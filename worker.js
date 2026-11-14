/**
 * RUGBY LIVE — Cloudflare Worker API proxy
 * Set API_KEY as a Worker secret. Never put it in the website.
 */
const API_BASE = "https://v1.rugby.api-sports.io";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (url.pathname !== "/api") return new Response("RUGBY LIVE API proxy", { status: 200 });
    if (!env.API_KEY) return json({ error: "API_KEY secret is not configured in the Cloudflare Worker." }, 503);

    const endpoint = url.searchParams.get("endpoint") || "games";
    const allowed = new Set(["games", "leagues", "standings", "teams", "players"]);
    if (!allowed.has(endpoint)) return json({ error: "Endpoint not allowed." }, 400);

    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint" && /^[a-zA-Z0-9_]+$/.test(key)) params.set(key, value);
    }
    const upstream = new URL(API_BASE + "/" + endpoint);
    upstream.search = params.toString();

    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(upstream.toString(), {
        headers: { "x-apisports-key": env.API_KEY, "accept": "application/json" }
      });
      const body = await response.text();
      const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=60"
      });
      for (const h of ["x-ratelimit-requests-limit", "x-ratelimit-requests-remaining"]) {
        const value = response.headers.get(h);
        if (value) headers.set(h, value);
      }
      const result = new Response(body, { status: response.status, headers });
      if (response.ok) {
        const ttl = endpoint === "games" && params.has("live") ? 900 : 3600;
        result.headers.set("cache-control", "public, max-age=" + ttl);
        ctx.waitUntil(cache.put(cacheKey, result.clone()));
      }
      return result;
    } catch (error) {
      return json({ error: "Could not reach API-Sports.", detail: String(error) }, 502);
    }
  }
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}
