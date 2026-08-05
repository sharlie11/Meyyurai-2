const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || 'https://fynfbbuxafzdqmitetfq.supabase.co';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_k0zGHSGxlVZw6v09hOZUeA_wKSfySTS';
const client = createClient(url, key);

async function checkPhase2Tables() {
  console.log('===========================================================');
  console.log('       MEYYURAI PHASE 2 RAG DATABASE AUDIT RESULTS         ');
  console.log('===========================================================');

  const tables = [
    'legal_documents',
    'legal_chunks',
    'document_embeddings',
    'support_organizations',
    'rights_articles',
    'rights_categories'
  ];

  for (const t of tables) {
    try {
      const { data, count, error } = await client.from(t).select('*', { count: 'exact' });
      if (error) {
        console.log(`❌ Table '${t}': ERROR (${error.message} - Code: ${error.code})`);
      } else {
        console.log(`✅ Table '${t}': EXISTS | Exact Row Count: ${count ?? (data ? data.length : 0)}`);
      }
    } catch (err) {
      console.log(`❌ Table '${t}': EXCEPTION (${err.message})`);
    }
  }

  console.log('===========================================================');
}

checkPhase2Tables();
