/**
 * chatbotController.js
 * AI Chat Assistant for Krench Chicken TikTok Management
 * Calls OpenAI GPT-4o with dynamic context based on keyword detection
 * LeadFlow — UC Chatbot (AI Assistant)
 *
 * NOTE: OpenAI integration is deferred. Controller returns a stub response
 * until `openai` package is installed and OPENAI_API_KEY is configured.
 */

const { success, error } = require('../utils/responseHelper');
const logger             = require('../utils/logger');

// ── Lazy-load OpenAI so the server starts even if the package is missing ──
let openai = null;
const getOpenAI = () => {
  if (openai) return openai;
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  } catch {
    return null;
  }
};

// ── Base system context ──────────────────────────────────────────
const BASE_SYSTEM = `You are an expert AI assistant for Krench Chicken — a fast-food brand based in Bogor, West Java, Indonesia.
You help the marketing team manage their TikTok content strategy through the LeadFlow platform.
You are helpful, concise, creative, and always respond in the same language the user writes in (Bahasa Indonesia or English).
Always give actionable, specific advice tailored to TikTok and Indonesian audiences.`;

// ── Keyword → context extension database ────────────────────────
// Loaded dynamically based on keywords detected in user input.
// Longer/more specific prompts pull more context chunks.
const CONTEXT_DB = {
  hashtag: `
HASHTAG CONTEXT:
- Popular Indonesian food TikTok hashtags: #KulinerIndonesia, #MakanEnak, #FoodTikTok, #JajananIndonesia, #RekomendasiMakan
- Krench Chicken niche tags: #AyamGoreng, #StreetFood, #Bogor, #KrenchChicken
- Best practice: use 3-5 niche + 3-5 broad hashtags. Avoid banned or overused tags.
- TikTok algorithm values hashtags that match the video content, not just trending ones.`,

  schedule: `
SCHEDULING CONTEXT:
- Best TikTok posting times for Indonesian audiences: 07:00–09:00, 12:00–14:00, 19:00–22:00 WIB
- Peak engagement days: Tuesday, Thursday, and weekends
- Minimum posting frequency for growth: 3–5 times per week
- Always schedule at least 30 minutes before the target time to allow for upload processing.`,

  content: `
CONTENT STRATEGY CONTEXT:
- Krench Chicken specializes in crispy fried chicken with Indonesian flavors.
- Target audience: 18–35 year olds, families, students in Bogor and West Java.
- Best-performing TikTok formats: behind-the-scenes kitchen clips, customer reactions, ASMR eating videos, limited-time promo reveals.
- Trending TikTok content styles: duet challenges, "POV" format, trending sound usage, recipe reveals.
- Storytelling arc for food content: Problem (hungry) → Solution (discover Krench) → Resolution (satisfied).`,

  caption: `
CAPTION CONTEXT:
- Effective TikTok captions are short (1–2 lines) with a clear hook or CTA.
- Use emojis strategically — 1–3 per caption, relevant to the food/emotion.
- CTAs that work: "Tag a friend who needs this 👇", "Comment your order below 🍗", "Save this for your next craving".
- Indonesian captions often mix Bahasa Indonesia and English (Bahasa Gaul/campur) for relatability.
- Always end with a question or call-to-action to boost comment engagement.`,

  idea: `
CONTENT IDEA CONTEXT:
- High-performing Krench Chicken video ideas: unboxing new menu items, staff "day in the life", customer testimonials, ASMR crunch videos, before/after cooking transformation, ingredient spotlights.
- Trending TikTok formats to leverage: "Things at Krench Chicken that hit different", "POV: You just discovered Krench", recipe tutorials, price reveal videos.
- Seasonal ideas: Ramadan/Lebaran specials, Independence Day (Aug 17) promos, school holiday content.`,

  music: `
MUSIC & AUDIO CONTEXT:
- Use trending TikTok sounds for higher reach — check the TikTok Creative Center for Indonesia trends.
- Original audio (ASMR crunch, cooking sounds) works well for food content.
- Background music: upbeat, energetic tracks for promo videos; chill/lo-fi for aesthetic content.
- Always use royalty-free or TikTok's licensed music to avoid muted videos.`,

  analytics: `
ANALYTICS CONTEXT:
- Key TikTok metrics to track: views, likes, shares, comments, watch time %, profile visits, follower growth.
- Good engagement rate for food brands: 5–10% (likes+comments / views).
- Videos with >50% average watch time are pushed by the algorithm.
- Best indicator of viral potential: high share-to-view ratio.`,

  tiktok: `
TIKTOK PLATFORM CONTEXT:
- TikTok videos: 15s–3min. Best performing: 21–34 seconds for food content.
- Vertical 9:16 format required. Use full screen — no letterboxing.
- First 1–3 seconds are critical: hook the viewer immediately with movement, text overlay, or sound.
- Captions/text overlays significantly increase accessibility and watch time.
- Posting consistently builds algorithmic trust — aim for same time slots daily.`,

  crisis: `
CRISIS/COMPLAINT CONTEXT:
- Respond to complaints within 2 hours on TikTok to show professionalism.
- Use empathetic language: "Terima kasih sudah memberikan masukan..."
- Always take the conversation to DMs for resolution, avoid public arguments.
- Common complaints: food quality, delivery time, pricing — have template responses ready.`,
};

