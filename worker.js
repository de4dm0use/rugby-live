/**
 * RUGBY LIVE — Cloudflare Worker API proxy
 * Configure API_KEY as a Worker secret. Never put it in the website.
 */
const API_BASE = "https://v1.rugby.api-sports.io";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type",
  "content-type": "application/json; charset=utf-8"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    // Simple diagnostics: this confirms deployment and secret binding without
    // returning the secret itself.
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        worker: "RUGBY LIVE API proxy",
        apiKeyConfigured: Boolean(env.API_KEY),
        message: env.API_KEY ? "Worker is ready to contact API-Sports." : "Add API_KEY under Worker Settings > Variables and Secrets."
      });
    }

    if (url.pathname !== "/api") return json({ error: "Route not found. Use /api?endpoint=games&date=YYYY-MM-DD" }, 404);
    if (!env.API_KEY) return json({ error: "API_KEY secret is not configured in this deployed Worker." }, 503);

    const endpoint = url.searchParams.get("endpoint") || "games";
    const allowed = new Set(["games", "leagues", "standings", "teams", "players"]);
    if (!allowed.has(endpoint)) return json({ error: "Endpoint not allowed." }, 400);

    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint" && /^[a-zA-Z0-9_]+$/.test(key)) params.set(key, value);
    }

    const upstream = new URL(API_BASE + "/" + endpoint);
    upstream.search = params.toString();

    // Cache API is best-effort: on some workers.dev configurations it may
    // not be available. A cache failure must never prevent the API request.
    let cache = null;
    let cacheKey = null;
    try {
      cache = caches.default;
      cacheKey = new Request(url.toString(), { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch (_) {
      cache = null;
      cacheKey = null;
    }

    try {
      const response = await fetch(upstream.toString(), {
        method: "GET",
        headers: { "x-apisports-key": env.API_KEY, "accept": "application/json" }
      });
      const body = await response.text();
      const headers = new Headers(CORS);
      headers.set("cache-control", "no-store");
      for (const h of [
        "x-ratelimit-requests-limit",
        "x-ratelimit-requests-remaining",
        "x-ratelimit-limit",
        "x-ratelimit-remaining"
      ]) {
        const value = response.headers.get(h);
        if (value) headers.set(h, value);
      }
      const result = new Response(body, { status: response.status, headers });

      if (response.ok && cache && cacheKey) {
        try {
          result.headers.set("cache-control", "public, max-age=300");
          ctx.waitUntil(cache.put(cacheKey, result.clone()).catch(() => {}));
        } catch (_) {
          // Continue normally if edge caching is unavailable.
        }
      }
      return result;
    } catch (error) {
      return json({ error: "Could not reach API-Sports.", detail: String(error) }, 502);
    }
  }
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: CORS });
}
