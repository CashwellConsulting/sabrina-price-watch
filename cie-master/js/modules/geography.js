/* Geography: real US state map (Albers), shaded by account count or average fit, with account dots. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const view = { metric: 'count', state: '', dots: true };

  // Deterministic jitter so dots placed at a state's centre don't stack.
  const jitter = (id, n) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return ((h % 1000) / 1000 - 0.5) * n; };

  CIE.registerModule({
    id: 'geography',
    group: 'intel',
    title: 'Geography',
    order: 12,
    describe: 'Where the accounts are: choropleth by count or fit, with clickable account dots.',
    render(root, ctx) {
      const ws = ctx.ws;
      const S = window.CIE_US_STATES || {};
      const ranked = CIE.rank(ws, null);
      const by = {};
      ranked.forEach((r) => { const k = r.a.state; if (!k) return; (by[k] = by[k] || []).push(r); });
      const val = (k) => { const l = by[k] || []; if (!l.length) return 0; return view.metric === 'count' ? l.length : l.reduce((s, r) => s + r.s.fit, 0) / l.length; };
      const max = Math.max(1, ...Object.keys(by).map(val));
      const shapes = Object.entries(S).map(([k, st]) => {
        const v = val(k), has = (by[k] || []).length;
        const fill = has ? CIE.charts.seq(v / max) : 'var(--surface-2)';
        const tip = `${st.n}: ${has} account${has === 1 ? '' : 's'}${has ? ' · avg fit ' + Math.round((by[k] || []).reduce((s, r) => s + r.s.fit, 0) / has) : ''}`;
        return `<path d="${st.d}" fill="${fill}" stroke="var(--surface)" stroke-width="${view.state === k ? 2.5 : 1}" ${view.state === k ? 'style="stroke:var(--ink)"' : ''} data-state="${k}" data-tip="${esc(tip)}" style="cursor:pointer"/>`;
      }).join('');
      const dots = view.dots ? ranked.map((r) => {
        const a = r.a;
        let p = null;
        if (a.lon != null && a.lat != null && !['AK', 'HI', 'PR'].includes(a.state)) p = CIE.charts.project(a.lon, a.lat);
        else if (S[a.state]) p = [S[a.state].c[0] + jitter(a.id, 26), S[a.state].c[1] + jitter(a.id + 'y', 18)];
        if (!p) return '';
        return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${3 + (r.s.fit / 100) * 5}" fill="${CIE.segmentColor(ws, a.segment)}" stroke="var(--surface)" stroke-width="2" data-id="${esc(a.id)}" data-tip="${esc(a.name)} · fit ${r.s.fit}" style="cursor:pointer"/>`;
      }).join('') : '';
      const list = (view.state ? by[view.state] || [] : ranked).slice(0, 40);
      const top = Object.keys(by).map((k) => ({ label: (S[k] && S[k].n) || k, value: by[k].length, color: 'var(--s1)', id: k })).sort((a, b) => b.value - a.value).slice(0, 12);

      root.innerHTML = `
        <div class="page-head"><div><h2>Geography</h2><p>Click a state to filter the list; click a dot to open the account. Dots are coloured by segment and sized by fit. Accounts without coordinates sit near their state's centre.</p></div>
          <div class="row"><div class="chips">${[['count', 'Shade by account count'], ['fit', 'Shade by average fit']].map(([k, l]) => `<button class="chip ${view.metric === k ? 'on' : ''}" data-metric="${k}">${l}</button>`).join('')}</div>
          <label class="check"><input type="checkbox" id="dots" ${view.dots ? 'checked' : ''}> Account dots</label></div></div>
        <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
          <div class="card"><svg class="chart" viewBox="0 0 975 610" role="img" aria-label="US map of accounts" id="map">${shapes}${dots}</svg>
            <div class="row" style="justify-content:space-between;margin-top:6px"><div class="ramp">${view.metric === 'count' ? 'Fewer' : 'Lower fit'} ${[1, 2, 3, 4, 5, 6, 7].map((i) => `<i style="background:var(--seq-${i})"></i>`).join('')} ${view.metric === 'count' ? 'More' : 'Higher fit'}</div>
            <div class="legend" style="margin:0">${ws.segments.slice(0, 8).map((s) => `<span><i style="background:${CIE.segmentColor(ws, s.id)};border-radius:50%"></i>${esc(s.name)}</span>`).join('')}</div></div></div>
          <div class="stack">
            <div class="card"><div class="card-head"><h3>${view.state ? esc((S[view.state] || {}).n || view.state) : 'All states'}</h3>${view.state ? '<button class="btn sm" id="clr">Show all</button>' : `<span class="sub">top ${list.length}</span>`}</div>
              <div class="table-wrap" style="max-height:330px;overflow-y:auto"><table><tbody>${list.map((r) => `<tr class="clickable" data-id="${esc(r.a.id)}"><td>${esc(r.a.name)}<div class="small muted">${esc(r.a.state)} · ${esc(CIE.segmentName(ws, r.a.segment))}</div></td><td class="r num">${r.s.fit}</td></tr>`).join('') || '<tr><td class="muted">No accounts here yet.</td></tr>'}</tbody></table></div></div>
            <div class="card"><div class="card-head"><h3>Accounts by state</h3></div>${CIE.charts.barList(top, { labelWidth: 120, row: 20, width: 380, title: 'Accounts by state' })}</div>
          </div>
        </div>`;
      root.querySelectorAll('[data-metric]').forEach((b) => (b.onclick = () => { view.metric = b.dataset.metric; ctx.rerender(); }));
      root.querySelector('#dots').onchange = (e) => { view.dots = e.target.checked; ctx.rerender(); };
      const clr = root.querySelector('#clr'); if (clr) clr.onclick = () => { view.state = ''; ctx.rerender(); };
      root.querySelectorAll('[data-state]').forEach((p) => (p.onclick = () => { view.state = view.state === p.dataset.state ? '' : p.dataset.state; ctx.rerender(); }));
      root.querySelectorAll('[data-id]').forEach((n) => (n.onclick = (e) => { e.stopPropagation(); if (by[n.dataset.id]) { view.state = n.dataset.id; ctx.rerender(); } else CIE.openAccount(ctx, n.dataset.id); }));
    },
  });
})();
