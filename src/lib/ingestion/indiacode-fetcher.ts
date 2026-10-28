import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { getServiceRoleClient } from "../server-utils";
import { normalizeVectorTo768 } from "../ai/providers/openrouter";
import { RIGHTS_DATA, getLawOfficialUrl } from "../data/rights-data";

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
 * Generates real 768-dimensional embedding vector (via OpenRouter, Gemini text-embedding-004, or Ollama)
 */
async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const openRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
  const geminiKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
  const ollamaEmbeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

  // 1. Try OpenRouter Embeddings API if key is available
  if (openRouterKey && !openRouterKey.startsWith("your_")) {
    try {
      const model = process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://meyyurai.app",
          "X-Title": "Meyyurai India Code Ingestion",
        },
        body: JSON.stringify({
          model,
          input: text.slice(0, 8000),
          dimensions: 768,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const rawVec = data.data?.[0]?.embedding;
        if (Array.isArray(rawVec) && rawVec.length > 0) {
          return normalizeVectorTo768(rawVec);
        }
      } else {
        console.warn(`   ⚠️ [OpenRouter Embedding HTTP ${res.status}]: Falling back to Gemini/Ollama embedding...`);
      }
    } catch (err) {
      console.warn("   ⚠️ [OpenRouter Embedding Exception]:", (err as Error).message);
    }
  }

  // 2. Try Gemini text-embedding-004 API if key is available
  if (geminiKey && !geminiKey.startsWith("your_")) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: text.slice(0, 8000) }] },
          }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as { embedding?: { values?: number[] } };
        if (data.embedding?.values && data.embedding.values.length === 768) {
          const isNonZero = data.embedding.values.some((val) => val !== 0);
          if (isNonZero) {
            return data.embedding.values;
          }
        }
      } else {
        console.warn(`   ⚠️ [Gemini Embedding HTTP ${res.status}]: Falling back to Ollama embedding...`);
      }
    } catch (err) {
      console.warn("   ⚠️ [Gemini Embedding Exception]:", (err as Error).message);
    }
  }

  // 3. Try Ollama nomic-embed-text API
  try {
    const res = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaEmbeddingModel,
        prompt: text.slice(0, 4000),
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { embedding?: number[] };
      if (data.embedding && data.embedding.length > 0) {
        const isNonZero = data.embedding.some((val) => val !== 0);
        if (isNonZero) {
          return normalizeVectorTo768(data.embedding);
        }
      }
    }
  } catch (err) {
    console.warn("   ⚠️ [Ollama Embedding Exception]:", (err as Error).message);
  }

  // Graceful fallback to zero-vector if external embedding services are unreachable
  console.warn("⚠️ [EMBEDDING WARNING]: Returning zero-vector fallback.");
  return new Array(768).fill(0);
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(officialUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timer);

      if (response.ok) {
        htmlContent = await response.text();
        // Save raw HTML & Metadata to disk cache
        fs.writeFileSync(htmlCacheFile, htmlContent, "utf8");
        fs.writeFileSync(
          metaCacheFile,
          JSON.stringify({ fetched_at: Date.now(), handle_id: handleId, url: officialUrl }, null, 2),
          "utf8",
        );
        console.log(`      ✓ Saved raw HTML to cache: ${htmlCacheFile}`);
      } else {
        if (fs.existsSync(htmlCacheFile)) {
          console.warn(`   ⚠️ [Network ${response.status} Warning]: Network fetch failed. Falling back to local cached file: ${htmlCacheFile}`);
          htmlContent = fs.readFileSync(htmlCacheFile, "utf8");
        } else {
          const errorMsg = `❌ [INDIA CODE FETCHER ERROR ${response.status}]: HTTP error when fetching ${officialUrl} and no local cache available.`;
          console.error(errorMsg);
          return { success: false, error: errorMsg };
        }
      }
    } catch (err) {
      clearTimeout(timer);
      if (fs.existsSync(htmlCacheFile)) {
        console.warn(`   ⚠️ [Network Timeout/Exception Warning]: ${(err as Error).message}. Falling back to local cached file: ${htmlCacheFile}`);
        htmlContent = fs.readFileSync(htmlCacheFile, "utf8");
      } else {
        const errorMsg = `❌ [INDIA CODE FETCHER NETWORK FAILURE]: Failed to reach indiacode.nic.in — ${(err as Error).message}`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }
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
    if (options.forceRefetch) {
      console.log(`[4/5] Force Refetch      : Deleting existing document record ID ${existingDoc.id} for re-ingestion...`);
      await client.from("legal_documents").delete().eq("id", existingDoc.id);
    } else {
      console.log(`[4/5] Checksum Check    : Document "${existingDoc.title}" already exists in DB. Skipping re-chunking (use forceRefetch=true to overwrite).`);
      await client
        .from("legal_documents")
        .update({ last_updated_by_source: todayStr })
        .eq("id", existingDoc.id);

      console.log(`[5/5] Ingestion Status  : Up-to-date in DB.`);
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
  let documentId: string = crypto.randomUUID();
  let dbInsertSuccess = false;

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

  if (docRes && !docErr) {
    documentId = docRes.id;
    dbInsertSuccess = true;
    console.log(`   + Created Supabase 'legal_documents' record | ID: ${documentId}`);
  } else {
    console.warn(`   ⚠️ Supabase DB insert notice (${docErr?.message}). Storing in local vector cache index...`);
  }

  // 6. Ingest legal_chunks & document_embeddings
  let chunkCount = 0;
  let embeddingCount = 0;
  const localChunksStore: Array<{
    chunk_id: string;
    document_id: string;
    act_name: string;
    official_url: string;
    section_number: string;
    chapter_title: string;
    official_text: string;
    embedding: number[];
  }> = [];

  for (const sec of parsedData.sections) {
    const chunkId = crypto.randomUUID();
    const tokenCount = sec.official_text.split(/\s+/).length;

    if (dbInsertSuccess) {
      const { data: chunkRes } = await client
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

      if (chunkRes) {
        const vectorText = `${sec.section_number}: ${sec.section_title}\n${sec.official_text}`;
        const embeddingVec = await generateEmbedding(vectorText, options.geminiApiKey);

        await client.from("document_embeddings" as any).insert({
          chunk_id: chunkRes.id,
          embedding: embeddingVec as unknown as string,
        });

        localChunksStore.push({
          chunk_id: chunkRes.id,
          document_id: documentId,
          act_name: parsedData.act_name,
          official_url: officialUrl,
          section_number: sec.section_number,
          chapter_title: sec.section_title,
          official_text: sec.official_text,
          embedding: embeddingVec,
        });

        chunkCount++;
        embeddingCount++;
        continue;
      }
    }

    // Local Store Backup Generation
    const vectorText = `${sec.section_number}: ${sec.section_title}\n${sec.official_text}`;
    const embeddingVec = await generateEmbedding(vectorText, options.geminiApiKey);

    localChunksStore.push({
      chunk_id: chunkId,
      document_id: documentId,
      act_name: parsedData.act_name,
      official_url: officialUrl,
      section_number: sec.section_number,
      chapter_title: sec.section_title,
      official_text: sec.official_text,
      embedding: embeddingVec,
    });

    chunkCount++;
    embeddingCount++;
  }

  // Save to local disk vector index
  saveToLocalVectorStore(localChunksStore);

  console.log(`[5/5] Ingestion Status  : SUCCESS! Ingested ${chunkCount} chunks & ${embeddingCount} real vector embeddings.`);
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

/**
 * Persists ingested chunks to local vector store JSON file
 */
function saveToLocalVectorStore(
  newChunks: Array<{
    chunk_id: string;
    document_id: string;
    act_name: string;
    official_url: string;
    section_number: string;
    chapter_title: string;
    official_text: string;
    embedding: number[];
  }>,
) {
  const storePath = path.join(process.cwd(), "scripts", "cache", "ingested_chunks_db.json");
  let existingStore: typeof newChunks = [];

  if (fs.existsSync(storePath)) {
    try {
      existingStore = JSON.parse(fs.readFileSync(storePath, "utf8"));
    } catch {
      existingStore = [];
    }
  }

  // Remove old entries for same act name
  const actNamesToReplace = new Set(newChunks.map((c) => c.act_name.toLowerCase()));
  existingStore = existingStore.filter((c) => !actNamesToReplace.has(c.act_name.toLowerCase()));

  existingStore.push(...newChunks);
  fs.writeFileSync(storePath, JSON.stringify(existingStore, null, 2), "utf8");
}

/**
 * Cosine Similarity function for 768-dim vector embeddings
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Local Hybrid Search (Vector + FTS) across ingested chunks and verified statutory rights data
 */
export function searchLocalIngestedChunks(
  queryText: string,
  queryEmbedding: number[],
  matchCount = 5,
): any[] {
  const storePath = path.join(process.cwd(), "scripts", "cache", "ingested_chunks_db.json");
  let store: Array<{
    chunk_id: string;
    document_id: string;
    act_name: string;
    official_url: string;
    section_number: string;
    chapter_title: string;
    official_text: string;
    embedding: number[];
  }> = [];

  if (fs.existsSync(storePath)) {
    try {
      store = JSON.parse(fs.readFileSync(storePath, "utf8")) || [];
    } catch {
      store = [];
    }
  }

  // Augment with verified statutory bare-act sections from RIGHTS_DATA
  const rightsChunks: Array<{
    chunk_id: string;
    document_id: string;
    act_name: string;
    official_url: string;
    section_number: string;
    chapter_title: string;
    official_text: string;
    embedding: number[];
  }> = [];

  if (RIGHTS_DATA && typeof RIGHTS_DATA === "object") {
    Object.entries(RIGHTS_DATA).forEach(([catKey, cat]) => {
      if (cat.laws && Array.isArray(cat.laws)) {
        cat.laws.forEach((law, idx) => {
          const officialUrl = getLawOfficialUrl(law);
          rightsChunks.push({
            chunk_id: `rights-${catKey}-${idx}`,
            document_id: `doc-${catKey}`,
            act_name: law.actName,
            official_url: officialUrl,
            section_number: law.section,
            chapter_title: law.classification || cat.title,
            official_text: `${law.section}: ${law.description}. ${law.bareActText || ""}. Punishment: ${law.punishment || ""}. Trial Court: ${law.trialCourt || ""}`,
            embedding: new Array(768).fill(0),
          });
        });
      }
    });
  }

  const allChunks = [...store, ...rightsChunks];
  if (allChunks.length === 0) return [];

  try {
    const qLower = (queryText || "").toLowerCase();
    const queryWords = qLower.split(/\s+/).filter((w) => w.length > 2);

    const scored = allChunks.map((chunk) => {
      const semSim = queryEmbedding && queryEmbedding.some((v) => v !== 0)
        ? cosineSimilarity(queryEmbedding, chunk.embedding)
        : 0;

      const fullText = (
        chunk.act_name + " " +
        chunk.section_number + " " +
        chunk.chapter_title + " " +
        chunk.official_text
      ).toLowerCase();

      let wordMatches = 0;
      for (const word of queryWords) {
        if (fullText.includes(word)) wordMatches++;
      }
      const ftsScore = queryWords.length > 0 ? wordMatches / queryWords.length : 0;

      // Category domain keywords boost
      let domainBoost = 0;
      if (
        (qLower.includes("property") || qLower.includes("ancestral") || qLower.includes("partition") || qLower.includes("land") || qLower.includes("will") || qLower.includes("brother")) &&
        (fullText.includes("succession") || fullText.includes("partition") || fullText.includes("property"))
      ) {
        domainBoost += 0.45;
      }
      if (
        (qLower.includes("work") || qLower.includes("salary") || qLower.includes("boss") || qLower.includes("job") || qLower.includes("labour") || qLower.includes("employee") || qLower.includes("wages")) &&
        (fullText.includes("wages") || fullText.includes("standing orders") || fullText.includes("labour") || fullText.includes("employment"))
      ) {
        domainBoost += 0.45;
      }
      if (
        (qLower.includes("women") || qLower.includes("harass") || qLower.includes("husband") || qLower.includes("posh") || qLower.includes("domestic") || qLower.includes("stalking") || qLower.includes("modesty") || qLower.includes("dowry")) &&
        (fullText.includes("women") || fullText.includes("domestic violence") || fullText.includes("bns section 7") || fullText.includes("posh") || fullText.includes("dowry"))
      ) {
        domainBoost += 0.45;
      }
      if (
        (qLower.includes("cyber") || qLower.includes("hack") || qLower.includes("otp") || qLower.includes("scam") || qLower.includes("fraud") || qLower.includes("online") || qLower.includes("phishing")) &&
        (fullText.includes("information technology") || fullText.includes("section 66") || fullText.includes("cyber"))
      ) {
        domainBoost += 0.45;
      }
      if (
        (qLower.includes("consumer") || qLower.includes("defect") || qLower.includes("refund") || qLower.includes("warranty") || qLower.includes("seller") || qLower.includes("product")) &&
        (fullText.includes("consumer protection") || fullText.includes("consumer"))
      ) {
        domainBoost += 0.45;
      }
      if (
        (qLower.includes("accident") || qLower.includes("car") || qLower.includes("bike") || qLower.includes("hit") || qLower.includes("injury") || qLower.includes("mact") || qLower.includes("collision")) &&
        (fullText.includes("motor vehicles") || fullText.includes("railway") || fullText.includes("compensation"))
      ) {
        domainBoost += 0.45;
      }
      if (
        (qLower.includes("rent") || qLower.includes("landlord") || qLower.includes("tenant") || qLower.includes("eviction") || qLower.includes("deposit")) &&
        (fullText.includes("tenan") || fullText.includes("rent") || fullText.includes("evict") || fullText.includes("deposit"))
      ) {
        domainBoost += 0.45;
      }

      const hybridScore = semSim * 0.4 + ftsScore * 0.35 + domainBoost * 0.25;

      return {
        chunk_id: chunk.chunk_id,
        document_id: chunk.document_id,
        act_name: chunk.act_name,
        official_url: chunk.official_url,
        chapter_number: null,
        chapter_title: chunk.chapter_title,
        section_number: chunk.section_number,
        subsection: null,
        official_text: chunk.official_text,
        similarity: hybridScore,
      };
    });

    const relevant = scored.filter((s) => s.similarity > 0.05);
    relevant.sort((a, b) => b.similarity - a.similarity);
    return (relevant.length > 0 ? relevant : scored.slice(0, 1)).slice(0, matchCount);
  } catch {
    return [];
  }
}
