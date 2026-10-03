/* Target accounts: lens presets, filters, ranked table, account drawer with score parts,
   outreach checklist, relationship overlay and buyer value calculator. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const view = { lens: 'all', seg: '', state: '', stage: '', q: '', sort: 'rank' };

  /* ---------- the account drawer (shared by every module) ---------- */
  CIE.openAccount = function (ctx, id) {
    const ws = ctx.ws, a = CIE.findAccount(ws, id);
    if (!a) return;
    const price = ws.offering.price;
    const draw = () => {
      const s = CIE.score(a, ws);
      const ranked = CIE.rank(ws, null);
      const pos = ranked.findIndex((r) => r.a.id === a.id) + 1;
      const v = CIE.valueModel(a.value, a.value.price || price);
      const curve = [];
      const pMax = Math.max(v.perUser * 1.5, (a.value.price || price) * 2, 100);
      for (let i = 1; i <= 24; i++) { const p = (pMax * i) / 24; curve.push({ x: p, y: v.perUser / p }); }
      const auto = `Rank #${pos} of ${ranked.length}. Fit ${s.fit} with ${Math.round(s.completeness * 100)}% of the scoring weight backed by evidence.${a.tags.includes('Builds own platform') ? ' Build-versus-buy risk is high.' : ''}`;
      return `
      <h2>${esc(a.name)}</h2>
      <div class="row" style="margin-top:6px"><span class="tag">${esc(CIE.stageLabel(a.stage))}</span><span class="tag">${esc(CIE.segmentName(ws, a.segment))}</span><span class="tag">${esc(a.state || '—')}</span>${a.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <section><h3>Bottom line</h3><div class="bottomline">${esc(a.bottomLine || auto)}</div>${a.bottomLine ? `<p class="small muted" style="margin-top:6px">${esc(auto)}</p>` : ''}</section>

      <section><h3>Why it ranks here</h3>
        <div class="row" style="margin-bottom:6px">${CIE.fitBar(s.fit, s.completeness)}</div>
        ${s.parts.map((p) => `<div class="dimrow"><span>${esc(p.label)} <span class="muted small">· weight ${p.weight}</span></span>
          <select data-dim="${p.key}" data-k="v">${[0, 1, 2, 3, 4, 5].map((n) => `<option ${n === p.v && p.status !== 'unknown' ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <select data-dim="${p.key}" data-k="s">${CIE.EVIDENCE.map((e) => `<option ${e === p.status ? 'selected' : ''}>${e}</option>`).join('')}</select>
          <span class="num small r">${p.pts.toFixed(1)}</span></div>`).join('')}
        <p class="small muted" style="margin-top:6px">Unknown dimensions score zero; they are never guessed. The black tick on the bar is the share of weight backed by evidence.</p>
      </section>

      <section><h3>Who uses it, who pays</h3><dl class="kv">
        ${[['why', 'Why this account'], ['user', 'User / workflow owner'], ['buyer', 'Economic buyer'], ['firstUse', 'First use to propose'], ['pilotEndpoint', 'Pilot endpoint'], ['uncertainty', 'Principal uncertainty'], ['nextAction', 'Next action']]
          .map(([k, l]) => `<dt>${l}</dt><dd><input data-f="${k}" value="${esc(a[k] || '')}" style="width:100%"></dd>`).join('')}
      </dl></section>

      <section><h3>Buying group</h3>
        ${a.people.length ? a.people.map((p) => `<div class="check"><b>${esc(p.name)}</b><span class="muted">${esc(p.role)}</span>${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">source</a>` : '<span class="tag">unsourced</span>'}</div>`).join('') : '<p class="muted small">No named people yet. Names appear only with a link to the page that lists them; emails are never guessed.</p>'}
      </section>

      ${a.signals && a.signals.length ? `<section><h3>Dated signals</h3>${a.signals.map((g) => `<div class="check"><span class="muted num">${esc(g.date)}</span><span>${esc(g.fact)}</span></div>`).join('')}</section>` : ''}

      <section><h3>Stage and outreach checklist</h3>
        ${CIE.CHECKS.map((c) => `<label class="check"><input type="checkbox" data-check="${c.id}" ${a.checks[c.id] ? 'checked' : ''}> ${esc(c.label)}</label>`).join('')}
        <div class="row" style="margin-top:8px"><label class="field">Stage<select data-stage>${CIE.STAGES.map((st) => `<option value="${st.id}" ${st.id === a.stage ? 'selected' : ''}>${esc(st.label)}</option>`).join('')}</select></label></div>
        <p class="small muted" style="margin-top:6px">Outreach-ready describes data completeness, not contact. If the four checks are not all passed the stage is downgraded automatically.</p>
      </section>

      <section><h3>Relationship overlay</h3>
        <div class="grid g2"><label class="field">Who holds it<input data-rel="owner" value="${esc(a.relationship.owner || '')}"></label>
        <label class="field">Strength<select data-rel="strength">${CIE.REL_STRENGTH.map((r) => `<option value="${r.id}" ${r.id === a.relationship.strength ? 'selected' : ''}>${esc(r.label)}${r.boost ? ' (+' + r.boost + ' in access lenses)' : ''}</option>`).join('')}</select></label></div>
        <label class="field" style="margin-top:8px">Path / note<input data-rel="note" value="${esc(a.relationship.note || '')}"></label>
        <p class="small muted" style="margin-top:6px">Kept separate from fit. It only adds a visible boost in lenses marked “+ access”.</p>
      </section>

      <section><h3>Buyer value calculator</h3>
        <div class="grid g3">
          ${[['users', 'Users', 1], ['hours', 'Hours saved / user / week', 0.5], ['rate', 'Loaded hourly cost ($)', 1], ['share', 'Share finance will count (0–1)', 0.05], ['price', 'Price per ' + ws.offering.unit + ' / yr ($)', 100], ['multiple', 'Target return multiple', 0.5]]
            .map(([k, l, st]) => `<label class="field">${l}<input type="number" step="${st}" data-val="${k}" value="${a.value[k] != null ? a.value[k] : k === 'price' ? price : ''}"></label>`).join('')}
        </div>
        <div class="grid g3" style="margin-top:12px">
          <div class="card kpi"><div class="label">Value per ${esc(ws.offering.unit)} / yr</div><div class="value">${CIE.money(v.perUser)}</div></div>
          <div class="card kpi"><div class="label">Value per $1 of price</div><div class="value">${v.perDollar.toFixed(2)}×</div></div>
          <div class="card kpi"><div class="label">Highest price at ${a.value.multiple}×</div><div class="value">${CIE.money(v.maxPrice)}</div></div>
        </div>
        <div style="margin-top:10px">${CIE.charts.line(curve, { title: 'Return multiple by price', ref: a.value.multiple, refLabel: 'target ' + a.value.multiple + '×', markX: a.value.price || price, formatX: CIE.money, formatY: (y) => y.toFixed(1) + '×' })}</div>
        <p class="small muted">Account value ${CIE.money(v.total)} / yr against a contract of ${CIE.money(v.contract)}. Every input is an assumption until validated with the buyer.</p>
      </section>

      <section><h3>Notes</h3><textarea data-f="notes" placeholder="Your working notes — saved in this browser">${esc(a.notes || '')}</textarea>
        <label class="field" style="margin-top:8px">Bottom line override<input data-f="bottomLine" value="${esc(a.bottomLine || '')}" placeholder="Leave blank to use the computed line"></label></section>`;
    };
    const bind = (d) => {
      d.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.dim) {
          const cur = a.scores[t.dataset.dim] || { v: 0, s: 'unknown' };
          if (t.dataset.k === 'v') { cur.v = Number(t.value); if (cur.s === 'unknown' && cur.v > 0) cur.s = 'estimated'; } else cur.s = t.value;
          a.scores[t.dataset.dim] = cur;
        } else if (t.dataset.f) a[t.dataset.f] = t.value;
        else if (t.dataset.check) { a.checks[t.dataset.check] = t.checked; if (CIE.enforceStage(a)) CIE.toast('Stage set back to Research-ready: a check is missing'); }
        else if (t.hasAttribute('data-stage')) { a.stage = t.value; if (CIE.enforceStage(a)) CIE.toast('Outreach-ready needs all four checks — set to Research-ready'); }
        else if (t.dataset.rel) a.relationship[t.dataset.rel] = t.value;
        else if (t.dataset.val) a.value[t.dataset.val] = Number(t.value);
        else return;
        ctx.save();
        const top = d.scrollTop;
        d.innerHTML = `<div class="row" style="justify-content:flex-end;margin-bottom:6px"><button class="btn sm" data-close-drawer>Close ✕</button></div>` + draw();
        d.scrollTop = top;
      });
    };
    ctx.openDrawer(draw(), bind);
  };

  /* ---------- the module ---------- */
  CIE.registerModule({
    id: 'accounts',
    group: 'intel',
    title: 'Target accounts',
    order: 11,
    describe: 'Ranked accounts with lens presets, filters, score breakdown and value calculator.',
    render(root, ctx) {
      const ws = ctx.ws;
      const lens = ws.lenses.find((l) => l.id === view.lens) || ws.lenses[0];
      let rows = CIE.rank(ws, lens);
      const rankOf = new Map(rows.map((r, i) => [r.a.id, i + 1]));
      rows = rows.filter(({ a }) =>
        (!view.seg || a.segment === view.seg) && (!view.state || a.state === view.state) && (!view.stage || a.stage === view.stage) &&
        (!view.q || (a.name + ' ' + a.tags.join(' ') + ' ' + (a.why || '')).toLowerCase().includes(view.q.toLowerCase())));
      if (view.sort === 'name') rows.sort((x, y) => x.a.name.localeCompare(y.a.name));
      if (view.sort === 'evidence') rows.sort((x, y) => y.s.completeness - x.s.completeness);
      if (view.sort === 'users') rows.sort((x, y) => (y.a.value.users || 0) - (x.a.value.users || 0));
      const states = [...new Set(ws.accounts.map((a) => a.state).filter(Boolean))].sort();

      root.innerHTML = `
        <div class="page-head"><div><h2>Target accounts</h2><p>Pick the question you are answering with a lens, then click any row for the bottom line, score parts, buyer and value calculator.</p></div>
          <div class="row"><button class="btn" id="addAcc">+ Add account</button><button class="btn" id="csv">Export CSV (${rows.length})</button></div></div>
        <div class="chips" id="lenses">${ws.lenses.map((l) => `<button class="chip ${l.id === lens.id ? 'on' : ''}" data-lens="${esc(l.id)}" ${l.description ? `data-tip="${esc(l.description)}"` : ''}>${esc(l.label)}${l.access ? ' + access' : ''}</button>`).join('')}</div>
        <div class="row" style="margin:12px 0">
          <input id="q" placeholder="Search name, tag, reason…" value="${esc(view.q)}" style="min-width:220px">
          <select id="seg"><option value="">All segments</option>${ws.segments.map((s) => `<option value="${esc(s.id)}" ${s.id === view.seg ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          <select id="st"><option value="">All states</option>${states.map((s) => `<option ${s === view.state ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <select id="stage"><option value="">All stages</option>${CIE.STAGES.map((s) => `<option value="${s.id}" ${s.id === view.stage ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>
          <select id="sort">${[['rank', 'Sort: rank'], ['evidence', 'Sort: evidence'], ['users', 'Sort: users'], ['name', 'Sort: name']].map(([k, l]) => `<option value="${k}" ${k === view.sort ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th class="r">#</th><th>Account</th><th>Segment</th><th>State</th><th>Fit · evidence</th><th class="r">Users</th><th>Stage</th><th>Relationship</th></tr></thead>
          <tbody>${rows.map(({ a, s, rankScore }) => `<tr class="clickable" data-id="${esc(a.id)}">
            <td class="r num">${rankOf.get(a.id)}</td>
            <td><b>${esc(a.name)}</b><div class="small muted">${a.tags.map(esc).join(' · ')}</div></td>
            <td><span class="status" style="--c:${CIE.segmentColor(ws, a.segment)}">${esc(CIE.segmentName(ws, a.segment))}</span></td>
            <td>${esc(a.state || '')}</td>
            <td>${CIE.fitBar(s.fit, s.completeness)}${lens.access && rankScore !== s.fit ? `<div class="small muted">+${rankScore - s.fit} access</div>` : ''}</td>
            <td class="r num">${CIE.num(a.value.users)}</td>
            <td><span class="status ${a.stage === 'outreach_ready' || a.stage === 'qualified' ? 'good' : a.stage === 'research_ready' ? 'warning' : ''}">${esc(CIE.stageLabel(a.stage))}</span></td>
            <td class="small">${esc((CIE.REL_STRENGTH.find((r) => r.id === a.relationship.strength) || {}).label || '')}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">No accounts match these filters.</td></tr>'}
          </tbody></table></div>`;

      root.querySelectorAll('[data-lens]').forEach((b) => (b.onclick = () => { view.lens = b.dataset.lens; ctx.rerender(); }));
      const bindSel = (id, key) => (root.querySelector(id).onchange = (e) => { view[key] = e.target.value; ctx.rerender(); });
      bindSel('#seg', 'seg'); bindSel('#st', 'state'); bindSel('#stage', 'stage'); bindSel('#sort', 'sort');
      const q = root.querySelector('#q');
      q.oninput = () => { view.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { ctx.rerender(); const n = document.getElementById('q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
      root.querySelectorAll('tr[data-id]').forEach((tr) => (tr.onclick = () => CIE.openAccount(ctx, tr.dataset.id)));
      root.querySelector('#csv').onclick = () => {
        const cols = [
          { label: 'Rank', get: (r) => rankOf.get(r.a.id) }, { label: 'Account', get: (r) => r.a.name },
          { label: 'Segment', get: (r) => CIE.segmentName(ws, r.a.segment) }, { label: 'State', get: (r) => r.a.state },
          { label: 'Fit', get: (r) => r.s.fit }, { label: 'Evidence share', get: (r) => Math.round(r.s.completeness * 100) + '%' },
          { label: 'Users', get: (r) => r.a.value.users }, { label: 'Stage', get: (r) => CIE.stageLabel(r.a.stage) },
          { label: 'Buyer', get: (r) => r.a.buyer }, { label: 'Next action', get: (r) => r.a.nextAction }, { label: 'Tags', get: (r) => r.a.tags.join('; ') },
        ];
        CIE.download(CIE.slug(ws.name) + '-accounts.csv', CIE.toCSV(rows, cols), 'text/csv');
      };
      root.querySelector('#addAcc').onclick = () => {
        CIE.modal('Add an account', `<div class="stack"><label class="field">Name<input id="nName"></label>
          <label class="field">Segment<select id="nSeg">${ws.segments.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}<option value="">Other</option></select></label>
          <label class="field">State (2-letter)<input id="nState" maxlength="2"></label></div>`, [{
          label: 'Add', primary: true, run(m) {
            const name = m.querySelector('#nName').value.trim();
            if (!name) return false;
            const a = { id: CIE.uid('acc'), name, segment: m.querySelector('#nSeg').value, state: m.querySelector('#nState').value.toUpperCase(), stage: 'identified', scores: {}, checks: {}, tags: [], people: [], relationship: { owner: '', strength: 'none', note: '' }, value: { users: 0, hours: 3, rate: 48, share: 0.6, multiple: 3 } };
            ws.accounts.push(a); ctx.save('Account added'); ctx.rerender(); CIE.openAccount(ctx, a.id);
          } }]);
      };
    },
  });
})();
