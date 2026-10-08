import { regeneratePlatform } from '../../lib/gemini.js';

const platforms = ['instagram', 'linkedin', 'x', 'instagramStory'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  const { platform, businessContext, currentContent, instruction } = req.body || {};
  if (!platforms.includes(platform)) return res.status(400).json({ success: false, error: 'Choose instagram, linkedin, x, or instagramStory to regenerate.' });
  if (!businessContext || typeof businessContext !== 'object' || currentContent === undefined) return res.status(400).json({ success: false, error: 'Business context and the current platform content are required.' });
  try {
    const content = await regeneratePlatform({ platform, businessContext, currentContent, instruction: typeof instruction === 'string' ? instruction.slice(0, 500) : '' });
    return res.status(200).json({ success: true, platform, content });
  } catch (error) {
    console.error('Content regeneration failed:', error.message);
    const status = error.status || (error.message?.includes('timeout') ? 504 : 502);
    return res.status(status).json({ success: false, error: error.status ? error.message : error.message?.includes('empty') || error.message?.includes('invalid') || error.message?.includes('incomplete') ? error.message : 'Content regeneration failed. Please try again.' });
  }
}
