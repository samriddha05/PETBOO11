const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const { generateEmbedding } = require('../utils/embedder');

const prisma = new PrismaClient();

// ... getChatSessions ...
// ... getChatHistory ...
async function getChatSessions(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized request.' });
    }

    const sessions = await prisma.chatHistory.findMany({
      where: { userId, role: 'user' },
      orderBy: { createdAt: 'desc' },
      distinct: ['sessionId'],
    });

    const formattedSessions = sessions.map((s) => ({
      sessionId: s.sessionId,
      title: s.message,
    }));

    return res.status(200).json({ sessions: formattedSessions });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch sessions.',
      details: error.message,
    });
  }
}

async function getChatHistory(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized request.' });
    }

    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const formattedHistory = history.map((msg) => ({
      sessionId: msg.sessionId,
      role: msg.role === 'user' ? 'user' : 'bot',
      text: msg.message,
    }));

    return res.status(200).json({ history: formattedHistory });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch chat history.',
      details: error.message,
    });
  }
}

async function handleChat(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized request.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
    }

    const { message, sessionId } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A valid message is required.' });
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'A valid sessionId is required.' });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    // Handle RAG Embedding search
    console.log("4. RETRIEVAL START: User asked:", message.trim());
    const queryEmbedding = await generateEmbedding(message.trim());
    console.log("5. QUERY VECTOR GENERATED: Length:", queryEmbedding.length);
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
    let retrievedText = '';
    try {
      const knowledgeDocs = await prisma.$queryRaw`
        SELECT text
        FROM "KnowledgeDocument"
        ORDER BY embedding <-> ${queryVector}::vector
        LIMIT 2;
      `;
      console.log("6. DB SEARCH RESULTS:", knowledgeDocs);
      if (knowledgeDocs && knowledgeDocs.length > 0) {
        retrievedText = knowledgeDocs.map(doc => doc.text).join('\n---\n');
      }
    } catch (dbErr) {
      console.error("6. DB SEARCH FAILED:", dbErr);
    }

    const userPets = await prisma.pet.findMany({ where: { userId: userId } });
    const userPetsStr = userPets.length ? userPets.map(p => p.name + ' (' + p.breed + ')').join(', ') : 'No pets added yet';
    
    let systemPromptContent = `You are Cuddles, an expert vet AI. You MUST base your answer strictly on this official company knowledge: [${retrievedText ? retrievedText : 'No internal knowledge retrieved'}]. If the knowledge base mentions a specific policy, quote it directly. The user's pets are: [${userPetsStr}].`;
    
    console.log("7. FINAL SYSTEM PROMPT:", systemPromptContent);

    const systemPrompt = { 
      role: "system", 
      content: systemPromptContent
    };

    const finalMessages = [
      { role: "user", content: message.trim() }
    ];
    
    finalMessages.unshift(systemPrompt);

    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: finalMessages,
      temperature: 0.7,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      const upstreamCode = completion?.code;
      const upstreamMsg = completion?.msg;
      throw new Error(
        upstreamCode || upstreamMsg
          ? `Upstream API error (${upstreamCode ?? 'unknown'}): ${upstreamMsg ?? 'No message'}`
          : 'Upstream API returned an empty response.'
      );
    }

    prisma.chatHistory.createMany({
      data: [
        { userId, sessionId, role: 'user', message: message.trim() },
        { userId, sessionId, role: 'assistant', message: reply }
      ]
    }).catch(err => console.error("Failed to save chat history asynchronously:", err));

    return res.status(200).json({ reply, sessionId });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to get response from Groq API.',
      details: error.message,
    });
  }
}

module.exports = {
  handleChat,
  getChatHistory,
  getChatSessions,
};
