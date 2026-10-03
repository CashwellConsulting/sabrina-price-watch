/* Importers: turn an existing single-file CIE (.html) into a workspace, entirely in the browser.
   Nothing is uploaded. Each adapter recognises a data layout, not a company, so new CIEs that reuse
   a layout import too. The file's own scripts are never executed — data blocks are parsed as data. */
(function () {
  'use strict';
  const CIE = window.CIE;
  const adapters = (CIE.importers = []);
  CIE.registerImporter = (a) => adapters.push(a);

  /* ---------- parsing helpers ---------- */
  const scriptsOf = (html) => [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attr: m[1], code: m[2] }));
  const jsonBlock = (html, id) => {
    const s = scriptsOf(html).find((x) => x.attr.includes(`id="${id}"`));
    return s ? JSON.parse(s.code) : null;
  };

  // Strict parser for JavaScript literal data (objects, arrays, strings, numbers, true/false/null).
  // Accepts unquoted keys, single quotes, .5 numbers and trailing commas. Anything else throws.
  function parseLiteral(src, start) {
    let i = start || 0;
    const ws = () => { for (;;) { while (/\s/.test(src[i])) i++; if (src[i] === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; } else if (src[i] === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; } else break; } };
    const fail = (m) => { throw new Error('Unreadable data near character ' + i + ': ' + m); };
    function str() {
      const q = src[i++]; let out = '';
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') { const n = src[++i]; const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' }; if (n === 'u') { out += String.fromCharCode(parseInt(src.substr(i + 1, 4), 16)); i += 5; continue; } out += map[n] != null ? map[n] : n; i++; continue; }
        out += src[i++];
      }
      i++; return out;
    }
    function val() {
      ws();
      const c = src[i];
      if (c === '{') {
        i++; const o = {};
        for (;;) {
          ws(); if (src[i] === '}') { i++; return o; }
          let k; if (src[i] === '"' || src[i] === "'") k = str(); else { const m = /^[A-Za-z_$][\w$]*|^\d+/.exec(src.slice(i, i + 200)); if (!m) fail('key'); k = m[0]; i += k.length; }
          ws(); if (src[i++] !== ':') fail('colon'); o[k] = val(); ws();
          if (src[i] === ',') i++; else if (src[i] !== '}') fail('object');
        }
      }
      if (c === '[') {
        i++; const a = [];
        for (;;) { ws(); if (src[i] === ']') { i++; return a; } a.push(val()); ws(); if (src[i] === ',') i++; else if (src[i] !== ']') fail('array'); }
      }
      if (c === '"' || c === "'") return str();
      const m = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i, i + 40));
      if (m) { i += m[0].length; return Number(m[0]); }
      for (const [w, v] of [['true', true], ['false', false], ['null', null], ['undefined', null]]) if (src.startsWith(w, i)) { i += w.length; return v; }
      fail('value');
    }
    const v = val();
    return { value: v, end: i };
  }
  CIE.parseLiteral = (s) => parseLiteral(s, 0).value;
  // Index just past the bracket that closes the one at `start` (string-aware), or -1.
  function matchEnd(src, start) {
    let d = 0, q = '';
    for (let i = start; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = ''; continue; }
      if (c === '"' || c === "'" || c === '`') q = c;
      else if (c === '[' || c === '{') d++;
      else if (c === ']' || c === '}') { d--; if (!d) return i + 1; }
    }
    return -1;
  }
  // Value of `const NAME = <literal>` inside any script, or null.
  function constOf(html, name) {
    for (const s of scriptsOf(html)) {
      const m = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*').exec(s.code);
      if (!m) continue;
      const start = m.index + m[0].length;
      const end = matchEnd(s.code, start);
      if (end > start) { try { return JSON.parse(s.code.slice(start, end)); } catch (e) { /* not strict JSON — fall through */ } }
      try { return parseLiteral(s.code, start).value; } catch (e) { return null; }
    }
    return null;
  }

  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'other';
  const titleCase = (s) => String(s || '').toLowerCase().replace(/\b([a-z])([a-z']*)/g, (w, a, b) => (/^(of|and|the|at|in|for|on)$/.test(w) ? w : a.toUpperCase() + b)).replace(/^./, (c) => c.toUpperCase());
  const prettify = (id) => String(id || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const segmentsFrom = (vals, labels) => [...new Set(vals.filter(Boolean))].map((v) => ({ id: slug(v), name: (labels && labels[v]) || (/[A-Z ]/.test(v) ? v : prettify(v)) }));
  // Score a value 0–5 by its quintile within the population.
  const quintiler = (vals) => { const s = vals.filter((v) => v != null && !isNaN(v)).sort((a, b) => a - b); return (v) => { if (v == null || isNaN(v) || !s.length) return 0; let k = 0; while (k < s.length && s[k] <= v) k++; return Math.max(1, Math.min(5, Math.ceil((k / s.length) * 5))); }; };
  const base = (name) => { const w = CIE.blankWorkspace(name); w.company = name; w.subtitle = 'Imported from an existing CIE file'; return w; };
  const account = (o) => Object.assign({ id: CIE.uid('acc'), stage: 'identified', tags: [], scores: {}, checks: {}, people: [], signals: [], relationship: { owner: '', strength: 'none', note: '' }, value: { users: 0, hours: 3, rate: 48, share: 0.6, multiple: 3 }, notes: '' }, o);

  /* =====================================================================
     1. Facility infection table:  const FACILITIES = [...], optional const HAI = [...]
     ===================================================================== */
  const HAI_META = {
    clabsi: { full: 'Central line-associated bloodstream infection', denomKey: 'clabsi_device_days', predKey: 'clabsi_predicted', denom: 'central-line days', per: 1000 },
    cauti: { full: 'Catheter-associated urinary tract infection', denomKey: 'cauti_device_days', predKey: 'cauti_predicted', denom: 'catheter days', per: 1000 },
    ssi_colon: { full: 'Surgical site infection — colon surgery', denomKey: 'ssi_colon_procedures', predKey: 'ssi_colon_predicted', denom: 'procedures', per: 100 },
    ssi_hyst: { full: 'Surgical site infection — abdominal hysterectomy', denomKey: 'ssi_hyst_procedures', predKey: 'ssi_hyst_predicted', denom: 'procedures', per: 100 },
    mrsa: { full: 'MRSA bacteremia', denomKey: 'mrsa_patient_days', predKey: 'mrsa_predicted', denom: 'patient days', per: 10000 },
    cdi: { full: 'Clostridioides difficile infection', denomKey: 'cdi_patient_days', predKey: 'cdi_predicted', denom: 'patient days', per: 10000 },
  };
  CIE.registerImporter({
    id: 'facility-hai',
    label: 'Facility infection-quality engine',
    detect: (html) => /const\s+FACILITIES\s*=\s*\[/.test(html),
    convert(html, name) {
      const F = constOf(html, 'FACILITIES');
      if (!Array.isArray(F) || !F.length) throw new Error('The facility table could not be read.');
      // Always the six reported CMS measures; the source's model list only supplies cost per case.
      const H = constOf(html, 'HAI') || [];
      const costOf = (k) => { const h = H.find((x) => x.key === k) || H.find((x) => x.key === k.split('_')[0]); return h && h.cost && h.cost.some(Boolean) ? h.cost : null; };
      const NAMES = { clabsi: 'CLABSI', cauti: 'CAUTI', ssi_colon: 'SSI colon', ssi_hyst: 'SSI hyst', mrsa: 'MRSA', cdi: 'C. diff' };
      const measures = Object.keys(HAI_META).filter((k) => F.some((f) => f[k + '_observed'] != null)).map((k) => ({ key: k, name: NAMES[k], full: HAI_META[k].full, denom: HAI_META[k].denom, per: HAI_META[k].per, cost: costOf(k), obsKey: k + '_observed', sirKey: k + '_sir' }));
      const num = (v) => (v == null || v === '' || isNaN(v) ? null : Number(v));
      const rows = F.map((f) => {
        const m = {};
        measures.forEach((ms) => {
          const meta = HAI_META[ms.key] || {};
          const o = num(f[ms.obsKey]), s = num(f[ms.sirKey]), p = num(f[meta.predKey]), d = num(f[meta.denomKey]);
          if (o != null || s != null) m[ms.key] = [o, p != null ? p : s ? o / s : null, s, d];
        });
        return {
          id: String(f['Facility ID'] || f.id || CIE.uid('f')), name: titleCase(f['Facility Name'] || f.name), city: titleCase(f['City/Town'] || f.city || ''), state: f.State || f.state || '',
          type: f['Hospital Type'] || '', owner: f['Hospital Ownership'] || '', rating: num(f['Hospital overall rating']), leapfrog: f.leapfrog_grade || '',
          hac: num(f.total_hac_score), hacPenalty: Number(f.hac_payment_reduction) === 1, worse: num(f.worse_benchmark_count),
          beds: num(f.hcris_total_beds), cc: num(f.hcris_critical_care_beds), icu: num(f.hcris_icu_beds),
          priority: f.priority_score != null ? Math.round(f.priority_score * 10) / 10 : null, rank: f.rank != null ? Math.round(f.rank) : null,
          excessReported: num(f.excess_total), wedge: f.lead_wedge || '', rationale: f.wedge_rationale || '', whyNow: f.why_now || '', access: [f.access_tags, f.access_notes].filter(Boolean).join(' — '), m,
        };
      });
      measures.forEach((ms) => { delete ms.obsKey; delete ms.sirKey; });
      const first = F[0];
      const ws = base(name);
      ws.subtitle = 'Imported facility infection-quality engine';
      ws.datasets = { quality: { title: 'Hospital-acquired infections', source: 'CMS Healthcare-Associated Infections with HCRIS beds, HAC Reduction Program and Leapfrog, as compiled in the source file', period: first['Start Date'] ? first['Start Date'] + ' – ' + first['End Date'] : '', measures, rows } };
      // Top facilities by priority become accounts, linked to their HAI profile.
      const top = rows.filter((r) => r.priority != null).sort((a, b) => b.priority - a.priority).slice(0, 150);
      const qEx = quintiler(rows.map((r) => r.excessReported)), qBeds = quintiler(rows.map((r) => r.beds)), qCC = quintiler(rows.map((r) => r.cc));
      ws.dimensions = [
        { key: 'burden', label: 'Infection burden (excess cases)', weight: 30 },
        { key: 'pressure', label: 'Safety pressure (HAC, Leapfrog, benchmarks)', weight: 25 },
        { key: 'footprint', label: 'Critical-care footprint', weight: 20 },
        { key: 'scale', label: 'Hospital scale', weight: 15 },
        { key: 'relationship', label: 'Relationship', weight: 10 },
      ];
      const owners = (o) => (/non-profit|nonprofit/i.test(o) ? 'Non-profit' : /government/i.test(o) ? 'Government' : /proprietary/i.test(o) ? 'Proprietary' : /physician/i.test(o) ? 'Physician-owned' : 'Other');
      ws.segments = ['Non-profit', 'Government', 'Proprietary', 'Physician-owned', 'Other'].map((n) => ({ id: slug(n), name: n }));
      ws.offering = { unit: 'bed', price: 2250 };
      ws.accounts = top.map((r) => {
        const pressure = Math.min(5, (r.hacPenalty ? 2 : 0) + (r.worse || 0) + ({ D: 2, F: 2, C: 1 }[r.leapfrog] || 0));
        return account({
          name: r.name, segment: slug(owners(r.owner)), state: r.state, city: r.city, facilityId: r.id, stage: 'identity_resolved',
          tags: [r.leapfrog ? 'Leapfrog ' + r.leapfrog : '', r.hacPenalty ? 'HAC penalty' : ''].filter(Boolean).concat((r.access || '').split('—')[0].split(/[,;]/).map((t) => t.trim()).filter(Boolean)),
          scores: { burden: { v: qEx(r.excessReported), s: 'evidenced' }, pressure: { v: pressure, s: 'evidenced' }, footprint: { v: qCC(r.cc), s: 'evidenced' }, scale: { v: qBeds(r.beds), s: 'evidenced' }, relationship: { v: 0, s: 'unknown' } },
          checks: { identity: true, workflow: !!r.wedge, buyer: false, trigger: !!r.whyNow },
          bottomLine: r.whyNow ? 'Why now: ' + r.whyNow : '', why: r.rationale, firstUse: r.wedge, user: 'Infection prevention and nursing quality teams', buyer: 'CNO / CMO / VP Quality & Patient Safety',
          value: { users: r.cc || r.beds || 0, hours: 3, rate: 65, share: 0.4, multiple: 2, price: 2250 },
          signals: [], notes: 'Original priority score ' + r.priority + (r.rank ? ' (rank ' + r.rank + ')' : ''),
        });
      });
      ws.lenses = [
        { id: 'all', label: 'All accounts', filter: {} },
        { id: 'hac', label: 'HAC-penalised', filter: { tags: ['HAC penalty'] } },
        { id: 'grade', label: 'Leapfrog C or worse', filter: { tags: ['Leapfrog C', 'Leapfrog D', 'Leapfrog F'] } },
        { id: 'warm', label: 'Relationships', filter: {}, access: true },
      ];
      ws.economics.streams = measures.filter((ms) => ms.cost).map((ms) => ({ label: ms.name + ' cases avoided', perUnit: 0, share: 0.4, counted: true, basis: 'set per bed from the facility profile; base cost per case ' + CIE.money(ms.cost[1]) }));
      ws.thesis = 'Ranked by public infection burden and safety pressure. Open Facility quality (HAI) for the full measure-level data on every hospital.';
      return ws;
    },
  });

  /* =====================================================================
     2. Researched-cohort engine:  <script id="cie-data" type="application/json">
     ===================================================================== */
  CIE.registerImporter({
    id: 'cohort-json',
    label: 'Researched-cohort engine',
    detect: (html) => /id="cie-data"/.test(html),
    convert(html, name) {
      const D = jsonBlock(html, 'cie-data');
      const SEG = constOf(html, 'SEG');
      const ws = base(name);
      ws.dimensions = Object.keys(D.weights).map((k) => ({ key: k, label: (D.dim_label && D.dim_label[k]) || prettify(k), weight: D.weights[k] }));
      ws.segments = segmentsFrom(D.cohort.map((a) => a.primary_segment), SEG);
      const stageMap = { qualified_opportunity: 'qualified' };
      const relMap = (k) => (/direct/.test(k) ? 'direct' : /warm/.test(k) ? 'warm' : /investor|possible/.test(k) ? 'possible' : 'none');
      const statusTag = { reference_to_verify: 'Reference to verify', partner_route: 'Partner route', net_new: '' };
      ws.accounts = D.cohort.map((a) => {
        const scores = {};
        Object.entries(a.scores || {}).forEach(([k, v]) => (scores[k] = { v: Array.isArray(v) ? v[0] : v, s: Array.isArray(v) ? v[1] : 'estimated' }));
        const cl = a.outreach_checklist || {};
        return account({
          id: a.id, name: a.name, segment: slug(a.primary_segment), state: a.state, stage: stageMap[a.stage] || a.stage || 'identified',
          tags: [statusTag[a.customer_status], a.depth === 'deep' ? 'Deep research' : ''].concat(/investor/.test((a.relationship || {}).kind || '') ? ['Investor-linked'] : []).filter(Boolean),
          scores, checks: { identity: !!cl.identity_and_parent, workflow: !!cl.workflow_evidence, buyer: !!cl.buyer_and_owner_hypothesis, trigger: !!cl.sourced_reason },
          why: a.why, user: a.user_workflow_owner, buyer: a.economic_buyer, firstUse: (a.first_use || {}).workflow, pilotEndpoint: (a.first_use || {}).pilot_endpoint,
          uncertainty: a.uncertainty, nextAction: a.next_action,
          people: (a.contacts || []).map((c) => ({ name: c.name, role: c.title, source: c.source_url })),
          signals: (a.signals || []).map((g) => ({ date: g.date, fact: g.fact })),
          relationship: { owner: '', strength: relMap((a.relationship || {}).kind || ''), note: (a.relationship || {}).route || '' },
          value: { users: (a.users || {}).base || 0, hours: 3, rate: 48, share: 0.6, multiple: 3 },
        });
      });
      if (D.market && D.market.segments) {
        const pr = D.market.prices || [2400, 3600, 4800];
        ws.market.prices = { low: pr[0], base: pr[1], high: pr[2] };
        ws.market.segments = D.market.segments.map((s) => ({ name: s.label || prettify(s.id), count: s.source_count || 0, retain: s.retained_share || [0, 0, 0], fit: s.workflow_fit_share || [0, 0, 0], upu: s.eligible_users_per_account || [0, 0, 0], expansion: false }));
      }
      ws.sources = (D.sources || []).map((s) => ({ title: s.title, publisher: s.source_id, date: s.accessed || s.period, kind: 'Public record', supports: s.note, url: s.url }));
      ws.glossary = (D.glossary || []).map((g) => ({ term: g.abbr, full: g.full, definition: g.meaning, relevance: '' }));
      ws.decisions = (D.review || []).map((r) => ({ topic: r.topic, question: r.q, call: r.decision, why: r.reason, confidence: r.confidence, effect: r.applied, status: 'Open', mine: '' }));
      ws.diligence = (D.backlog || []).map((b) => ({ question: b.item, why: b.why, owner: '', priority: /high|1/i.test(b.priority) ? 'P1' : 'P2', status: 'Open', answer: b.next }));
      ws.lenses = [{ id: 'all', label: 'All accounts', filter: {} }, { id: 'indep', label: 'Independent demand', filter: { excludeTags: ['Investor-linked', 'Reference to verify', 'Partner route'] } }, { id: 'warm', label: 'Warm introductions', filter: {}, access: true }]
        .concat(ws.segments.slice(0, 5).map((s) => ({ id: 'seg_' + s.id, label: s.name, filter: { segments: [s.id] } })));
      ws.asOf = (D.meta && D.meta.built) || ws.asOf;
      return ws;
    },
  });

  /* =====================================================================
     3. Model engine:  <script id="model-data" type="application/json">
     ===================================================================== */
  CIE.registerImporter({
    id: 'model-json',
    label: 'Account-model engine',
    detect: (html) => /id="model-data"/.test(html),
    convert(html, name) {
      const M = jsonBlock(html, 'model-data');
      const ws = base(name);
      ws.asOf = M.as_of || ws.asOf;
      ws.thesis = typeof M.thesis === 'string' ? M.thesis : '';
      ws.subtitle = M.purpose || ws.subtitle;
      ws.dimensions = (M.dimensions || []).map((d, i) => ({ key: slug(d), label: d, weight: (M.weights || [])[i] || 10 }));
      ws.segments = segmentsFrom((M.accounts || []).map((a) => a.segment));
      ws.accounts = (M.accounts || []).map((a) => {
        const scores = {};
        ws.dimensions.forEach((d, i) => (scores[d.key] = { v: (a.scores || [])[i] || 0, s: (a.scores || [])[i] == null ? 'unknown' : 'estimated' }));
        const price = Array.isArray(a.price) ? a.price[1] : 0;
        return account({
          id: a.id, name: a.name, segment: slug(a.segment), state: a.state, stage: /qualif/i.test(a.stage || '') ? 'qualified' : /research/i.test(a.stage || '') ? 'research_ready' : 'identified',
          tags: [a.wave, a.status].filter(Boolean), scores, why: a.rationale, buyer: a.buyer, firstUse: a.wedge, pilotEndpoint: a.metric, uncertainty: a.gate, nextAction: a.next_action,
          bottomLine: a.score_basis || '', relationship: { owner: '', strength: /unknown|no /i.test(a.access || '') ? 'none' : 'possible', note: a.access || '' },
          value: { users: 0, hours: 3, rate: 48, share: 0.6, multiple: 3, price }, notes: [a.funding && 'Funding: ' + a.funding, a.cycle && 'Cycle: ' + a.cycle, a.incumbent && 'Incumbent: ' + a.incumbent].filter(Boolean).join('\n'),
        });
      });
      ws.sources = (M.sources || []).map((s) => ({ title: s.title, publisher: s.id, date: s.date || s.accessed, kind: /customer/i.test(s.kind) ? 'Customer testimony' : /vendor|company/i.test(s.kind) ? 'Vendor claim' : 'Public record', supports: s.note, url: s.url }));
      ws.glossary = (M.glossary || []).map((g) => ({ term: g.term, full: g.expansion, definition: g.meaning, relevance: g.commercial }));
      ws.diligence = (M.claims || []).map((c) => ({ question: c.claim, why: c.limit, owner: '', priority: 'P2', status: /verified|confirmed/i.test(c.status) ? 'Answered' : 'Open', answer: c.status }));
      ws.decisions = (M.policies || []).map((p) => ({ topic: 'Policy', question: p.title, call: p.action, why: p.meaning, confidence: 'Medium', effect: p.impact, status: 'Open', mine: '' }));
      ws.lenses = [{ id: 'all', label: 'All accounts', filter: {} }].concat([...new Set(ws.accounts.map((a) => a.tags[0]).filter(Boolean))].slice(0, 5).map((w) => ({ id: slug(w), label: w, filter: { tags: [w] } })));
      return ws;
    },
  });

  /* =====================================================================
     4. Network / owner engine:  const DATA = { sites: [...], groups: [...] }
     ===================================================================== */
  CIE.registerImporter({
    id: 'network-owners',
    label: 'Network owner engine',
    detect: (html) => /const\s+DATA\s*=\s*\{\s*"sites"/.test(html),
    convert(html, name) {
      const D = constOf(html, 'DATA');
      const ws = base(name);
      ws.offering = { unit: 'site', price: 60000 };
      ws.dimensions = [
        { key: 'scale', label: 'Open sites', weight: 30 }, { key: 'growth', label: 'Growth: new and coming sites', weight: 15 },
        { key: 'footprint', label: 'Multi-state footprint', weight: 10 }, { key: 'lanes', label: 'Both service lanes', weight: 15 },
        { key: 'data', label: 'Data confidence', weight: 10 }, { key: 'proximity', label: 'Proximity to HQ', weight: 10 }, { key: 'relationship', label: 'Relationship', weight: 10 },
      ];
      ws.segments = segmentsFrom(D.groups.map((g) => g.type));
      const sitesBy = {};
      D.sites.forEach((s) => (sitesBy[s.gid] = sitesBy[s.gid] || []).push(s));
      const qOpen = quintiler(D.groups.map((g) => g.n_open)), qGrow = quintiler(D.groups.map((g) => (g.n_ramp || 0) + (g.n_pipe || 0)));
      ws.accounts = D.groups.map((g) => {
        const s0 = (sitesBy[g.id] || []).find((s) => s.lat != null) || {};
        return account({
          id: g.id, name: g.name, segment: slug(g.type), state: (g.states || [])[0] || s0.st, lat: s0.lat, lon: s0.lon,
          tags: [g.backer, g.clinic && g.pharmacy ? 'Both lanes' : '', g.recent_change ? 'Recent ownership change' : ''].filter(Boolean),
          scores: {
            scale: { v: qOpen(g.n_open), s: 'evidenced' }, growth: { v: (g.n_ramp || 0) + (g.n_pipe || 0) ? qGrow((g.n_ramp || 0) + (g.n_pipe || 0)) : 0, s: 'evidenced' },
            footprint: { v: Math.min(5, (g.states || []).length), s: 'evidenced' }, lanes: { v: g.clinic && g.pharmacy ? 5 : g.clinic || g.pharmacy ? 2 : 0, s: 'evidenced' },
            data: { v: Math.round((g.complete || 0) * 5), s: 'estimated' }, proximity: { v: g.dist_hq == null ? 0 : g.dist_hq < 250 ? 5 : g.dist_hq < 600 ? 3 : 1, s: g.dist_hq == null ? 'unknown' : 'evidenced' }, relationship: { v: 0, s: 'unknown' },
          },
          checks: { identity: true }, people: (g.people || []).map((p) => ({ name: p.name, role: p.role, source: '' })),
          value: { users: g.n_open || 0, hours: 3, rate: 48, share: 0.6, multiple: 3 },
          notes: (sitesBy[g.id] || []).map((s) => '• ' + s.site + (s.status ? ' (' + s.status + ')' : '')).join('\n'),
        });
      });
      ws.lenses = [{ id: 'all', label: 'All owners', filter: {} }].concat(ws.segments.map((s) => ({ id: 'seg_' + s.id, label: s.name, filter: { segments: [s.id] } }))).concat([{ id: 'warm', label: 'Pilot + access', filter: {}, access: true }]);
      return ws;
    },
  });

  /* =====================================================================
     5. Account universe:  const ACCOUNTS = [ { ..., components: {dimension: points} } ]
     ===================================================================== */
  CIE.registerImporter({
    id: 'account-universe',
    label: 'Account-universe engine',
    detect: (html) => /const\s+ACCOUNTS\s*=\s*\[/.test(html),
    convert(html, name) {
      const A = constOf(html, 'ACCOUNTS');
      const ws = base(name);
      const comps = {};
      A.forEach((a) => Object.entries(a.components || {}).forEach(([k, v]) => (comps[k] = Math.max(comps[k] || 0, Number(v) || 0))));
      ws.dimensions = Object.entries(comps).map(([k, max]) => ({ key: slug(k), label: k, weight: Math.round(max) || 10 }));
      ws.segments = segmentsFrom(A.map((a) => a.segment));
      ws.accounts = A.map((a) => {
        const scores = {};
        Object.entries(comps).forEach(([k, max]) => { const v = (a.components || {})[k]; scores[slug(k)] = v == null ? { v: 0, s: 'unknown' } : { v: Math.round((v / (max || 1)) * 5), s: 'estimated' }; });
        return account({
          id: a.id, name: a.name, segment: slug(a.segment), stage: /research|verify/i.test(a.triggerStatus || '') ? 'identity_resolved' : 'research_ready',
          tags: [a.priority, a.motion, a.existing ? 'Existing customer' : '', a.competitor ? 'Competitive takeout' : '', a.accountTier].filter(Boolean),
          scores, why: a.why, firstUse: (a.wedges || []).join(', '), uncertainty: a.statusNote, nextAction: a.activationRule, bottomLine: a.trigger ? 'Trigger: ' + a.trigger + ' (' + (a.triggerStatus || '') + ')' : '',
          checks: { identity: true }, notes: [a.scaleEvidence, a.initialPrice && 'Initial: ' + a.initialPrice, a.expansionPrice && 'Expansion: ' + a.expansionPrice, a.channel].filter(Boolean).join('\n'),
        });
      });
      ws.lenses = [{ id: 'all', label: 'All accounts', filter: {} }].concat([...new Set(A.map((a) => a.motion).filter(Boolean))].map((m) => ({ id: slug(m), label: m, filter: { tags: [m] } }))).concat([{ id: 'p1', label: 'P1 only', filter: { tags: ['P1'] } }]);
      return ws;
    },
  });

  /* ---------- anonymisation ----------
     Some source companies must never appear on screen. Their names are matched by hash so the real
     name is not written anywhere in this code; matching text is replaced throughout the workspace. */
  const fnv = (str) => { let h = 0x811c9dc5; for (const c of String(str).toLowerCase()) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const ALIASES = { d10305b5: 'Lumen Bedside AI' };
  const brandOf = (fileName) => String(fileName || '').replace(/^[0-9a-f]{8}-/i, '').split(/[_\s.-]/)[0];
  function replaceDeep(o, re, to) {
    if (typeof o === 'string') return o.replace(re, to);
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = replaceDeep(o[i], re, to); return o; }
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = replaceDeep(o[k], re, to); return o; }
    return o;
  }
  // Applies to fresh imports and to workspaces imported by an earlier version. Returns true if changed.
  CIE.anonymize = function (ws) {
    const file = ws.importedFrom && ws.importedFrom.file;
    const brand = brandOf(file);
    const alias = brand && ALIASES[fnv(brand)];
    if (!alias) return false;
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const { datasets, ...rest } = ws;
    replaceDeep(rest, re, alias);
    Object.assign(ws, rest);
    if (datasets) replaceDeep(datasets, re, alias);
    ws.importedFrom.file = ws.importedFrom.file.replace(re, alias);
    ws.company = alias;
    ws.name = alias + ' (demo)';
    return true;
  };

  /* ---------- entry point ---------- */
  CIE.importCIE = function (html, fileName) {
    const name = String(fileName || 'Imported CIE').replace(/\.(html?|json)$/i, '').replace(/^[0-9a-f]{8}-/i, '').replace(/_/g, ' ').replace(/\s*(Commercial Intelligence Engine|CIE)\b.*$/i, '').trim() || 'Imported CIE';
    const a = adapters.find((x) => x.detect(html));
    if (!a) throw new Error('This file does not contain a data layout the importer recognises. Supported: ' + adapters.map((x) => x.label).join(', ') + '.');
    const ws = a.convert(html, name);
    ws.name = name + ' (imported)';
    ws.importedFrom = { file: fileName, adapter: a.id, at: new Date().toISOString() };
    ws.accounts.forEach((acc) => CIE.enforceStage(acc));
    CIE.anonymize(ws);
    return { ws, adapter: a };
  };
})();
