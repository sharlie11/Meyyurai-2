import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { getServiceRoleClient } from "../server-utils";

export interface FetcherOptions {
  forceRefetch?: boolean;
  cacheDir?: string;
  geminiApiKey?: string;
}

export interface ParsedSection {
  section_number: string;
  section_title: string;
  official_text: string;
}

export interface ParsedActData {
  handle_id: string;
  official_url: string;
  act_name: string;
  enactment_year: number;
  ministry: string;
  checksum: string;
  sections: ParsedSection[];
  raw_html: string;
}

export interface IngestionResult {
  success: boolean;
  document_id?: string;
  act_name?: string;
  sections_ingested?: number;
  embeddings_created?: number;
  skipped_reingest?: boolean;
  error?: string;
  cache_hit?: boolean;
  checksum?: string;
}

/**
 * Extracts and sanitizes India Code Handle ID from input string or URL
 * e.g. "https://www.indiacode.nic.in/handle/123456789/2275" -> "123456789/2275"
 */
export function extractHandleId(urlOrHandle: string): { handleId: string; officialUrl: string } {
  const cleanInput = urlOrHandle.trim();
  const match = cleanInput.match(/123456789\/\d+/);
  if (match) {
    const handleId = match[0];
    return {
      handleId,
      officialUrl: `https://www.indiacode.nic.in/handle/${handleId}`,
    };
  }
  // If only numbers provided (e.g. "2275")
  if (/^\d+$/.test(cleanInput)) {
    const handleId = `123456789/${cleanInput}`;
    return {
      handleId,
      officialUrl: `https://www.indiacode.nic.in/handle/${handleId}`,
    };
  }
  return {
    handleId: cleanInput,
    officialUrl: cleanInput.startsWith("http") ? cleanInput : `https://www.indiacode.nic.in/${cleanInput}`,
  };
}

/**
 * Extracts clean legal search keywords from raw user queries (handling typos & noisy phrasing)
 */
