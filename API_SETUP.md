# RUGBY LIVE — API-Sports Rugby setup

Rugby Live uses a Cloudflare Worker as a private proxy. The API-Sports key must stay in Cloudflare as a Worker secret; never add it to this repository or the website.

## Cloudflare Worker

The deployed Worker URL configured in `api.js` is:

`https://rugby-live.whetton-oscar.workers.dev`

In Cloudflare → Workers & Pages → your Worker → Settings → Variables and Secrets, create a secret:

- Name: `API_KEY`
- Value: your API-Sports Rugby key

Save/deploy the Worker after adding the secret.

## Website connection

The website calls the Worker at `/api?endpoint=games&date=YYYY-MM-DD&timezone=Europe/London`. The browser never receives or stores the API key.

## Troubleshooting

- If the site reports that `API_KEY` is not configured, check the Worker secret name and redeploy.
- If API-Sports returns an authentication or subscription error, check that the key is active and the Rugby API plan is enabled.
- If no games are shown, the provider may not have fixtures or live coverage for that date/competition.
- The dashboard currently displays provider-returned games and fixtures. Player statistics and standings are not yet integrated.

Provider dashboard: https://dashboard.api-football.com/
Rugby API documentation: https://api-sports.io/documentation/rugby/v1
