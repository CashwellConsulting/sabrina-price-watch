/* CIE Master core: storage, workspaces, module registry, scoring, shared UI helpers.
   Plain script (no ES modules) so the app opens by double-click from disk. */
(function () {
  'use strict';

  const CIE = (window.CIE = window.CIE || {});
  CIE.version = '1.1.0';
  CIE.modules = [];
  CIE.groups = [
    { id: 'intel', title: 'Account Intelligence' },
    { id: 'market', title: 'Market & Revenue' },
    { id: 'pilot', title: 'Pilot & Gates' },
    { id: 'knowledge', title: 'Knowledge' },
    { id: 'custom', title: 'Custom modules' },
    { id: 'system', title: 'Workspace' },
  ];

  /* ---------------- formatting ---------------- */
  const esc = (CIE.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  CIE.num = (n, d = 0) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
  CIE.money = (n) => {
    if (n == null || isNaN(n)) return '—';
    const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e9) return s + '$' + (a / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e4) return s + '$' + Math.round(a / 1e3) + 'K';
    return s + '$' + Math.round(a).toLocaleString('en-US');
  };
  CIE.pct = (n, d = 0) => (n == null || isNaN(n) ? '—' : (n * 100).toFixed(d) + '%');
  CIE.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  CIE.clone = (o) => JSON.parse(JSON.stringify(o));
  CIE.roundHalfUp = (x) => Math.floor(x + 0.5);

  /* ---------------- safe storage ---------------- */
  const store = (CIE.store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
  });
  const KEY_INDEX = 'cie-master:index';
  const KEY_PREFS = 'cie-master:prefs';
  const wsKey = (id) => 'cie-master:ws:' + id;

  /* ---------------- workspace model ---------------- */
  CIE.STAGES = [
    { id: 'identified', label: 'Identified' },
    { id: 'identity_resolved', label: 'Identity resolved' },
    { id: 'workflow_evidenced', label: 'Workflow evidenced' },
    { id: 'research_ready', label: 'Research-ready' },
    { id: 'outreach_ready', label: 'Outreach-ready' },
    { id: 'qualified', label: 'Qualified opportunity' },
  ];
  CIE.CHECKS = [
    { id: 'identity', label: 'Identity and parent resolved' },
    { id: 'workflow', label: 'Workflow evidenced' },
    { id: 'buyer', label: 'Buyer and owner hypothesis' },
    { id: 'trigger', label: 'Sourced reason to act now' },
  ];
  CIE.EVIDENCE = ['evidenced', 'estimated', 'unknown'];
  CIE.REL_STRENGTH = [
    { id: 'none', label: 'None recorded', boost: 0 },
    { id: 'possible', label: 'Possible path', boost: 4 },
    { id: 'warm', label: 'Warm introduction', boost: 7 },
    { id: 'direct', label: 'Direct relationship', boost: 10 },
  ];
  CIE.STAMPS = ['claim', 'testimony', 'preference', 'unknown'];

  CIE.blankWorkspace = function (name) {
    return {
      id: CIE.uid('ws'),
      schema: 1,
      name: name || 'New engagement',
      company: '',
      subtitle: 'Commercial intelligence engine',
      asOf: new Date().toISOString().slice(0, 10),
      thesis: '',
      offering: { unit: 'user', price: 2400 },
      enabledModules: null, // null = every registered module
      dimensions: [
        { key: 'workflow', label: 'Workflow fit', weight: 30 },
        { key: 'scale', label: 'Scale', weight: 20 },
        { key: 'integration', label: 'Integration', weight: 20 },
        { key: 'budget', label: 'Budget', weight: 15 },
        { key: 'trigger', label: 'Trigger', weight: 10 },
        { key: 'relationship', label: 'Relationship', weight: 5 },
      ],
      segments: [],
      lenses: [{ id: 'all', label: 'All accounts', filter: {} }],
      accounts: [],
      findings: [],
      market: {
        prices: { low: 2400, base: 3600, high: 4800 },
        segments: [],
        capacity: { reps: 4, rampMonths: 6, dealsPerRep: 6, acv: 60000, expansion: 1.15 },
      },
      bridge: { start: 0, unit: '$M', steps: [] },
      truth: { groups: [], questions: [] },
      economics: { implementation: 0.25, screen: 3, prices: [], streams: [
        { label: 'Time returned to staff', perUnit: 7488, share: 0.6, counted: true, basis: '3 h/week × 52 × $48' },
        { label: 'Quality / compliance (not counted)', perUnit: 1000, share: 1, counted: false, basis: 'shown, never in the return' },
      ] },
      gates: { oneLine: '', stopRules: '', gates: [], cohort: [], valueTypes: [] },
      deals: { byAccount: {}, plays: [] },
      diligence: [],
      sources: [],
      glossary: [],
      decisions: [],
      custom: [],
      datasets: {},
    };
  };

  // Fill keys a workspace from an older export may be missing.
  CIE.normalize = function (ws) {
    const base = CIE.blankWorkspace(ws.name);
    for (const k of Object.keys(base)) if (ws[k] === undefined) ws[k] = base[k];
    for (const k of Object.keys(base.market)) if (ws.market[k] === undefined) ws.market[k] = base.market[k];
    for (const k of Object.keys(base.gates)) if (ws.gates[k] === undefined) ws.gates[k] = base.gates[k];
    ws.market.segments.forEach((s) => ['retain', 'fit', 'upu'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = [0, 0, 0]; }));
    ws.accounts.forEach((a) => {
      a.scores = a.scores || {};
      a.checks = a.checks || {};
      a.tags = a.tags || [];
      a.people = a.people || [];
      a.relationship = a.relationship || { owner: '', strength: 'none', note: '' };
      a.value = a.value || { users: a.users || 0, hours: 3, rate: 48, share: 0.6, multiple: 3 };
      a.stage = a.stage || 'identified';
    });
    return ws;
  };

  /* ---------------- workspace persistence ---------------- */
  CIE.listWorkspaces = () => store.get(KEY_INDEX, []);
  // Large tables (ws.datasets, e.g. thousands of facilities) live in IndexedDB; the rest in localStorage.
  const idb = (CIE.idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res) => {
        try {
          const rq = indexedDB.open('cie-master', 1);
          rq.onupgradeneeded = () => rq.result.createObjectStore('datasets');
          rq.onsuccess = () => res((this.db = rq.result));
          rq.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    },
    async get(k) {
      const db = await this.open();
      if (!db) return undefined;
      return new Promise((res) => { try { const r = db.transaction('datasets').objectStore('datasets').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); } catch (e) { res(undefined); } });
    },
    async set(k, v) {
      const db = await this.open();
      if (!db) return false;
      return new Promise((res) => { try { const t = db.transaction('datasets', 'readwrite'); t.objectStore('datasets').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); } catch (e) { res(false); } });
    },
    async del(k) {
      const db = await this.open();
      if (!db) return;
      try { db.transaction('datasets', 'readwrite').objectStore('datasets').delete(k); } catch (e) { /* ignore */ }
    },
  });
  CIE.loadWorkspace = async (id) => {
    const ws = store.get(wsKey(id), null);
    if (!ws) return null;
    if (ws.hasDatasets) ws.datasets = (await idb.get(id)) || {};
    return CIE.normalize(ws);
  };
  CIE.saveWorkspace = function (ws) {
    ws.updatedAt = new Date().toISOString();
    const { datasets, _dsDirty, ...rest } = ws;
    rest.hasDatasets = !!(datasets && Object.keys(datasets).length);
    if (rest.hasDatasets && _dsDirty) { idb.set(ws.id, datasets); delete ws._dsDirty; }
    const ok = store.set(wsKey(ws.id), rest);
    const idx = CIE.listWorkspaces().filter((w) => w.id !== ws.id);
    idx.push({ id: ws.id, name: ws.name });
    store.set(KEY_INDEX, idx);
    return ok;
  };
  CIE.deleteWorkspace = function (id) {
    store.del(wsKey(id));
    idb.del(id);
    store.set(KEY_INDEX, CIE.listWorkspaces().filter((w) => w.id !== id));
  };
  CIE.prefs = store.get(KEY_PREFS, {});
  CIE.savePrefs = () => store.set(KEY_PREFS, CIE.prefs);

  /* ---------------- module registry ---------------- */
  // A module: { id, group, title, order, describe, render(root, ctx) }.
  CIE.registerModule = function (def) {
    if (!def.id || !def.render) throw new Error('Module needs id and render');
    CIE.modules = CIE.modules.filter((m) => m.id !== def.id).concat(def);
  };
  CIE.activeModules = function (ws) {
    const builtIn = CIE.modules
      .filter((m) => m.group === 'system' || !ws.enabledModules || ws.enabledModules.includes(m.id))
      .slice();
    const custom = (ws.custom || []).map((c, i) => CIE.customModule(c, i));
    return builtIn.concat(custom).sort((a, b) => (a.order || 50) - (b.order || 50));
  };

  /* ---------------- scoring ---------------- */
  CIE.weightsOf = (ws, override) => {
    const w = {};
    ws.dimensions.forEach((d) => (w[d.key] = override && override[d.key] != null ? override[d.key] : d.weight));
    return w;
  };
  // fit = Σ(weight × score/5) / Σweight × 100; unknown dimensions score 0 (never guessed).
  CIE.score = function (a, ws, override) {
    const w = CIE.weightsOf(ws, override);
    let tot = 0, got = 0, ev = 0;
    const parts = ws.dimensions.map((d) => {
      const s = a.scores[d.key] || { v: 0, s: 'unknown' };
      const v = s.s === 'unknown' ? 0 : Number(s.v) || 0;
      const pts = (w[d.key] * v) / 5;
      tot += w[d.key];
      got += pts;
      if (s.s === 'evidenced') ev += w[d.key];
      return { key: d.key, label: d.label, weight: w[d.key], v, status: s.s || 'unknown', pts };
    });
    const fit = tot ? Math.round((got / tot) * 100) : 0;
    return { fit, completeness: tot ? ev / tot : 0, parts };
  };
  CIE.relBoost = (a) => (CIE.REL_STRENGTH.find((r) => r.id === (a.relationship && a.relationship.strength)) || { boost: 0 }).boost;
  CIE.checksPassed = (a) => CIE.CHECKS.every((c) => a.checks[c.id]);
  // Outreach-ready (and above) requires every check; downgrade otherwise.
  CIE.enforceStage = function (a) {
    const i = CIE.STAGES.findIndex((s) => s.id === a.stage);
    const or = CIE.STAGES.findIndex((s) => s.id === 'outreach_ready');
    if (i >= or && !CIE.checksPassed(a)) { a.stage = 'research_ready'; return true; }
    return false;
  };

  /* Ranked list: score every account (optionally under a lens's weights), sort by fit, then evidence. */
  CIE.rank = function (ws, lens) {
    const override = lens && lens.weights;
    return ws.accounts
      .filter((a) => CIE.lensMatch(a, lens))
      .map((a) => {
        const s = CIE.score(a, ws, override);
        const access = lens && lens.access ? Math.min(100, s.fit + CIE.relBoost(a)) : s.fit;
        return { a, s, rankScore: access };
      })
      .sort((x, y) => y.rankScore - x.rankScore || y.s.completeness - x.s.completeness || x.a.name.localeCompare(y.a.name));
  };
  CIE.findAccount = (ws, id) => ws.accounts.find((a) => a.id === id);
  CIE.stageLabel = (id) => (CIE.STAGES.find((s) => s.id === id) || { label: id }).label;

  // Buyer value: users × hours/week × 52 × loaded rate × share finance will count.
  CIE.valueModel = function (v, price) {
    const perUser = (Number(v.hours) || 0) * 52 * (Number(v.rate) || 0) * (Number(v.share) || 0);
    const users = Number(v.users) || 0;
    return {
      perUser,
      total: perUser * users,
      perDollar: price ? perUser / price : 0,
      maxPrice: v.multiple ? perUser / v.multiple : 0,
      contract: price * users,
    };
  };

  CIE.lensMatch = function (a, lens) {
    const f = (lens && lens.filter) || {};
    if (f.segments && f.segments.length && !f.segments.includes(a.segment)) return false;
    if (f.states && f.states.length && !f.states.includes(a.state)) return false;
    if (f.tags && f.tags.length && !f.tags.some((t) => a.tags.includes(t))) return false;
    if (f.excludeTags && f.excludeTags.some((t) => a.tags.includes(t))) return false;
    if (f.stages && f.stages.length && !f.stages.includes(a.stage)) return false;
    return true;
  };

  /* ---------------- CSV / files ---------------- */
  CIE.toCSV = function (rows, cols) {
    const q = (v) => {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [cols.map((c) => q(c.label)).join(',')].concat(rows.map((r) => cols.map((c) => q(c.get(r))).join(','))).join('\n');
  };
  CIE.download = function (name, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  CIE.slug = (s) => String(s || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------------- UI helpers ---------------- */
  CIE.toast = function (msg) {
    document.querySelectorAll('.toast').forEach((n) => n.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  };
  CIE.modal = function (title, bodyHtml, actions) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${bodyHtml}<div class="row">${(actions || [])
      .map((a, i) => `<button class="btn ${a.primary ? 'primary' : ''}" data-i="${i}">${esc(a.label)}</button>`)
      .join('')}<button class="btn" data-close>Close</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', (e) => {
      if (e.target === back || e.target.hasAttribute('data-close')) return close();
      const i = e.target.getAttribute('data-i');
      if (i != null && actions[i].run(back.querySelector('.modal')) !== false) close();
    });
    return back;
  };

  // Global tooltip: any element with data-tip shows it on hover.
  let tipEl = null;
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { if (tipEl) tipEl.style.display = 'none'; return; }
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tooltip'; document.body.appendChild(tipEl); }
    tipEl.innerHTML = t.getAttribute('data-tip');
    tipEl.style.display = 'block';
  });
  document.addEventListener('mousemove', (e) => {
    if (!tipEl || tipEl.style.display === 'none') return;
    const x = Math.min(e.clientX + 14, window.innerWidth - tipEl.offsetWidth - 8);
    tipEl.style.left = x + 'px';
    tipEl.style.top = e.clientY + 14 + 'px';
  });

  CIE.fitBar = (fit, completeness) =>
    `<div class="fitbar" data-tip="Fit ${fit} / 100 · ${Math.round(completeness * 100)}% of weight evidenced (black tick)"><div class="track"><div class="fill" style="width:${fit}%"></div><div class="ev" style="left:calc(${Math.round(
      completeness * 100
    )}% - 1px)"></div></div><span class="n">${fit}</span></div>`;

  CIE.SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
  // Color follows the entity: a segment keeps its slot no matter the filter.
  CIE.segmentColor = (ws, seg) => {
    const i = ws.segments.findIndex((s) => s.id === seg || s.name === seg);
    return i >= 0 && i < 8 ? CIE.SERIES[i] : 'var(--muted)';
  };
  CIE.segmentName = (ws, seg) => (ws.segments.find((s) => s.id === seg) || { name: seg || '—' }).name;
})();
