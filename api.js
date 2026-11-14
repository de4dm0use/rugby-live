/* RUGBY LIVE — API-Sports Rugby via private Cloudflare Worker. */
(() => {
  const API_BASE = "https://rugby-live.whetton-oscar.workers.dev/api";
  const $ = (s) => document.querySelector(s);
  let liveMatches = [];
  let todayMatches = [];
  let apiReady = false;
  let busy = false;

  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const dateKey = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return p.year + "-" + p.month + "-" + p.day;
  };
  async function getGames(params) {
    const q = new URLSearchParams({ endpoint: "games", ...params });
    const r = await fetch(API_BASE + "?" + q.toString(), {
      method: "GET",
      headers: { "accept": "application/json" },
      cache: "no-store"
    });
    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      const type = r.headers.get("content-type") || "unknown content type";
      const preview = raw.slice(0, 220).replace(/\\s+/g, " ").trim();
      throw new Error("HTTP " + r.status + " from Worker; " + type + "; response: " + (preview || "[empty body]"));
    }
    if (!r.ok || (data.errors && Object.keys(data.errors).length) || data.error) {
      throw new Error("HTTP " + r.status + ": " + JSON.stringify(data.errors || data.error || data.message || data));
    }
    return Array.isArray(data.response) ? data.response : [];
  }

  function statusOf(g) { return g.status?.long || g.status?.short || "Scheduled"; }
  function scoreOf(g) {
    const h = g.scores?.home, a = g.scores?.away;
    return h == null || a == null ? "— : —" : h + " — " + a;
  }
  function matchCard(g) {
    const live = ["1H","2H","HT","ET","BT","PT","P","LIVE"].includes(String(g.status?.short || "").toUpperCase());
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
      : '<p class="muted">No live or scheduled matches found for today.</p>';
    const upcoming = todayMatches.filter(g => !liveMatches.some(x => x.id === g.id));
    $("#fixtures").innerHTML = upcoming.length
      ? upcoming.slice(0, 12).map(g => '<div class="fixture">' + matchCard(g) + '</div>').join("")
      : '<div class="fixture"><small>No further fixtures returned for today.</small></div>';
    const badge = document.querySelector(".demo");
    if (badge) {
      badge.textContent = apiReady ? "● LIVE API DATA" : "● API CONNECTION ERROR";
      badge.style.color = apiReady ? "var(--green)" : "var(--amber)";
    }
    const notice = document.querySelector(".notice");
    if (notice) notice.innerHTML = apiReady
      ? "<b>Live data connected.</b> Scores and fixtures are supplied by API-Sports Rugby. Coverage depends on the provider and competition. Player ratings and standings are not yet connected."
      : "<b>Live data not connected.</b> " + safe(window.RUGBY_API_ERROR || "Check the Cloudflare Worker and its API_KEY secret.") + " No demo scores are being presented as real results.";
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    $("#matches").innerHTML = '<p class="muted">Loading real rugby data…</p>';
    try {
      // Rugby API's games endpoint is date/league/team based; it does not
      // support the Football-style live=all parameter.
      const today = await getGames({ date: dateKey(), timezone: "Europe/London" });
      todayMatches = today;
      liveMatches = today.filter(g =>
        ["1H","2H","HT","ET","BT","PT","P","LIVE"].includes(
          String(g.status?.short || "").toUpperCase()
        )
      );
      apiReady = true;
      window.RUGBY_API_ERROR = "";
    } catch (e) {
      apiReady = false;
      window.RUGBY_API_ERROR = e.message;
    } finally {
      busy = false;
    }
    renderReal();
  }

  function openSettings() {
    const body = $("#modalBody");
    $("#modalTitle").textContent = "Live data connection";
    body.innerHTML = `
      <p>Rugby Live uses its Cloudflare Worker to connect securely to API-Sports Rugby.</p>
      <p><b>Worker:</b> <a href="https://rugby-live.whetton-oscar.workers.dev" target="_blank" rel="noopener" style="color:var(--green)">rugby-live.whetton-oscar.workers.dev</a></p>
      <p>Your API key is stored privately as a Cloudflare Worker secret. It is not stored in this website or GitHub.</p>
      <p id="rugbyKeyStatus">Checking connection…</p>
      <button id="testRugbyConnection" class="filter" type="button">Test connection</button>`;
    $("#modal").classList.add("open");
    $("#rugbyKeyStatus").textContent = apiReady
      ? "Connected — API-Sports data is loading."
      : "Connection status: " + (window.RUGBY_API_ERROR || "not yet confirmed.");
    $("#testRugbyConnection").onclick = async () => {
      $("#rugbyKeyStatus").textContent = "Testing…";
      await refresh();
      $("#rugbyKeyStatus").textContent = apiReady
        ? "Connected successfully. API-Sports returned a valid response."
        : "Connection failed: " + (window.RUGBY_API_ERROR || "check the Worker secret and API subscription.");
    };
  }

  $("#matches").innerHTML = '<p class="muted">Checking Cloudflare connection…</p>';
  $("#playerRows").innerHTML = '<p class="muted">Player statistics are not connected yet.</p>';
  $("#tableRows").innerHTML = '<tr><td colspan="5">Standings integration is not enabled yet.</td></tr>';
  $("#fixtures").innerHTML = '<div class="fixture"><small>Loading genuine fixtures…</small></div>';
  $("#search")?.addEventListener("input", renderReal);
  $("#filter")?.addEventListener("change", renderReal);
  $("#tableFilter")?.addEventListener("change", () => {
    $("#tableRows").innerHTML = '<tr><td colspan="5">Standings integration is not enabled for this competition yet.</td></tr>';
  });
  // Assign rather than add a listener: this replaces the legacy demo modal handler
  // still present in the original page script.
  if ($("#api")) $("#api").onclick = openSettings;
  refresh();
  setInterval(refresh, 5 * 60 * 1000);
})();
