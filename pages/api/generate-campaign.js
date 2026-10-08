import { generateCampaign } from '../../lib/gemini.js';
import { getCampaigns, toLegacyCampaign, writeCampaigns } from '../../lib/campaigns.js';

const required = ['businessName', 'businessType', 'productService', 'campaignGoal', 'brandTone'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ success: false, error: 'Send campaign details as a JSON object.' });
    const missing = required.filter(key => typeof body[key] !== 'string' || !body[key].trim());
    if (missing.length || !Array.isArray(body.targetAudience) || body.targetAudience.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide business name, business type, product or service, at least one target audience, campaign goal, and brand tone.' });
    }
    const brief = {
      businessName: body.businessName.trim(), businessType: body.businessType.trim(), productService: body.productService.trim(),
      targetAudience: body.targetAudience.map(value => String(value).trim()).filter(Boolean), location: typeof body.location === 'string' ? body.location.trim() : '',
      campaignGoal: body.campaignGoal.trim(), brandTone: body.brandTone.trim()
    };
    const campaign = await generateCampaign(brief);
    const record = {
      id: crypto.randomUUID(), campaignTitle: campaign.campaignTitle, businessName: brief.businessName,
      businessType: brief.businessType, productService: brief.productService, targetAudience: brief.targetAudience,
      location: brief.location, campaignGoal: brief.campaignGoal, brandTone: brief.brandTone,
      createdAt: new Date().toISOString(), campaign, platformsGenerated: ['instagram', 'linkedin', 'x', 'instagramStory']
    };
    const records = await getCampaigns();
    records.unshift(record);
    await writeCampaigns(records);
    return res.status(200).json({ success: true, campaign, savedCampaign: toLegacyCampaign(record) });
  } catch (error) {
    console.error('Campaign generation failed:', error.message);
    const status = error.status || (error.message?.includes('timeout') ? 504 : 502);
    return res.status(status).json({ success: false, error: error.status ? error.message : error.message?.includes('empty') || error.message?.includes('invalid') || error.message?.includes('incomplete') ? error.message : 'Campaign generation failed. Please try again.' });
  }
}
