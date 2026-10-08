import { GoogleGenAI } from '@google/genai';

export function buildImageUrl({ prompt, businessName, productService, brandTone, platform, seed }) {
  const contextText = [businessName, productService, brandTone].filter(Boolean).join(', ');
  const base = prompt || `${contextText} promotional aesthetic photography`;
  const clean = encodeURIComponent(`${base.trim()}, professional photography, aesthetic composition, studio lighting, high resolution, 4k`);
  const dims = {
    instagram: 'width=800&height=800',
    linkedin: 'width=1200&height=675',
    x: 'width=1200&height=675',
    instagramStory: 'width=720&height=1280'
  }[platform] || 'width=800&height=600';
  const s = seed || Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${clean}?${dims}&nologo=true&seed=${s}`;
}

export const campaignSchema = {
  type: 'OBJECT',
  properties: {
    campaignTitle: { type: 'STRING' },
    campaignConcept: { type: 'STRING' },
    instagram: {
      type: 'OBJECT',
      properties: {
        caption: { type: 'STRING' },
        hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
        imagePrompt: { type: 'STRING', description: 'Detailed prompt for an aesthetic visual for Instagram' }
      },
      required: ['caption', 'hashtags']
    },
    linkedin: {
      type: 'OBJECT',
      properties: {
        post: { type: 'STRING' },
        imagePrompt: { type: 'STRING', description: 'Detailed prompt for a professional visual for LinkedIn' }
      },
      required: ['post']
    },
    x: {
      type: 'OBJECT',
      properties: {
        post: { type: 'STRING' },
        imagePrompt: { type: 'STRING', description: 'Detailed prompt for an eye-catching visual for X' }
      },
      required: ['post']
    },
    instagramStory: {
      type: 'OBJECT',
      properties: {
        slides: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { slideNumber: { type: 'INTEGER' }, text: { type: 'STRING' } },
            required: ['slideNumber', 'text']
          }
        },
        imagePrompt: { type: 'STRING', description: 'Detailed prompt for a vertical visual for Instagram Story' }
      },
      required: ['slides']
    }
  },
  required: ['campaignTitle', 'campaignConcept', 'instagram', 'linkedin', 'x', 'instagramStory']
};

const systemInstruction = `You are BrandBloom, a professional social media content strategist. Create one coherent campaign idea adapted to Instagram, LinkedIn, X, and Instagram Stories. Understand the supplied business, audience, goal, and tone. Keep all supplied factual details consistent. Never invent prices, offers, addresses, phone numbers, opening hours, claims, awards, or statistics. For each platform, provide a detailed "imagePrompt" describing an aesthetic promotional photograph fitting the brand tone. Instagram needs a natural caption, CTA when appropriate, and relevant non-stuffed hashtags. LinkedIn should be informative and business-suitable while keeping the chosen tone. X should be concise, conversational, and distinct from the Instagram caption. Stories must contain 3–5 connected short slides with one clear message each and a final CTA when appropriate. Write naturally and never mention AI.`;

export function validateCampaign(campaign) {
  return Boolean(campaign && typeof campaign.campaignTitle === 'string' && campaign.campaignTitle.trim() && typeof campaign.campaignConcept === 'string' && campaign.instagram && typeof campaign.instagram.caption === 'string' && Array.isArray(campaign.instagram.hashtags) && campaign.linkedin && typeof campaign.linkedin.post === 'string' && campaign.x && typeof campaign.x.post === 'string' && Array.isArray(campaign.instagramStory?.slides) && campaign.instagramStory.slides.length >= 3 && campaign.instagramStory.slides.length <= 5 && campaign.instagramStory.slides.every((slide, index) => Number.isInteger(slide.slideNumber) && typeof slide.text === 'string' && slide.slideNumber === index + 1));
}

async function callGeminiWithFallback(ai, contents, responseSchema) {
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    : ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const uniqueModels = [...new Set(models)];
  let lastError;

  for (const model of uniqueModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { responseMimeType: 'application/json', responseSchema, httpOptions: { timeout: 35000 } }
        });
        if (response?.text?.trim()) return response.text;
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        if (isTransient && attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

export async function generateCampaign(brief) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Campaign generation is not configured. Add GEMINI_API_KEY to the server environment.');
    error.status = 503;
    throw error;
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const rawText = await callGeminiWithFallback(
    ai,
    `${systemInstruction}\n\nCreate the campaign from this brief:\n${JSON.stringify(brief)}`,
    campaignSchema
  );
  if (!rawText?.trim()) throw new Error('Gemini returned an empty campaign. Please try again.');
  let campaign;
  try { campaign = JSON.parse(rawText); }
  catch { throw new Error('Gemini returned invalid campaign data. Please try again.'); }
  if (!validateCampaign(campaign)) throw new Error('Gemini returned incomplete campaign data. Please try again.');
  ['instagram', 'linkedin', 'x', 'instagramStory'].forEach(p => {
    if (campaign[p]) {
      campaign[p].imageUrl = buildImageUrl({
        prompt: campaign[p].imagePrompt,
        businessName: brief.businessName,
        productService: brief.productService,
        brandTone: brief.brandTone,
        platform: p
      });
    }
  });
  return campaign;
}

export const platformSchema = {
  instagram: campaignSchema.properties.instagram,
  linkedin: campaignSchema.properties.linkedin,
  x: campaignSchema.properties.x,
  instagramStory: campaignSchema.properties.instagramStory
};

export async function regeneratePlatform({ platform, businessContext, currentContent, instruction }) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('Campaign regeneration is not configured. Add GEMINI_API_KEY to the server environment.');
    error.status = 503;
    throw error;
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const rawText = await callGeminiWithFallback(
    ai,
    `${systemInstruction}\nRegenerate ONLY the ${platform} output. Keep business facts consistent with context. Apply this instruction if provided: ${instruction || 'Create a fresh alternative in the same campaign voice.'}\nContext: ${JSON.stringify(businessContext)}\nCurrent version: ${JSON.stringify(currentContent)}`,
    platformSchema[platform]
  );
  if (!rawText?.trim()) throw new Error('Gemini returned an empty result. Please try again.');
  let content;
  try { content = JSON.parse(rawText); }
  catch { throw new Error('Gemini returned invalid content. Please try again.'); }
  const valid = platform === 'instagram' ? typeof content.caption === 'string' && Array.isArray(content.hashtags)
    : platform === 'instagramStory' ? Array.isArray(content.slides) && content.slides.length >= 3 && content.slides.length <= 5 && content.slides.every((slide, index) => Number.isInteger(slide.slideNumber) && typeof slide.text === 'string' && slide.slideNumber === index + 1)
    : typeof content.post === 'string';
  if (!valid) throw new Error('Gemini returned incomplete content. Please try again.');
  content.imageUrl = buildImageUrl({
    prompt: content.imagePrompt,
    businessName: businessContext?.businessName,
    productService: businessContext?.productService,
    brandTone: businessContext?.brandTone,
    platform,
    seed: Date.now()
  });
  return content;
}
