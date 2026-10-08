import fs from 'node:fs/promises';
import path from 'node:path';

const dataFile = path.join(process.cwd(), 'data', 'campaigns.json');

export async function getCampaigns() {
  try {
    const value = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function writeCampaigns(campaigns) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(campaigns, null, 2));
  await fs.rename(temporaryFile, dataFile);
}

export function toLegacyCampaign(record) {
  const content = record.campaign || {};
  return {
    id: record.id,
    __backendId: record.id,
    campaign_name: record.campaignTitle,
    campaignTitle: record.campaignTitle,
    campaign_concept: content.campaignConcept,
    campaignConcept: content.campaignConcept,
    business_name: record.businessName,
    businessName: record.businessName,
    business_type: record.businessType,
    businessType: record.businessType,
    product_service: record.productService,
    productService: record.productService,
    target_audience: record.targetAudience,
    targetAudience: record.targetAudience,
    location: record.location,
    campaign_goal: record.campaignGoal,
    campaignGoal: record.campaignGoal,
    brand_tone: record.brandTone,
    brandTone: record.brandTone,
    created_at: record.createdAt,
    createdAt: record.createdAt,
    instagram_content: `${content.instagram?.caption || ''}${content.instagram?.hashtags?.length ? `\n\n${content.instagram.hashtags.join(' ')}` : ''}`,
    linkedin_content: content.linkedin?.post || '',
    x_content: content.x?.post || '',
    story_content: content.instagramStory?.slides?.map(slide => `SLIDE ${slide.slideNumber}\n${slide.text}`).join('\n\n') || '',
    campaign: content,
    platforms_generated: record.platformsGenerated || ['instagram', 'linkedin', 'x', 'instagramStory'],
    platformsGenerated: record.platformsGenerated || ['instagram', 'linkedin', 'x', 'instagramStory']
  };
}