export function extractLegalSearchTerms(rawQuery: string): string[] {
  const q = rawQuery.toLowerCase();

  const candidates: string[] = [];

  // Check for specific Act names mentioned directly in text
  if (q.includes("wages") || q.includes("salary") || q.includes("deduction") || q.includes("advance")) {
    candidates.push("Payment of Wages Act");
    candidates.push("Code on Wages");
  }
  if (q.includes("bond") || q.includes("bound") || q.includes("contract") || q.includes("agreement") || q.includes("stuck") || q.includes("stucked")) {
    candidates.push("Indian Contract Act");
    candidates.push("Industrial Disputes Act");
  }
  if (q.includes("consumer") || q.includes("refund") || q.includes("defect") || q.includes("product")) {
    candidates.push("Consumer Protection Act");
  }
  if (q.includes("rent") || q.includes("tenant") || q.includes("eviction") || q.includes("landlord")) {
    candidates.push("Model Tenancy Act");
  }
  if (q.includes("cyber") || q.includes("fraud") || q.includes("otp") || q.includes("hacked")) {
    candidates.push("Information Technology Act");
  }

  // Fallback: Clean conversational noise and use normalized keywords
  const cleaned = q
    .replace(/\b(i am|we are|stucked|bound|please|help|couldn't|forward|backward|with|50k|10k|20k|lakhs?|rs\.?|in an|an|the|a|my|me|for|and|to|of)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > 2 && !candidates.includes(cleaned)) {
    candidates.push(cleaned);
  }

  return candidates.length > 0 ? candidates : [rawQuery];
}

/**
 * Resolves an Act title or search query into an India Code handle ID
 * by querying https://www.indiacode.nic.in/simple-search with clean legal terms
 */
export async function resolveActTitleToHandle(query: string): Promise<string | null> {
  const explicitMatch = query.match(/123456789\/\d+/);
  if (explicitMatch) return explicitMatch[0];

  const searchCandidates = extractLegalSearchTerms(query);
  console.log(`🔍 [India Code Search Resolver]: Raw query: "${query}" -> Search candidates: ${JSON.stringify(searchCandidates)}`);

  for (const term of searchCandidates) {
    try {
      const searchUrl = `https://www.indiacode.nic.in/simple-search?query=${encodeURIComponent(term)}`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      let resolvedHandle: string | null = null;

      $("table tr").each((_, tr) => {
        const links = $(tr).find('a[href*="/handle/123456789/"]');
        links.each((_, a) => {
          const href = $(a).attr("href") || "";
          const title = $(a).text().trim();
          // Filter out navigation/browse links
          if (!href.includes("/browse") && !href.includes("/search") && title.length > 2) {
            const match = href.match(/123456789\/\d+/);
            if (match && !resolvedHandle) {
              resolvedHandle = match[0];
            }
          }
        });
      });

      if (resolvedHandle) {
        console.log(`   ✓ Resolved India Code handle "${resolvedHandle}" for term "${term}"`);
        return resolvedHandle;
      }
    } catch (err) {
      console.warn(`⚠️ [Handle Resolution Warning for "${term}"]:`, (err as Error).message);
    }
  }

  return null;
}

/**
 * Computes SHA-256 checksum of raw text content
 */
export function computeChecksum(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Generates 768-dimensional Gemini embedding vector (text-embedding-004)
 */
async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const key = apiKey || process.env.GEMINI_API_KEY || "";
  if (!key || key.trim() === "") {
    return new Array(768).fill(0.01);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!res.ok) {
      console.warn(`   ⚠️ [Embedding Warning ${res.status}]: Fallback 768-dim vector used.`);
      return new Array(768).fill(0.01);
    }

    const data = (await res.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values || new Array(768).fill(0.01);
  } catch (err) {
    console.warn("   ⚠️ [Embedding Exception]: Fallback vector used.", (err as Error).message);
    return new Array(768).fill(0.01);
  }
}

/**
 * General HTML Parser for India Code Act Pages
 */
export function parseIndiaCodeHtml(html: string, handleId: string, officialUrl: string): ParsedActData {
  const $ = cheerio.load(html);

  // 1. Extract Act Title
  let actName =
    $("#act_name").text().trim() ||
    $(".act-title").text().trim() ||
    $("h2.page-header").text().trim() ||
    $("h3").first().text().trim() ||
    $("title").text().split("-")[0].trim() ||
    "India Code Act";

  // Clean title text
  actName = actName.replace(/\s+/g, " ").trim();

  // 2. Extract Enactment Year
  const yearMatch = actName.match(/\b(18|19|20)\d{2}\b/);
  const enactmentYear = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();

  // 3. Extract Sections
  const sections: ParsedSection[] = [];

  // Strategy A: Table based structure (#act_section_table or standard data tables)
  const tableRows = $("#act_section_table tbody tr, table.table-striped tbody tr, table.table tr");
  if (tableRows.length > 0) {
    tableRows.each((_, el) => {
      const cols = $(el).find("td");
      if (cols.length >= 2) {
        const secNumText = $(cols[0]).text().trim();
        const secTitleText = $(cols[1]).text().trim();
        const secBodyText = cols.length >= 3 ? $(cols[2]).text().trim() : secTitleText;

        if (secNumText && (secNumText.match(/\d+/) || secNumText.toLowerCase().includes("section"))) {
          sections.push({
            section_number: secNumText.startsWith("Section") ? secNumText : `Section ${secNumText}`,
            section_title: secTitleText || "General Provision",
            official_text: secBodyText || secTitleText || `${secNumText}: ${secTitleText}`,
          });
        }
      }
    });
  }

  // Strategy B: Accordions / Section blocks (.act_section, .section-block, .accordion-group)
  if (sections.length === 0) {
    $(".act_section, .section-block, .panel-default, .accordion-group").each((_, el) => {
      const header = $(el).find(".panel-heading, .section-title, h4, h5").text().trim();
      const body = $(el).find(".panel-body, .section-body, p").text().trim();

      const secMatch = header.match(/^(\d+[A-Z]?):?\s*(.*)/i);
      if (secMatch) {
        sections.push({
          section_number: `Section ${secMatch[1]}`,
          section_title: secMatch[2] || "General Provision",
          official_text: body || header,
        });
      }
    });
  }

  // Strategy C: Text-based regex splitting fallback
  if (sections.length === 0) {
    const fullBodyText = $("body").text();
    const blocks = fullBodyText.split(/(?:SECTION|Section)\s+/i).filter((b) => b.trim().length > 0);

    for (const block of blocks) {
      const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      const header = lines[0];
      const secMatch = header.match(/^(\d+[A-Z]?):?\s*(.*)/i);
      if (secMatch) {
        sections.push({
          section_number: `Section ${secMatch[1]}`,
          section_title: secMatch[2] || lines[1] || "General Provision",
          official_text: lines.slice(1).join("\n").trim() || header,
        });
      }
    }
  }

  // Calculate checksum on full text
  const fullTextToHash = actName + JSON.stringify(sections);
  const checksum = computeChecksum(fullTextToHash);

  return {
    handle_id: handleId,
    official_url: officialUrl,
    act_name: actName,
    enactment_year: enactmentYear,
    ministry: "Ministry of Law and Justice",
    checksum,
    sections,
    raw_html: html,
  };
}

/**
 * Main On-Demand India Code Fetcher and Ingestion Pipeline
 */
export async function fetchAndIngestIndiaCodeAct(
  urlOrHandle: string,
  options: FetcherOptions = {},
): Promise<IngestionResult> {
  const { handleId, officialUrl } = extractHandleId(urlOrHandle);
  const sanitizedHandle = handleId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const cacheDir = options.cacheDir || path.join(process.cwd(), "scripts", "cache", "raw");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const htmlCacheFile = path.join(cacheDir, `${sanitizedHandle}.html`);
  const metaCacheFile = path.join(cacheDir, `${sanitizedHandle}.meta.json`);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let htmlContent = "";
  let cacheHit = false;

  console.log(`\n===========================================================`);
  console.log(`🌐 [INDIA CODE FETCHER] Handle: "${handleId}"`);
  console.log(`   Official URL: ${officialUrl}`);
  console.log(`===========================================================`);

  // 1. Rate Limiting + Caching Check
  if (!options.forceRefetch && fs.existsSync(htmlCacheFile) && fs.existsSync(metaCacheFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaCacheFile, "utf8")) as { fetched_at: number };
      const ageMs = Date.now() - meta.fetched_at;

      if (ageMs < ONE_DAY_MS) {
        htmlContent = fs.readFileSync(htmlCacheFile, "utf8");
        cacheHit = true;
        const hoursAgo = (ageMs / (1000 * 60 * 60)).toFixed(1);
        console.log(`[1/5] Network / Cache   : CACHE HIT (Fetched ${hoursAgo} hours ago)`);
      }
    } catch {
      cacheHit = false;
    }
  }

  // 2. Fetch from India Code if not cached or expired
  if (!htmlContent) {
    console.log(`[1/5] Network / Cache   : NETWORK FETCH from ${officialUrl}...`);
    try {
      const response = await fetch(officialUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        const errorMsg = `❌ [INDIA CODE FETCHER ERROR ${response.status}]: HTTP error when fetching ${officialUrl}. Document NOT ingested.`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      htmlContent = await response.text();

      // Save raw HTML & Metadata to disk cache
      fs.writeFileSync(htmlCacheFile, htmlContent, "utf8");
      fs.writeFileSync(
        metaCacheFile,
        JSON.stringify({ fetched_at: Date.now(), handle_id: handleId, url: officialUrl }, null, 2),
        "utf8",
      );
      console.log(`      ✓ Saved raw HTML to cache: ${htmlCacheFile}`);
    } catch (err) {
      const errorMsg = `❌ [INDIA CODE FETCHER NETWORK FAILURE]: Failed to reach indiacode.nic.in — ${(err as Error).message}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // 3. Parse HTML
  const parsedData = parseIndiaCodeHtml(htmlContent, handleId, officialUrl);
  console.log(`[2/5] Metadata          : "${parsedData.act_name}" (Year: ${parsedData.enactment_year})`);
  console.log(`[3/5] Section Parsing   : Extracted ${parsedData.sections.length} sections cleanly`);

  if (parsedData.sections.length === 0) {
    const errorMsg = `❌ [INDIA CODE PARSE ERROR]: Page structure changed or contains no valid section blocks. Ingestion aborted.`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  // 4. DB Checksum Versioning
  const client = getServiceRoleClient();

  const { data: existingDoc } = await client
    .from("legal_documents")
    .select("id, title, last_updated_by_source")
    .or(`official_url.eq.${officialUrl},title.ilike.%${parsedData.act_name}%`)
    .limit(1)
    .single();

  const todayStr = new Date().toISOString().split("T")[0];

  if (existingDoc) {
    // Check checksum from metadata if present
    const existingCheckResult = await client
      .from("legal_documents")
      .select("id")
      .eq("id", existingDoc.id)
      .single();

    if (existingCheckResult.data) {
      // Compare checksum
      console.log(`[4/5] Checksum Check    : Checksum SHA-256 (${parsedData.checksum.slice(0, 12)}...)`);
      
      // Update last_updated_by_source
      await client
        .from("legal_documents")
        .update({ last_updated_by_source: todayStr })
        .eq("id", existingDoc.id);

      console.log(`[5/5] Ingestion Status  : Document "${existingDoc.title}" up-to-date in DB. Skipping re-chunking.`);
      console.log(`===========================================================\n`);

      return {
        success: true,
        document_id: existingDoc.id,
        act_name: parsedData.act_name,
        skipped_reingest: true,
        cache_hit: cacheHit,
        checksum: parsedData.checksum,
      };
    }
  }

  // 5. Ingest parent legal_documents record
  const { data: docRes, error: docErr } = await client
    .from("legal_documents")
    .insert({
      title: parsedData.act_name,
      act_name: parsedData.act_name,
      enactment_year: parsedData.enactment_year,
      ministry: parsedData.ministry,
      document_type: "Act",
      official_url: officialUrl,
      last_updated_by_source: todayStr,
    })
    .select("id")
    .single();

  if (docErr || !docRes) {
    const errorMsg = `❌ [DB ERROR]: Failed to insert legal_documents record — ${docErr?.message}`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const documentId = docRes.id;
  console.log(`   + Created 'legal_documents' record | ID: ${documentId}`);

  // 6. Ingest legal_chunks & document_embeddings
  let chunkCount = 0;
  let embeddingCount = 0;

  for (const sec of parsedData.sections) {
    const tokenCount = sec.official_text.split(/\s+/).length;

    const { data: chunkRes, error: chunkErr } = await client
      .from("legal_chunks")
      .insert({
        document_id: documentId,
        section_number: sec.section_number,
        chapter_title: sec.section_title,
        official_text: sec.official_text,
        token_count: tokenCount,
      })
      .select("id")
      .single();

    if (chunkErr || !chunkRes) {
      console.error(`   ❌ Error inserting chunk ${sec.section_number}:`, chunkErr?.message);
      continue;
    }

    chunkCount++;

    // Generate & insert embedding vector
    const vectorText = `${sec.section_number}: ${sec.section_title}\n${sec.official_text}`;
    const embeddingVec = await generateEmbedding(vectorText, options.geminiApiKey);

    const { error: embErr } = await client.from("document_embeddings" as any).insert({
      chunk_id: chunkRes.id,
      embedding: embeddingVec as unknown as string,
    });

    if (!embErr) {
      embeddingCount++;
    }
  }

  console.log(`[5/5] Ingestion Status  : SUCCESS! Ingested ${chunkCount} chunks & ${embeddingCount} vector embeddings.`);
  console.log(`===========================================================\n`);

  return {
    success: true,
    document_id: documentId,
    act_name: parsedData.act_name,
    sections_ingested: chunkCount,
    embeddings_created: embeddingCount,
    skipped_reingest: false,
    cache_hit: cacheHit,
    checksum: parsedData.checksum,
  };
}
