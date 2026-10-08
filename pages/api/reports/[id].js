import { getCampaigns, toLegacyCampaign } from '../../../lib/campaigns.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  try {
    const record = (await getCampaigns()).find(item => item.id === req.query.id);
    if (!record) return res.status(404).json({ success: false, error: 'Campaign report not found.' });
    return res.status(200).json({ success: true, campaign: toLegacyCampaign(record) });
  } catch (error) {
    console.error('Report lookup failed:', error.message);
    return res.status(500).json({ success: false, error: 'Reports are temporarily unavailable.' });
  }
}
