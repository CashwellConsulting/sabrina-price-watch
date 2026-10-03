/* Pilot & gates (gate tracker, cohort builder, value types never added together)
   and Deal mechanics (MEDDPICC evidence per account). */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const GATE_STATUS = [
    { id: 'not_started', label: 'Not started', cls: '' },
    { id: 'in_progress', label: 'In progress', cls: 'warning' },
    { id: 'passed', label: 'Passed', cls: 'good' },
    { id: 'failed', label: 'Failed / redesign', cls: 'critical' },
  ];
  const ROLES = ['Strong fit', 'Typical', 'Friction case'];

  CIE.registerModule({
    id: 'gates',
    group: 'pilot',
    title: 'Gates & pilot cohort',
    order: 30,
    describe: 'Evidence gates before rollout, a balanced pilot cohort, and value types kept separate.',
    render(root, ctx) {
      const ws = ctx.ws, G = ws.gates;
      G.valueTypes = G.valueTypes || [];
      const ranked = CIE.rank(ws, null);
      const cohort = G.cohort.map((c) => ({ c, r: ranked.find((r) => r.a.id === c.id) })).filter((x) => x.r);
      const passed = G.gates.filter((g) => g.status === 'passed').length;

      root.innerHTML = `
        <div class="page-head"><div><h2>Gates & pilot cohort</h2><p>No rollout past a gate until its owner signs off. A “no-go” on a weak use case counts as progress.</p></div>
          <div class="row"><button class="btn" id="addGate">+ Add gate</button></div></div>
        ${G.oneLine ? `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>The strategy in one line</h3></div><p style="font-size:15px;margin:0">${esc(G.oneLine)}</p></div>` : ''}
        <div class="card"><div class="card-head"><h3>The gates</h3><span class="sub">${passed} of ${G.gates.length} passed</span></div>
          ${CIE.charts.stackBar(GATE_STATUS.map((s, i) => ({ label: s.label, value: G.gates.filter((g) => g.status === s.id).length, color: ['var(--axis)', 'var(--warning)', 'var(--good)', 'var(--critical)'][i] })).filter((p) => p.value), { title: 'Gate status' })}
          <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>#</th><th>Gate</th><th>Pass criteria</th><th>Owner</th><th>Status</th><th></th></tr></thead>
          <tbody>${G.gates.map((g, i) => `<tr><td class="num">${i}</td><td><input data-g="${i}" data-k="name" value="${esc(g.name)}"></td><td><input data-g="${i}" data-k="criteria" value="${esc(g.criteria)}" style="min-width:260px"></td><td><input data-g="${i}" data-k="owner" value="${esc(g.owner || '')}"></td>
            <td><select data-g="${i}" data-k="status">${GATE_STATUS.map((s) => `<option value="${s.id}" ${s.id === g.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></td><td><button class="btn sm danger" data-delg="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>
          ${G.stopRules ? `<p class="notice" style="margin-top:12px"><b>Stop or redesign when:</b> ${esc(G.stopRules)}</p>` : ''}</div>

        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-head"><h3>Build the pilot cohort</h3><span class="sub">one strong, one typical, one with friction</span></div>
            <div class="row" style="margin-bottom:10px"><button class="btn primary" id="suggest">Suggest a starting cohort</button><button class="btn" id="clear">Clear</button>
              <select id="addAcc"><option value="">+ Add an account…</option>${ranked.filter((r) => !G.cohort.find((c) => c.id === r.a.id)).map((r) => `<option value="${esc(r.a.id)}">${esc(r.a.name)}</option>`).join('')}</select></div>
            <div class="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Fit</th><th></th></tr></thead><tbody>
            ${cohort.map(({ c, r }, i) => `<tr><td class="clickable" data-open="${esc(r.a.id)}"><b>${esc(r.a.name)}</b><div class="small muted">${esc(CIE.segmentName(ws, r.a.segment))} · ${esc(r.a.state)}</div></td>
              <td><select data-role="${i}">${ROLES.map((x) => `<option ${x === c.role ? 'selected' : ''}>${x}</option>`).join('')}</select></td><td>${CIE.fitBar(r.s.fit, r.s.completeness)}</td><td><button class="btn sm danger" data-delc="${i}">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No cohort yet. “Suggest” picks a top account, a median account and a lower-fit one with a relationship path.</td></tr>'}
            </tbody></table></div></div>
          <div class="card"><div class="card-head"><h3>Value types — never add these together</h3><button class="btn sm" id="addVT">+ type</button></div>
            ${G.valueTypes.map((v, i) => `<div class="card" style="padding:10px;margin-bottom:8px;box-shadow:none"><div class="row" style="justify-content:space-between"><input data-v="${i}" data-k="label" value="${esc(v.label)}" style="font-weight:600;flex:1"><button class="btn sm danger" data-delv="${i}">✕</button></div>
              <div class="row" style="margin-top:6px">${['low', 'base', 'high'].map((k) => `<label class="field">${k === 'low' ? 'Downside' : k === 'base' ? 'Working' : 'Upside'} ($)<input type="number" data-v="${i}" data-k="${k}" value="${v[k] || 0}"></label>`).join('')}</div>
              <input data-v="${i}" data-k="note" value="${esc(v.note || '')}" placeholder="What kind of value this is" style="width:100%;margin-top:6px"></div>`).join('')}
            ${G.valueTypes.length ? CIE.charts.columns(G.valueTypes.map((v) => ({ label: v.label.length > 16 ? v.label.slice(0, 15) + '…' : v.label, values: [v.low || 0, v.base || 0, v.high || 0] })), [{ label: 'Downside', color: 'var(--s2)' }, { label: 'Working', color: 'var(--s1)' }, { label: 'Upside', color: 'var(--s3)' }], { title: 'Value types', height: 180 }) : ''}
            <p class="small muted">Preventing a loss, growing volume, and collecting cash sooner are different money. Cash timing is one-time, not profit. They are shown side by side, deliberately without a total.</p></div>
        </div>`;

      root.querySelectorAll('[data-g]').forEach((el) => (el.onchange = () => { G.gates[el.dataset.g][el.dataset.k] = el.value; ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-delg]').forEach((el) => (el.onclick = () => { G.gates.splice(el.dataset.delg, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addGate').onclick = () => { G.gates.push({ name: 'New gate', criteria: '', owner: '', status: 'not_started' }); ctx.save(); ctx.rerender(); };
      root.querySelector('#suggest').onclick = () => {
        if (!ranked.length) return;
        const strong = ranked[0].a;
        const typical = ranked[Math.floor(ranked.length / 2)].a;
        const friction = ranked.slice(Math.floor(ranked.length / 2) + 1).find((r) => r.a.relationship.strength !== 'none') || ranked[ranked.length - 1];
        G.cohort = [{ id: strong.id, role: ROLES[0] }, { id: typical.id, role: ROLES[1] }, { id: (friction.a || friction).id, role: ROLES[2] }];
        ctx.save('Cohort suggested'); ctx.rerender();
      };
      root.querySelector('#clear').onclick = () => { G.cohort = []; ctx.save(); ctx.rerender(); };
      root.querySelector('#addAcc').onchange = (e) => { if (!e.target.value) return; G.cohort.push({ id: e.target.value, role: ROLES[1] }); ctx.save(); ctx.rerender(); };
      root.querySelectorAll('[data-role]').forEach((el) => (el.onchange = () => { G.cohort[el.dataset.role].role = el.value; ctx.save(); }));
      root.querySelectorAll('[data-delc]').forEach((el) => (el.onclick = () => { G.cohort.splice(el.dataset.delc, 1); ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-open]').forEach((el) => (el.onclick = () => CIE.openAccount(ctx, el.dataset.open)));
      root.querySelectorAll('[data-v]').forEach((el) => (el.onchange = () => { const v = G.valueTypes[el.dataset.v]; v[el.dataset.k] = el.type === 'number' ? Number(el.value) : el.value; ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-delv]').forEach((el) => (el.onclick = () => { G.valueTypes.splice(el.dataset.delv, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addVT').onclick = () => { G.valueTypes.push({ label: 'New value type', low: 0, base: 0, high: 0, note: '' }); ctx.save(); ctx.rerender(); };
    },
  });

  /* ---------------- Deal mechanics ---------------- */
  const MEDDPICC = [
    ['metrics', 'Metrics', 'The measurable outcome the buyer will hold you to'],
    ['economic_buyer', 'Economic buyer', 'The person who can say yes to the money'],
    ['decision_criteria', 'Decision criteria', 'How they will judge the options'],
    ['decision_process', 'Decision process', 'Steps, people and dates to a decision'],
    ['paper_process', 'Paper process', 'Legal, security, procurement and contracting path'],
    ['pain', 'Identified pain', 'The funded problem, in their words'],
    ['champion', 'Champion', 'Someone with power who sells for you when you are not there'],
    ['competition', 'Competition', 'Alternatives, including build-it-yourself and do nothing'],
  ];
  const EVS = [
    { id: 'unknown', label: 'Unknown', score: 0 },
    { id: 'claimed', label: 'Claimed by us', score: 0.3 },
    { id: 'partial', label: 'Partially confirmed', score: 0.6 },
    { id: 'confirmed', label: 'Confirmed by buyer', score: 1 },
  ];
  const dview = { id: '' };

  CIE.registerModule({
    id: 'deals',
    group: 'pilot',
    title: 'Deal mechanics',
    order: 31,
    describe: 'MEDDPICC evidence per account, with stalled-deal plays.',
    render(root, ctx) {
      const ws = ctx.ws;
      ws.deals = ws.deals || { byAccount: {}, plays: [] };
      const D = ws.deals;
      const ranked = CIE.rank(ws, null);
      const health = (id) => { const d = D.byAccount[id] || {}; return MEDDPICC.reduce((s, [k]) => s + (EVS.find((e) => e.id === ((d[k] || {}).status || 'unknown')).score), 0) / MEDDPICC.length; };
      const pipeline = ranked.filter((r) => ['research_ready', 'outreach_ready', 'qualified'].includes(r.a.stage) || D.byAccount[r.a.id]);
      if (!dview.id || !CIE.findAccount(ws, dview.id)) dview.id = (pipeline[0] || ranked[0] || { a: {} }).a.id;
      const a = CIE.findAccount(ws, dview.id);
      const d = (a && (D.byAccount[a.id] = D.byAccount[a.id] || {})) || {};
      const gaps = MEDDPICC.filter(([k]) => !d[k] || d[k].status === 'unknown' || d[k].status === 'claimed');

      root.innerHTML = `
        <div class="page-head"><div><h2>Deal mechanics</h2><p>Record what the buyer has actually confirmed for each MEDDPICC element. Health counts only buyer evidence; what we claim scores low on purpose.</p></div></div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr)">
          <div class="card"><div class="card-head"><h3>Pipeline deal health</h3><span class="sub">research-ready and later</span></div>
            <div id="dh">${CIE.charts.barList(pipeline.slice(0, 20).map((r) => ({ id: r.a.id, label: r.a.name, value: Math.round(health(r.a.id) * 100), color: r.a.id === dview.id ? 'var(--s7)' : 'var(--s1)' })), { max: 100, labelWidth: 170, width: 420, row: 22, format: (v) => v + '%', title: 'Deal health' })}</div>
            <label class="field" style="margin-top:10px">Or pick any account<select id="pick">${ranked.map((r) => `<option value="${esc(r.a.id)}" ${r.a.id === dview.id ? 'selected' : ''}>${esc(r.a.name)}</option>`).join('')}</select></label></div>
          <div class="card">${a ? `<div class="card-head"><h3>${esc(a.name)}</h3><span class="sub">health ${Math.round(health(a.id) * 100)}% · ${esc(CIE.stageLabel(a.stage))}</span></div>
            ${MEDDPICC.map(([k, l, hint]) => { const e = d[k] || { status: 'unknown', note: '' }; return `<div class="dimrow" style="grid-template-columns:150px 170px 1fr"><span><b>${l}</b><div class="small muted">${hint}</div></span>
              <select data-m="${k}" data-k="status">${EVS.map((x) => `<option value="${x.id}" ${x.id === e.status ? 'selected' : ''}>${x.label}</option>`).join('')}</select>
              <input data-m="${k}" data-k="note" value="${esc(e.note || '')}" placeholder="Evidence, in the buyer's words"></div>`; }).join('')}
            <div class="notice" style="margin-top:12px"><b>Next three questions:</b> ${gaps.slice(0, 3).map(([, l, h]) => `${l} — ${h.toLowerCase()}`).join('; ') || 'All elements have buyer evidence. Test the close plan.'}</div>` : '<p class="muted">No accounts.</p>'}</div>
        </div>
        ${D.plays.length ? `<h3 style="margin:22px 0 10px">Unblock a stalled deal</h3><div class="grid g2">${D.plays.map((p) => `<div class="card"><h3 style="margin-bottom:6px">${esc(p.situation)}</h3><p class="small muted" style="margin-bottom:6px">Signal: ${esc(p.signal)}</p><p class="ink2" style="margin:0">${esc(p.move)}</p></div>`).join('')}</div>` : ''}`;

      root.querySelectorAll('#dh [data-id]').forEach((g) => (g.onclick = () => { dview.id = g.dataset.id; ctx.rerender(); }));
      root.querySelector('#pick').onchange = (e) => { dview.id = e.target.value; ctx.rerender(); };
      root.querySelectorAll('[data-m]').forEach((el) => (el.onchange = () => { const e = (d[el.dataset.m] = d[el.dataset.m] || { status: 'unknown', note: '' }); e[el.dataset.k] = el.value; ctx.save(); if (el.dataset.k === 'status') ctx.rerender(); }));
    },
  });
})();
