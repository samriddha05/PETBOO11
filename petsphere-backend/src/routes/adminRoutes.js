const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateEmbedding } = require('../utils/embedder');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/knowledge', async (req, res) => {
  try {
    const textContext = req.body.text || req.body.content;
    const text = textContext;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text/content is required' });
    }

    console.log("1. INGESTION START: Text to embed:", text);

    // Generate the 384-dimensional embedding
    const embeddingArray = await generateEmbedding(text);
    console.log("2. EMBEDDING GENERATED: Vector length:", embeddingArray.length);
    
    // Format for pgvector: '[val1, val2, ...]'
    const embeddingString = `[${embeddingArray.join(',')}]`;

    // Insert using raw SQL because Prisma does not natively support inserting 
    // into Unsupported("vector") types using standard create() syntax
    const result = await prisma.$queryRaw`
      INSERT INTO "KnowledgeDocument" (id, text, embedding, "createdAt") 
      VALUES (gen_random_uuid(), ${text}, ${embeddingString}::vector, NOW())
      RETURNING id
    `;
    
    console.log("3. DB SAVE SUCCESS: Document ID:", result[0]?.id);

    return res.status(201).json({ message: 'Knowledge document ingested successfully' });
  } catch (error) {
    console.error('Error ingesting knowledge document:', error);
    return res.status(500).json({ error: 'Failed to ingest knowledge document', details: error.message });
  }
});

module.exports = router;
