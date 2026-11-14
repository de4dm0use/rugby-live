/* RUGBY LIVE real-data client. Requires the Cloudflare Worker in README.md. */
(() => {
  const API_BASE = "/api"; // Change to your deployed Worker URL if it is on another domain.
  const $ = (s) => document.querySelector(s);
  let liveMatches = [];
  let todayMatches = [];
  let apiReady = false;

  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const dateKey = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());

  async function getGames(params) {
    const q = new URLSearchParams({ endpoint: "games", ...params });
    const r = await fetch(API_BASE + "?" + q.toString(), { cache: "no-store" });
    const data = await r.json();
    if (!r.ok || data.errors && Object.keys(data.errors).length) {
      throw new Error(JSON.stringify(data.errors || data.message || data.error || r.status));
    }
    return Array.isArray(data.response) ? data.response : [];
  }

  function statusOf(g) {
    return g.status?.long || g.status?.short || "Scheduled";
  }
  function scoreOf(g) {
    const h = g.scores?.home, a = g.scores?.away;
    return h == null || a == null ? "— : —" : h + " — " + a;
  }
  function matchCard(g) {
    const live = ["1H","2H","HT","ET","P","LIVE"].includes(String(g.status?.short || "").toUpperCase());
    const clock = g.status?.elapsed != null ? " · " + g.status.elapsed + "'" : "";
    const league = g.league?.name || "Rugby";
    const home = g.teams?.home?.name || "Home";
    const away = g.teams?.away?.name || "Away";
    const date = g.date ? new Date(g.date).toLocaleString("en-GB", {
      day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/London"
    }) : "";
    return '<article class="match"><div class="meta"><b>' + safe(league) + '</b><span>' +
      (live ? '<span style="color:var(--red)">● LIVE</span>' : safe(statusOf(g))) +
      safe(clock) + '</span></div><div class="teams"><div class="team">' +
      safe(home) + '</div><div class="score">' + safe(scoreOf(g)) +
      '</div><div class="team">' + safe(away) + '</div></div><div class="foot"><span>' +
      safe(g.venue?.name || "") + '</span><span>' + safe(date) + '</span></div></article>';
  }
  function renderReal() {
    const q = ($("#search")?.value || "").toLowerCase();
    const selected = $("#filter")?.value || "all";
    const all = [...liveMatches, ...todayMatches.filter(x => !liveMatches.some(y => y.id === x.id))];
    const filtered = all.filter(g => {
      const text = [g.league?.name, g.teams?.home?.name, g.teams?.away?.name].join(" ").toLowerCase();
      return (!q || text.includes(q)) && (selected === "all" || g.league?.name === selected);
    });
    $("#matches").innerHTML = filtered.length
      ? filtered.map(matchCard).join("")
      : '<p class="muted">No live or scheduled matches found for today. Try again later.</p>';

    const upcoming = todayMatches.filter(g => !liveMatches.some(x => x.id === g.id));
    $("#fixtures").innerHTML = upcoming.length
      ? upcoming.slice(0, 12).map(g => '<div class="fixture">' + matchCard(g) + '</div>').join("")
      : '<div class="fixture"><small>No further fixtures returned for today.</small></div>';

    const badge = document.querySelector(".demo");
    if (badge) {
      badge.textContent = apiReady ? "● LIVE API DATA" : "● API UNAVAILABLE";
      badge.style.color = apiReady ? "var(--green)" : "var(--amber)";
    }
    const notice = document.querySelector(".notice");
    if (notice) notice.innerHTML = apiReady
      ? "<b>Live data connected.</b> Scores and fixtures are supplied by API-Sports Rugby. Coverage and update frequency depend on the provider and competition. Player ratings remain unavailable until a verified player-statistics feed is connected."
      : "<b>Live data not connected.</b> " + safe(window.RUGBY_API_ERROR || "Check your Cloudflare Worker URL and API_KEY secret.") + " Demo scores are not being presented as real results.";
  }

  async function refresh() {
    try {
      const [live, today] = await Promise.all([
        getGames({ live: "all" }),
        getGames({ date: dateKey() })
      ]);
      liveMatches = live;
      todayMatches = today;
      apiReady = true;
      window.RUGBY_API_ERROR = "";
    } catch (e) {
      apiReady = false;
      window.RUGBY_API_ERROR = e.message;
    }
    renderReal();
  }

  // Remove the hard-coded example match/player/table content immediately.
  $("#matches").innerHTML = '<p class="muted">Connecting to rugby data…</p>';
  $("#playerRows").innerHTML = '<p class="muted">Player ratings need a separate verified statistics feed. No sample ratings are shown.</p>';
  $("#tableRows").innerHTML = '<tr><td colspan="5">Live standings will appear when a competition is selected and mapped.</td></tr>';
  $("#fixtures").innerHTML = '<div class="fixture"><small>Loading genuine fixtures…</small></div>';
  $("#search")?.addEventListener("input", renderReal);
  $("#filter")?.addEventListener("change", renderReal);
  refresh();
  setInterval(refresh, 5 * 60 * 1000);
})();
