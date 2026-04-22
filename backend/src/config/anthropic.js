// src/config/openai.js
// OpenAI GPT-4o client — used by contentIdeaService and AI classifier

const OpenAI = (() => {
    try {
      return require('openai');
    } catch {
      return null;
    }
  })();
  
  let openaiClient = null;
  
  function getOpenAIClient() {
    if (openaiClient) return openaiClient;
  
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[OpenAI] OPENAI_API_KEY not set — AI features will be unavailable');
      return null;
    }
  
    if (!OpenAI) {
      console.warn('[OpenAI] "openai" package not installed — run: npm install openai');
      return null;
    }
  
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('[OpenAI] Client initialised ✓');
    return openaiClient;
  }
  
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
  
  module.exports = { getOpenAIClient, OPENAI_MODEL };
  