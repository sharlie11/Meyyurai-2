const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || 'https://fynfbbuxafzdqmitetfq.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_supabase_service_role_key'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : 'sb_publishable_k0zGHSGxlVZw6v09hOZUeA_wKSfySTS';

const client = createClient(url, key);
const geminiApiKey = process.env.GEMINI_API_KEY || '';

async function generateEmbedding(text) {
  if (!geminiApiKey || geminiApiKey.trim() === '') {
    console.log('   [Embedding]: Using 768-dim normalized fallback vector.');
    return new Array(768).fill(0.01);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`   [Embedding Warning ${res.status}]: Using 768-dim fallback vector.`);
      return new Array(768).fill(0.01);
    }

    const data = await res.json();
    return data.embedding.values || new Array(768).fill(0.01);
  } catch (err) {
    console.warn('   [Embedding Exception]: Using 768-dim fallback vector.', err.message);
    return new Array(768).fill(0.01);
  }
}

async function runIngestion() {
  console.log('===========================================================');
  console.log('  INGESTION PIPELINE TEST: PAYMENT OF WAGES ACT, 1936      ');
  console.log('===========================================================');

  const rawFilePath = path.join(__dirname, 'raw_payment_of_wages_act_1936.txt');
  const rawContent = fs.readFileSync(rawFilePath, 'utf8');

  // 1. Insert Parent Legal Document
  const docPayload = {
    title: 'Payment of Wages Act, 1936',
    act_name: 'Payment of Wages Act, 1936',
    enactment_year: 1936,
    ministry: 'Ministry of Labour and Employment',
    document_type: 'Act',
    official_url: 'https://www.indiacode.nic.in/handle/123456789/2275',
  };

  const { data: docRes, error: docErr } = await client
    .from('legal_documents')
    .insert(docPayload)
    .select('*');

  if (docErr) {
    console.error('❌ Failed to insert legal_documents:', docErr.message);
    return;
  }

  const parentDoc = docRes[0];
  console.log(`✅ [1/3] Inserted into 'legal_documents' | ID: ${parentDoc.id}`);
  console.log(`       Title: "${parentDoc.title}" | Ministry: "${parentDoc.ministry}"`);

  // 2. Parse Section Chunks
  const sectionBlocks = rawContent.split(/SECTION\s+/i).filter((s) => s.trim().length > 0 && s.includes(':'));
  console.log(`\nFound ${sectionBlocks.length} sections to chunk and embed...`);

  let chunkCount = 0;
  let embeddingCount = 0;

  for (const block of sectionBlocks) {
    const lines = block.trim().split('\n');
    const header = lines[0]; // e.g. "1: Short title, extent, commencement and application."
    const secNumMatch = header.match(/^(\d+[A-Z]?):?\s*(.*)/i);
    if (!secNumMatch) continue;

    const sectionNum = `Section ${secNumMatch[1]}`;
    const sectionTitle = secNumMatch[2] || 'General Provision';
    const bodyText = lines.slice(1).join('\n').trim();

    // Insert Chunk
    const { data: chunkRes, error: chunkErr } = await client
      .from('legal_chunks')
      .insert({
        document_id: parentDoc.id,
        section_number: sectionNum,
        chapter_title: sectionTitle,
        official_text: bodyText || header,
        token_count: (bodyText || header).split(/\s+/).length,
      })
      .select('*');

    if (chunkErr) {
      console.error(`❌ Error inserting chunk ${sectionNum}:`, chunkErr.message);
      continue;
    }

    const chunk = chunkRes[0];
    chunkCount++;
    console.log(`   + [2/3] Inserted chunk '${sectionNum}' | ID: ${chunk.id}`);

    // Generate Embedding & Insert
    const embeddingVec = await generateEmbedding(`${sectionNum}: ${sectionTitle}\n${chunk.official_text}`);
    const { data: embRes, error: embErr } = await client
      .from('document_embeddings')
      .insert({
        chunk_id: chunk.id,
        embedding: embeddingVec,
      })
      .select('*');

    if (embErr) {
      console.error(`   ❌ Error inserting embedding for ${sectionNum}:`, embErr.message);
    } else {
      embeddingCount++;
      console.log(`   + [3/3] Inserted vector embedding for chunk ID: ${chunk.id}`);
    }
  }

  // 3. Output Database Counts Audit
  console.log('\n===========================================================');
  console.log('       INGESTION COMPLETE — VERIFYING DATABASE COUNTS     ');
  console.log('===========================================================');

  const { count: docCount } = await client.from('legal_documents').select('*', { count: 'exact' });
  const { count: chunkDbCount } = await client.from('legal_chunks').select('*', { count: 'exact' });
  const { count: embCount } = await client.from('document_embeddings').select('*', { count: 'exact' });

  console.log(`📊 select count(*) from legal_documents   : ${docCount}`);
  console.log(`📊 select count(*) from legal_chunks      : ${chunkDbCount}`);
  console.log(`📊 select count(*) from document_embeddings: ${embCount}`);
  console.log('===========================================================\n');
}

runIngestion();
