/* Operating truth (stamped inputs, unknowns never zero-filled) and the illustrative ARR bridge. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;

  CIE.registerModule({
    id: 'truth',
    group: 'market',
    title: 'Operating truth',
    order: 22,
    describe: 'Interview worksheet: every number stamped claim / testimony / preference / unknown.',
    render(root, ctx) {
      const ws = ctx.ws, t = ws.truth;
      root.innerHTML = `
        <div class="page-head"><div><h2>Operating truth</h2><p>What must be true before the growth story. Stamp every number. Unknowns render as hatched bars and never enter totals as zero. This is a prep worksheet, not finance or management guidance.</p></div>
          <div class="row"><button class="btn" id="addGroup">+ Add group</button></div></div>
        <div class="legend" style="margin:0 0 14px">${CIE.STAMPS.map((s) => `<span><span class="stamp stamp-${s}">${s}</span></span>`).join('')}</div>
        <div class="grid g3">${t.groups.map((g, gi) => {
          const known = g.fields.filter((f) => f.stamp !== 'unknown' && f.value !== '' && f.value != null);
          const max = Math.max(1, ...known.map((f) => Math.abs(Number(f.value) || 0)));
          return `<div class="card"><div class="card-head"><input data-g="${gi}" data-k="title" value="${esc(g.title)}" style="font-weight:600;border:0;padding:0;background:none;font-size:15px"><button class="btn sm" data-addf="${gi}">+ field</button></div>
            ${g.note ? `<p class="small muted">${esc(g.note)}</p>` : ''}
            ${g.fields.map((f, fi) => { const unk = f.stamp === 'unknown' || f.value === '' || f.value == null; const w = unk ? 100 : (Math.abs(Number(f.value) || 0) / max) * 100;
              return `<div class="truth-row"><input data-g="${gi}" data-f="${fi}" data-k="label" value="${esc(f.label)}" style="grid-column:1/-1;border:0;padding:2px 0;background:none;font-weight:500">
                <input data-g="${gi}" data-f="${fi}" data-k="value" value="${esc(f.value == null ? '' : f.value)}" placeholder="blank = unknown">
                <select data-g="${gi}" data-f="${fi}" data-k="stamp" class="stamp stamp-${f.stamp}">${CIE.STAMPS.map((s) => `<option ${s === f.stamp ? 'selected' : ''}>${s}</option>`).join('')}</select><div style="grid-column:1/-1"><div class="truth-bar ${unk ? 'hatch' : ''}" style="width:${w}%;${unk ? 'background-color:transparent' : ''}" data-tip="${unk ? 'Unknown — not counted' : esc(f.label + ': ' + f.value + ' (' + f.stamp + ')')}"></div></div></div>`; }).join('')}
          </div>`; }).join('')}</div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>What I will ask in the room</h3><button class="btn sm" id="addQ">+ question</button></div>
          ${t.questions.map((q, i) => `<div class="row" style="margin-bottom:6px;flex-wrap:nowrap"><span class="muted num">${i + 1}.</span><input data-q="${i}" value="${esc(q)}" style="flex:1"><button class="btn sm danger" data-delq="${i}">✕</button></div>`).join('')}</div>`;
      root.querySelectorAll('[data-g]').forEach((el) => (el.onchange = () => {
        const g = t.groups[el.dataset.g];
        if (el.dataset.f == null) g[el.dataset.k] = el.value;
        else {
          const f = g.fields[el.dataset.f];
          f[el.dataset.k] = el.value;
          if (el.dataset.k === 'value' && el.value === '') f.stamp = 'unknown';
          if (el.dataset.k === 'value' && el.value !== '' && f.stamp === 'unknown') f.stamp = 'claim';
        }
        ctx.save(); ctx.rerender();
      }));
      root.querySelectorAll('[data-addf]').forEach((b) => (b.onclick = () => { t.groups[b.dataset.addf].fields.push({ label: 'New field', value: '', stamp: 'unknown' }); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addGroup').onclick = () => { t.groups.push({ title: 'New group', fields: [] }); ctx.save(); ctx.rerender(); };
      root.querySelectorAll('[data-q]').forEach((el) => (el.onchange = () => { t.questions[el.dataset.q] = el.value; ctx.save(); }));
      root.querySelectorAll('[data-delq]').forEach((el) => (el.onclick = () => { t.questions.splice(el.dataset.delq, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addQ').onclick = () => { t.questions.push(''); ctx.save(); ctx.rerender(); };
    },
  });

  CIE.registerModule({
    id: 'bridge',
    group: 'market',
    title: 'Revenue bridge',
    order: 23,
    describe: 'Illustrative ARR bridge: expansion vs net-new vs churn, all editable.',
    render(root, ctx) {
      const ws = ctx.ws, b = ws.bridge;
      const steps = b.steps.map((s) => ({ label: s.label, value: (s.sign < 0 ? -1 : 1) * (Number(s.count) || 0) * (Number(s.avg) || 0) }));
      const end = (Number(b.start) || 0) + steps.reduce((t, s) => t + s.value, 0);
      const growth = steps.filter((s) => s.value > 0).reduce((t, s) => t + s.value, 0);
      const exp = b.steps.map((s, i) => ({ s, v: steps[i].value })).filter((x) => x.s.kind === 'expansion').reduce((t, x) => t + x.v, 0);
      root.innerHTML = `
        <div class="page-head"><div><h2>Revenue bridge</h2><p>Pressure-test the mix of installed-base expansion and net-new growth needed to reach the target. Every input is editable; none is management guidance.</p></div>
          <div class="row"><label class="field">Starting ARR ($)<input type="number" id="start" value="${b.start}"></label><label class="field">Target ARR ($)<input type="number" id="target" value="${b.target || 0}"></label></div></div>
        <div class="grid g4">
          <div class="card kpi"><div class="label">Starting ARR</div><div class="value">${CIE.money(b.start)}</div></div>
          <div class="card kpi"><div class="label">Ending ARR</div><div class="value">${CIE.money(end)}</div><div class="foot">${b.target ? (end >= b.target ? '<span class="status good">meets</span>' : '<span class="status serious">short of</span>') + ' target ' + CIE.money(b.target) : ''}</div></div>
          <div class="card kpi"><div class="label">Gross new ARR</div><div class="value">${CIE.money(growth)}</div></div>
          <div class="card kpi"><div class="label">Share from installed base</div><div class="value">${CIE.pct(exp / (growth || 1))}</div><div class="foot">steps tagged “expansion”</div></div>
        </div>
        <div class="card" style="margin-top:16px">${CIE.charts.waterfall(Number(b.start) || 0, steps, { startLabel: 'Starting ARR', endLabel: 'Ending ARR', title: 'ARR bridge' })}</div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Bridge steps</h3><button class="btn sm" id="add">+ step</button></div>
          <div class="table-wrap"><table><thead><tr><th>Step</th><th>Kind</th><th class="r">Count</th><th class="r">Average ARR ($)</th><th>Direction</th><th class="r">Impact</th><th></th></tr></thead>
          <tbody>${b.steps.map((s, i) => `<tr><td><input data-i="${i}" data-k="label" value="${esc(s.label)}"></td>
            <td><select data-i="${i}" data-k="kind">${['expansion', 'new', 'churn', 'other'].map((k) => `<option ${k === s.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
            <td><input type="number" data-i="${i}" data-k="count" value="${s.count}"></td><td><input type="number" data-i="${i}" data-k="avg" value="${s.avg}"></td>
            <td><select data-i="${i}" data-k="sign"><option value="1" ${s.sign >= 0 ? 'selected' : ''}>adds</option><option value="-1" ${s.sign < 0 ? 'selected' : ''}>subtracts</option></select></td>
            <td class="r num">${CIE.money(steps[i].value)}</td><td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table></div></div>`;
      root.querySelector('#start').onchange = (e) => { b.start = Number(e.target.value); ctx.save(); ctx.rerender(); };
      root.querySelector('#target').onchange = (e) => { b.target = Number(e.target.value); ctx.save(); ctx.rerender(); };
      root.querySelectorAll('[data-i]').forEach((el) => (el.onchange = () => { const s = b.steps[el.dataset.i]; const k = el.dataset.k; s[k] = ['count', 'avg', 'sign'].includes(k) ? Number(el.value) : el.value; ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-del]').forEach((el) => (el.onclick = () => { b.steps.splice(el.dataset.del, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#add').onclick = () => { b.steps.push({ label: 'New step', kind: 'new', count: 1, avg: 50000, sign: 1 }); ctx.save(); ctx.rerender(); };
    },
  });
})();
