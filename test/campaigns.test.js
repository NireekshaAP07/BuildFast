import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCampaign, campaignSchema, platformSchema } from '../lib/gemini.js';
import { toLegacyCampaign, getCampaigns, writeCampaigns } from '../lib/campaigns.js';
import generateHandler from '../pages/api/generate-campaign.js';
import regenerateHandler from '../pages/api/regenerate-content.js';
import reportsHandler from '../pages/api/reports/index.js';
import reportByIdHandler from '../pages/api/reports/[id].js';

test('validateCampaign accepts valid campaign data', () => {
  const valid = {
    campaignTitle: 'Brew & Bean Winter Warmth',
    campaignConcept: 'Cozy coffee moments for busy students and young professionals',
    instagram: {
      caption: 'Meet your new winter favorite.',
      hashtags: ['#BrewAndBean', '#CoffeeLovers']
    },
    linkedin: {
      post: 'How intentional craft elevates everyday work routines at Brew & Bean.'
    },
    x: {
      post: 'Cold morning, warm brew. Hazelnut Cold Coffee is waiting.'
    },
    instagramStory: {
      slides: [
        { slideNumber: 1, text: 'Need a focus boost today?' },
        { slideNumber: 2, text: 'Freshly roasted cold coffee with hazelnut.' },
        { slideNumber: 3, text: 'Drop by Brew & Bean.' }
      ]
    }
  };
  assert.equal(validateCampaign(valid), true);
});

test('validateCampaign rejects incomplete or malformed campaigns', () => {
  assert.equal(validateCampaign(null), false);
  assert.equal(validateCampaign({}), false);
  assert.equal(validateCampaign({ campaignTitle: '' }), false);
  // Missing linkedin
  assert.equal(validateCampaign({
    campaignTitle: 'Title',
    campaignConcept: 'Concept',
    instagram: { caption: 'Hi', hashtags: [] },
    x: { post: 'Post' },
    instagramStory: { slides: [{ slideNumber: 1, text: '1' }, { slideNumber: 2, text: '2' }, { slideNumber: 3, text: '3' }] }
  }), false);
  // Too few slides (less than 3)
  assert.equal(validateCampaign({
    campaignTitle: 'Title',
    campaignConcept: 'Concept',
    instagram: { caption: 'Hi', hashtags: [] },
    linkedin: { post: 'LinkedIn' },
    x: { post: 'Post' },
    instagramStory: { slides: [{ slideNumber: 1, text: '1' }] }
  }), false);
});

test('toLegacyCampaign provides both snake_case and camelCase field compatibility', () => {
  const record = {
    id: 'test-123',
    campaignTitle: 'Brew & Bean Cozy',
    businessName: 'Brew & Bean',
    businessType: 'Cafe & Restaurant',
    productService: 'Hazelnut Cold Coffee',
    targetAudience: ['Students', 'Young Professionals'],
    location: 'Bengaluru',
    campaignGoal: 'Product Promotion',
    brandTone: 'Cozy',
    createdAt: '2026-09-27T00:00:00.000Z',
    campaign: {
      campaignTitle: 'Brew & Bean Cozy',
      campaignConcept: 'A comforting cup',
      instagram: { caption: 'Sip and relax', hashtags: ['#Coffee'] },
      linkedin: { post: 'Professional craft' },
      x: { post: 'Short and sweet' },
      instagramStory: {
        slides: [
          { slideNumber: 1, text: 'Slide 1' },
          { slideNumber: 2, text: 'Slide 2' },
          { slideNumber: 3, text: 'Slide 3' }
        ]
      }
    },
    platformsGenerated: ['instagram', 'linkedin', 'x', 'instagramStory']
  };

  const legacy = toLegacyCampaign(record);
  assert.equal(legacy.id, 'test-123');
  assert.equal(legacy.campaign_name, 'Brew & Bean Cozy');
  assert.equal(legacy.campaignTitle, 'Brew & Bean Cozy');
  assert.equal(legacy.business_name, 'Brew & Bean');
  assert.equal(legacy.businessName, 'Brew & Bean');
  assert.equal(legacy.instagram_content, 'Sip and relax\n\n#Coffee');
  assert.equal(legacy.linkedin_content, 'Professional craft');
  assert.equal(legacy.x_content, 'Short and sweet');
  assert.match(legacy.story_content, /SLIDE 1\nSlide 1/);
  assert.deepEqual(legacy.platformsGenerated, ['instagram', 'linkedin', 'x', 'instagramStory']);
});

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

test('generate-campaign API rejects non-POST and invalid body', async () => {
  const getRes = mockRes();
  await generateHandler({ method: 'GET' }, getRes);
  assert.equal(getRes.statusCode, 405);
  assert.equal(getRes.data.success, false);

  const emptyRes = mockRes();
  await generateHandler({ method: 'POST', body: {} }, emptyRes);
  assert.equal(emptyRes.statusCode, 400);
  assert.equal(emptyRes.data.success, false);
});

test('regenerate-content API validates unsupported platform and missing fields', async () => {
  const wrongPlatformRes = mockRes();
  await regenerateHandler({ method: 'POST', body: { platform: 'tiktok' } }, wrongPlatformRes);
  assert.equal(wrongPlatformRes.statusCode, 400);

  const missingContextRes = mockRes();
  await regenerateHandler({ method: 'POST', body: { platform: 'instagram' } }, missingContextRes);
  assert.equal(missingContextRes.statusCode, 400);
});

test('reports API handles GET and POST saving and retrieving records', async () => {
  const postRes = mockRes();
  const testId = `test-report-${Date.now()}`;
  await reportsHandler({
    method: 'POST',
    body: {
      id: testId,
      businessName: 'Test Cafe',
      brandTone: 'Friendly',
      campaignTitle: 'Test Campaign'
    }
  }, postRes);
  assert.equal(postRes.statusCode, 200);
  assert.equal(postRes.data.success, true);
  assert.equal(postRes.data.campaign.id, testId);

  const getRes = mockRes();
  await reportsHandler({ method: 'GET' }, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.data.success, true);
  const found = getRes.data.campaigns.find(c => c.id === testId);
  assert.ok(found);

  const getSingleRes = mockRes();
  await reportByIdHandler({ method: 'GET', query: { id: testId } }, getSingleRes);
  assert.equal(getSingleRes.statusCode, 200);
  assert.equal(getSingleRes.data.campaign.businessName, 'Test Cafe');

  const notFoundRes = mockRes();
  await reportByIdHandler({ method: 'GET', query: { id: 'non-existent-id' } }, notFoundRes);
  assert.equal(notFoundRes.statusCode, 404);
});
