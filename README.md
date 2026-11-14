# RUGBY LIVE

A responsive rugby union dashboard for scores, fixtures, competitions, lineups and player ratings.

## Current status

The first front-end version is live in the repository as `index.html`. It includes:
- Responsive dark sports dashboard
- Search across teams, players and competitions
- Competition directory: Six Nations, Rugby World Cup, The Rugby Championship, Premiership Rugby, URC, Top 14, Super Rugby Pacific and Investec Champions Cup
- Match centre, fixture cards and example league tables
- Example starting XV and player ratings
- Separate labels for official and calculated rating types
- Explanations for connecting a real rugby data provider

**Important:** Scores, fixtures, tables and ratings currently displayed are illustrative demo content. They are not live data and should not be treated as real match results or official ratings.

## GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`, then save.
4. GitHub will publish the site at:

   https://stantheman1506.github.io/rugby-live/

It may take a few minutes for the first deployment.

## Adding genuine live data

GitHub Pages is static hosting. A live rugby feed requires a separate data provider and a secure API proxy.

1. Choose a rugby union provider with coverage for the required competitions.
2. Confirm licensing and availability for live scores, fixtures, lineups, player statistics and official ratings.
3. Keep the provider API key in a server-side secret (for example, a Cloudflare Worker), never in this public repository.
4. Configure the site to call the proxy and map the returned data into the dashboard.
5. Label provider-supplied ratings as official only when the provider explicitly identifies them as such. Keep calculated ratings clearly separate and publish the calculation method.

## Development

The site is a static HTML/CSS/JavaScript project. Open `index.html` in a browser to preview it locally. No build step is required.
