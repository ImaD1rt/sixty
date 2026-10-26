'use strict';
(() => {
  const STORE_KEY = 'sixty.v1';
  const DAY_START_HOUR = 4; // a day runs 4 AM to 4 AM, so late-night logging counts for the day before
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
    { id: 'social', name: 'Daily social rep' },
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

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // How a set is logged; value is the field list stored on each exercise.
  const FIELD_TYPES = [
    ['lb,reps', 'Weight × reps'],
    ['+lb,reps', 'Bodyweight (+lb) × reps'],
    ['in,reps', 'Distance/height (in) × reps'],
    ['reps', 'Reps only'],
    ['sec', 'Seconds'],
    ['min', 'Minutes'],
    ['rounds', 'Rounds'],
  ];

  // Indexed by Date.getDay(): 0 = Sunday. f = the fields logged per set.
  // rest: true makes the "Trained" habit count as done automatically.
  const DEFAULT_SCHEDULE = [
    { name: 'Rest', rest: true, ex: [] },
    { name: 'Lower + Power', ex: [
      { n: 'Box jumps', sets: 4, target: '4×3', f: ['in', 'reps'] },
      { n: 'Back squat', sets: 4, target: '4×6', f: ['lb', 'reps'] },
      { n: 'Romanian deadlift', sets: 3, target: '3×8', f: ['lb', 'reps'] },
      { n: 'Walking lunges', sets: 3, target: '3×10/leg', f: ['lb', 'reps'] },
      { n: 'Calf raises', sets: 3, target: '3×15', f: ['lb', 'reps'] },
    ] },
    { name: 'Upper', ex: [
      { n: 'Bench press', sets: 4, target: '4×6', f: ['lb', 'reps'] },
      { n: 'Pull-ups', sets: 4, target: '4×max', f: ['+lb', 'reps'] },
      { n: 'Overhead press', sets: 3, target: '3×8', f: ['lb', 'reps'] },
      { n: 'Rows', sets: 3, target: '3×10', f: ['lb', 'reps'] },
      { n: 'Curls', sets: 2, target: '2×12', f: ['lb', 'reps'] },
      { n: 'Triceps', sets: 2, target: '2×12', f: ['lb', 'reps'] },
    ] },
    { name: 'Conditioning', ex: [
      { n: 'Intervals: 30s hard / 90s easy (bike, hill sprints, or rower)', sets: 1, target: '8 rounds', f: ['rounds'] },
      { n: 'Easy cardio', sets: 1, target: '15–20 min', f: ['min'] },
    ] },
    { name: 'Lower + Speed', ex: [
      { n: '20m sprints', sets: 6, target: '6×20m', f: ['sec'] },
      { n: 'Broad jumps', sets: 4, target: '4×3', f: ['in', 'reps'] },
      { n: 'Trap bar deadlift', sets: 4, target: '4×5', f: ['lb', 'reps'] },
      { n: 'Bulgarian split squats', sets: 3, target: '3×8/leg', f: ['lb', 'reps'] },
      { n: 'Plank', sets: 3, target: '3×45s', f: ['sec'] },
    ] },
    { name: 'Upper', ex: [
      { n: 'Incline DB press', sets: 4, target: '4×8', f: ['lb', 'reps'] },
      { n: 'Chin-ups', sets: 4, target: '4×max', f: ['+lb', 'reps'] },
      { n: 'Dips', sets: 3, target: '3×10', f: ['+lb', 'reps'] },
      { n: 'Lateral raises', sets: 3, target: '3×15', f: ['lb', 'reps'] },
      { n: 'Face pulls', sets: 3, target: '3×15', f: ['lb', 'reps'] },
    ] },
    { name: 'Rest: walk, stretch, or optional sport', rest: true, ex: [
      { n: 'Walk / stretch / sport', sets: 1, target: 'optional', f: ['min'] },
    ] },
  ];
  const cloneSchedule = sch => sch.map(sc => ({ ...sc, ex: sc.ex.map(e => ({ ...e, f: [...e.f] })) }));

  const defaultState = () => ({
    v: 3,
    settings: {
      startDate: '2026-10-25',
      endDate: '2026-12-20',
      calTarget: 3000,
      proteinTarget: 160,
      startWeight: 160,
      goalWeight: 175,
      bedtime: '23:00',
      rushDate: '',
      theme: 'dark',
    },
    habits: DEFAULT_HABITS.map(h => ({ ...h })),
    foods: DEFAULT_FOODS.map(f => ({ ...f })),
    schedule: cloneSchedule(DEFAULT_SCHEDULE),
    days: {},
    people: [],
    events: [],
    todos: [],
    preEvent: null,
    urgesBeaten: 0,
  });

  // ---------- Storage ----------
  // Only a corrupt/missing store falls back to defaults; a bug in normalize() must never wipe saved data.
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    return s && s.settings ? normalize(s) : defaultState();
  }
  function normalize(s) {
    const d = defaultState();
    const out = {
      ...d, ...s,
      settings: { ...d.settings, ...s.settings },
      habits: Array.isArray(s.habits) ? s.habits : d.habits,
      foods: Array.isArray(s.foods) ? s.foods : d.foods,
      schedule: Array.isArray(s.schedule) && s.schedule.length === 7 ? s.schedule : d.schedule,
      days: s.days && typeof s.days === 'object' ? s.days : {},
      people: Array.isArray(s.people) ? s.people : [],
      events: Array.isArray(s.events) ? s.events : [],
      todos: Array.isArray(s.todos) ? s.todos : [],
    };
    // v1 → v2: new weight goal, unless it was already changed by hand.
    if (!(s.v >= 2)) {
      if (out.settings.startWeight === 155 && out.settings.goalWeight === 162) {
        out.settings.startWeight = 160;
        out.settings.goalWeight = 175;
      }
      out.v = 2;
    }
    // v2 → v3: add the daily social rep habit, counted from the day it was added.
    if (!(s.v >= 3)) {
      if (!out.habits.some(h => h.id === 'social')) out.habits.push({ id: 'social', name: 'Daily social rep', added: todayKey() });
      out.v = 3;
    }
    return out;
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


  // ---------- Helpers ----------
  const $ = sel => document.querySelector(sel);
  const view = $('#view');
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / DAY_MS);
  const todayKey = () => keyOf(new Date(Date.now() - DAY_START_HOUR * 3600000));
  const curKey = () => ui.viewDate || todayKey();
  const startKey = () => state.settings.startDate; // Day 0
  const endKey = () => state.settings.endDate;
  const lastDay = () => Math.max(1, diffDays(startKey(), endKey())); // number of the final day
  const span = () => lastDay() + 1; // days tracked, including Day 0
  const dayNum = k => diffDays(startKey(), k);
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
  // On rest days the "Trained" habit is done automatically.
  const habitDone = (k, id) => !!getDay(k).habits[id] || (id === 'train' && isRest(k));
  function completion(k) {
    const hs = habitsFor(k);
    if (!hs.length) return 0;
    return hs.filter(h => habitDone(k, h.id)).length / hs.length;
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
  const sessionFor = k => state.schedule[sessionIdx(k)];
  const isRest = k => !!sessionFor(k).rest;

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

  let state = load();
  const ui = { tab: 'today', viewDate: null, lastToday: null, peopleQuery: '' };

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
    render();
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
    if (h.id === 'train') {
      const sess = sessionFor(k);
      return sess.rest && sess.name.toLowerCase() === 'rest' ? 'Counts automatically' : sess.name;
    }
    if (h.id === 'sleep') return `Target: ${fmtTime(s.bedtime)}`;
    if (h.id === 'social') { const rep = repFor(k); return `Week ${rep.week}: ${rep.text}`; }
    return '';
  }

  function viewToday() {
    const k = curKey(), s = state.settings, n = dayNum(k), d = getDay(k);
    let headline;
    if (n < 0) headline = `Starts in ${plural(-n, 'day')}`;
    else if (n > lastDay()) headline = 'Challenge complete';
    else headline = `Day ${n} <span class="of">of ${lastDay()}</span>`;
    const pct = clamp(n / lastDay(), 0, 1) * 100;

    const hs = habitsFor(k);
    const done = hs.filter(h => habitDone(k, h.id)).length;
    const habits = hs.map(h => {
      const on = habitDone(k, h.id);
      const restTrain = h.id === 'train' && isRest(k);
      const hint = habitHint(h, k);
      return `<button class="habit${on ? ' on' : ''}" data-action="habit" data-id="${esc(h.id)}" aria-pressed="${on}">
        <span class="check">${CHECK_SVG}</span>
        <span class="grow"><div class="label">${restTrain ? 'Rest day' : esc(h.name)}</div>${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</span>
      </button>`;
    }).join('');

    const sess = sessionFor(k), idx = sessionIdx(k);
    const t = totals(k);
    const w = d.weight;

    return `
      ${viewingBanner()}
      <header class="dayhead">
        <div class="eyebrow">${fmtLong(k)}</div>
        <h1 class="num">${headline}</h1>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </header>
      ${rushLine() ? `<button class="rush-chip" data-action="go" data-to="social">${esc(rushLine())} ›</button>` : ''}

      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>day streak</span></div>
        ${hasHabit('nogamble')
          ? `<div class="stat"><b>${gambleFree()}</b><span>${gambleFree() === 1 ? 'day' : 'days'} gambling-free</span></div>`
          : `<div class="stat"><b>${done}/${hs.length}</b><span>done today</span></div>`}
      </div>

      <h2>Habits · <span class="num">${done}/${hs.length}</span></h2>
      <div class="habits">${habits || '<div class="empty">No habits yet. Add some in Settings.</div>'}</div>

      <h2>Session</h2>
      <div class="card">
        <span class="tag">${DOW[idx]}${sess.rest ? ' · Rest day' : ''}</span>
        <div class="session-title">${esc(sess.name)}</div>
        ${sess.ex.length ? `<details class="workout">
          <summary>${sess.rest ? 'Optional' : 'Full workout'} ▾</summary>
          <ul class="exlist">${sess.ex.map(e => `<li><span>${esc(e.n)}</span><span>${esc(e.target)}</span></li>`).join('')}</ul>
          <button class="btn primary block" style="margin-top:12px" data-action="go" data-to="train">Log workout</button>
        </details>` : '<div class="sub" style="margin-top:4px">Recover: eat, sleep, hit your protein.</div>'}
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
    const idx = sessionIdx(k), sess = state.schedule[idx], dflt = parse(k).getDay();
    const chips = state.schedule.map((sc, i) => `<button class="chip${i === idx ? ' on' : ''}${i === dflt ? ' today' : ''}" data-action="session-pick" data-idx="${i}">${DOW[i]}</button>`).join('');
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
      <header class="dayhead row spread">
        <div class="grow"><div class="eyebrow">${fmtLong(k)}</div><h1>${esc(sess.name)}</h1></div>
        <button class="btn sm" data-action="sch-edit" data-day="${idx}">Edit</button>
      </header>
      <div class="chips" role="group" aria-label="Choose session">${chips}</div>
      ${sess.rest ? `<div class="hint-box" style="margin:0 0 12px"><b>Rest day</b>“Trained” counts as done automatically.${sess.ex.length ? ' Anything below is optional.' : ''}</div>` : ''}
      ${cards || (sess.rest ? '' : `<div class="empty">No exercises for ${DOW_LONG[idx]}. Tap Edit to add some.</div>`)}
      ${hasHabit('train') && !sess.rest ? `<button class="btn block ${doneOn ? '' : 'primary'}" data-action="habit" data-id="train">${doneOn ? 'Session done ✓ (tap to undo)' : 'Mark session done'}</button>` : ''}
    `;
  }

  // ---------- Schedule editor ----------
  function scheduleSheet(di, keepScroll) {
    const prev = keepScroll && $('.sheet') ? $('.sheet').scrollTop : 0;
    const sc = state.schedule[di];
    const rows = sc.ex.map((ex, ei) => `<div class="ex-edit">
        <div class="row" style="gap:6px">
          <input class="input grow" value="${esc(ex.n)}" data-sch="${di}" data-ei="${ei}" data-key="n" aria-label="Exercise name">
          <button class="icon-btn" data-action="sch-ex-move" data-day="${di}" data-ei="${ei}" data-dir="-1" ${ei === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button class="icon-btn" data-action="sch-ex-move" data-day="${di}" data-ei="${ei}" data-dir="1" ${ei === sc.ex.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <button class="icon-btn plain" data-action="sch-ex-del" data-day="${di}" data-ei="${ei}" aria-label="Remove exercise">✕</button>
        </div>
        <div class="grid2" style="grid-template-columns:1fr 80px;margin-top:8px">
          <label class="field"><span>Target</span><input class="input" value="${esc(ex.target)}" placeholder="e.g. 4×6" data-sch="${di}" data-ei="${ei}" data-key="target"></label>
          <label class="field"><span>Sets</span><input class="input num" type="number" inputmode="numeric" min="1" max="12" value="${ex.sets}" data-sch="${di}" data-ei="${ei}" data-key="sets"></label>
        </div>
        <label class="field" style="margin:0"><span>Log as</span><select class="input" data-sch="${di}" data-ei="${ei}" data-key="f">
          ${FIELD_TYPES.map(([v, label]) => `<option value="${v}"${ex.f.join(',') === v ? ' selected' : ''}>${label}</option>`).join('')}
        </select></label>
      </div>`).join('');
    openSheet(`${sheetHead(DOW_LONG[di])}
      <label class="field"><span>Session name</span><input class="input" value="${esc(sc.name)}" data-sch="${di}" data-key="name"></label>
      <label class="checkline"><input type="checkbox" data-sch="${di}" data-key="rest"${sc.rest ? ' checked' : ''}> Rest day (“Trained” counts automatically)</label>
      <h2>Exercises</h2>
      <div class="stack">${rows || '<div class="empty">No exercises.</div>'}</div>
      <button class="btn block" style="margin-top:8px" data-action="sch-ex-add" data-day="${di}">+ Add exercise</button>
      <div class="grid2" style="margin-top:16px">
        <button class="btn ghost" data-action="sch-reset" data-day="${di}">Reset day</button>
        <button class="btn primary" data-action="close-sheet">Done</button>
      </div>
      <p class="sub" style="margin-top:12px">“Last session” numbers follow the exercise name, so renaming keeps its history.</p>`, true);
    if (prev) $('.sheet').scrollTop = prev;
  }

  // Move logged sets to the new name, unless another day still uses the old one.
  function renameLogs(from, to) {
    const uses = state.schedule.reduce((n, sc) => n + sc.ex.filter(e => e.n === from).length, 0);
    if (uses > 1) return;
    for (const d of Object.values(state.days)) {
      if (d.workout && d.workout[from] && !d.workout[to]) { d.workout[to] = d.workout[from]; delete d.workout[from]; }
    }
  }

  // ---------- Progress ----------
  const CH = { W: 340, H: 210, L: 34, R: 12, T: 14, B: 26 };
  let chartPts = [], chartY = null;

  function weightSeries() {
    const s = state.settings, t = todayKey();
    const pts = [];
    for (let i = 0; i < span(); i++) {
      const k = addDays(startKey(), i);
      pts.push({ i, k, w: (state.days[k] && state.days[k].weight) || null });
    }
    const lastIdx = pts.reduce((m, p) => (p.w ? p.i : m), -1);
    const step = (s.goalWeight - s.startWeight) / (span() - 1);
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
    const N = pts.length - 1;
    const X = i => L + (i / N) * (W - L - R);
    const Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    chartY = { X, Y };

    let grid = '';
    for (let v = lo; v <= hi; v += step) {
      grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * N)).map(i => `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === N ? 'end' : 'middle'}">${fmtShort(pts[i].k)}</text>`).join('');

    let path = '', pen = false;
    for (const p of pts) {
      if (p.avg == null) { pen = false; continue; }
      path += `${pen ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.avg).toFixed(1)}`;
      pen = true;
    }
    const dots = pts.filter(p => p.w).map(p => `<circle class="dot" cx="${X(p.i)}" cy="${Y(p.w)}" r="4"/>`).join('');

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bodyweight over the challenge with 7-day average and target line">
      ${grid}${ticks}
      <line class="target" x1="${X(0)}" y1="${Y(pts[0].target)}" x2="${X(N)}" y2="${Y(pts[N].target)}"/>
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
    const rate = (s.goalWeight - s.startWeight) / (lastDay() / 7);
    // "Too fast" scales with the goal: 1 lb/week, or half a pound over target pace if the goal needs more.
    const fast = Math.max(1, rate + 0.5);
    let hint;
    if (weekly != null && weekly > fast) {
      hint = { title: 'Gaining fast', body: `Up ${weekly.toFixed(1)} lb this week. Eat ~200 cal less per day.` };
    } else if (twoWeek != null && twoWeek < 0.3) {
      hint = { title: 'Scale hasn’t moved in 2 weeks', body: 'Eat ~200 cal more per day.' };
    } else if (weekly != null && weekly < rate - 0.5) {
      hint = { title: 'Behind pace', body: `Up ${weekly.toFixed(1)} lb this week vs ~${rate.toFixed(1)} target. Eat ~200 cal more per day.` };
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
    for (let i = 0; i < span(); i++) {
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

      ${socialStats()}

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
      const N = chartPts.length - 1;
      const i = clamp(Math.round(((sx - L) / (W - L - R)) * N), 0, N);
      const p = chartPts[i];
      const x = chartY.X(i);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.style.display = '';
      tip.innerHTML = `<b>${fmtShort(p.k)} · Day ${i}</b>${p.w ? `Weight ${p.w.toFixed(1)} lb` : 'No weigh-in'}<br>${p.avg ? `7-day avg ${p.avg.toFixed(1)}<br>` : ''}Target ${p.target.toFixed(1)}`;
      tip.hidden = false;
      const half = tip.offsetWidth / 2 + 4;
      tip.style.left = clamp(x * r.width / W, half, r.width - half) + 'px';
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', () => { cross.style.display = 'none'; tip.hidden = true; });
  }

  // ---------- To-do ----------
  const TODO_CATS = [
    { id: 'asap', label: 'ASAP', empty: 'Nothing urgent.' },
    { id: 'recurring', label: 'Recurring', empty: 'No recurring to-dos yet.' },
    { id: 'soon', label: 'Soon-ish', empty: 'Nothing here yet.' },
    { id: 'free', label: 'Free time', empty: 'Ideas for when you have time.' },
  ];
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const daysLabel = days => {
    const ds = days.slice().sort();
    if (ds.length === 7) return 'Every day';
    if (ds.join() === '1,2,3,4,5') return 'Weekdays';
    if (ds.join() === '0,6') return 'Weekends';
    return ds.map(d => DOW[d]).join(' · ');
  };
  const isDueOn = (t, k) => (t.days || ALL_DAYS).includes(parse(k).getDay());
  const todoDone = (t, k) => (t.cat === 'recurring' ? !!(getDay(k).todos || {})[t.id] : !!t.done);
  // Finished one-offs stay visible (struck through) until the day rolls over.
  const todoVisible = (t, k) => t.cat === 'recurring' || !t.done || t.doneOn === k;
  const dayPicker = days => `<div class="daypick">${DOW.map((d, i) => `<button class="${days.includes(i) ? 'on' : ''}" data-action="todo-day" data-d="${i}" aria-label="${DOW_LONG[i]}">${d}</button>`).join('')}</div>`;
  const pickedDays = root => [...root.querySelectorAll('.daypick .on')].map(b => Number(b.dataset.d));

  function todoRow(t, k) {
    const due = t.cat !== 'recurring' || isDueOn(t, k);
    const done = due && todoDone(t, k);
    return `<div class="titem${done ? ' done' : ''}${due ? '' : ' later'}">
      <button class="tcheck" data-action="todo-toggle" data-id="${esc(t.id)}"${due ? '' : ' disabled'} aria-pressed="${done}" aria-label="${done ? 'Mark not done' : 'Mark done'}"><span class="check">${CHECK_SVG}</span></button>
      <button class="ttext" data-action="todo-edit" data-id="${esc(t.id)}">${esc(t.text)}${t.cat === 'recurring' ? `<small>${due ? '' : 'Not today · '}${daysLabel(t.days || ALL_DAYS)}</small>` : ''}</button>
    </div>`;
  }

  function viewTodo() {
    const k = curKey(), cat = ui.todoCat || 'asap';
    const groups = TODO_CATS.map(c => {
      const due = t => c.id !== 'recurring' || isDueOn(t, k);
      const items = state.todos
        .filter(t => t.cat === c.id && todoVisible(t, k))
        .sort((a, b) => (due(b) - due(a)) || (todoDone(a, k) - todoDone(b, k)) || (a.ts - b.ts));
      const left = items.filter(t => due(t) && !todoDone(t, k)).length;
      return `<h2>${c.label} · <span class="num">${left}</span></h2>
        <div class="tlist">${items.map(t => todoRow(t, k)).join('') || `<div class="empty">${c.empty}</div>`}</div>`;
    }).join('');
    return `
      ${viewingBanner()}
      <header class="dayhead"><div class="eyebrow">${fmtLong(k)}</div><h1>To-do</h1></header>
      <div class="card">
        <div class="row" style="gap:8px">
          <input class="input grow" id="todo-text" placeholder="Add a to-do" autocomplete="off" aria-label="New to-do">
          <button class="btn primary" data-action="todo-add">Add</button>
        </div>
        <div class="seg block-seg" style="margin-top:10px">${TODO_CATS.map(c => `<button class="${c.id === cat ? 'on' : ''}" data-action="todo-cat" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
        <div class="todo-days" style="margin-top:10px"${cat === 'recurring' ? '' : ' hidden'}>${dayPicker(ui.todoDays || ALL_DAYS)}</div>
      </div>
      ${groups}
    `;
  }

  function todoSheet(id) {
    const t = state.todos.find(x => x.id === id);
    if (!t) return;
    openSheet(`${sheetHead('Edit to-do')}
      <label class="field"><span>To-do</span><input class="input" id="te-text" value="${esc(t.text)}"></label>
      <div class="field"><span>Type</span>
        <div class="seg block-seg">${TODO_CATS.map(c => `<button class="${c.id === t.cat ? 'on' : ''}" data-action="todo-cat" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
      </div>
      <div class="field todo-days"${t.cat === 'recurring' ? '' : ' hidden'}><span>Repeats on</span>${dayPicker(t.days || ALL_DAYS)}</div>
      <div class="grid2" style="margin-top:8px">
        <button class="btn ghost" style="color:var(--danger)" data-action="todo-del" data-id="${esc(t.id)}">Delete</button>
        <button class="btn primary" data-action="todo-save" data-id="${esc(t.id)}">Save</button>
      </div>`);
  }

  // ---------- Social ----------
  // [last week this applies to, challenge]
  const REP_PLAN = [
    [2, 'Small talk with one stranger'],
    [4, 'Start one real conversation with someone you kind of know'],
    [6, 'Make plans: invite someone to hang out or lift'],
    [Infinity, 'Go to a group event and talk to 3 new people'],
  ];
  const PRE_EVENT = [
    'Speak in the first 2 minutes',
    'Stand in the circle, phone away',
    'Learn + use 3 names',
    'Get one detail per person',
    'Pull someone else into a conversation',
    'Go deep with at least 1 person',
  ];
  // Day 0 belongs to week 1.
  const weekOf = k => Math.max(1, Math.ceil(dayNum(k) / 7));
  const repFor = k => { const week = weekOf(k); return { week, text: REP_PLAN.find(([max]) => week <= max)[1] }; };
  const ago = k => {
    const n = diffDays(k, todayKey());
    return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? `${n} days ago` : fmtShort(k);
  };
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  function rushLine() {
    const r = state.settings.rushDate;
    if (!r) return '';
    const n = diffDays(todayKey(), r);
    if (n > 1) return `${n} days to rush`;
    if (n === 1) return 'Rush starts tomorrow';
    if (n === 0) return 'Rush starts today';
    return n >= -14 ? 'Rush is on' : '';
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const findPerson = id => state.people.find(p => p.id === id);

  function peopleList() {
    const q = ui.peopleQuery.trim().toLowerCase();
    const list = state.people
      .filter(p => !q || [p.name, p.group, p.met, p.followUp, ...(p.details || [])].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '') || (b.ts || 0) - (a.ts || 0));
    if (!list.length) return `<div class="empty">${state.people.length ? 'No matches.' : 'No one yet. Add people as you meet them.'}</div>`;
    return list.map(p => `<button class="person" data-action="person-open" data-id="${esc(p.id)}">
        <div class="row spread"><b>${esc(p.name)}</b><span class="sub">${ago(p.lastSeen)}</span></div>
        ${[p.group, ...(p.details || [])].filter(Boolean).length ? `<div class="sub">${esc([p.group, ...(p.details || [])].filter(Boolean).join(' · '))}</div>` : ''}
        ${p.followUp ? `<div class="follow">Follow up: ${esc(p.followUp)}</div>` : ''}
      </button>`).join('');
  }

  function viewSocial() {
    const k = curKey(), d = getDay(k), rep = repFor(k), done = !!d.habits.social, rush = rushLine();
    const recent = state.events.slice().sort((a, b) => b.k.localeCompare(a.k) || (b.ts || 0) - (a.ts || 0)).slice(0, 3);
    return `
      ${viewingBanner()}
      <header class="dayhead"><div class="eyebrow">${rush ? esc(rush) : fmtLong(k)}</div><h1>Social</h1></header>

      <div class="card">
        <span class="tag">Week ${rep.week} · Today’s rep</span>
        <div class="session-title" style="margin:2px 0 12px">${esc(rep.text)}</div>
        <button class="habit rep-check${done ? ' on' : ''}" data-action="social-rep" aria-pressed="${done}">
          <span class="check">${CHECK_SVG}</span><span class="label">${done ? 'Done' : 'Mark done'}</span>
        </button>
        <input class="input" style="margin-top:10px" placeholder="Note (optional): who, what happened" value="${esc(d.socialNote || '')}" data-social-note="${k}" aria-label="Social rep note">
      </div>

      <div class="grid2" style="margin-bottom:12px">
        <button class="btn" data-action="pre-event">Pre-event checklist</button>
        <button class="btn" data-action="debrief">Debrief</button>
      </div>

      <h2>People · <span class="num">${state.people.length}</span></h2>
      <div class="row" style="margin-bottom:8px;gap:8px">
        <input class="input grow" type="search" id="people-search" placeholder="Search names, details, groups" value="${esc(ui.peopleQuery)}" autocomplete="off" aria-label="Search people">
        <button class="btn primary" data-action="person-new">+ Add</button>
      </div>
      ${state.people.length ? '<button class="btn block ghost" style="margin-bottom:8px" data-action="review">Review names (flashcards)</button>' : ''}
      <div class="people" id="people-list">${peopleList()}</div>

      ${recent.length ? `<h2>Recent events</h2><div class="log">${recent.map(e => `<div class="log-item">
          <div class="grow"><b>${esc(e.name || 'Event')} <span class="stars">${stars(e.rating)}</span></b>
            <span>${fmtShort(e.k)}${e.well ? ` · Went well: ${esc(e.well)}` : ''}${e.next ? ` · Next: ${esc(e.next)}` : ''}</span></div>
          <button class="icon-btn plain" data-action="event-del" data-id="${esc(e.id)}" aria-label="Delete event">✕</button>
        </div>`).join('')}</div>` : ''}
    `;
  }

  function personForm(p, presetMet) {
    const det = (p && p.details) || [];
    const hints = ['Major / hometown', 'Sport / interest', 'Something they mentioned'];
    const n = Math.max(3, det.length);
    openSheet(`${sheetHead(p ? 'Edit person' : 'Add person')}
      <label class="field"><span>Name</span><input class="input" id="pf-name" value="${esc(p ? p.name : '')}" autocomplete="off" autocapitalize="words"></label>
      <label class="field"><span>Where / when you met</span><input class="input" id="pf-met" value="${esc(p ? p.met || '' : presetMet || '')}" placeholder="e.g. Dining hall, Oct 25"></label>
      <label class="field"><span>House / group (optional)</span><input class="input" id="pf-group" value="${esc(p ? p.group || '' : '')}" placeholder="e.g. a fraternity, club soccer"></label>
      <div class="field"><span>Details to remember</span>
        <div class="stack">${Array.from({ length: n }, (_, i) => `<input class="input pf-detail" value="${esc(det[i] || '')}" placeholder="${hints[i] || 'Another detail'}" aria-label="Detail ${i + 1}">`).join('')}</div>
      </div>
      <label class="field"><span>Follow-up (optional)</span><input class="input" id="pf-follow" value="${esc(p ? p.followUp || '' : '')}" placeholder="e.g. ask how his midterm went"></label>
      <button class="btn primary block" data-action="person-save" data-id="${p ? esc(p.id) : ''}">${p ? 'Save' : 'Add person'}</button>`, true);
    if (!p) setTimeout(() => $('#pf-name') && $('#pf-name').focus(), 50);
  }

  function personSheet(id, seenMode) {
    const p = findPerson(id);
    if (!p) return;
    const times = (p.seen || []).length + 1;
    openSheet(`${sheetHead(esc(p.name))}
      <div class="card">
        ${p.group ? `<span class="tag">${esc(p.group)}</span>` : ''}
        ${p.met ? `<div class="sub">Met: ${esc(p.met)}</div>` : ''}
        <div class="sub">Last seen ${ago(p.lastSeen)}${times > 1 ? ` · seen ${times} times` : ''}</div>
        ${(p.details || []).length ? `<ul class="detail-list">${p.details.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${p.followUp ? `<div class="hint-box"><b>Follow up</b>${esc(p.followUp)}</div>` : ''}
      </div>
      ${seenMode ? `<div class="card">
          <label class="field"><span>New detail (optional)</span><input class="input" id="seen-detail" placeholder="Something new you learned"></label>
          <label class="field"><span>Next follow-up (optional)</span><input class="input" id="seen-follow" value="${esc(p.followUp || '')}"></label>
          <button class="btn primary block" data-action="seen-save" data-id="${esc(p.id)}">Save: seen today</button>
        </div>` : `<button class="btn primary block" data-action="seen-again" data-id="${esc(p.id)}">Seen again</button>`}
      <div class="grid2" style="margin-top:8px">
        <button class="btn" data-action="person-edit" data-id="${esc(p.id)}">Edit</button>
        <button class="btn ghost" style="color:var(--danger)" data-action="person-del" data-id="${esc(p.id)}">Delete</button>
      </div>`);
    if (seenMode) setTimeout(() => $('#seen-detail') && $('#seen-detail').focus(), 50);
  }

  function reviewSheet() {
    const rv = ui.review, total = rv.order.length;
    if (rv.i >= total) {
      openSheet(`${sheetHead('Review done')}
        <div class="card" style="text-align:center"><div class="timer">${rv.right}/${total}</div><div class="sub">names recalled</div></div>
        <div class="grid2"><button class="btn" data-action="review">Go again</button><button class="btn primary" data-action="close-sheet">Done</button></div>`, true);
      return;
    }
    const p = findPerson(rv.order[rv.i]);
    const details = (p.details || []).map(x => `<div>${esc(x)}</div>`).join('') || '<div class="sub">No details saved</div>';
    const ctx = [p.group, p.met].filter(Boolean).join(' · ');
    openSheet(`${sheetHead(`Review · ${rv.i + 1} of ${total}`)}
      <button class="flashcard" data-action="review-flip" aria-label="${rv.flipped ? 'Name shown' : 'Tap to reveal name'}">
        ${rv.flipped ? `<div class="fc-name">${esc(p.name)}</div>` : ''}
        <div class="fc-details">${details}</div>
        ${ctx ? `<div class="sub" style="margin-top:12px">${esc(ctx)}</div>` : ''}
        ${rv.flipped ? '' : '<div class="sub" style="margin-top:24px">Who is this? Tap to reveal</div>'}
      </button>
      ${rv.flipped ? `<div class="grid2" style="margin-top:12px">
          <button class="btn" data-action="review-next" data-ok="0">Missed it</button>
          <button class="btn primary" data-action="review-next" data-ok="1">Got it</button>
        </div>` : ''}`, true);
  }

  function preEventSheet() {
    const t = todayKey();
    if (!state.preEvent || state.preEvent.k !== t) state.preEvent = { k: t, done: [] };
    const pe = state.preEvent;
    openSheet(`${sheetHead('Pre-event')}
      <p class="sub" style="margin:-8px 0 12px;font-size:15px">Read it before you walk in. Check things off as you go.</p>
      <div class="habits">${PRE_EVENT.map((x, i) => `<button class="habit${pe.done.includes(i) ? ' on' : ''}" data-action="pre-toggle" data-i="${i}">
          <span class="check">${CHECK_SVG}</span><span class="label">${x}</span></button>`).join('')}</div>
      <button class="btn primary block" style="margin-top:12px" data-action="debrief">Done? Debrief</button>`, true);
  }

  function debriefSheet() {
    ui.debrief = { rating: 0 };
    openSheet(`${sheetHead('Debrief')}
      <label class="field"><span>Event (optional)</span><input class="input" id="db-name" placeholder="e.g. Rush night, party on Elm St"></label>
      <div class="field"><span>How did it go?</span>
        <div class="rating">${[1, 2, 3, 4, 5].map(n => `<button data-action="db-rate" data-n="${n}" aria-label="${n} out of 5">${n}</button>`).join('')}</div>
      </div>
      <label class="field"><span>One thing that went well</span><input class="input" id="db-well"></label>
      <label class="field"><span>One thing to try next time</span><input class="input" id="db-next"></label>
      <button class="btn primary block" data-action="db-save">Save debrief</button>`, true);
  }

  function addAnotherSheet(title) {
    openSheet(`${sheetHead(title)}
      <p class="sub" style="font-size:15px;margin:0 0 16px">Add people while their names are fresh.</p>
      <div class="stack">
        <button class="btn primary block" data-action="person-new" data-from-event="1">+ Add someone you met</button>
        <button class="btn block ghost" data-action="close-sheet">Done</button>
      </div>`);
  }

  // Per-week social numbers for the Progress tab.
  function socialWeeks() {
    const t = todayKey();
    const curW = Math.min(weekOf(t < endKey() ? t : endKey()), weekOf(endKey()));
    const weeks = Array.from({ length: curW }, (_, i) => ({ w: i + 1, reps: 0, people: 0, events: 0, ratings: [] }));
    const at = k => (k && dayNum(k) >= 0 && k <= t ? weeks[Math.min(weekOf(k), curW) - 1] : null);
    for (const [k, d] of Object.entries(state.days)) { const wk = at(k); if (wk && d.habits && d.habits.social) wk.reps++; }
    for (const p of state.people) { const wk = at(p.created); if (wk) wk.people++; }
    for (const e of state.events) { const wk = at(e.k); if (wk) { wk.events++; wk.ratings.push(e.rating); } }
    return weeks;
  }
  function socialStats() {
    const rows = socialWeeks().map(w => {
      const avg = w.ratings.length ? w.ratings.reduce((a, b) => a + b, 0) / w.ratings.length : null;
      return `<tr><td>${w.w}</td><td>${w.reps}</td><td>${w.people}</td><td>${w.events}</td>
        <td>${avg == null ? '<span class="sub">—</span>' : `<span class="meter" aria-hidden="true"><i style="width:${avg / 5 * 100}%"></i></span>${avg.toFixed(1)}`}</td></tr>`;
    }).join('');
    return `<h2>Social · by week</h2>
      <div class="card"><table class="wk num">
        <thead><tr><th>Week</th><th>Reps</th><th>New people</th><th>Events</th><th>Avg rating</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
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
          <label class="field"><span>Start (Day 0)</span><input class="input" type="date" value="${s.startDate}" data-setting="startDate"></label>
          <label class="field"><span>End date</span><input class="input" type="date" value="${s.endDate}" data-setting="endDate"></label>
          <label class="field"><span>Bedtime target</span><input class="input" type="time" value="${s.bedtime}" data-setting="bedtime"></label>
          <label class="field"><span>Rush starts</span><input class="input" type="date" value="${s.rushDate || ''}" data-setting="rushDate"></label>
        </div>
        <div class="sub">Day 0 is ${fmtDay(startKey())}, Day ${lastDay()} is ${fmtDay(endKey())}. Days roll over at 4 AM.</div>
      </div>

      <h2>Habits</h2>
      <div class="list-edit">${habits}
        <div class="item"><input class="input grow" id="new-habit" placeholder="New habit" aria-label="New habit name">
          <button class="btn sm primary" data-action="habit-add">Add</button></div>
      </div>

      <h2>Workout schedule</h2>
      <div class="list-edit">${state.schedule.map((sc, i) => `<button class="item sch-row" data-action="sch-edit" data-day="${i}">
          <b style="width:40px;flex:none">${DOW[i]}</b>
          <span class="grow">${esc(sc.name)}</span>
          <span class="sub">${sc.rest ? 'Rest' : plural(sc.ex.length, 'exercise')} ›</span>
        </button>`).join('')}
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

  // ---------- Tab wheel ----------
  // The tabs sit on an arc that wraps around like a dial: swipe to spin, the center tab is the open screen.
  const TABS = [
    { id: 'today', label: 'Today', icon: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>' },
    { id: 'food', label: 'Food', icon: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 21V3c-2 0-3 3-3 7s1 4 3 4"/>' },
    { id: 'train', label: 'Train', icon: '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>' },
    { id: 'todo', label: 'To-do', icon: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>' },
    { id: 'social', label: 'Social', icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/>' },
    { id: 'progress', label: 'Progress', icon: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>' },
    { id: 'settings', label: 'Settings', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>' },
  ];
  const NT = TABS.length;
  const STEP = 25 * Math.PI / 180; // angle between neighbouring tabs on the dial
  const wheelEl = $('#wheel');
  const wheel = { pos: 0, target: null, raf: 0, drag: null };
  const wrapIdx = i => ((i % NT) + NT) % NT;
  const radius = () => Math.min(window.innerWidth, 560) * 0.46;
  const stepPx = () => radius() * Math.sin(STEP);
  const nearest = i => wheel.pos + (wrapIdx(i - wheel.pos + NT / 2) - NT / 2); // same tab, shortest way round

  wheelEl.innerHTML = '<span class="wheel-slot" aria-hidden="true"></span>' + TABS.map((t, i) =>
    `<button class="tab" data-tab="${t.id}" data-i="${i}"><svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg><span>${t.label}</span></button>`).join('');
  const wheelItems = [...wheelEl.querySelectorAll('.tab')];

  function layoutWheel() {
    const R = radius();
    wheelItems.forEach((el, i) => {
      const d = wrapIdx(i - wheel.pos + NT / 2) - NT / 2;
      const a = d * STEP, ad = Math.abs(d);
      el.style.transform = `translate(-50%, 0) translate(${(R * Math.sin(a)).toFixed(1)}px, ${(R * (1 - Math.cos(a))).toFixed(1)}px) rotate(${a.toFixed(3)}rad) scale(${(1 - Math.min(ad, 3) * 0.08).toFixed(3)})`;
      el.style.opacity = Math.max(0, 1 - ad / 3.2).toFixed(2);
      const reachable = ad < 2.6;
      el.style.pointerEvents = reachable ? '' : 'none';
      el.tabIndex = reachable ? 0 : -1;
      el.classList.toggle('on', ad < 0.5);
      el.setAttribute('aria-current', el.dataset.tab === ui.tab ? 'page' : 'false');
    });
  }

  function spinTo(target) {
    cancelAnimationFrame(wheel.raf);
    wheel.target = target;
    const from = wheel.pos, t0 = performance.now(), dur = 280;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      wheel.pos = from + (target - from) * e;
      layoutWheel();
      if (p < 1) wheel.raf = requestAnimationFrame(tick);
      else { wheel.pos = wrapIdx(target); wheel.target = null; layoutWheel(); }
    };
    wheel.raf = requestAnimationFrame(tick);
  }
  // Spin to a tab and open it right away (the view doesn't wait for the animation).
  function selectTab(i) {
    const target = Math.round(nearest(i));
    spinTo(target);
    const id = TABS[wrapIdx(target)].id;
    if (id !== ui.tab) go(id);
  }
  // Keep the dial in step when a view is opened some other way (buttons, calendar).
  function syncWheel() {
    const i = TABS.findIndex(t => t.id === ui.tab);
    const aimed = wheel.target != null ? wrapIdx(wheel.target) : wrapIdx(Math.round(wheel.pos));
    if (aimed !== i || (wheel.target == null && Math.abs(wheel.pos - Math.round(wheel.pos)) > 0.01)) spinTo(Math.round(nearest(i)));
    else layoutWheel();
  }

  wheelEl.addEventListener('pointerdown', e => {
    cancelAnimationFrame(wheel.raf); wheel.target = null;
    wheel.drag = { x: e.clientX, pos: wheel.pos, moved: false, last: e.clientX, t: performance.now(), v: 0, tick: Math.round(wheel.pos), tab: e.target.closest('.tab') };
    wheelEl.setPointerCapture(e.pointerId);
  });
  wheelEl.addEventListener('pointermove', e => {
    const dr = wheel.drag;
    if (!dr) return;
    const dx = e.clientX - dr.x;
    if (!dr.moved && Math.abs(dx) < 6) return;
    dr.moved = true;
    const now = performance.now();
    dr.v = 0.7 * dr.v + 0.3 * ((e.clientX - dr.last) / Math.max(1, now - dr.t));
    dr.last = e.clientX; dr.t = now;
    wheel.pos = dr.pos - dx / stepPx();
    const notch = Math.round(wheel.pos);
    if (notch !== dr.tick) { dr.tick = notch; try { navigator.vibrate && navigator.vibrate(4); } catch (err) {} }
    layoutWheel();
  });
  const endDrag = () => {
    const dr = wheel.drag;
    if (!dr) return;
    wheel.drag = null;
    if (!dr.moved) { if (dr.tab) selectTab(Number(dr.tab.dataset.i)); else syncWheel(); return; }
    const fling = clamp((-dr.v * 140) / stepPx(), -2, 2); // a quick flick carries up to 2 extra tabs
    selectTab(Math.round(wheel.pos + fling));
  };
  wheelEl.addEventListener('pointerup', endDrag);
  wheelEl.addEventListener('pointercancel', endDrag);
  wheelEl.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    selectTab(TABS.findIndex(t => t.id === ui.tab) + (e.key === 'ArrowRight' ? 1 : -1));
  });
  window.addEventListener('resize', layoutWheel);

  // ---------- Render ----------
  const VIEWS = { today: viewToday, food: viewFood, train: viewTrain, todo: viewTodo, social: viewSocial, progress: viewProgress, settings: viewSettings };
  function render() {
    ui.lastToday = todayKey();
    view.innerHTML = VIEWS[ui.tab]();
    if (ui.tab === 'progress') bindChart();
    syncWheel();
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
    // Wheel taps are handled by its pointer events; this only catches keyboard "clicks".
    const tab = e.target.closest('.tab');
    if (tab) { if (e.detail === 0) selectTab(Number(tab.dataset.i)); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action, k = curKey();

    switch (a) {
      case 'habit': {
        const d = day(k), id = el.dataset.id;
        if (id === 'train' && isRest(k)) { toast('Rest day: this one counts automatically'); break; }
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
      case 'sch-edit': scheduleSheet(Number(el.dataset.day)); break;
      case 'sch-ex-add': {
        const di = Number(el.dataset.day), sc = state.schedule[di];
        let name = 'New exercise', n = 2;
        while (sc.ex.some(e => e.n === name)) name = `New exercise ${n++}`;
        sc.ex.push({ n: name, sets: 3, target: '3×10', f: ['lb', 'reps'] });
        save(); scheduleSheet(di);
        const sheet = $('.sheet'); sheet.scrollTop = sheet.scrollHeight;
        const inputs = sheet.querySelectorAll('[data-key="n"]');
        inputs[inputs.length - 1].select();
        break;
      }
      case 'sch-ex-move': {
        const di = Number(el.dataset.day), ex = state.schedule[di].ex;
        const i = Number(el.dataset.ei), j = i + Number(el.dataset.dir);
        if (j < 0 || j >= ex.length) break;
        [ex[i], ex[j]] = [ex[j], ex[i]];
        save(); scheduleSheet(di, true);
        break;
      }
      case 'sch-ex-del': {
        const di = Number(el.dataset.day), snap = snapshot();
        const [gone] = state.schedule[di].ex.splice(Number(el.dataset.ei), 1);
        save(); scheduleSheet(di, true);
        toast(`Removed ${gone.n}`, () => { restorer(snap)(); scheduleSheet(di, true); });
        break;
      }
      case 'sch-reset': {
        const di = Number(el.dataset.day), snap = snapshot();
        state.schedule[di] = cloneSchedule([DEFAULT_SCHEDULE[di]])[0];
        save(); scheduleSheet(di);
        toast(`${DOW_LONG[di]} reset`, () => { restorer(snap)(); scheduleSheet(di); });
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
      case 'todo-cat': {
        const root = el.closest('.sheet') || view;
        root.querySelectorAll('[data-action="todo-cat"]').forEach(b => b.classList.toggle('on', b === el));
        root.querySelector('.todo-days').hidden = el.dataset.cat !== 'recurring';
        if (!el.closest('.sheet')) ui.todoCat = el.dataset.cat;
        break;
      }
      case 'todo-day':
        el.classList.toggle('on');
        if (!el.closest('.sheet')) ui.todoDays = pickedDays(view);
        break;
      case 'todo-add': {
        const input = $('#todo-text'), text = input.value.trim(), cat = ui.todoCat || 'asap';
        if (!text) { input.focus(); break; }
        const t = { id: uid(), text, cat, ts: Date.now() };
        if (cat === 'recurring') {
          t.days = pickedDays(view);
          if (!t.days.length) { toast('Pick at least one day'); break; }
        }
        state.todos.push(t);
        save(); buzz(); render();
        $('#todo-text').focus(); // keep the keyboard up for the next one
        break;
      }
      case 'todo-toggle': {
        const t = state.todos.find(x => x.id === el.dataset.id);
        if (!t) break;
        if (t.cat === 'recurring') {
          const d = day(k);
          d.todos = d.todos || {};
          if (d.todos[t.id]) delete d.todos[t.id]; else d.todos[t.id] = true;
        } else {
          t.done = !t.done;
          t.doneOn = t.done ? k : undefined;
        }
        save(); buzz(); render();
        break;
      }
      case 'todo-edit': todoSheet(el.dataset.id); break;
      case 'todo-save': {
        const t = state.todos.find(x => x.id === el.dataset.id);
        if (!t) break;
        const sheet = $('.sheet'), text = $('#te-text').value.trim();
        const cat = sheet.querySelector('[data-action="todo-cat"].on').dataset.cat;
        if (!text) { toast('Add some text'); break; }
        if (cat === 'recurring') {
          const days = pickedDays(sheet);
          if (!days.length) { toast('Pick at least one day'); break; }
          t.days = days;
        } else if (t.cat === 'recurring') { t.done = false; delete t.days; }
        t.text = text; t.cat = cat;
        save(); closeSheet(); toast('Saved');
        break;
      }
      case 'todo-del': {
        const snap = snapshot();
        state.todos = state.todos.filter(x => x.id !== el.dataset.id);
        save(); closeSheet(); toast('To-do deleted', restorer(snap));
        break;
      }
      case 'social-rep': {
        const d = day(k);
        d.habits.social = !d.habits.social;
        save(); buzz(); render();
        if (d.habits.social && isComplete(k)) toast(k === todayKey() ? `All done. ${plural(streak(), 'day')} streak 🔥` : 'Day complete ✓');
        break;
      }
      case 'person-new':
        ui.fromEvent = el.dataset.fromEvent === '1' ? ui.fromEvent : null;
        personForm(null, ui.fromEvent);
        break;
      case 'person-edit': personForm(findPerson(el.dataset.id)); break;
      case 'person-open': personSheet(el.dataset.id); break;
      case 'seen-again': personSheet(el.dataset.id, true); break;
      case 'person-save': {
        const name = $('#pf-name').value.trim();
        if (!name) { toast('Add a name'); $('#pf-name').focus(); break; }
        const fields = {
          name,
          met: $('#pf-met').value.trim(),
          group: $('#pf-group').value.trim(),
          details: [...document.querySelectorAll('.pf-detail')].map(i => i.value.trim()).filter(Boolean),
          followUp: $('#pf-follow').value.trim(),
        };
        const existing = el.dataset.id && findPerson(el.dataset.id);
        if (existing) Object.assign(existing, fields);
        else state.people.push({ id: uid(), ...fields, created: todayKey(), lastSeen: todayKey(), seen: [], ts: Date.now() });
        save();
        if (!existing && ui.fromEvent) addAnotherSheet(`Added ${name}`);
        else { closeSheet(); toast(existing ? 'Saved' : `Added ${name}`); }
        break;
      }
      case 'seen-save': {
        const p = findPerson(el.dataset.id);
        if (!p) break;
        const detail = $('#seen-detail').value.trim();
        if (detail) p.details = [...(p.details || []), detail];
        p.followUp = $('#seen-follow').value.trim();
        p.seen = [...(p.seen || []), { k: todayKey(), note: detail }];
        p.lastSeen = todayKey(); p.ts = Date.now();
        save(); closeSheet(); toast(`Saw ${p.name} again`);
        break;
      }
      case 'person-del': {
        const p = findPerson(el.dataset.id);
        if (!p) break;
        confirmSheet(`Delete ${esc(p.name)}?`, 'This removes them and their details from your People log.', 'Delete', () => {
          state.people = state.people.filter(x => x.id !== p.id);
          save(); render(); toast('Deleted');
        }, true);
        break;
      }
      case 'review':
        ui.review = { order: shuffle(state.people.map(p => p.id)), i: 0, flipped: false, right: 0 };
        reviewSheet();
        break;
      case 'review-flip': if (!ui.review.flipped) { ui.review.flipped = true; reviewSheet(); } break;
      case 'review-next':
        if (el.dataset.ok === '1') ui.review.right++;
        ui.review.i++; ui.review.flipped = false;
        reviewSheet();
        break;
      case 'pre-event': preEventSheet(); break;
      case 'pre-toggle': {
        const pe = state.preEvent, i = Number(el.dataset.i);
        pe.done = pe.done.includes(i) ? pe.done.filter(x => x !== i) : [...pe.done, i];
        save(); buzz();
        el.classList.toggle('on', pe.done.includes(i));
        break;
      }
      case 'debrief': debriefSheet(); break;
      case 'db-rate':
        ui.debrief.rating = Number(el.dataset.n);
        document.querySelectorAll('[data-action="db-rate"]').forEach(b => b.classList.toggle('on', Number(b.dataset.n) === ui.debrief.rating));
        break;
      case 'db-save': {
        if (!ui.debrief || !ui.debrief.rating) { toast('Rate it 1–5 first'); break; }
        const ev = { id: uid(), k: todayKey(), name: $('#db-name').value.trim(), rating: ui.debrief.rating,
          well: $('#db-well').value.trim(), next: $('#db-next').value.trim(), ts: Date.now() };
        state.events.push(ev);
        save();
        ui.fromEvent = `${ev.name || 'Event'}, ${fmtShort(ev.k)}`;
        addAnotherSheet('Debrief saved ✓');
        break;
      }
      case 'event-del': {
        const snap = snapshot();
        state.events = state.events.filter(e => e.id !== el.dataset.id);
        save(); render(); toast('Event deleted', restorer(snap));
        break;
      }
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
    if (el.id === 'people-search') {
      ui.peopleQuery = el.value;
      $('#people-list').innerHTML = peopleList();
      return;
    }
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
      if (key === 'startDate' || key === 'endDate') {
        const next = { ...s, [key]: el.value };
        if (!el.value || next.endDate <= next.startDate) { toast('End date must be after the start date'); render(); return; }
        s[key] = el.value;
      } else if (key === 'bedtime') { if (el.value) s[key] = el.value; }
      else if (key === 'rushDate') s.rushDate = el.value;
      else if (num(el.value) > 0) s[key] = num(el.value);
      save(); render();
    } else if (el.dataset.socialNote) {
      const d = day(el.dataset.socialNote), v = el.value.trim();
      if (v) d.socialNote = v; else delete d.socialNote;
      save();
    } else if (el.dataset.sch != null) {
      const sc = state.schedule[Number(el.dataset.sch)], key = el.dataset.key;
      if (el.dataset.ei == null) {
        if (key === 'rest') sc.rest = el.checked;
        else if (el.value.trim()) sc.name = el.value.trim();
      } else {
        const ex = sc.ex[Number(el.dataset.ei)], v = el.value.trim();
        if (key === 'n') {
          if (!v || sc.ex.some(e => e !== ex && e.n === v)) { el.value = ex.n; toast('Use a different name'); return; }
          renameLogs(ex.n, v); ex.n = v;
        } else if (key === 'sets') ex.sets = clamp(Math.round(num(v)) || 1, 1, 12);
        else if (key === 'target') ex.target = v;
        else if (key === 'f') ex.f = v.split(',');
      }
      save();
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
      else if (e.target.id === 'todo-text') $('[data-action="todo-add"]').click();
      else e.target.blur();
    }
    if (e.key === 'Escape' && $('#sheet-root').innerHTML) closeSheet();
  });

  // Hide the tab bar while typing (iOS floats fixed bars above the keyboard otherwise).
  const isField = el => el && el.matches && el.matches('input:not([type="checkbox"]):not([type="file"]), select, textarea');
  document.addEventListener('focusin', e => { if (isField(e.target)) document.body.classList.add('typing'); });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (isField(document.activeElement)) return;
      document.body.classList.remove('typing');
      window.scrollTo(window.scrollX, window.scrollY); // nudge iOS to reset the viewport after the keyboard closes
    }, 50);
  });

  // Block pinch-zoom on iOS, which ignores user-scalable=no in some cases.
  document.addEventListener('gesturestart', e => e.preventDefault());

  // Roll over to the new day if the app was left open past midnight.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ui.lastToday !== todayKey()) { ui.viewDate = null; render(); }
  });

  // ---------- Boot ----------
  applyTheme();
  save(); // persist any data upgrade from an older version
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