// ── Keyword detection → load relevant context ────────────────────
function buildDynamicContext(userMessages, inputLength) {
  const allText = userMessages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  const matched = [];

  // Always include base hashtag + schedule for calendar context
  if (/hashtag|tag|#/.test(allText))              matched.push(CONTEXT_DB.hashtag);
  if (/schedule|jadwal|waktu|posting time|jam/.test(allText)) matched.push(CONTEXT_DB.schedule);
  if (/content|konten|video|post/.test(allText))  matched.push(CONTEXT_DB.content);
  if (/caption|keterangan|teks|copy/.test(allText)) matched.push(CONTEXT_DB.caption);
  if (/idea|ide|saran|suggest|kreasi/.test(allText)) matched.push(CONTEXT_DB.idea);
  if (/music|lagu|audio|sound|musik/.test(allText)) matched.push(CONTEXT_DB.music);
  if (/analytic|metric|data|insight|statistik|view|like/.test(allText)) matched.push(CONTEXT_DB.analytics);
  if (/tiktok|platform|algorithm|algortima/.test(allText)) matched.push(CONTEXT_DB.tiktok);
  if (/complaint|complain|keluhan|negatif|bad|buruk/.test(allText)) matched.push(CONTEXT_DB.crisis);

  // If input is longer (more context needed), always add content + idea context
  if (inputLength > 80 && !matched.includes(CONTEXT_DB.content))  matched.push(CONTEXT_DB.content);
  if (inputLength > 120 && !matched.includes(CONTEXT_DB.idea))     matched.push(CONTEXT_DB.idea);

  // If no specific context matched, provide a general TikTok + content fallback
  if (matched.length === 0) {
    matched.push(CONTEXT_DB.content);
    matched.push(CONTEXT_DB.tiktok);
  }

  return matched.join('\n');
}

// ── POST /api/chatbot/message ────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return error(res, { message: 'messages array is required', statusCode: 400 });
    }

    const client = getOpenAI();

    // ── Stub response when OpenAI package / key is not available ──
    if (!client || !process.env.OPENAI_API_KEY) {
      return success(res, {
        message: 'Chat response generated',
        data: {
          reply: 'AI Assistant is not yet configured. Please check back later.',
          role:  'assistant',
          model: 'stub',
          usage: null,
        },
      });
    }

    // Last user message length drives context depth
    const lastUserMsg  = [...messages].reverse().find(m => m.role === 'user');
    const inputLength  = lastUserMsg?.content?.length || 0;
    const dynamicCtx   = buildDynamicContext(messages, inputLength);

    const systemPrompt = `${BASE_SYSTEM}\n\n${dynamicCtx}\n\nKeep responses concise but thorough. Use bullet points or numbered lists where helpful. Max 300 words per response unless the user asks for a detailed explanation.`;

    const response = await client.chat.completions.create({
      model:       process.env.OPENAI_MODEL || 'gpt-4o',
      max_tokens:  600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // Keep last 10 messages for context window
      ],
    });

    const reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return success(res, {
      message: 'Chat response generated',
      data: {
        reply,
        role:  'assistant',
        model: response.model,
        usage: response.usage,
      },
    });
  } catch (err) {
    logger.error('[chatbotController.sendMessage]', err);

    if (err?.status === 401) {
      return error(res, { message: 'OpenAI API key not configured. Please check server settings.', statusCode: 503 });
    }
    if (err?.status === 429) {
      return error(res, { message: 'AI service is temporarily rate-limited. Please try again in a moment.', statusCode: 429 });
    }

    return error(res, { message: 'Failed to generate AI response', statusCode: 500 });
  }
};

module.exports = { sendMessage };
