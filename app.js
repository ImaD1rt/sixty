'use strict';
(() => {
  const STORE_KEY = 'sixty.v1';
  const DAYS = 60;
  const DAY_MS = 86400000;

  // ---------- Defaults ----------
  const DEFAULT_HABITS = [
    { id: 'protein', name: 'Hit protein goal' },
    { id: 'creatine', name: 'Took creatine (5g)' },
    { id: 'train', name: "Trained / did today's session" },
    { id: 'nogamble', name: 'No gambling' },
    { id: 'sun', name: 'Morning sunlight (10 min outside)' },
    { id: 'steps', name: '8k+ steps' },
    { id: 'teethAM', name: 'Brushed teeth AM' },
    { id: 'teethPM', name: 'Brushed teeth PM' },
    { id: 'sleep', name: 'Phone out of bed / asleep by target time' },
  ];

  const DEFAULT_FOODS = [
    { id: 'whey', name: 'Whey scoop', cal: 120, p: 25 },
    { id: 'yogurt', name: 'Greek yogurt (1 cup)', cal: 150, p: 20 },
    { id: 'cottage', name: 'Cottage cheese (1 cup)', cal: 200, p: 25 },
    { id: 'egg', name: 'Egg', cal: 70, p: 6 },
    { id: 'tofu', name: 'Tofu/tempeh serving', cal: 180, p: 20 },
    { id: 'seitan', name: 'Seitan (3oz)', cal: 120, p: 21 },
    { id: 'lentil', name: 'Lentil pasta serving', cal: 190, p: 21 },
    { id: 'milk', name: 'Milk (1 cup)', cal: 150, p: 8 },
    { id: 'oats', name: 'Oats (1 cup dry)', cal: 300, p: 10 },
  ];

  // Indexed by Date.getDay(): 0 = Sunday. f = the fields logged per set.
  const SCHEDULE = [
    { name: 'Rest / Walk / Stretch', short: 'Sun', ex: [
      { n: 'Walk', sets: 1, target: 'easy', f: ['min'] },
      { n: 'Stretch / mobility', sets: 1, target: '10–15 min', f: ['min'] },
    ] },
    { name: 'Lower + Power', short: 'Mon', ex: [
      { n: 'Box jumps', sets: 4, target: '4×3', f: ['in', 'reps'] },
      { n: 'Back squat', sets: 4, target: '4×6', f: ['lb', 'reps'] },
      { n: 'Romanian deadlift', sets: 3, target: '3×8', f: ['lb', 'reps'] },
      { n: 'Walking lunges', sets: 3, target: '3×10/leg', f: ['lb', 'reps'] },
      { n: 'Calf raises', sets: 3, target: '3×15', f: ['lb', 'reps'] },
    ] },
    { name: 'Upper', short: 'Tue', ex: [
      { n: 'Bench press', sets: 4, target: '4×6', f: ['lb', 'reps'] },
      { n: 'Pull-ups', sets: 4, target: '4×max', f: ['+lb', 'reps'] },
      { n: 'Overhead press', sets: 3, target: '3×8', f: ['lb', 'reps'] },
      { n: 'Rows', sets: 3, target: '3×10', f: ['lb', 'reps'] },
      { n: 'Curls', sets: 2, target: '2×12', f: ['lb', 'reps'] },
      { n: 'Triceps', sets: 2, target: '2×12', f: ['lb', 'reps'] },
    ] },
    { name: 'Easy Cardio', short: 'Wed', ex: [
      { n: 'Easy cardio', sets: 1, target: '30–40 min', f: ['min'] },
    ] },
    { name: 'Lower + Speed', short: 'Thu', ex: [
      { n: '20m sprints', sets: 6, target: '6×20m', f: ['sec'] },
      { n: 'Broad jumps', sets: 4, target: '4×3', f: ['in', 'reps'] },
      { n: 'Trap bar deadlift', sets: 4, target: '4×5', f: ['lb', 'reps'] },
      { n: 'Bulgarian split squats', sets: 3, target: '3×8/leg', f: ['lb', 'reps'] },
      { n: 'Plank', sets: 3, target: '3×45s', f: ['sec'] },
    ] },
    { name: 'Upper', short: 'Fri', ex: [
      { n: 'Incline DB press', sets: 4, target: '4×8', f: ['lb', 'reps'] },
      { n: 'Chin-ups', sets: 4, target: '4×max', f: ['+lb', 'reps'] },
      { n: 'Dips', sets: 3, target: '3×10', f: ['+lb', 'reps'] },
      { n: 'Lateral raises', sets: 3, target: '3×15', f: ['lb', 'reps'] },
      { n: 'Face pulls', sets: 3, target: '3×15', f: ['lb', 'reps'] },
    ] },
    { name: 'Conditioning', short: 'Sat', ex: [
      { n: 'Intervals: 30s hard / 90s easy', sets: 1, target: '8 rounds', f: ['rounds'] },
      { n: 'Easy cardio finisher', sets: 1, target: '20 min', f: ['min'] },
    ] },
  ];

  const defaultState = () => ({
    v: 1,
    settings: {
      startDate: '2026-10-25',
      calTarget: 3000,
      proteinTarget: 160,
      startWeight: 155,
      goalWeight: 162,
      bedtime: '23:00',
      theme: 'dark',
    },
    habits: DEFAULT_HABITS.map(h => ({ ...h })),
    foods: DEFAULT_FOODS.map(f => ({ ...f })),
    days: {},
    urgesBeaten: 0,
  });

  // ---------- Storage ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.settings) return normalize(s);
    } catch (e) {}
    return defaultState();
  }
  function normalize(s) {
    const d = defaultState();
    return {
      ...d, ...s,
      settings: { ...d.settings, ...s.settings },
      habits: Array.isArray(s.habits) ? s.habits : d.habits,
      foods: Array.isArray(s.foods) ? s.foods : d.foods,
      days: s.days && typeof s.days === 'object' ? s.days : {},
    };
  }
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save. Storage may be full.'); }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
  }

  let state = load();
  const ui = { tab: 'today', viewDate: null, lastToday: null };

  // ---------- Helpers ----------
  const $ = sel => document.querySelector(sel);
  const view = $('#view');
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / DAY_MS);
  const todayKey = () => keyOf(new Date());
  const curKey = () => ui.viewDate || todayKey();
  const startKey = () => state.settings.startDate;
  const endKey = () => addDays(startKey(), DAYS - 1);
  const dayNum = k => diffDays(startKey(), k) + 1;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const fmtDay = k => parse(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtLong = k => parse(k).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const fmtShort = k => parse(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fmtTime = hm => {
    const [h, m] = (hm || '23:00').split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };
  const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  const EMPTY_DAY = { habits: {}, food: [], workout: {} };
  const getDay = k => state.days[k] || EMPTY_DAY;
  function day(k) {
    if (!state.days[k]) state.days[k] = { habits: {}, food: [], workout: {} };
    const d = state.days[k];
    d.habits = d.habits || {}; d.food = d.food || []; d.workout = d.workout || {};
    return d;
  }
  const hasHabit = id => state.habits.some(h => h.id === id);
  // Habits added mid-challenge only count from the day they were added.
  const habitsFor = k => state.habits.filter(h => !h.added || h.added <= k);
  function completion(k) {
    const hs = habitsFor(k);
    if (!hs.length) return 0;
    const d = getDay(k);
    return hs.filter(h => d.habits[h.id]).length / hs.length;
  }
  const isComplete = k => habitsFor(k).length > 0 && completion(k) === 1;

  // Count back from today (or yesterday, if today isn't done yet) while pred holds.
  function runLength(pred) {
    const t = todayKey();
    let k = pred(t) ? t : addDays(t, -1);
    let c = 0;
    while (k >= startKey() && pred(k)) { c++; k = addDays(k, -1); }
    return c;
  }
  const streak = () => runLength(isComplete);
  const gambleFree = () => runLength(k => !!getDay(k).habits.nogamble);

  const sessionIdx = k => { const d = getDay(k); return Number.isInteger(d.session) ? d.session : parse(k).getDay(); };
  const sessionFor = k => SCHEDULE[sessionIdx(k)];

  function totals(k) {
    return getDay(k).food.reduce((t, f) => {
      t.cal += num(f.cal); t.p += num(f.p); t.c += num(f.c); t.f += num(f.f);
      return t;
    }, { cal: 0, p: 0, c: 0, f: 0 });
  }

  // Auto-check the protein habit when the log crosses the target; undo it if entries are removed.
  function syncProtein(k) {
    if (!hasHabit('protein')) return false;
    const d = day(k);
    const hit = totals(k).p >= state.settings.proteinTarget;
    if (hit && !d.habits.protein) { d.habits.protein = true; d.autoProtein = true; return true; }
    if (!hit && d.habits.protein && d.autoProtein) { d.habits.protein = false; d.autoProtein = false; }
    return false;
  }

  // ---------- Toast & undo ----------
  let toastTimer, pendingUndo = null;
  function toast(msg, undo) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-action="undo">Undo</button>' : ''}`;
    el.hidden = false;
    pendingUndo = undo || null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; pendingUndo = null; }, undo ? 4500 : 2200);
  }
  const snapshot = () => JSON.stringify(state);
  const restorer = snap => () => { state = JSON.parse(snap); save(); render(); };

  // ---------- Sheets ----------
  function openSheet(html, full) {
    $('#sheet-root').innerHTML = `<div class="overlay"><div class="sheet${full ? ' full' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  }
  function closeSheet() {
    $('#sheet-root').innerHTML = '';
    stopUrgeTick();
  }
  const sheetHead = title => `<div class="sheet-head"><h3>${title}</h3><button class="icon-btn" data-action="close-sheet" aria-label="Close">✕</button></div>`;

  function confirmSheet(title, body, okLabel, onOk, danger) {
    pendingConfirm = onOk;
    openSheet(`${sheetHead(title)}<p class="sub" style="font-size:15px;margin:0 0 20px">${body}</p>
      <div class="stack">
        <button class="btn block ${danger ? 'danger' : 'primary'}" data-action="confirm-ok">${okLabel}</button>
        <button class="btn block ghost" data-action="close-sheet">Cancel</button>
      </div>`);
  }
  let pendingConfirm = null;

  // ---------- Shared bits ----------
  function viewingBanner() {
    if (!ui.viewDate || ui.viewDate === todayKey()) return '';
    return `<div class="banner"><span>Editing ${fmtDay(ui.viewDate)}</span><button data-action="back-today">Back to today</button></div>`;
  }
  function bar(value, target, cls = '') {
    const pct = target > 0 ? clamp(value / target, 0, 1) * 100 : 0;
    return `<div class="bar ${cls}"><i style="width:${pct}%"></i></div>`;
  }

  // ---------- Today ----------
  function habitHint(h, k) {
    const s = state.settings;
    if (h.id === 'protein') return `${Math.round(totals(k).p)} / ${s.proteinTarget} g logged`;
    if (h.id === 'train') return sessionFor(k).name;
    if (h.id === 'sleep') return `Target: ${fmtTime(s.bedtime)}`;
    return '';
  }

  function viewToday() {
    const k = curKey(), s = state.settings, n = dayNum(k), d = getDay(k);
    let headline;
    if (n < 1) headline = `Starts in ${plural(1 - n, 'day')}`;
    else if (n > DAYS) headline = 'Challenge complete';
    else headline = `Day ${n} <span class="of">of ${DAYS}</span>`;
    const pct = clamp(n / DAYS, 0, 1) * 100;

    const hs = habitsFor(k);
    const done = hs.filter(h => d.habits[h.id]).length;
    const habits = hs.map(h => {
      const on = !!d.habits[h.id];
      const hint = habitHint(h, k);
      return `<button class="habit${on ? ' on' : ''}" data-action="habit" data-id="${esc(h.id)}" aria-pressed="${on}">
        <span class="check">${CHECK_SVG}</span>
        <span class="grow"><div class="label">${esc(h.name)}</div>${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</span>
      </button>`;
    }).join('');

    const sess = sessionFor(k);
    const t = totals(k);
    const w = d.weight;

    return `
      ${viewingBanner()}
      <header class="dayhead">
        <div class="eyebrow">${fmtLong(k)}</div>
        <h1 class="num">${headline}</h1>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </header>

      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>day streak</span></div>
        ${hasHabit('nogamble')
          ? `<div class="stat"><b>${gambleFree()}</b><span>days gambling-free</span></div>`
          : `<div class="stat"><b>${done}/${hs.length}</b><span>done today</span></div>`}
      </div>

      <h2>Habits · <span class="num">${done}/${hs.length}</span></h2>
      <div class="habits">${habits || '<div class="empty">No habits yet. Add some in Settings.</div>'}</div>

      <h2>Session</h2>
      <div class="card">
        <span class="tag">${sess.short}</span>
        <div class="session-title">${esc(sess.name)}</div>
        <details class="workout">
          <summary>Full workout ▾</summary>
          <ul class="exlist">${sess.ex.map(e => `<li><span>${esc(e.n)}</span><span>${esc(e.target)}</span></li>`).join('')}</ul>
          <button class="btn primary block" style="margin-top:12px" data-action="go" data-to="train">Log workout</button>
        </details>
      </div>

      <h2>Macros</h2>
      <button class="card" style="display:block;width:100%;text-align:left;border:0" data-action="go" data-to="food">
        <div class="macro-line"><span>Calories</span><span class="num">${Math.round(t.cal)} <span class="sub">/ ${s.calTarget}</span></span></div>
        ${bar(t.cal, s.calTarget)}
        <div class="macro-line" style="margin-top:14px"><span>Protein</span><span class="num">${Math.round(t.p)}g <span class="sub">/ ${s.proteinTarget}g</span></span></div>
        ${bar(t.p, s.proteinTarget, 'protein')}
      </button>

      <h2>Morning weight</h2>
      <div class="card row">
        <div class="unit-wrap grow">
          <input class="input num" type="number" inputmode="decimal" step="0.1" placeholder="${esc(lastWeight(k) ?? s.startWeight)}" value="${w ?? ''}" data-weight="${k}" aria-label="Morning bodyweight in pounds">
          <small>lb</small>
        </div>
        ${w ? '<span class="tag">Logged ✓</span>' : ''}
      </div>
    `;
  }

  function lastWeight(beforeKey) {
    const ks = Object.keys(state.days).filter(x => x < beforeKey && state.days[x].weight).sort();
    return ks.length ? state.days[ks[ks.length - 1]].weight : null;
  }

  // ---------- Food ----------
  function ring(value, target, color, label, unit) {
    const r = 58, c = 2 * Math.PI * r;
    const pct = target > 0 ? clamp(value / target, 0, 1) : 0;
    const left = Math.round(target - value);
    return `<div class="ring-card">
      <div class="ring">
        <svg viewBox="0 0 132 132" aria-hidden="true">
          <circle class="track" cx="66" cy="66" r="${r}"/>
          <circle class="val" cx="66" cy="66" r="${r}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>
        </svg>
        <div class="center"><b>${Math.round(value)}</b><small>/ ${target}${unit}</small></div>
      </div>
      <div class="label">${label}</div>
      <div class="left num">${left > 0 ? `${left}${unit} to go` : `Target hit ✓ +${-left}${unit}`}</div>
    </div>`;
  }

  function viewFood() {
    const k = curKey(), s = state.settings, t = totals(k), d = getDay(k);
    const quick = state.foods.map(f => `<button class="qbtn" data-action="food-quick" data-id="${esc(f.id)}">
        <b>${esc(f.name)}</b><span class="num">${f.cal} cal · ${f.p}g</span></button>`).join('');
    const log = d.food.slice().reverse().map(f => `<div class="log-item">
        <div class="grow"><b>${esc(f.name)}</b>
          <span class="num">${Math.round(num(f.cal))} cal · ${Math.round(num(f.p))}g protein${f.c ? ` · ${f.c}g carbs` : ''}${f.f ? ` · ${f.f}g fat` : ''}</span></div>
        <button class="icon-btn plain" data-action="food-del" data-id="${esc(f.id)}" aria-label="Delete ${esc(f.name)}">✕</button>
      </div>`).join('');

    return `
      ${viewingBanner()}
      <header class="dayhead"><div class="eyebrow">${fmtLong(k)}</div><h1>Food</h1></header>
      <div class="rings">
        ${ring(t.cal, s.calTarget, 'var(--accent)', 'Calories', '')}
        ${ring(t.p, s.proteinTarget, 'var(--protein)', 'Protein', 'g')}
      </div>
      ${t.c || t.f ? `<div class="sub num" style="text-align:center;margin:-4px 0 8px">Carbs ${Math.round(t.c)}g · Fat ${Math.round(t.f)}g</div>` : ''}

      <h2>Quick add</h2>
      <div class="quick">${quick}</div>
      <button class="btn block" style="margin-top:8px" data-action="food-custom">+ Custom entry</button>

      <h2>Log · <span class="num">${d.food.length}</span></h2>
      <div class="log">${log || '<div class="empty">Nothing logged yet. Tap a quick-add above.</div>'}</div>
    `;
  }

  function customFoodSheet() {
    openSheet(`${sheetHead('Custom entry')}
      <label class="field"><span>Name</span><input class="input" id="cf-name" placeholder="e.g. Paneer wrap" autocomplete="off"></label>
      <div class="grid2">
        <label class="field"><span>Calories</span><input class="input num" id="cf-cal" type="number" inputmode="numeric"></label>
        <label class="field"><span>Protein (g)</span><input class="input num" id="cf-p" type="number" inputmode="decimal"></label>
        <label class="field"><span>Carbs (g, optional)</span><input class="input num" id="cf-c" type="number" inputmode="decimal"></label>
        <label class="field"><span>Fat (g, optional)</span><input class="input num" id="cf-f" type="number" inputmode="decimal"></label>
      </div>
      <label class="checkline"><input type="checkbox" id="cf-save"> Save as a quick-add button</label>
      <button class="btn primary block" style="margin-top:12px" data-action="food-custom-add">Add to log</button>`);
    setTimeout(() => $('#cf-name') && $('#cf-name').focus(), 50);
  }

  function addFood(f) {
    const k = curKey();
    const snap = snapshot();
    day(k).food.push({ id: uid(), name: f.name, cal: num(f.cal), p: num(f.p), c: num(f.c) || undefined, f: num(f.f) || undefined, t: Date.now() });
    const hit = syncProtein(k);
    save(); render(); buzz();
    toast(hit ? `Protein goal hit ✓` : `Added ${f.name}`, restorer(snap));
  }

  // ---------- Train ----------
  function lastLog(name, beforeKey) {
    const ks = Object.keys(state.days).filter(x => x < beforeKey).sort().reverse();
    for (const k of ks) {
      const sets = state.days[k].workout && state.days[k].workout[name];
      if (sets && sets.some(s => s.some(v => v !== '' && v != null))) return { k, sets };
    }
    return null;
  }
  function fmtSet(s, ex) {
    if (ex.f.length === 1) return s[0] ? `${s[0]} ${ex.f[0]}` : '';
    const [a, b] = s;
    if (!a && !b) return '';
    if (ex.f[0] === '+lb') return a && num(a) > 0 ? `+${a}×${b || '?'}` : `${b || '?'} reps`;
    return a ? `${a}×${b || '?'}` : `${b} reps`;
  }

  function viewTrain() {
    const k = curKey(), d = getDay(k);
    const idx = sessionIdx(k), sess = SCHEDULE[idx], dflt = parse(k).getDay();
    const chips = SCHEDULE.map((sc, i) => `<button class="chip${i === idx ? ' on' : ''}${i === dflt ? ' today' : ''}" data-action="session-pick" data-idx="${i}">${sc.short}</button>`).join('');
    const doneOn = !!d.habits.train;

    const cards = sess.ex.map((ex, ei) => {
      const logged = (d.workout[ex.n] || []);
      const last = lastLog(ex.n, k);
      const lastStr = last ? last.sets.map(s => fmtSet(s, ex)).filter(Boolean).join(' · ') : '';
      const rows = Math.max(ex.sets, logged.length);
      let sets = '';
      for (let si = 0; si < rows; si++) {
        const cur = logged[si] || [];
        const prev = last && last.sets[si] || [];
        const inputs = ex.f.map((f, fi) => `<div class="unit-wrap"><input class="input num" type="number"
            inputmode="${f === 'reps' || f === 'rounds' ? 'numeric' : 'decimal'}" step="any"
            value="${esc(cur[fi] ?? '')}" placeholder="${esc(prev[fi] || '')}"
            data-ex="${ei}" data-set="${si}" data-f="${fi}" aria-label="${esc(ex.n)} set ${si + 1} ${f}"><small>${f}</small></div>`).join('');
        sets += `<div class="set${ex.f.length === 1 ? ' one' : ''}"><span class="n">${ex.sets === 1 && rows === 1 ? '' : `Set ${si + 1}`}</span>${inputs}</div>`;
      }
      return `<div class="ex">
        <div class="ex-head"><b>${esc(ex.n)}</b><span class="ex-target">${esc(ex.target)}</span></div>
        <div class="ex-last">${last ? `Last (${fmtShort(last.k)}): <b>${esc(lastStr)}</b>` : 'No previous session. Set the baseline.'}</div>
        ${sets}
        <button class="link" data-action="set-add" data-ex="${ei}">+ Add set</button>
      </div>`;
    }).join('');

    return `
      ${viewingBanner()}
      <header class="dayhead"><div class="eyebrow">${fmtLong(k)}</div><h1>${esc(sess.name)}</h1></header>
      <div class="chips" role="group" aria-label="Choose session">${chips}</div>
      ${cards}
      ${hasHabit('train') ? `<button class="btn block ${doneOn ? '' : 'primary'}" data-action="habit" data-id="train">${doneOn ? 'Session done ✓ (tap to undo)' : 'Mark session done'}</button>` : ''}
    `;
  }

  // ---------- Progress ----------
  const CH = { W: 340, H: 210, L: 34, R: 12, T: 14, B: 26 };
  let chartPts = [], chartY = null;

  function weightSeries() {
    const s = state.settings, t = todayKey();
    const pts = [];
    for (let i = 0; i < DAYS; i++) {
      const k = addDays(startKey(), i);
      pts.push({ i, k, w: (state.days[k] && state.days[k].weight) || null });
    }
    const lastIdx = pts.reduce((m, p) => (p.w ? p.i : m), -1);
    const step = (s.goalWeight - s.startWeight) / (DAYS - 1);
    for (const p of pts) {
      p.target = s.startWeight + step * p.i;
      p.avg = null;
      if (p.i > lastIdx || p.k > t) continue;
      let sum = 0, n = 0;
      for (let j = Math.max(0, p.i - 6); j <= p.i; j++) if (pts[j].w) { sum += pts[j].w; n++; }
      if (n) p.avg = sum / n;
    }
    return pts;
  }

  function chartSVG(pts) {
    const { W, H, L, R, T, B } = CH;
    const vals = pts.flatMap(p => [p.w, p.target]).filter(Boolean);
    let lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
    let step = 1;
    while ((hi - lo) / step > 6) step *= 2;
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const X = i => L + (i / (DAYS - 1)) * (W - L - R);
    const Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    chartY = { X, Y };

    let grid = '';
    for (let v = lo; v <= hi; v += step) {
      grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    const ticks = [0, 14, 29, 44, 59].map(i => `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === 59 ? 'end' : 'middle'}">${fmtShort(pts[i].k)}</text>`).join('');

    let path = '', pen = false;
    for (const p of pts) {
      if (p.avg == null) { pen = false; continue; }
      path += `${pen ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.avg).toFixed(1)}`;
      pen = true;
    }
    const dots = pts.filter(p => p.w).map(p => `<circle class="dot" cx="${X(p.i)}" cy="${Y(p.w)}" r="4"/>`).join('');

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bodyweight over the 60 days with 7-day average and target line">
      ${grid}${ticks}
      <line class="target" x1="${X(0)}" y1="${Y(pts[0].target)}" x2="${X(DAYS - 1)}" y2="${Y(pts[DAYS - 1].target)}"/>
      ${dots}
      <path class="avg" d="${path}"/>
      <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"/>
      <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent"/>
    </svg>`;
  }

  function avgWindow(end, len = 7) {
    let sum = 0, n = 0;
    for (let i = 0; i < len; i++) {
      const dd = state.days[addDays(end, -i)];
      if (dd && dd.weight) { sum += dd.weight; n++; }
    }
    return n ? { avg: sum / n, n } : null;
  }

  function trend() {
    const s = state.settings;
    const t = todayKey() < endKey() ? todayKey() : endKey();
    const a0 = avgWindow(t), a1 = avgWindow(addDays(t, -7)), a2 = avgWindow(addDays(t, -14));
    const ok = a => a && a.n >= 3;
    const weekly = ok(a0) && ok(a1) ? a0.avg - a1.avg : null;
    const twoWeek = ok(a0) && ok(a2) ? a0.avg - a2.avg : null;
    const rate = (s.goalWeight - s.startWeight) / (DAYS / 7);
    let hint;
    if (weekly != null && weekly > 1) {
      hint = { title: 'Gaining fast', body: `Up ${weekly.toFixed(1)} lb this week. Eat ~200 cal less per day.` };
    } else if (twoWeek != null && twoWeek < 0.3) {
      hint = { title: 'Scale hasn’t moved in 2 weeks', body: 'Eat ~200 cal more per day.' };
    } else if (weekly != null) {
      hint = { title: 'On track', body: `Target pace is ~${rate.toFixed(1)} lb/week. Keep it steady.` };
    } else {
      hint = { title: 'Building a trend', body: 'Weigh in most mornings (3+ per week). The weekly change shows up after 2 weeks of data.' };
    }
    return { avg: a0 && a0.avg, weekly, hint };
  }

  function calendar() {
    const t = todayKey(), start = startKey();
    const offset = parse(start).getDay();
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) cells += '<div></div>';
    for (let i = 0; i < DAYS; i++) {
      const k = addDays(start, i);
      const dt = parse(k);
      const label = dt.getDate();
      const mon = i === 0 || label === 1 ? `<small>${dt.toLocaleDateString(undefined, { month: 'short' })}</small>` : '';
      const cls = [k === t ? 'today' : '', ui.viewDate === k && k !== t ? 'viewing' : ''].join(' ');
      if (k > t) {
        cells += `<button class="future ${cls}" disabled aria-label="${fmtDay(k)}, upcoming">${mon}${label}</button>`;
      } else {
        const pct = Math.round(completion(k) * 100);
        const ink = pct >= 55 ? 'var(--accent-ink)' : 'var(--text)';
        cells += `<button class="${cls}" style="background:color-mix(in srgb, var(--accent) ${pct}%, var(--cal-0));color:${ink}"
          data-action="open-day" data-k="${k}" aria-label="${fmtDay(k)}, ${pct}% complete">${mon}${label}</button>`;
      }
    }
    return `<div class="cal">${cells}</div>
      <div class="cal-legend">0%
        <i style="background:var(--cal-0)"></i>
        <i style="background:color-mix(in srgb, var(--accent) 50%, var(--cal-0))"></i>
        <i style="background:var(--accent)"></i>100%</div>`;
  }

  function viewProgress() {
    const k = curKey(), s = state.settings, d = getDay(k);
    const pts = weightSeries();
    chartPts = pts;
    const tr = trend();
    const latest = pts.filter(p => p.w).pop();
    const toGo = latest ? s.goalWeight - (tr.avg || latest.w) : s.goalWeight - s.startWeight;
    const rows = pts.filter(p => p.w).reverse().map(p => `<li><span>${fmtDay(p.k)}</span><span class="num">${p.w.toFixed(1)} lb${p.avg ? ` · avg ${p.avg.toFixed(1)}` : ''}</span></li>`).join('');

    return `
      ${viewingBanner()}
      <header class="dayhead"><h1>Progress</h1></header>

      <div class="card">
        <div class="row">
          <div class="grow"><b>Morning weight</b><div class="sub">${fmtDay(k)}</div></div>
          <div class="unit-wrap" style="width:130px">
            <input class="input num" type="number" inputmode="decimal" step="0.1" placeholder="${esc(lastWeight(k) ?? s.startWeight)}"
              value="${d.weight ?? ''}" data-weight="${k}" aria-label="Morning bodyweight in pounds"><small>lb</small>
          </div>
        </div>
      </div>

      <div class="stats" style="grid-template-columns:1fr 1fr 1fr">
        <div class="stat"><b style="font-size:24px">${tr.avg ? tr.avg.toFixed(1) : '—'}</b><span>7-day avg</span></div>
        <div class="stat"><b style="font-size:24px">${tr.weekly != null ? (tr.weekly >= 0 ? '+' : '') + tr.weekly.toFixed(1) : '—'}</b><span>lb / week</span></div>
        <div class="stat"><b style="font-size:24px">${toGo > 0 ? toGo.toFixed(1) : '0'}</b><span>lb to ${s.goalWeight}</span></div>
      </div>

      <div class="card">
        <div class="chart-wrap">${chartSVG(pts)}<div class="tip" hidden></div></div>
        <div class="legend">
          <span><i class="l-dot"></i>Daily weigh-in</span>
          <span><i class="l-avg"></i>7-day average</span>
          <span><i class="l-target"></i>Target ${s.startWeight}→${s.goalWeight}</span>
        </div>
        <div class="hint-box"><b>${esc(tr.hint.title)}</b>${esc(tr.hint.body)}</div>
        ${rows ? `<details class="workout"><summary>All weigh-ins ▾</summary><ul class="exlist">${rows}</ul></details>` : ''}
      </div>

      <h2>History · tap a day to edit</h2>
      <div class="card">${calendar()}</div>
    `;
  }

  function bindChart() {
    const svg = view.querySelector('.chart');
    if (!svg) return;
    const tip = view.querySelector('.tip');
    const cross = svg.querySelector('.cross');
    const { W, L, R } = CH;
    const show = e => {
      const r = svg.getBoundingClientRect();
      const sx = (e.clientX - r.left) * (W / r.width);
      const i = clamp(Math.round(((sx - L) / (W - L - R)) * (DAYS - 1)), 0, DAYS - 1);
      const p = chartPts[i];
      const x = chartY.X(i);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.style.display = '';
      tip.innerHTML = `<b>${fmtShort(p.k)} · Day ${i + 1}</b>${p.w ? `Weight ${p.w.toFixed(1)} lb` : 'No weigh-in'}<br>${p.avg ? `7-day avg ${p.avg.toFixed(1)}<br>` : ''}Target ${p.target.toFixed(1)}`;
      tip.hidden = false;
      const half = tip.offsetWidth / 2 + 4;
      tip.style.left = clamp(x * r.width / W, half, r.width - half) + 'px';
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', () => { cross.style.display = 'none'; tip.hidden = true; });
  }

  // ---------- Settings ----------
  function viewSettings() {
    const s = state.settings;
    const habits = state.habits.map((h, i) => `<div class="item">
        <input class="input grow" value="${esc(h.name)}" data-habit-name="${esc(h.id)}" aria-label="Habit name">
        <button class="icon-btn" data-action="habit-move" data-id="${esc(h.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="icon-btn" data-action="habit-move" data-id="${esc(h.id)}" data-dir="1" ${i === state.habits.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="icon-btn plain" data-action="habit-del" data-id="${esc(h.id)}" aria-label="Remove habit">✕</button>
      </div>`).join('');
    const foods = state.foods.map(f => `<div class="food-edit">
        <input class="input" value="${esc(f.name)}" data-food="${esc(f.id)}" data-key="name" aria-label="Food name">
        <div class="unit-wrap"><input class="input num" type="number" inputmode="numeric" value="${f.cal}" data-food="${esc(f.id)}" data-key="cal" aria-label="Calories"><small>cal</small></div>
        <div class="unit-wrap"><input class="input num" type="number" inputmode="decimal" value="${f.p}" data-food="${esc(f.id)}" data-key="p" aria-label="Protein grams"><small>g</small></div>
        <button class="icon-btn plain" data-action="food-preset-del" data-id="${esc(f.id)}" aria-label="Remove ${esc(f.name)}">✕</button>
      </div>`).join('');

    return `
      <header class="dayhead"><h1>Settings</h1></header>

      <div class="card toggle-row">
        <b>Theme</b>
        <div class="seg">
          <button class="${s.theme !== 'light' ? 'on' : ''}" data-action="theme" data-v="dark">Dark</button>
          <button class="${s.theme === 'light' ? 'on' : ''}" data-action="theme" data-v="light">Light</button>
        </div>
      </div>

      <h2>Targets</h2>
      <div class="card">
        <div class="grid2">
          <label class="field"><span>Calories / day</span><input class="input num" type="number" inputmode="numeric" value="${s.calTarget}" data-setting="calTarget"></label>
          <label class="field"><span>Protein / day (g)</span><input class="input num" type="number" inputmode="numeric" value="${s.proteinTarget}" data-setting="proteinTarget"></label>
          <label class="field"><span>Start weight (lb)</span><input class="input num" type="number" inputmode="decimal" step="0.1" value="${s.startWeight}" data-setting="startWeight"></label>
          <label class="field"><span>Goal weight (lb)</span><input class="input num" type="number" inputmode="decimal" step="0.1" value="${s.goalWeight}" data-setting="goalWeight"></label>
          <label class="field"><span>Start date</span><input class="input" type="date" value="${s.startDate}" data-setting="startDate"></label>
          <label class="field"><span>Bedtime target</span><input class="input" type="time" value="${s.bedtime}" data-setting="bedtime"></label>
        </div>
        <div class="sub">Challenge runs ${fmtDay(startKey())} → ${fmtDay(endKey())}.</div>
      </div>

      <h2>Habits</h2>
      <div class="list-edit">${habits}
        <div class="item"><input class="input grow" id="new-habit" placeholder="New habit" aria-label="New habit name">
          <button class="btn sm primary" data-action="habit-add">Add</button></div>
      </div>

      <h2>Quick-add foods</h2>
      <div class="list-edit">${foods}
        <div class="item"><button class="btn sm block" data-action="food-preset-add">+ Add food</button></div>
      </div>

      <h2>Backup</h2>
      <div class="card stack">
        <button class="btn block" data-action="export">Export data (JSON)</button>
        <label class="btn block" style="cursor:pointer">Import from backup<input type="file" accept="application/json,.json" id="import-file" hidden></label>
        <div class="sub">Everything is stored only on this device. Export a backup every week or two.</div>
      </div>

      <h2>Danger zone</h2>
      <button class="btn block ghost" style="color:var(--danger)" data-action="reset">Reset all data</button>
      <p class="sub" style="text-align:center;margin-top:24px">Sixty · ${state.urgesBeaten || 0} urges ridden out</p>
    `;
  }

  function exportData() {
    const json = JSON.stringify(state, null, 2);
    const name = `sixty-backup-${todayKey()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
      navigator.share({ files: [file], title: name }).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { toast('That file isn’t valid JSON'); return; }
      if (!data || !data.settings || !data.days) { toast('That doesn’t look like a Sixty backup'); return; }
      const n = Object.keys(data.days).length;
      confirmSheet('Import backup?', `This replaces everything on this device with the backup (${plural(n, 'day')} of data).`, 'Replace with backup', () => {
        state = normalize(data); save(); applyTheme(); render(); toast('Backup imported');
      });
    };
    reader.readAsText(file);
  }

  // ---------- Urge screen ----------
  const URGE_MS = 10 * 60 * 1000;
  const urge = { end: null, remaining: URGE_MS, tick: null };
  const urgeLeft = () => (urge.end ? Math.max(0, urge.end - Date.now()) : urge.remaining);
  const fmtMS = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };

  function openUrge() {
    const gf = hasHabit('nogamble') ? gambleFree() : null;
    openSheet(`${sheetHead('Ride it out')}
      ${gf != null ? `<p class="sub" style="margin:-8px 0 16px;font-size:15px">You’re ${plural(gf, 'day')} gambling-free. An urge is a wave. It peaks and passes.</p>` : ''}
      <div class="urge-call">
        <div class="sub">Free, confidential, 24/7. Call or text:</div>
        <div class="big">1-800-GAMBLER</div>
        <div class="sub" style="margin:-8px 0 12px">(1-800-426-2537)</div>
        <div class="grid2">
          <a class="btn primary" href="tel:+18004262537" style="text-decoration:none">Call</a>
          <a class="btn" href="sms:+18004262537" style="text-decoration:none">Text</a>
        </div>
      </div>
      <div class="card" style="text-align:center">
        <div class="sub">Wait 10 minutes before doing anything</div>
        <div class="timer" id="urge-timer">${fmtMS(urgeLeft())}</div>
        <div class="grid2">
          <button class="btn primary" data-action="urge-toggle" id="urge-toggle">${urge.end ? 'Pause' : urgeLeft() < URGE_MS ? 'Resume' : 'Start'}</button>
          <button class="btn" data-action="urge-reset">Reset</button>
        </div>
      </div>
      <h2>Do this instead</h2>
      <ul class="todo-list">
        <li>Go for a 10-minute walk (leave your phone in your pocket)</li>
        <li>Do 20 pushups</li>
        <li>Text a friend</li>
        <li>Drink a big glass of water</li>
      </ul>`, true);
    if (urge.end) startUrgeTick();
  }
  function startUrgeTick() {
    stopUrgeTick();
    urge.tick = setInterval(() => {
      const left = urgeLeft();
      const el = $('#urge-timer');
      if (el) el.textContent = fmtMS(left);
      if (left <= 0) urgeFinished();
    }, 250);
  }
  function stopUrgeTick() { clearInterval(urge.tick); urge.tick = null; }
  function urgeFinished() {
    stopUrgeTick();
    urge.end = null; urge.remaining = URGE_MS;
    state.urgesBeaten = (state.urgesBeaten || 0) + 1;
    save();
    try { navigator.vibrate && navigator.vibrate([80, 60, 80]); } catch (e) {}
    const el = $('#urge-timer'); if (el) el.textContent = 'Done 💪';
    const btn = $('#urge-toggle'); if (btn) btn.textContent = 'Start';
    toast(`Urge ridden out. That’s ${state.urgesBeaten}.`);
  }

  // ---------- Render ----------
  const VIEWS = { today: viewToday, food: viewFood, train: viewTrain, progress: viewProgress, settings: viewSettings };
  function render() {
    ui.lastToday = todayKey();
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.tab === ui.tab;
      t.classList.toggle('on', on);
      t.setAttribute('aria-current', on ? 'page' : 'false');
    });
    view.innerHTML = VIEWS[ui.tab]();
    if (ui.tab === 'progress') bindChart();
  }
  function go(tab) {
    ui.tab = tab;
    render();
    window.scrollTo(0, 0);
  }
  function applyTheme() {
    const light = state.settings.theme === 'light';
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]').content = light ? '#f3f4f6' : '#0b0d10';
  }

  // ---------- Events ----------
  document.addEventListener('click', e => {
    if (e.target.classList.contains('overlay')) { closeSheet(); return; }
    const tab = e.target.closest('.tab');
    if (tab) { go(tab.dataset.tab); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action, k = curKey();

    switch (a) {
      case 'habit': {
        const d = day(k), id = el.dataset.id;
        d.habits[id] = !d.habits[id];
        if (id === 'protein') d.autoProtein = false;
        save(); buzz(); render();
        if (d.habits[id] && isComplete(k)) toast(k === todayKey() ? `All done. ${plural(streak(), 'day')} streak 🔥` : 'Day complete ✓');
        break;
      }
      case 'go': go(el.dataset.to); break;
      case 'back-today': ui.viewDate = null; render(); break;
      case 'open-day': {
        const dk = el.dataset.k;
        ui.viewDate = dk === todayKey() ? null : dk;
        go('today');
        break;
      }
      case 'food-quick': {
        const f = state.foods.find(x => x.id === el.dataset.id);
        if (f) addFood(f);
        break;
      }
      case 'food-custom': customFoodSheet(); break;
      case 'food-custom-add': {
        const name = $('#cf-name').value.trim() || 'Custom food';
        const f = { name, cal: num($('#cf-cal').value), p: num($('#cf-p').value), c: num($('#cf-c').value), f: num($('#cf-f').value) };
        if (!f.cal && !f.p) { toast('Enter calories or protein'); break; }
        if ($('#cf-save').checked) state.foods.push({ id: uid(), name, cal: f.cal, p: f.p, ...(f.c ? { c: f.c } : {}), ...(f.f ? { f: f.f } : {}) });
        closeSheet();
        addFood(f);
        break;
      }
      case 'food-del': {
        const d = day(k), snap = snapshot();
        d.food = d.food.filter(f => f.id !== el.dataset.id);
        syncProtein(k); save(); render();
        toast('Entry deleted', restorer(snap));
        break;
      }
      case 'session-pick': {
        const d = day(k), i = Number(el.dataset.idx);
        if (i === parse(k).getDay()) delete d.session; else d.session = i;
        save(); render();
        break;
      }
      case 'set-add': {
        const ex = sessionFor(k).ex[Number(el.dataset.ex)];
        const d = day(k);
        const sets = d.workout[ex.n] = d.workout[ex.n] || [];
        while (sets.length < ex.sets) sets.push(ex.f.map(() => ''));
        sets.push(ex.f.map(() => ''));
        save(); render();
        break;
      }
      case 'theme': state.settings.theme = el.dataset.v; save(); applyTheme(); render(); break;
      case 'habit-move': {
        const i = state.habits.findIndex(h => h.id === el.dataset.id), j = i + Number(el.dataset.dir);
        if (i < 0 || j < 0 || j >= state.habits.length) break;
        [state.habits[i], state.habits[j]] = [state.habits[j], state.habits[i]];
        save(); render();
        break;
      }
      case 'habit-del': {
        const snap = snapshot(), h = state.habits.find(x => x.id === el.dataset.id);
        state.habits = state.habits.filter(x => x.id !== el.dataset.id);
        save(); render();
        toast(`Removed “${h ? h.name : 'habit'}”`, restorer(snap));
        break;
      }
      case 'habit-add': {
        const input = $('#new-habit'), name = input.value.trim();
        if (!name) { input.focus(); break; }
        state.habits.push({ id: 'h' + uid(), name, added: todayKey() });
        save(); render();
        toast('Habit added');
        break;
      }
      case 'food-preset-add':
        state.foods.push({ id: uid(), name: 'New food', cal: 0, p: 0 });
        save(); render();
        break;
      case 'food-preset-del': {
        const snap = snapshot();
        state.foods = state.foods.filter(f => f.id !== el.dataset.id);
        save(); render();
        toast('Quick-add removed', restorer(snap));
        break;
      }
      case 'export': exportData(); break;
      case 'reset':
        confirmSheet('Reset everything?', 'This erases all habits, food logs, workouts, and weigh-ins on this device. It can’t be undone. Export a backup first if you might want it.', 'Erase all data', () => {
          const theme = state.settings.theme;
          state = defaultState(); state.settings.theme = theme;
          save(); ui.viewDate = null; render(); toast('All data erased');
        }, true);
        break;
      case 'confirm-ok': {
        const fn = pendingConfirm; pendingConfirm = null;
        closeSheet();
        if (fn) fn();
        break;
      }
      case 'close-sheet': closeSheet(); break;
      case 'undo': {
        const fn = pendingUndo; pendingUndo = null;
        $('#toast').hidden = true;
        if (fn) fn();
        break;
      }
      case 'urge-open': openUrge(); break;
      case 'urge-toggle':
        if (urge.end) { urge.remaining = urgeLeft(); urge.end = null; stopUrgeTick(); el.textContent = 'Resume'; }
        else { urge.end = Date.now() + urge.remaining; startUrgeTick(); el.textContent = 'Pause'; }
        break;
      case 'urge-reset':
        urge.end = null; urge.remaining = URGE_MS; stopUrgeTick();
        $('#urge-timer').textContent = fmtMS(URGE_MS);
        $('#urge-toggle').textContent = 'Start';
        break;
    }
  });

  // Workout set inputs save as you type, without re-rendering (keeps focus).
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.set == null) return;
    const k = curKey(), ex = sessionFor(k).ex[Number(el.dataset.ex)];
    const d = day(k);
    const sets = d.workout[ex.n] = d.workout[ex.n] || [];
    const si = Number(el.dataset.set);
    while (sets.length <= si) sets.push(ex.f.map(() => ''));
    sets[si][Number(el.dataset.f)] = el.value;
    saveSoon();
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.weight) {
      const v = parseFloat(el.value), d = day(el.dataset.weight);
      if (el.value === '') delete d.weight;
      else if (v > 50 && v < 600) d.weight = Math.round(v * 10) / 10;
      else { toast('Enter weight in lb'); return; }
      save(); render();
      toast(el.value === '' ? 'Weight cleared' : 'Weight saved');
    } else if (el.dataset.setting) {
      const key = el.dataset.setting, s = state.settings;
      if (key === 'startDate' || key === 'bedtime') { if (el.value) s[key] = el.value; }
      else if (num(el.value) > 0) s[key] = num(el.value);
      save(); render();
    } else if (el.dataset.habitName) {
      const h = state.habits.find(x => x.id === el.dataset.habitName);
      if (h && el.value.trim()) { h.name = el.value.trim(); save(); }
    } else if (el.dataset.food) {
      const f = state.foods.find(x => x.id === el.dataset.food);
      if (!f) return;
      f[el.dataset.key] = el.dataset.key === 'name' ? (el.value.trim() || f.name) : num(el.value);
      save();
    } else if (el.id === 'import-file' && el.files[0]) {
      importData(el.files[0]);
      el.value = '';
    }
  });

  // Enter dismisses the keyboard on number fields; in the custom-food sheet it submits.
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) {
      if (e.target.closest('.sheet') && e.target.id && e.target.id.startsWith('cf-')) $('[data-action="food-custom-add"]').click();
      else if (e.target.id === 'new-habit') $('[data-action="habit-add"]').click();
      else e.target.blur();
    }
    if (e.key === 'Escape' && $('#sheet-root').innerHTML) closeSheet();
  });

  // Roll over to the new day if the app was left open past midnight.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ui.lastToday !== todayKey()) { ui.viewDate = null; render(); }
  });

  // ---------- Boot ----------
  applyTheme();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
