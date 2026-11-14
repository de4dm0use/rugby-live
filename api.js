/* RUGBY LIVE — API-Sports Rugby browser-key client.
   The key is stored only in this browser's localStorage, never in this GitHub repo.
   For a public multi-user deployment, use the Cloudflare Worker proxy instead. */
(() => {
  const API_BASE = "https://v1.rugby.api-sports.io";
  const KEY_STORAGE = "rugby_live_apisports_key";
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
  const getKey = () => localStorage.getItem(KEY_STORAGE) || "";

  async function getGames(params) {
    const key = getKey();
    if (!key) throw new Error("Add your API-Sports key using Data provider setup.");
    const q = new URLSearchParams(params);
    const r = await fetch(API_BASE + "/games?" + q.toString(), {
      method: "GET",
      headers: { "x-apisports-key": key },
      cache: "no-store"
    });
    let data;
    try { data = await r.json(); } catch { throw new Error("API returned an unreadable response."); }
    if (!r.ok || (data.errors && Object.keys(data.errors).length)) {
      throw new Error(JSON.stringify(data.errors || data.message || data.error || r.status));
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
      badge.textContent = apiReady ? "● LIVE API DATA" : (getKey() ? "● API ERROR" : "● KEY NEEDED");
      badge.style.color = apiReady ? "var(--green)" : "var(--amber)";
    }
    const notice = document.querySelector(".notice");
    if (notice) notice.innerHTML = apiReady
      ? "<b>Live data connected.</b> Scores and fixtures are supplied by API-Sports Rugby. Coverage depends on the provider and competition. Player ratings and standings are not yet connected."
      : "<b>Live data not connected.</b> " + safe(window.RUGBY_API_ERROR || "Open Data provider setup and add your API-Sports key.") + " No demo scores are being presented as real results.";
  }

  async function refresh() {
    if (busy) return;
    if (!getKey()) {
      apiReady = false;
      window.RUGBY_API_ERROR = "No API key saved in this browser yet.";
      $("#matches").innerHTML = '<p class="muted">Add your API-Sports key in Data provider setup to load genuine fixtures and scores.</p>';
      $("#fixtures").innerHTML = '<div class="fixture"><small>Waiting for API key…</small></div>';
      $("#playerRows").innerHTML = '<p class="muted">Player statistics are not connected yet.</p>';
      $("#tableRows").innerHTML = '<tr><td colspan="5">Standings integration is not enabled yet.</td></tr>';
      renderReal();
      return;
    }
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
    const saved = getKey();
    const body = $("#modalBody");
    $("#modalTitle").textContent = "API-Sports data settings";
    body.innerHTML = `
      <p>Paste your API-Sports Rugby key below. It is saved in this browser only and is not written to GitHub.</p>
      <label for="rugbyApiKey" style="display:block;margin:14px 0 6px;font-weight:800;color:var(--text)">API key</label>
      <input id="rugbyApiKey" type="password" autocomplete="off" spellcheck="false"
        placeholder="Paste your API-Sports key" value="${safe(saved)}"
        style="width:100%;padding:13px;border-radius:10px;border:1px solid var(--line);background:#07100d;color:white">
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">
        <button id="saveRugbyKey" class="filter" type="button">Save key & connect</button>
        <button id="removeRugbyKey" class="filter" type="button">Remove saved key</button>
      </div>
      <p id="rugbyKeyStatus" style="margin-top:12px"> ${saved ? "A key is saved in this browser." : "No key saved yet."} </p>
      <p><b>Security:</b> this browser-only method means the key is visible to anyone using this browser's developer tools and is sent directly to API-Sports. Do not use a personal key on a shared device. For a public site with multiple visitors, use the private Cloudflare Worker method instead.</p>
      <p><a href="https://dashboard.api-football.com/" target="_blank" rel="noopener" style="color:var(--green)">Open API-Sports dashboard</a></p>`;
    $("#modal").classList.add("open");
    $("#saveRugbyKey").onclick = async () => {
      const value = $("#rugbyApiKey").value.trim();
      if (!value) { $("#rugbyKeyStatus").textContent = "Paste a key first."; return; }
      localStorage.setItem(KEY_STORAGE, value);
      $("#rugbyKeyStatus").textContent = "Key saved in this browser. Testing connection…";
      liveMatches = []; todayMatches = [];
      await refresh();
      $("#rugbyKeyStatus").textContent = apiReady
        ? "Connected successfully. Real rugby data is loading."
        : "Connection failed: " + (window.RUGBY_API_ERROR || "check the key and API plan.");
    };
    $("#removeRugbyKey").onclick = () => {
      localStorage.removeItem(KEY_STORAGE);
      liveMatches = []; todayMatches = []; apiReady = false;
      $("#rugbyApiKey").value = "";
      $("#rugbyKeyStatus").textContent = "Saved key removed from this browser.";
      refresh();
    };
  }

  $("#matches").innerHTML = '<p class="muted">Checking for an API key…</p>';
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
  setInterval(refresh, 15 * 60 * 1000);
})();
