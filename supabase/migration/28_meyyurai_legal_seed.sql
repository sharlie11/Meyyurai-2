-- Dummy seed data for RAG pipeline testing
DO $$
DECLARE
    source_id UUID;
    doc_id UUID;
    chunk_id UUID;
BEGIN
    -- 1. Insert Source
    INSERT INTO knowledge_sources (name, type, base_url)
    VALUES ('Ministry of Law and Justice', 'Central Government', 'https://www.indiacode.nic.in')
    RETURNING id INTO source_id;

    -- 2. Insert Act
    INSERT INTO legal_documents (source_id, title, act_name, enactment_year, ministry, document_type, official_url)
    VALUES (
        source_id,
        'The Code on Wages, 2019',
        'Code on Wages',
        2019,
        'Ministry of Labour and Employment',
        'Act',
        'https://www.indiacode.nic.in/handle/123456789/13636'
    )
    RETURNING id INTO doc_id;

    -- 3. Insert Chunk (Section 15: Mode of payment of wages)
    INSERT INTO legal_chunks (document_id, chapter_number, chapter_title, section_number, official_text)
    VALUES (
        doc_id,
        'Chapter III',
        'Payment of Wages',
        'Section 15',
        'All wages shall be paid in current coin or currency notes or by cheque or by crediting the wages in the bank account of the employee or by the electronic mode.'
    )
    RETURNING id INTO chunk_id;

    -- Insert dummy embedding for chunk (using a zero vector for schema testing)
    INSERT INTO document_embeddings (chunk_id, embedding)
    VALUES (chunk_id, array_fill(0, ARRAY[768])::vector);

    -- 4. Insert Chunk (Section 17: Time limit for payment of wages)
    INSERT INTO legal_chunks (document_id, chapter_number, chapter_title, section_number, official_text)
    VALUES (
        doc_id,
        'Chapter III',
        'Payment of Wages',
        'Section 17(1)',
        'The employer shall pay or cause to be paid wages to the employees, engaged on (i) daily basis, at the end of the shift; (ii) weekly basis, on the last working day of the week, that is to say, before the weekly holiday; (iii) fortnightly basis, before the end of the second day after the end of the fortnight; (iv) monthly basis, before the expiry of the seventh day of the succeeding month.'
    )
    RETURNING id INTO chunk_id;

    -- Insert dummy embedding for chunk
    INSERT INTO document_embeddings (chunk_id, embedding)
    VALUES (chunk_id, array_fill(0, ARRAY[768])::vector);

END $$;
