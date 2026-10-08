import { getCampaigns, toLegacyCampaign, writeCampaigns } from '../../../lib/campaigns.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const campaigns = (await getCampaigns()).map(toLegacyCampaign);
      return res.status(200).json({ success: true, campaigns });
    }
    if (req.method === 'POST') {
      const body = req.body;
      const businessName = body?.businessName || body?.business_name;
      const brandTone = body?.brandTone || body?.brand_tone;
      if (!body || typeof body !== 'object' || !businessName || !brandTone) return res.status(400).json({ success: false, error: 'Campaign details are required to save a report.' });
      const records = await getCampaigns();
      const id = body.id || body.__backendId || crypto.randomUUID();
      const index = records.findIndex(record => record.id === id);
      const existing = index >= 0 ? records[index] : null;
      const targetAudienceRaw = body.targetAudience ?? body.target_audience ?? existing?.targetAudience;
      const targetAudience = Array.isArray(targetAudienceRaw) ? targetAudienceRaw : String(targetAudienceRaw || '').split(',').map(item => item.trim()).filter(Boolean);
      const record = {
        id,
        campaignTitle: body.campaignTitle || body.campaign_name || existing?.campaignTitle || `${businessName} Campaign`,
        businessName,
        businessType: body.businessType || body.business_type || existing?.businessType || '',
        productService: body.productService || body.product_service || existing?.productService || '',
        targetAudience,
        location: body.location || existing?.location || '',
        campaignGoal: body.campaignGoal || body.campaign_goal || existing?.campaignGoal || '',
        brandTone,
        createdAt: body.createdAt || body.created_at || existing?.createdAt || new Date().toISOString(),
        campaign: body.campaign || existing?.campaign || {
          campaignTitle: body.campaignTitle || body.campaign_name || `${businessName} Campaign`,
          campaignConcept: body.campaignConcept || body.campaign_concept || '',
          instagram: { caption: body.instagramContent || body.instagram_content || '', hashtags: [] },
          linkedin: { post: body.linkedinContent || body.linkedin_content || '' },
          x: { post: body.xContent || body.x_content || '' },
          instagramStory: { slides: String(body.storyContent || body.story_content || '').split(/\n\n/).filter(Boolean).map((text, i) => ({ slideNumber: i + 1, text: text.replace(/^SLIDE \d+\n/, '') })) }
        },
        platformsGenerated: body.platformsGenerated || body.platforms_generated || existing?.platformsGenerated || ['instagram', 'linkedin', 'x', 'instagramStory']
      };
      const igContent = body.instagramContent ?? body.instagram_content;
      if (igContent !== undefined) {
        const tagLine = String(igContent).match(/(?:^|\n)(#[\p{L}\p{N}_]+(?:\s+#[\p{L}\p{N}_]+)*)\s*$/u)?.[1] || '';
        const caption = tagLine ? String(igContent).slice(0, String(igContent).lastIndexOf(tagLine)).trimEnd() : String(igContent);
        record.campaign.instagram = { caption, hashtags: tagLine ? tagLine.match(/#[\p{L}\p{N}_]+/gu) : [] };
      }
      const liContent = body.linkedinContent ?? body.linkedin_content;
      if (liContent !== undefined) record.campaign.linkedin = { post: String(liContent) };
      const xContent = body.xContent ?? body.x_content;
      if (xContent !== undefined) record.campaign.x = { post: String(xContent) };
      const storyContent = body.storyContent ?? body.story_content;
      if (storyContent !== undefined) {
        record.campaign.instagramStory = { slides: String(storyContent).split(/\n\n/).filter(Boolean).map((text, i) => ({ slideNumber: i + 1, text: text.replace(/^SLIDE \d+\n/, '') })) };
      }
      if (index >= 0) records[index] = record; else records.unshift(record);
      await writeCampaigns(records);
      return res.status(200).json({ success: true, campaign: toLegacyCampaign(record) });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  } catch (error) {
    console.error('Reports request failed:', error.message);
    return res.status(500).json({ success: false, error: 'Reports are temporarily unavailable.' });
  }
}
