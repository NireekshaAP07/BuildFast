# BrandBloom AI

BrandBloom is the existing static HTML frontend served by a small Next.js Pages Router backend. The original UI and styles remain in `index.html`.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add your Gemini API key to `.env.local`:

```dotenv
GEMINI_API_KEY=your_key_here
```

The key is read by server-side API routes only. `GEMINI_MODEL` is optional; the default is `gemini-2.5-flash`.

## Run

```bash
npm run dev
```

Open http://localhost:3000. For production, run `npm run build` and `npm start`.

## API

- `POST /api/generate-campaign` accepts `businessName`, `businessType`, `productService`, `targetAudience` (array), `location`, `campaignGoal`, and `brandTone`. It returns structured campaign content and saves the campaign.
- `POST /api/regenerate-content` accepts `platform` (`instagram`, `linkedin`, `x`, or `instagramStory`), `businessContext`, `currentContent`, and optional `instruction`.
- `GET /api/reports` lists saved campaigns. `POST /api/reports` saves or updates one.
- `GET /api/reports/[id]` retrieves one campaign.

Campaign history is stored in `data/campaigns.json` for this local MVP. This file is git-ignored. File storage is suitable for local demos; use a persistent database or volume before deploying to an environment with ephemeral or read-only filesystems.

## Try campaign generation

```bash
curl -X POST http://localhost:3000/api/generate-campaign \
  -H 'Content-Type: application/json' \
  -d '{"businessName":"Brew & Bean","businessType":"Cafe & Restaurant","productService":"Hazelnut Cold Coffee","targetAudience":["Students","Young Professionals"],"location":"Bengaluru","campaignGoal":"Product Promotion","brandTone":"Cozy"}'
```

`npm test` runs Node's test runner. No automated test files existed when this backend was added!
