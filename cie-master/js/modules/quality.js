/* Facility quality: measure-level infection (HAI) data per facility — observed, predicted, SIR,
   denominator, rate — with filters, pooled SIRs, a facility profile and a print-ready presentation view.
   Data lives in ws.datasets.quality = { title, source, period, measures[], rows[] }. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const view = { q: '', state: '', type: '', grade: '', worse: false, hac: false, minBeds: 0, sort: 'priority', dir: -1, shown: 100, focus: '' };

  const sirClass = (s) => (s == null || isNaN(s) ? 'na' : s < 0.5 ? 'b3' : s < 0.8 ? 'b2' : s < 0.95 ? 'b1' : s <= 1.05 ? 'mid' : s <= 1.25 ? 'r1' : s <= 1.6 ? 'r2' : 'r3');
  const sirCell = (m) => {
    if (!m || m[2] == null) return '<td class="sir na" data-tip="Not reported">—</td>';
    return `<td class="sir ${sirClass(m[2])}" data-tip="Observed ${CIE.num(m[0])} · predicted ${CIE.num(m[1], 1)} · SIR ${m[2].toFixed(2)}">${m[2].toFixed(2)}</td>`;
  };
  // Excess = cases above predicted, summed over measures (measures better than predicted add nothing).
  const excessOf = (r) => Object.values(r.m || {}).reduce((t, m) => t + (m && m[0] != null && m[1] != null ? Math.max(0, m[0] - m[1]) : 0), 0);
  const observedOf = (r) => Object.values(r.m || {}).reduce((t, m) => t + (m && m[0] != null ? m[0] : 0), 0);
  const worseCount = (r) => Object.values(r.m || {}).filter((m) => m && m[2] != null && m[2] > 1).length;
  CIE.qualityData = (ws) => (ws.datasets && ws.datasets.quality) || null;

  function pooled(rows, measures) {
    return measures.map((ms) => {
      let o = 0, p = 0, worse = 0, rep = 0;
      rows.forEach((r) => { const m = r.m && r.m[ms.key]; if (m && m[0] != null && m[1] != null) { o += m[0]; p += m[1]; rep++; if (m[2] != null && m[2] > 1) worse++; } });
      return { ms, o, p, sir: p ? o / p : null, worse, rep };
    });
  }

  /* ---------- facility profile (drawer + presentation) ---------- */
  function profileHtml(ws, r, Q, present) {
    const P = pooled([r], Q.measures);
    const cost = (ms, k) => (ms.cost ? ms.cost[k] : 0);
    const exposure = Q.measures.reduce((t, ms) => { const m = r.m[ms.key]; return t + (m && m[0] != null && m[1] != null ? Math.max(0, m[0] - m[1]) * cost(ms, 1) : 0); }, 0);
    const maxSir = Math.max(2, ...P.map((x) => x.sir || 0));
    const facts = [
      ['Location', [r.city, r.state].filter(Boolean).join(', ')], ['Type', r.type], ['Ownership', r.owner],
      ['Overall star rating', r.rating ? r.rating + ' / 5' : '—'], ['Leapfrog grade', r.leapfrog || '—'],
      ['HAC score', r.hac != null ? r.hac.toFixed(3) : '—'], ['HAC payment reduction', r.hacPenalty ? 'Yes — penalised' : 'No'],
      ['Total beds', CIE.num(r.beds)], ['Critical-care beds', CIE.num(r.cc)], ['ICU beds', CIE.num(r.icu)],
    ];
    return `
      <div class="${present ? 'present-head' : ''}">
        <h2>${esc(r.name)}</h2>
        <div class="row" style="margin-top:6px">${r.rank ? `<span class="tag">Priority rank #${r.rank}</span>` : ''}${r.priority != null ? `<span class="tag">Priority score ${r.priority}</span>` : ''}<span class="tag">${esc(r.state || '')}</span>${r.leapfrog ? `<span class="tag">Leapfrog ${esc(r.leapfrog)}</span>` : ''}${r.hacPenalty ? '<span class="tag">HAC penalty</span>' : ''}</div>
        <p class="small muted" style="margin-top:6px">${esc(Q.source || '')}${Q.period ? ' · reporting period ' + esc(Q.period) : ''}</p>
      </div>
      <div class="grid g4" style="margin-top:12px">
        <div class="card kpi"><div class="label">Observed infections</div><div class="value">${CIE.num(observedOf(r))}</div><div class="foot">${Q.measures.length} measures</div></div>
        <div class="card kpi"><div class="label">Excess cases above predicted</div><div class="value">${CIE.num(excessOf(r), 1)}</div><div class="foot">Σ max(0, observed − predicted)</div></div>
        <div class="card kpi"><div class="label">Measures worse than national</div><div class="value">${worseCount(r)}</div><div class="foot">SIR above 1.0</div></div>
        <div class="card kpi"><div class="label">Excess-case cost exposure</div><div class="value">${CIE.money(exposure)}</div><div class="foot">base cost per case · indicative</div></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><div class="card-head"><h3>Standardized infection ratio by measure</h3><span class="sub">tick = national baseline (1.0)</span></div>
          ${CIE.charts.barList(P.map((x) => ({ label: x.ms.name, value: x.sir == null ? 0 : +x.sir.toFixed(2), color: x.sir == null ? 'var(--axis)' : x.sir > 1 ? 'var(--div-r3)' : 'var(--div-b3)', marker: 1 / maxSir, tip: `${x.ms.full || x.ms.name}: SIR ${x.sir == null ? 'n/a' : x.sir.toFixed(2)}` })), { max: maxSir, labelWidth: 120, width: 520, format: (v) => (v ? v.toFixed(2) : 'n/a'), title: 'SIR by measure' })}
          <p class="small muted">Below 1.0 = fewer infections than predicted for a hospital of this size and case mix; above 1.0 = more.</p></div>
        <div class="card"><div class="card-head"><h3>Observed vs predicted</h3></div>
          ${CIE.charts.columns(P.map((x) => ({ label: x.ms.name, values: [x.o, +x.p.toFixed(1)] })), [{ label: 'Observed', color: 'var(--s2)' }, { label: 'Predicted', color: 'var(--s1)' }], { format: (v) => CIE.num(v), title: 'Observed vs predicted' })}</div>
      </div>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>Measure detail</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Measure</th><th class="r">Observed</th><th class="r">Predicted</th><th class="r">SIR</th><th class="r">Excess</th><th class="r">Exposure</th><th>Denominator</th><th class="r">Rate</th></tr></thead><tbody>
        ${Q.measures.map((ms) => { const m = r.m[ms.key]; if (!m) return `<tr><td><b>${esc(ms.name)}</b></td><td colspan="7" class="muted">Not reported</td></tr>`;
          const ex = m[0] != null && m[1] != null ? m[0] - m[1] : null; const rate = m[3] ? (m[0] / m[3]) * (ms.per || 1000) : null;
          return `<tr><td><b>${esc(ms.name)}</b><div class="small muted">${esc(ms.full || '')}</div></td><td class="r num">${CIE.num(m[0])}</td><td class="r num">${CIE.num(m[1], 1)}</td>${sirCell(m)}<td class="r num">${ex == null ? '—' : (ex >= 0 ? '+' : '') + ex.toFixed(1)}</td><td class="r num">${ex > 0 ? CIE.money(ex * cost(ms, 1)) : '—'}</td><td class="num">${m[3] ? CIE.num(m[3]) + ' ' + esc(ms.denom || '') : '—'}</td><td class="r num">${rate == null ? '—' : rate.toFixed(2) + ' / ' + CIE.num(ms.per || 1000)}</td></tr>`; }).join('')}
        </tbody></table></div></div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><div class="card-head"><h3>Facility facts</h3></div><dl class="kv">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl></div>
        <div class="card"><div class="card-head"><h3>Commercial read</h3></div><dl class="kv">
          ${r.wedge ? `<dt>Lead workflow</dt><dd>${esc(r.wedge)}</dd>` : ''}${r.rationale ? `<dt>Rationale</dt><dd>${esc(r.rationale)}</dd>` : ''}${r.whyNow ? `<dt>Why now</dt><dd>${esc(r.whyNow)}</dd>` : ''}${r.access ? `<dt>Access</dt><dd>${esc(r.access)}</dd>` : ''}
          </dl>${!r.wedge && !r.whyNow ? '<p class="muted small">No commercial notes for this facility.</p>' : ''}</div>
      </div>`;
  }

  CIE.openFacility = function (ctx, id) {
    const ws = ctx.ws, Q = CIE.qualityData(ws);
    const r = Q && Q.rows.find((x) => x.id === id);
    if (!r) return CIE.toast('No facility data for this account');
    ctx.openDrawer(`<div class="row" style="justify-content:flex-end;margin-bottom:6px"><button class="btn primary sm" id="presentBtn">Present full screen ⤢</button></div>` + profileHtml(ws, r, Q, false), (d) => {
      d.classList.add('wide');
      d.querySelector('#presentBtn').onclick = () => CIE.presentFacility(ctx, id);
    });
  };

  CIE.presentFacility = function (ctx, id) {
    const ws = ctx.ws, Q = CIE.qualityData(ws);
    const r = Q.rows.find((x) => x.id === id);
    ctx.closeDrawer();
    const ov = document.createElement('div');
    ov.className = 'present';
    const list = view.list || [r.id];
    const pos = list.indexOf(r.id);
    ov.innerHTML = `<div class="present-bar"><span class="muted small">${esc(Q.title || 'Facility quality')} · ${pos >= 0 ? pos + 1 + ' of ' + list.length : ''} · ← → to move, Esc to close</span><span class="row"><button class="btn sm" data-p="-1">← Previous</button><button class="btn sm" data-p="1">Next →</button><button class="btn sm" onclick="window.print()">Print / PDF</button><button class="btn sm" data-x>Close ✕</button></span></div><div class="present-body">${profileHtml(ws, r, Q, true)}</div>`;
    document.body.appendChild(ov);
    const go = (d) => { const i = list.indexOf(r.id) + d; if (i >= 0 && i < list.length) { ov.remove(); document.removeEventListener('keydown', key); CIE.presentFacility(ctx, list[i]); } };
    const key = (e) => { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', key); } if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    document.addEventListener('keydown', key);
    ov.addEventListener('click', (e) => { if (e.target.hasAttribute('data-x')) { ov.remove(); document.removeEventListener('keydown', key); } const p = e.target.getAttribute('data-p'); if (p) go(Number(p)); });
  };

  CIE.registerModule({
    id: 'quality',
    group: 'intel',
    title: 'Facility quality (HAI)',
    order: 14,
    describe: 'Infection data per facility: observed, predicted, SIR, rates, with a presentation view.',
    render(root, ctx) {
      const ws = ctx.ws, Q = CIE.qualityData(ws);
      if (!Q || !Q.rows || !Q.rows.length) {
        root.innerHTML = `<div class="page-head"><div><h2>Facility quality (HAI)</h2><p>No facility dataset in this engagement yet.</p></div></div>
          <div class="card"><p>Load one with <b>Data &amp; modules → Import an existing CIE file</b> (any CIE that carries a facility infection table), or switch to the sample engagement to see how it works.</p></div>`;
        return;
      }
      const all = Q.rows;
      const states = [...new Set(all.map((r) => r.state).filter(Boolean))].sort();
      const types = [...new Set(all.map((r) => r.type).filter(Boolean))].sort();
      const grades = [...new Set(all.map((r) => r.leapfrog).filter(Boolean))].sort();
      let rows = all.filter((r) =>
        (!view.q || (r.name + ' ' + (r.city || '')).toLowerCase().includes(view.q.toLowerCase())) &&
        (!view.state || r.state === view.state) && (!view.type || r.type === view.type) && (!view.grade || r.leapfrog === view.grade) &&
        (!view.worse || worseCount(r) > 0) && (!view.hac || r.hacPenalty) && (!view.minBeds || (r.beds || 0) >= view.minBeds));
      const key = view.sort;
      const val = (r) => key === 'name' ? r.name : key === 'beds' ? r.beds || 0 : key === 'observed' ? observedOf(r) : key === 'excess' ? excessOf(r) : key === 'worse' ? worseCount(r) : key === 'priority' ? (r.priority != null ? r.priority : -1) : r.m && r.m[key] && r.m[key][2] != null ? r.m[key][2] : -1;
      rows.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * view.dir; });
      view.list = rows.map((r) => r.id);
      const P = pooled(rows, Q.measures);
      const totO = P.reduce((t, x) => t + x.o, 0), totP = P.reduce((t, x) => t + x.p, 0), totEx = rows.reduce((t, r) => t + excessOf(r), 0);
      const maxSir = Math.max(1.5, ...P.map((x) => x.sir || 0));
      const th = (k, l, cls) => `<th class="sortable ${cls || ''}" data-sort="${k}">${l}${view.sort === k ? (view.dir < 0 ? ' ▼' : ' ▲') : ''}</th>`;

      root.innerHTML = `
        <div class="page-head"><div><h2>${esc(Q.title || 'Facility quality (HAI)')}</h2><p>${esc(Q.source || '')}${Q.period ? ' · ' + esc(Q.period) : ''}. Click any facility for its full profile, then <b>Present</b> for a clean full-screen view you can page through with the arrow keys.</p></div>
          <div class="row"><button class="btn" id="csv">Export CSV (${rows.length})</button>${rows[0] ? '<button class="btn primary" id="present">Present filtered list ⤢</button>' : ''}</div></div>
        <div class="row" style="margin-bottom:12px">
          <input id="fq" placeholder="Search facility or city…" value="${esc(view.q)}" style="min-width:220px">
          <select id="fs"><option value="">All states</option>${states.map((s) => `<option ${s === view.state ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          ${types.length > 1 ? `<select id="ft"><option value="">All types</option>${types.map((s) => `<option ${s === view.type ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>` : ''}
          ${grades.length ? `<select id="fg"><option value="">Any Leapfrog grade</option>${grades.map((s) => `<option ${s === view.grade ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>` : ''}
          <label class="field" style="flex-direction:row;align-items:center;gap:6px">Min beds<input type="number" id="fb" value="${view.minBeds || ''}" style="width:80px"></label>
          <label class="check"><input type="checkbox" id="fw" ${view.worse ? 'checked' : ''}> Worse than national on ≥1</label>
          <label class="check"><input type="checkbox" id="fh" ${view.hac ? 'checked' : ''}> HAC penalty</label>
          <button class="btn sm" id="freset">Reset</button>
        </div>
        <div class="grid g4">
          <div class="card kpi"><div class="label">Facilities</div><div class="value">${CIE.num(rows.length)}</div><div class="foot">of ${CIE.num(all.length)} in the dataset</div></div>
          <div class="card kpi"><div class="label">Observed infections</div><div class="value">${CIE.num(totO)}</div><div class="foot">predicted ${CIE.num(totP)}</div></div>
          <div class="card kpi"><div class="label">Excess cases above predicted</div><div class="value">${CIE.num(totEx)}</div><div class="foot">pooled SIR ${totP ? (totO / totP).toFixed(2) : '—'} across all measures</div></div>
          <div class="card kpi"><div class="label">Worse than national on ≥1 measure</div><div class="value">${CIE.num(rows.filter((r) => worseCount(r) > 0).length)}</div><div class="foot">${CIE.num(rows.filter((r) => r.hacPenalty).length)} with a HAC payment penalty</div></div>
        </div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-head"><h3>Pooled SIR by measure</h3><span class="sub">Σ observed ÷ Σ predicted · tick = 1.0</span></div>
            ${CIE.charts.barList(P.map((x) => ({ label: x.ms.name, value: x.sir == null ? 0 : +x.sir.toFixed(2), color: x.sir > 1 ? 'var(--div-r3)' : 'var(--div-b3)', marker: 1 / maxSir, tip: `${x.ms.full || x.ms.name}: pooled SIR ${x.sir == null ? 'n/a' : x.sir.toFixed(2)} across ${x.rep} reporting facilities` })), { max: maxSir, labelWidth: 120, width: 520, format: (v) => v.toFixed(2), title: 'Pooled SIR' })}</div>
          <div class="card"><div class="card-head"><h3>Facilities worse than national, by measure</h3><span class="sub">count with SIR above 1.0</span></div>
            ${CIE.charts.barList(P.map((x) => ({ label: x.ms.name, value: x.worse, color: 'var(--s2)', tip: `${x.ms.name}: ${x.worse} of ${x.rep} reporting facilities above 1.0` })), { labelWidth: 120, width: 520, title: 'Worse than national' })}</div>
        </div>
        <div class="legend" style="margin:16px 0 8px"><span>SIR:</span>${['b3', 'b2', 'b1', 'mid', 'r1', 'r2', 'r3'].map((c, i) => `<span><i class="sir ${c}" style="width:22px"></i>${['<0.5', '0.5–0.8', '0.8–0.95', '≈1.0', '1.05–1.25', '1.25–1.6', '>1.6'][i]}</span>`).join('')}</div>
        <div class="table-wrap"><table class="hai"><thead><tr>${th('priority', 'Priority', 'r')}${th('name', 'Facility')}<th>State</th>${th('beds', 'Beds', 'r')}${th('observed', 'Observed', 'r')}${th('excess', 'Excess', 'r')}${Q.measures.map((ms) => th(ms.key, esc(ms.name), 'r')).join('')}<th>Leapfrog</th><th>HAC</th></tr></thead>
          <tbody>${rows.slice(0, view.shown).map((r) => `<tr class="clickable" data-f="${esc(r.id)}"><td class="r num">${r.priority != null ? r.priority : ''}</td><td><b>${esc(r.name)}</b><div class="small muted">${esc(r.city || '')}</div></td><td>${esc(r.state || '')}</td><td class="r num">${CIE.num(r.beds)}</td><td class="r num">${CIE.num(observedOf(r))}</td><td class="r num">${excessOf(r).toFixed(1)}</td>${Q.measures.map((ms) => sirCell(r.m[ms.key])).join('')}<td>${esc(r.leapfrog || '')}</td><td>${r.hacPenalty ? '<span class="status serious">penalty</span>' : ''}</td></tr>`).join('') || `<tr><td colspan="${8 + Q.measures.length}" class="muted">No facilities match.</td></tr>`}</tbody></table></div>
        ${rows.length > view.shown ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" id="more">Show ${Math.min(200, rows.length - view.shown)} more (${CIE.num(rows.length - view.shown)} hidden)</button></div>` : ''}`;

      const re = () => { view.shown = 100; ctx.rerender(); };
      const q = root.querySelector('#fq');
      q.oninput = () => { view.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { re(); const n = document.getElementById('fq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); };
      [['#fs', 'state'], ['#ft', 'type'], ['#fg', 'grade']].forEach(([s, k]) => { const el = root.querySelector(s); if (el) el.onchange = () => { view[k] = el.value; re(); }; });
      root.querySelector('#fb').onchange = (e) => { view.minBeds = Number(e.target.value) || 0; re(); };
      root.querySelector('#fw').onchange = (e) => { view.worse = e.target.checked; re(); };
      root.querySelector('#fh').onchange = (e) => { view.hac = e.target.checked; re(); };
      root.querySelector('#freset').onclick = () => { Object.assign(view, { q: '', state: '', type: '', grade: '', worse: false, hac: false, minBeds: 0, sort: 'priority', dir: -1 }); re(); };
      root.querySelectorAll('[data-sort]').forEach((t) => (t.onclick = () => { if (view.sort === t.dataset.sort) view.dir *= -1; else { view.sort = t.dataset.sort; view.dir = t.dataset.sort === 'name' ? 1 : -1; } ctx.rerender(); }));
      root.querySelectorAll('tr[data-f]').forEach((tr) => (tr.onclick = () => CIE.openFacility(ctx, tr.dataset.f)));
      const more = root.querySelector('#more'); if (more) more.onclick = () => { view.shown += 200; ctx.rerender(); };
      const pr = root.querySelector('#present'); if (pr) pr.onclick = () => CIE.presentFacility(ctx, rows[0].id);
      root.querySelector('#csv').onclick = () => {
        const cols = [{ label: 'Facility ID', get: (r) => r.id }, { label: 'Facility', get: (r) => r.name }, { label: 'City', get: (r) => r.city }, { label: 'State', get: (r) => r.state }, { label: 'Beds', get: (r) => r.beds }, { label: 'Priority', get: (r) => r.priority }, { label: 'Observed total', get: observedOf }, { label: 'Excess total', get: (r) => excessOf(r).toFixed(2) }]
          .concat(Q.measures.flatMap((ms) => [{ label: ms.name + ' observed', get: (r) => (r.m[ms.key] || [])[0] }, { label: ms.name + ' predicted', get: (r) => (r.m[ms.key] || [])[1] }, { label: ms.name + ' SIR', get: (r) => (r.m[ms.key] || [])[2] }, { label: ms.name + ' denominator', get: (r) => (r.m[ms.key] || [])[3] }]))
          .concat([{ label: 'Leapfrog', get: (r) => r.leapfrog }, { label: 'HAC penalty', get: (r) => (r.hacPenalty ? 'Yes' : 'No') }]);
        CIE.download(CIE.slug(ws.name) + '-facility-quality.csv', CIE.toCSV(rows, cols), 'text/csv');
      };
    },
  });
})();
