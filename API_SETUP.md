# RUGBY LIVE — real data setup

The website now includes a live-data client and a Cloudflare Worker proxy for **API-Sports Rugby**.

## 1. Get a free API key
1. Create an account at https://dashboard.api-football.com/
2. Enable/subscribe to **API-Rugby** (the provider advertises a free tier of 100 requests/day).
3. Copy your API key.

Provider details: https://api-sports.io/sports/rugby  
API documentation: https://api-sports.io/documentation/rugby/v1

## 2. Deploy the secure proxy
1. Create a free Cloudflare account and create a Worker named `rugby-live-api`.
2. Paste the contents of `worker.js` into the Worker editor and deploy it.
3. In Worker → Settings → Variables and Secrets, add a secret named `API_KEY` with your API-Sports key.
4. Save/deploy again.
5. Your Worker URL will look like `https://rugby-live-api.<your-subdomain>.workers.dev`.

Do not put the API key in `index.html`, `api.js`, GitHub Pages settings, or any public file.

## 3. Connect GitHub Pages to the Worker
Open `api.js` and change:
```js
const API_BASE = "/api";
```
to your Worker URL plus `/api`, for example:
```js
const API_BASE = "https://rugby-live-api.example.workers.dev/api";
```
Commit the change. The website will request live games and today's fixtures through the Worker.

## Data and limits
- Live scores are refreshed by the page every five minutes; the Worker caches live responses for 15 minutes to protect the free daily quota.
- Today's fixtures are cached for one hour.
- The current integration displays genuine live/today match data only when the provider returns it.
- Player ratings and league tables are deliberately not fabricated. They need provider coverage and a follow-up mapping to the dashboard.
- API coverage varies by competition and season. Check the provider's coverage page before relying on a competition.
