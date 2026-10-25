(() => {
  "use strict";

  const cfg = window.TRACKER_CONFIG;
  const $ = (id) => document.getElementById(id);
  const screens = ["setup", "signin", "pin", "app"];
  const show = (name) => screens.forEach((s) => ($("screen-" + s).hidden = s !== name));

  // ---------- date helpers (local time) ----------
  const iso = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const today = () => iso(new Date());
  const weekStart = (s) => { const d = parse(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
  const fmtDay = (s) => parse(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const round1 = (x) => Math.round(x * 10) / 10;

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function phaseFor(day) {
    const p = cfg.phases.find((p) => day >= p.start && day <= p.end);
    if (p) return p;
    if (day < cfg.phases[0].start) return { ...cfg.phases[0], pre: true };
    return cfg.phases[cfg.phases.length - 1];
  }

  // ---------- setup ----------
  if (!cfg || !cfg.supabaseUrl || cfg.supabaseUrl.includes("PASTE") || !window.supabase) {
    show("setup");
    return;
  }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "trk-auth" }
  });

  let user = null;
  const data = { daily: [], workouts: [], lifts: [], body: [] };
  const charts = {};

  // ---------- local storage (wrapped) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} }
  };
  const pinKey = () => "trk-pin-" + user.id;

  async function sha(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---------- sign in ----------
  $("signinForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("signinError").textContent = "";
    const { data: res, error } = await sb.auth.signInWithPassword({
      email: $("signinEmail").value.trim(),
      password: $("signinPassword").value
    });
    if (error) { $("signinError").textContent = error.message; return; }
    user = res.user;
    $("signinPassword").value = "";
    startPinSet();
  });

  async function signOut() {
    if (user) store.del(pinKey());
    await sb.auth.signOut();
    user = null;
    show("signin");
  }
  $("signOut").addEventListener("click", signOut);
  $("pinForgot").addEventListener("click", signOut);

  // ---------- PIN ----------
  let pinMode = "unlock"; // unlock | set | confirm
  let pinBuf = "";
  let pinFirst = "";
  let pinFails = 0;

  function renderDots() {
    $("pinDots").querySelectorAll("span").forEach((s, i) => s.classList.toggle("on", i < pinBuf.length));
  }
  function pinScreen(mode) {
    pinMode = mode; pinBuf = ""; renderDots();
    $("pinError").textContent = "";
    $("pinTitle").textContent = mode === "unlock" ? "Enter PIN" : mode === "set" ? "Choose a 4-digit PIN" : "Confirm PIN";
    $("pinHint").textContent = mode === "unlock" ? "" : "Used to unlock this tracker on this device.";
    $("pinForgot").hidden = mode !== "unlock";
    show("pin");
  }
  function startPinSet() { pinFirst = ""; pinScreen("set"); }
  function lock() { if (user && store.get(pinKey())) pinScreen("unlock"); }

  function shake(msg) {
    $("pinError").textContent = msg;
    const d = $("pinDots");
    d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake");
    pinBuf = ""; renderDots();
  }

  async function pinComplete() {
    const h = await sha(user.id + ":" + pinBuf);
    if (pinMode === "set") { pinFirst = pinBuf; pinScreen("confirm"); return; }
    if (pinMode === "confirm") {
      if (pinBuf !== pinFirst) { pinFirst = ""; pinMode = "set"; $("pinTitle").textContent = "Choose a 4-digit PIN"; shake("PINs didn't match. Try again."); return; }
      store.set(pinKey(), h);
      openApp();
      return;
    }
    if (h === store.get(pinKey())) { pinFails = 0; openApp(); return; }
    pinFails++;
    if (pinFails >= 5) { toast("Too many attempts. Sign in again."); pinFails = 0; signOut(); return; }
    shake(`Wrong PIN (${5 - pinFails} tries left)`);
  }

  $("pinPad").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const k = b.dataset.key || b.textContent.trim();
    if (k === "clear") pinBuf = "";
    else if (k === "back") pinBuf = pinBuf.slice(0, -1);
    else if (/^\d$/.test(k) && pinBuf.length < 4) pinBuf += k;
    renderDots();
    if (pinBuf.length === 4) setTimeout(pinComplete, 120);
  });
  document.addEventListener("keydown", (e) => {
    if ($("screen-pin").hidden) return;
    if (/^\d$/.test(e.key) && pinBuf.length < 4) { pinBuf += e.key; renderDots(); if (pinBuf.length === 4) setTimeout(pinComplete, 120); }
    else if (e.key === "Backspace") { pinBuf = pinBuf.slice(0, -1); renderDots(); }
  });

  $("lockBtn").addEventListener("click", lock);
  $("changePin").addEventListener("click", startPinSet);

  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > cfg.lockAfterMinutes * 60000) lock();
  });

  // ---------- data ----------
  async function loadAll() {
    const q = (t, order) => sb.from(t).select("*").order(order, { ascending: true }).limit(5000);
    const [d, w, l, b] = await Promise.all([q("daily_log", "day"), q("workouts", "day"), q("lift_sets", "day"), q("body_log", "day")]);
    for (const r of [d, w, l, b]) if (r.error) { toast("Load failed: " + r.error.message); throw r.error; }
    data.daily = d.data; data.workouts = w.data; data.lifts = l.data; data.body = b.data;
  }

  async function openApp() {
    show("app");
    renderHeader();
    try { await loadAll(); } catch { return; }
    fillDaily(); fillBody(); setupWorkoutForm();
    renderActiveTab();
  }

  function renderHeader() {
    const t = today();
    const p = phaseFor(t);
    if (p.pre) {
      $("phaseLabel").textContent = `Cut starts ${fmtDay(p.start)}`;
    } else {
      const wk = Math.floor(daysBetween(p.start, t) / 7) + 1;
      const total = Math.ceil((daysBetween(p.start, p.end) + 1) / 7);
      $("phaseLabel").textContent = `${p.name} · week ${wk} of ${total}`;
    }
    $("phaseTargets").textContent = `${p.kcal.toLocaleString()} kcal · ${p.protein} g protein · ${cfg.sessionsPerWeek} sessions/wk`;
  }

  // ---------- tabs ----------
  let activeTab = "today";
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    activeTab = b.dataset.tab;
    $("tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.id !== "tab-" + activeTab));
    store.set("trk-tab", activeTab);
    renderActiveTab();
  });
  function renderActiveTab() {
    if (activeTab === "progress") renderProgress();
    if (activeTab === "history") renderHistory();
  }

  // ---------- daily form ----------
  const dailyFields = { dWeight: "weight_lb", dCalories: "calories", dProtein: "protein_g", dSteps: "steps", dSleep: "sleep_h", dNotes: "notes" };
  function fillDaily() {
    if (!$("dailyDay").value) $("dailyDay").value = today();
    const row = data.daily.find((r) => r.day === $("dailyDay").value) || {};
    for (const [id, col] of Object.entries(dailyFields)) $(id).value = row[col] ?? "";
    $("dPrep").checked = !!row.meal_prep;
    const p = phaseFor($("dailyDay").value);
    $("dCalories").placeholder = `target ${p.kcal}`;
    $("dProtein").placeholder = `target ${p.protein}`;
    $("dSteps").placeholder = `target ${cfg.stepsTarget}`;
    $("dailySaved").textContent = row.day ? "Saved entry loaded" : "";
  }
  $("dailyDay").addEventListener("change", fillDaily);
  $("dailyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const row = { user_id: user.id, day: $("dailyDay").value, meal_prep: $("dPrep").checked, updated_at: new Date().toISOString() };
    for (const [id, col] of Object.entries(dailyFields)) row[col] = col === "notes" ? ($(id).value.trim() || null) : num($(id).value);
    const { error } = await sb.from("daily_log").upsert(row, { onConflict: "user_id,day" });
    if (error) { toast("Save failed: " + error.message); return; }
    const i = data.daily.findIndex((r) => r.day === row.day);
    if (i >= 0) data.daily[i] = row; else { data.daily.push(row); data.daily.sort((a, b) => a.day.localeCompare(b.day)); }
    $("dailySaved").textContent = "Saved";
    toast("Day saved");
  });

  // ---------- body form ----------
  function fillBody() {
    if (!$("bodyDay").value) $("bodyDay").value = today();
    const row = data.body.find((r) => r.day === $("bodyDay").value) || {};
    $("bWaist").value = row.waist_in ?? "";
    $("bNotes").value = row.notes ?? "";
    const last = data.body[data.body.length - 1];
    $("bodySaved").textContent = last ? `Last: ${last.waist_in}" on ${fmtDay(last.day)}` : "";
  }
  $("bodyDay").addEventListener("change", fillBody);
  $("bodyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const row = { user_id: user.id, day: $("bodyDay").value, waist_in: num($("bWaist").value), notes: $("bNotes").value.trim() || null };
    const { error } = await sb.from("body_log").upsert(row, { onConflict: "user_id,day" });
    if (error) { toast("Save failed: " + error.message); return; }
    const i = data.body.findIndex((r) => r.day === row.day);
    if (i >= 0) data.body[i] = row; else { data.body.push(row); data.body.sort((a, b) => a.day.localeCompare(b.day)); }
    fillBody();
    toast("Waist saved");
  });

  // ---------- program + workout form ----------
  const prog = window.TRACKER_PROGRAM;
  const rotation = prog.rotation;
  const mainLifts = Object.values(prog.sessions).flatMap((s) => s.exercises.filter((x) => x.main).flatMap((x) => [x.a, x.b]))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const round5 = (x) => Math.round(x / 5) * 5;

  // Program week for a date: 0 before the start, then 1, 2, 3...
  function progWeek(day) {
    const start = cfg.phases[0].start;
    return day < start ? 0 : Math.floor(daysBetween(start, day) / 7) + 1;
  }
  const variantFor = (day) => (progWeek(day) % 2 === 0 && progWeek(day) > 0 ? "b" : "a");
  const isDeload = (day) => { const w = progWeek(day); return w > 0 && w % prog.deloadEvery === 0; };

  // Logged sets for one exercise grouped by session, oldest first.
  function historyFor(name) {
    const groups = new Map();
    for (const s of data.lifts) {
      if (s.lift !== name) continue;
      const k = s.workout_id ?? s.day;
      if (!groups.has(k)) groups.set(k, { day: s.day, weight: Number(s.weight_lb), reps: [] });
      const g = groups.get(k);
      g.weight = Math.max(g.weight, Number(s.weight_lb));
      g.reps.push(s.reps);
    }
    return [...groups.values()].sort((a, b) => a.day.localeCompare(b.day));
  }
  const fmtSets = (g, bw) => `${bw && !g.weight ? "BW" : `${g.weight} lb`} × ${g.reps.join(", ")}`;

  function suggest(ex, name, bw, day) {
    const [lo, hi] = ex.reps;
    const hist = historyFor(name);
    const last = hist[hist.length - 1] || null;
    const work = hist.filter((g) => !isDeload(g.day) && g.day < day);
    const ref = work[work.length - 1];
    const deload = isDeload(day);
    if (!ref) {
      return { last, weight: null, cls: "",
        text: bw ? "First time: bodyweight; add weight once you hit " + hi + " on every set."
                 : `First time: pick a weight you could do ${hi + 2} times. Stop each set with 1–2 reps left.` };
    }
    let w = ref.weight, cls = "", text;
    const hitTop = ref.reps.length >= ex.sets && ref.reps.every((r) => r >= hi);
    const missed = ref.reps.some((r) => r < lo);
    const prev = work[work.length - 2];
    if (hitTop) { w = ref.weight + ex.inc; cls = "good"; text = `Add ${ex.inc} lb: you hit ${hi} on every set last time.`; }
    else if (missed && prev && prev.weight === ref.weight && prev.reps.some((r) => r < lo)) {
      w = bw ? ref.weight : round5(ref.weight * 0.9); cls = "warn"; text = `Missed ${lo} reps twice at ${ref.weight} lb. Drop ~10% and build back up.`;
    }
    else text = `Stay at ${bw && !ref.weight ? "bodyweight" : ref.weight + " lb"} and beat last time's reps.`;
    if (deload) { w = bw ? 0 : round5(w * 0.9); cls = ""; text = `Deload week: ~10% lighter, one fewer set, leave 3+ reps in the tank.`; }
    return { last, weight: w, cls, text };
  }

  function exerciseCard(ex, variant, day) {
    const deload = isDeload(day);
    const name = ex[variant];
    const bw = !!(ex.bw || (variant === "a" && ex.bwA));
    const sets = deload ? Math.max(2, ex.sets - 1) : ex.sets;
    const s = suggest(ex, name, bw, day);
    const el = document.createElement("div");
    el.className = "ex";
    el.dataset.name = name;
    const canSwap = ex.a !== ex.b;
    el.innerHTML = `
      <div class="ex-head">
        <div>
          <div class="ex-name">${ex.main ? '<span class="ex-tag">Main</span>' : ""}${esc(name)}</div>
          <div class="ex-target">${sets} × ${ex.reps[0]}–${ex.reps[1]}${ex.perLeg ? "/leg" : ""} · +${ex.inc} lb when you hit ${ex.reps[1]} on every set</div>
          ${canSwap ? `<div class="ex-target">Alternate: ${esc(ex[variant === "a" ? "b" : "a"])}</div>` : ""}
        </div>
        ${canSwap ? `<button type="button" class="ex-swap" title="Use the alternate exercise">Swap</button>` : ""}
      </div>
      <div class="ex-last">${s.last ? `Last: ${esc(fmtSets(s.last, bw))} · ${fmtDay(s.last.day)}` : '<span class="muted">No history yet</span>'}</div>
      <div class="ex-sugg ${s.cls}">${esc(s.text)}</div>
      <div class="ex-inputs" style="grid-template-columns: 1.5fr repeat(${sets}, 1fr)">
        <label>${bw ? "Added lb" : "Weight (lb)"}<input class="exW" type="number" step="2.5" inputmode="decimal" value="${s.weight ?? (bw ? 0 : "")}" /></label>
        ${Array.from({ length: sets }, (_, i) => `<label>Set ${i + 1}<input class="exR" type="number" inputmode="numeric" placeholder="${s.last && s.last.reps[i] != null ? s.last.reps[i] : ""}" /></label>`).join("")}
      </div>`;
    if (canSwap) el.querySelector(".ex-swap").addEventListener("click", () => el.replaceWith(exerciseCard(ex, variant === "a" ? "b" : "a", day)));
    return el;
  }

  function customCard() {
    const el = document.createElement("div");
    el.className = "ex";
    el.innerHTML = `
      <div class="ex-head">
        <div class="ex-name" style="flex:1"><input class="exName" type="text" placeholder="Exercise name" list="exNames" /></div>
        <button type="button" class="ex-rm">Remove</button>
      </div>
      <div class="ex-inputs" style="grid-template-columns: 1.5fr repeat(3, 1fr)">
        <label>Weight (lb)<input class="exW" type="number" step="2.5" inputmode="decimal" /></label>
        <label>Set 1<input class="exR" type="number" inputmode="numeric" /></label>
        <label>Set 2<input class="exR" type="number" inputmode="numeric" /></label>
        <label>Set 3<input class="exR" type="number" inputmode="numeric" /></label>
      </div>`;
    el.querySelector(".ex-rm").addEventListener("click", () => el.remove());
    el.querySelector(".exName").addEventListener("input", (e) => (el.dataset.name = e.target.value.trim()));
    return el;
  }

  function renderSession() {
    const day = $("wDay").value || today();
    const session = $("wSession").value;
    const v = variantFor(day);
    const wk = progWeek(day);
    const nextDeload = wk === 0 ? prog.deloadEvery : Math.ceil((wk + (isDeload(day) ? 1 : 0)) / prog.deloadEvery) * prog.deloadEvery;
    $("weekInfo").className = "callout" + (isDeload(day) ? " warn" : "");
    $("weekInfo").innerHTML = wk === 0
      ? `<strong>Pre-program week · Variation A</strong>Program week 1 starts ${fmtDay(cfg.phases[0].start)}. Use this week to find your starting weights.`
      : `<strong>Week ${wk} · Variation ${v.toUpperCase()}${isDeload(day) ? " · Deload" : ""}</strong>` +
        (isDeload(day) ? "Lighter week to recover: the weights below are already reduced." : `Variations alternate weekly. Next deload: week ${nextDeload}.`);
    const list = $("exList");
    list.innerHTML = "";
    const s = prog.sessions[session];
    if (s) {
      const f = document.createElement("p");
      f.className = "muted small";
      f.textContent = s.focus;
      list.appendChild(f);
      s.exercises.forEach((ex) => list.appendChild(exerciseCard(ex, v, day)));
    }
  }

  function renderLastWeights() {
    const names = [...new Set(data.lifts.map((s) => s.lift))];
    const rows = names.map((n) => {
      const h = historyFor(n), last = h[h.length - 1];
      const best = Math.max(...data.lifts.filter((s) => s.lift === n).map((s) => e1rm(Number(s.weight_lb), s.reps)));
      return { n, last, best };
    }).sort((a, b) => b.last.day.localeCompare(a.last.day) || a.n.localeCompare(b.n));
    $("lastWeights").innerHTML = `<tr><th>Exercise</th><th>Last</th><th>Date</th><th class="num">Best e1RM</th></tr>` +
      (rows.length ? rows.map((r) => `<tr><td>${esc(r.n)}</td><td>${esc(fmtSets(r.last, !r.last.weight))}</td><td>${fmtDay(r.last.day)}</td><td class="num">${r.best ? Math.round(r.best) : "—"}</td></tr>`).join("")
        : `<tr><td colspan="4" class="muted">Log a session to see your weights here.</td></tr>`);
    let dl = $("exNames");
    if (!dl) { dl = document.createElement("datalist"); dl.id = "exNames"; document.body.appendChild(dl); }
    dl.innerHTML = names.map((n) => `<option value="${esc(n)}">`).join("");
  }

  function setupWorkoutForm() {
    $("wDay").value = today();
    $("wSession").innerHTML = rotation.map((s) => `<option>${esc(s)}</option>`).join("");
    const last = [...data.workouts].reverse().find((w) => rotation.includes(w.session));
    const next = last ? rotation[(rotation.indexOf(last.session) + 1) % rotation.length] : rotation[0];
    $("wSession").value = next;
    $("wSuggest").textContent = last ? `Next in rotation after ${last.session} (${fmtDay(last.day)}).` : `Start the rotation with ${rotation[0]}.`;
    renderSession();
    renderLastWeights();
  }
  $("wSession").addEventListener("change", renderSession);
  $("wDay").addEventListener("change", renderSession);
  $("addEx").addEventListener("click", () => $("exList").appendChild(customCard()));
  $("workoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const day = $("wDay").value;
    const sets = [];
    for (const card of $("exList").querySelectorAll(".ex")) {
      const name = card.dataset.name;
      const w = num(card.querySelector(".exW").value);
      const reps = [...card.querySelectorAll(".exR")].map((i) => num(i.value)).filter((r) => r != null && r > 0);
      if (!name || !reps.length) continue;
      if (w == null) { toast(`Add a weight for ${name} (0 = bodyweight)`); return; }
      reps.forEach((r) => sets.push({ lift: name, weight_lb: w, reps: r }));
    }
    if (!sets.length) { toast("Enter reps for at least one exercise"); return; }
    const { data: w, error } = await sb.from("workouts")
      .insert({ user_id: user.id, day, session: $("wSession").value, notes: $("wNotes").value.trim() || null })
      .select().single();
    if (error) { toast("Save failed: " + error.message); return; }
    data.workouts.push(w);
    const rows = sets.map((s) => ({ ...s, user_id: user.id, day, workout_id: w.id }));
    const { data: ins, error: e2 } = await sb.from("lift_sets").insert(rows).select();
    if (e2) { toast("Sets failed to save: " + e2.message); return; }
    data.lifts.push(...ins);
    data.workouts.sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id);
    data.lifts.sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id);
    $("wNotes").value = "";
    toast(`${w.session} saved`);
    setupWorkoutForm();
  });

  // ---------- analytics ----------
  const weights = () => data.daily.filter((r) => r.weight_lb != null).map((r) => ({ day: r.day, w: Number(r.weight_lb) }));

  function avgOver(rows, from, to, key) {
    const xs = rows.filter((r) => r.day >= from && r.day <= to && r[key] != null).map((r) => Number(r[key]));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  }

  // lb/week from a least-squares fit over the last 14 days
  function rate14() {
    const t = today();
    const pts = weights().filter((p) => p.day > addDays(t, -14) && p.day <= t);
    if (pts.length < 6 || daysBetween(pts[0].day, pts[pts.length - 1].day) < 9) return null;
    const xs = pts.map((p) => daysBetween(pts[0].day, p.day)), ys = pts.map((p) => p.w);
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let n = 0, d = 0;
    xs.forEach((x, i) => { n += (x - mx) * (ys[i] - my); d += (x - mx) ** 2; });
    return d ? (n / d) * 7 : null;
  }

  const e1rm = (w, r) => w * (1 + r / 30);

  function liftsDropping() {
    // lifts whose last two top sets are both 5%+ below that lift's best in the prior 6 weeks
    const t = today(), out = [];
    for (const lift of mainLifts) {
      const xs = data.lifts.filter((s) => s.lift === lift && s.day > addDays(t, -42)).map((s) => ({ day: s.day, v: e1rm(s.weight_lb, s.reps) }));
      if (xs.length < 4) continue;
      const lastTwo = xs.slice(-2), best = Math.max(...xs.slice(0, -2).map((x) => x.v));
      if (lastTwo.every((x) => x.v < best * 0.95)) out.push(lift);
    }
    return out;
  }

  function adjustment() {
    const t = today(), p = phaseFor(t), r = rate14();
    const intoPhase = p.pre ? -1 : daysBetween(p.start, t);
    const drop = liftsDropping();
    if (p.pre) return { cls: "", title: `Cut starts ${fmtDay(p.start)}`, body: "Log a few weigh-ins before then so the first week has a baseline." };
    if (r === null) return { cls: "", title: "Keep logging", body: "Need about 10 days of morning weigh-ins (6+) before pace advice kicks in." };
    const rs = `${r > 0 ? "+" : ""}${round1(r)} lb/week over the last 2 weeks`;
    if (p.name === "Cut") {
      if (intoPhase < 14) return { cls: "", title: rs, body: "Weeks 1–2: water and food volume make the scale noisy. Don't adjust yet." };
      if (drop.length >= 2 || (r < -1.5 && intoPhase >= 21))
        return { cls: "bad", title: rs, body: `Losing too fast${drop.length >= 2 ? ` and ${drop.join(", ")} are dropping` : ""}. Add ~150 kcal of carbs (≈ ${p.kcal + 150}).` };
      if (r > -0.75) return { cls: "warn", title: rs, body: `Slower than target. Cut ~150 kcal from rice or potatoes (≈ ${Math.max(1900, p.kcal - 150)}), never below 1,900.` };
      if (r > -1.0) return { cls: "good", title: rs, body: "Slightly under target pace. Hold for another week before changing anything." };
      return { cls: "good", title: rs, body: "On pace. Change nothing." };
    }
    if (p.name === "Break") {
      const kc = avgOver(data.daily, addDays(t, -13), t, "calories");
      if (Math.abs(r) <= 0.5) return { cls: "good", title: rs, body: `Weight is steady. ${kc ? `Your ~${Math.round(kc)} kcal average is maintenance; bulk at ≈ ${Math.round(kc / 50) * 50 + 250}.` : "Log calories so maintenance can be estimated."}` };
      return { cls: "warn", title: rs, body: r > 0 ? "Still gaining — trim ~150 kcal to find maintenance." : "Still losing — add ~150 kcal to find maintenance." };
    }
    if (r < 0.25) return { cls: "warn", title: rs, body: `Gaining too slowly. Add ~150 kcal (≈ ${p.kcal + 150}).` };
    if (r > 0.75) return { cls: "bad", title: rs, body: `Gaining too fast. Cut ~150 kcal (≈ ${p.kcal - 150}).` };
    return { cls: "good", title: rs, body: "On pace. Change nothing." };
  }

  function kpi(label, value, sub, cls = "") {
    return `<div class="kpi ${cls}"><div class="k-label">${esc(label)}</div><div class="k-value">${esc(value)}</div><div class="k-sub">${esc(sub)}</div></div>`;
  }

  function streak() {
    const logged = new Set(data.daily.filter((r) => r.weight_lb != null || r.protein_g != null).map((r) => r.day));
    let d = today(), n = 0;
    if (!logged.has(d)) d = addDays(d, -1);
    while (logged.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }

  function renderProgress() {
    const t = today(), p = phaseFor(t), ws = weekStart(t);
    const a = adjustment();
    $("adjustCallout").className = "callout " + a.cls;
    $("adjustCallout").innerHTML = `<strong>${esc(a.title)}</strong>${esc(a.body)}`;

    const avg7 = avgOver(data.daily, addDays(t, -6), t, "weight_lb");
    const prev7 = avgOver(data.daily, addDays(t, -13), addDays(t, -7), "weight_lb");
    const thisWeek = data.daily.filter((r) => r.day >= ws && r.day <= t);
    const protHit = thisWeek.filter((r) => r.protein_g != null && r.protein_g >= p.protein).length;
    const protLogged = thisWeek.filter((r) => r.protein_g != null).length;
    const kcal7 = avgOver(data.daily, addDays(t, -6), t, "calories");
    const steps7 = avgOver(data.daily, addDays(t, -6), t, "steps");
    const sessions = data.workouts.filter((w) => w.day >= ws && w.day <= t).length;
    const preps = thisWeek.filter((r) => r.meal_prep).length;
    const firstW = data.body[0], lastW = data.body[data.body.length - 1];
    const sleep7 = avgOver(data.daily, addDays(t, -6), t, "sleep_h");
    const dayOfWeek = daysBetween(ws, t) + 1;

    $("kpis").innerHTML = [
      kpi("7-day avg weight", avg7 ? `${round1(avg7)} lb` : "—", avg7 && prev7 ? `${avg7 - prev7 > 0 ? "+" : ""}${round1(avg7 - prev7)} vs prior week` : "needs weigh-ins"),
      kpi("Protein this week", `${protHit}/${dayOfWeek}`, `days ≥ ${p.protein} g (${protLogged} logged)`, protHit >= Math.min(6, dayOfWeek) ? "good" : protHit >= dayOfWeek - 2 ? "warn" : "bad"),
      kpi("Sessions this week", `${sessions}/${cfg.sessionsPerWeek}`, "Mon–Sun", sessions >= cfg.sessionsPerWeek ? "good" : ""),
      kpi("Avg calories (7d)", kcal7 ? Math.round(kcal7).toLocaleString() : "—", `target ${p.kcal.toLocaleString()}`, kcal7 ? (Math.abs(kcal7 - p.kcal) <= 150 ? "good" : "warn") : ""),
      kpi("Avg steps (7d)", steps7 ? Math.round(steps7).toLocaleString() : "—", `target ${cfg.stepsTarget.toLocaleString()}`, steps7 ? (steps7 >= cfg.stepsTarget ? "good" : "warn") : ""),
      kpi("Meal preps", `${preps}/2`, "this week", preps >= 2 ? "good" : ""),
      kpi("Waist", lastW ? `${lastW.waist_in}"` : "—", firstW && lastW && firstW !== lastW ? `${round1(lastW.waist_in - firstW.waist_in)}" since ${fmtDay(firstW.day)}` : "log weekly"),
      kpi("Avg sleep (7d)", sleep7 ? `${round1(sleep7)} h` : "—", "aim 7+", sleep7 ? (sleep7 >= 7 ? "good" : "warn") : ""),
      kpi("Logging streak", `${streak()} days`, "weight or protein logged")
    ].join("");

    drawCharts();
  }

  // ---------- charts ----------
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function baseOpts(extra = {}) {
    const grid = css("--border"), tick = css("--muted");
    return {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tick, maxRotation: 0, autoSkipPadding: 16 } },
        y: { grid: { color: grid }, ticks: { color: tick } }
      },
      ...extra
    };
  }
  function chart(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), config);
  }
  function dayRange(from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }

  function drawCharts() {
    if (!window.Chart) return;
    const primary = css("--primary"), muted = css("--muted"), border = css("--border");
    const t = today();

    // Weight: daily dots, 7-day avg, target band for the current phase
    const W = weights();
    if (W.length) {
      const days = dayRange(W[0].day, t);
      const byDay = Object.fromEntries(W.map((p) => [p.day, p.w]));
      const avg = days.map((d) => {
        const xs = W.filter((p) => p.day <= d && p.day > addDays(d, -7)).map((p) => p.w);
        return xs.length ? round1(xs.reduce((a, b) => a + b) / xs.length) : null;
      });
      const p = phaseFor(t);
      let lo = days.map(() => null), hi = days.map(() => null);
      if (!p.pre) {
        const anchorDays = W.filter((x) => x.day >= addDays(p.start, -3) && x.day <= addDays(p.start, 6)).map((x) => x.w);
        const base = anchorDays.length ? anchorDays.reduce((a, b) => a + b) / anchorDays.length : null;
        if (base) {
          const bandDays = days.map((d) => (d >= p.start ? daysBetween(p.start, d) : null));
          lo = bandDays.map((n) => (n == null ? null : round1(base + (p.rate[0] * n) / 7)));
          hi = bandDays.map((n) => (n == null ? null : round1(base + (p.rate[1] * n) / 7)));
        }
      }
      chart("chartWeight", {
        type: "line",
        data: {
          labels: days.map(fmtDay),
          datasets: [
            { label: "Target (fast)", data: lo, borderWidth: 0, pointRadius: 0, fill: false },
            { label: "Target (slow)", data: hi, borderWidth: 0, pointRadius: 0, fill: "-1", backgroundColor: primary + "22" },
            { label: "Weigh-in", data: days.map((d) => byDay[d] ?? null), showLine: false, pointRadius: 3, pointBackgroundColor: muted + "99", borderColor: "transparent" },
            { label: "7-day avg", data: avg, borderColor: primary, borderWidth: 2.5, pointRadius: 0, spanGaps: true, tension: 0.25 }
          ]
        },
        options: baseOpts()
      });
    }

    // Protein: last 28 days vs target
    const pdays = dayRange(addDays(t, -27), t);
    const pmap = Object.fromEntries(data.daily.map((r) => [r.day, r.protein_g]));
    chart("chartProtein", {
      type: "bar",
      data: {
        labels: pdays.map(fmtDay),
        datasets: [
          { type: "line", label: "Target", data: pdays.map((d) => phaseFor(d).protein), borderColor: muted, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 },
          { label: "Protein (g)", data: pdays.map((d) => pmap[d] ?? null),
            backgroundColor: pdays.map((d) => (pmap[d] != null && pmap[d] >= phaseFor(d).protein ? primary : border)), borderRadius: 3 }
        ]
      },
      options: baseOpts()
    });

    // Waist
    chart("chartWaist", {
      type: "line",
      data: { labels: data.body.map((r) => fmtDay(r.day)),
        datasets: [{ label: "Waist (in)", data: data.body.map((r) => Number(r.waist_in)), borderColor: primary, backgroundColor: primary, borderWidth: 2, pointRadius: 3, tension: 0.2 }] },
      options: baseOpts()
    });

    // Sessions per week: last 12 weeks
    const weeks = []; for (let i = 11; i >= 0; i--) weeks.push(weekStart(addDays(t, -7 * i)));
    const counts = weeks.map((w) => data.workouts.filter((x) => x.day >= w && x.day <= addDays(w, 6)).length);
    chart("chartSessions", {
      type: "bar",
      data: { labels: weeks.map(fmtDay),
        datasets: [
          { type: "line", label: "Target", data: weeks.map(() => cfg.sessionsPerWeek), borderColor: muted, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 },
          { label: "Sessions", data: counts, backgroundColor: counts.map((c) => (c >= cfg.sessionsPerWeek ? primary : border)), borderRadius: 3 }
        ] },
      options: baseOpts({ scales: { x: { grid: { display: false }, ticks: { color: muted } }, y: { grid: { color: border }, ticks: { color: muted, stepSize: 1 }, suggestedMax: 5, beginAtZero: true } } })
    });

    // Strength
    const pick = $("liftPick");
    const logged = [...new Set(data.lifts.map((s) => s.lift))];
    const choices = [...mainLifts, ...logged.filter((n) => !mainLifts.includes(n)).sort()];
    const want = pick.value || store.get("trk-lift") || mainLifts[0];
    pick.innerHTML = choices.map((l) => `<option>${esc(l)}</option>`).join("");
    pick.value = choices.includes(want) ? want : mainLifts[0];
    if (!pick.dataset.bound) {
      pick.dataset.bound = "1";
      pick.addEventListener("change", () => { store.set("trk-lift", pick.value); drawCharts(); });
    }
    const best = {};
    data.lifts.filter((s) => s.lift === pick.value).forEach((s) => { const v = e1rm(Number(s.weight_lb), s.reps); best[s.day] = Math.max(best[s.day] || 0, v); });
    const ld = Object.keys(best).sort();
    chart("chartLift", {
      type: "line",
      data: { labels: ld.map(fmtDay),
        datasets: [{ label: `${pick.value} e1RM (lb)`, data: ld.map((d) => Math.round(best[d])), borderColor: primary, backgroundColor: primary, borderWidth: 2, pointRadius: 3, tension: 0.2 }] },
      options: baseOpts()
    });
  }

  // ---------- history ----------
  function renderHistory() {
    const days = [...data.daily].reverse().slice(0, 60);
    $("histDaily").innerHTML =
      `<tr><th>Day</th><th class="num">Weight</th><th class="num">kcal</th><th class="num">Protein</th><th class="num">Steps</th><th class="num">Sleep</th><th>Prep</th><th>Notes</th><th></th></tr>` +
      (days.length ? days.map((r) => `<tr>
        <td>${fmtDay(r.day)}</td><td class="num">${r.weight_lb ?? ""}</td><td class="num">${r.calories ?? ""}</td><td class="num">${r.protein_g ?? ""}</td>
        <td class="num">${r.steps != null ? Number(r.steps).toLocaleString() : ""}</td><td class="num">${r.sleep_h ?? ""}</td><td>${r.meal_prep ? "✓" : ""}</td>
        <td>${esc(r.notes)}</td><td><button data-del-day="${r.day}" aria-label="Delete">&times;</button></td></tr>`).join("")
        : `<tr><td colspan="9" class="muted">Nothing logged yet.</td></tr>`);

    const ws = [...data.workouts].reverse().slice(0, 40);
    $("histWorkouts").innerHTML =
      `<tr><th>Day</th><th>Session</th><th>Sets</th><th>Notes</th><th></th></tr>` +
      (ws.length ? ws.map((w) => {
        const byEx = new Map();
        data.lifts.filter((s) => s.workout_id === w.id).forEach((s) => {
          if (!byEx.has(s.lift)) byEx.set(s.lift, { w: s.weight_lb, reps: [] });
          byEx.get(s.lift).reps.push(s.reps);
        });
        const sets = [...byEx].map(([n, g]) => `${n} ${Number(g.w) ? g.w : "BW"}×${g.reps.join("/")}`).join(" · ");
        return `<tr><td>${fmtDay(w.day)}</td><td>${esc(w.session)}</td><td>${esc(sets)}</td><td>${esc(w.notes)}</td>
          <td><button data-del-workout="${w.id}" aria-label="Delete">&times;</button></td></tr>`;
      }).join("") : `<tr><td colspan="5" class="muted">No sessions yet.</td></tr>`);
  }

  $("tab-history").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.delDay) {
      if (!confirm(`Delete the log for ${fmtDay(b.dataset.delDay)}?`)) return;
      const { error } = await sb.from("daily_log").delete().eq("day", b.dataset.delDay);
      if (error) { toast(error.message); return; }
      data.daily = data.daily.filter((r) => r.day !== b.dataset.delDay);
      fillDaily(); renderHistory(); toast("Deleted");
    } else if (b.dataset.delWorkout) {
      const id = Number(b.dataset.delWorkout);
      if (!confirm("Delete this session and its sets?")) return;
      const { error } = await sb.from("workouts").delete().eq("id", id);
      if (error) { toast(error.message); return; }
      data.workouts = data.workouts.filter((w) => w.id !== id);
      data.lifts = data.lifts.filter((s) => s.workout_id !== id);
      setupWorkoutForm(); renderHistory(); toast("Deleted");
    }
  });

  // ---------- boot ----------
  (async () => {
    const saved = store.get("trk-tab");
    if (saved && $("tab-" + saved)) $("tabs").querySelector(`[data-tab="${saved}"]`).click();
    const { data: s } = await sb.auth.getSession();
    if (!s.session) { show("signin"); return; }
    user = s.session.user;
    if (store.get(pinKey())) pinScreen("unlock"); else startPinSet();
  })();

  sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") { user = null; show("signin"); } });
})();
