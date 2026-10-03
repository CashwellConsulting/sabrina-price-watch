/* Overview: start-here thesis, headline counts, top accounts, stage funnel, findings. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;

  CIE.registerModule({
    id: 'overview',
    group: 'intel',
    title: 'Overview',
    order: 10,
    describe: 'Headline counts, the start-here call, top accounts and what the data says.',
    render(root, ctx) {
      const ws = ctx.ws;
      const ranked = CIE.rank(ws, null);
      const top = ranked.slice(0, 15);
      const ready = ws.accounts.filter((a) => a.stage === 'outreach_ready' || a.stage === 'qualified').length;
      const users = ws.accounts.reduce((s, a) => s + (Number(a.value.users) || 0), 0);
      const avgEv = ranked.length ? ranked.reduce((s, r) => s + r.s.completeness, 0) / ranked.length : 0;
      const stageCounts = CIE.STAGES.map((st) => ({ label: st.label, value: ws.accounts.filter((a) => a.stage === st.id).length, color: 'var(--s1)' }));
      const segCounts = ws.segments.map((s) => ({ label: s.name, value: ws.accounts.filter((a) => a.segment === s.id).length, color: CIE.segmentColor(ws, s.id), tip: `${s.name}: ${ws.accounts.filter((a) => a.segment === s.id).length} accounts` }));
      const tone = { supports: 'good', challenges: 'serious', sizing: 'warning', pricing: 'warning' };

      root.innerHTML = `
        <div class="page-head"><div><h2>${esc(ws.company || ws.name)}</h2><p>${esc(ws.subtitle || '')}</p></div>
          <span class="tag">Private working model · ${esc(ws.asOf || '')}</span></div>
        ${ws.thesis ? `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Start here</h3><span class="sub">The working call — change it in Workspace</span></div><p style="font-size:15px;margin:0">${esc(ws.thesis)}</p></div>` : ''}
        <div class="grid g4">
          <div class="card kpi"><div class="label">Accounts in the model</div><div class="value">${CIE.num(ws.accounts.length)}</div><div class="foot">${ws.segments.length} segments</div></div>
          <div class="card kpi"><div class="label">Outreach-ready</div><div class="value">${CIE.num(ready)}</div><div class="foot">all four checks passed; no contact implied</div></div>
          <div class="card kpi"><div class="label">Users across accounts</div><div class="value">${CIE.num(users)}</div><div class="foot">${CIE.money(users * ws.offering.price)} / yr at ${CIE.money(ws.offering.price)}</div></div>
          <div class="card kpi"><div class="label">Average evidence share</div><div class="value">${CIE.pct(avgEv)}</div><div class="foot">of scoring weight backed by a cited fact</div></div>
        </div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-head"><h3>Top 15 by fit</h3><span class="sub">bar = fit · black tick = evidence share · click to open</span></div>
            <div id="topChart">${CIE.charts.barList(top.map((r) => ({ id: r.a.id, label: r.a.name, value: r.s.fit, color: CIE.segmentColor(ws, r.a.segment), marker: r.s.completeness, tip: `${r.a.name}: fit ${r.s.fit}, ${Math.round(r.s.completeness * 100)}% evidenced` })), { max: 100, title: 'Top accounts by fit' })}</div>
            <div class="legend">${ws.segments.slice(0, 8).map((s) => `<span><i style="background:${CIE.segmentColor(ws, s.id)}"></i>${esc(s.name)}</span>`).join('')}</div>
            <p class="small muted" style="margin-top:8px">A long bar with the tick far to the left is promising but thinly evidenced — research it first.</p></div>
          <div class="stack">
            <div class="card"><div class="card-head"><h3>Accounts by stage</h3><span class="sub">data completeness, not contact</span></div>${CIE.charts.barList(stageCounts, { title: 'Accounts by stage', labelWidth: 170, row: 22 })}</div>
            <div class="card"><div class="card-head"><h3>Accounts by segment</h3></div>${CIE.charts.barList(segCounts, { title: 'Accounts by segment', labelWidth: 170, row: 22 })}</div>
          </div>
        </div>
        ${ws.findings.length ? `<h3 style="margin:22px 0 10px">What the data says</h3><div class="grid g2">${ws.findings.map((f) => `
          <div class="card"><div class="card-head"><span class="status ${tone[f.kind] || ''}">${esc(f.label || f.kind)}</span><span class="sub">confidence: ${esc(f.confidence || '—')}</span></div>
          <h3 style="margin-bottom:6px">${esc(f.title)}</h3><p class="ink2" style="margin:0">${esc(f.body)}</p></div>`).join('')}</div>` : ''}`;
      root.querySelectorAll('#topChart [data-id]').forEach((g) => (g.onclick = () => CIE.openAccount(ctx, g.dataset.id)));
    },
  });
})();
