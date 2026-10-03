/* Market model: editable Low/Base/High segment scenarios, named-account view, sales-capacity model. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const SC = ['low', 'base', 'high'];
  const SCL = { low: 'Low', base: 'Base', high: 'High' };

  // buying units = round_half_up(count × share retained × workflow-fit share); users = units × users/unit; pool = users × price
  CIE.marketCalc = function (m) {
    const out = { low: { units: 0, users: 0, pool: 0 }, base: { units: 0, users: 0, pool: 0 }, high: { units: 0, users: 0, pool: 0 }, rows: [] };
    m.segments.forEach((s) => {
      const r = { s };
      SC.forEach((k, i) => {
        const units = CIE.roundHalfUp((Number(s.count) || 0) * (Number(s.retain[i]) || 0) * (Number(s.fit[i]) || 0));
        const users = units * (Number(s.upu[i]) || 0);
        const pool = users * (Number(m.prices[k]) || 0);
        r[k] = { units, users, pool };
        if (!s.expansion) { out[k].units += units; out[k].users += users; out[k].pool += pool; }
      });
      out.rows.push(r);
    });
    return out;
  };

  CIE.registerModule({
    id: 'market',
    group: 'market',
    title: 'Market model',
    order: 20,
    describe: 'Low/Base/High market sizing by segment plus a seller-capacity model.',
    render(root, ctx) {
      const ws = ctx.ws, m = ws.market;
      const calc = CIE.marketCalc(m);
      const named = ws.accounts.reduce((s, a) => s + (Number(a.value.users) || 0), 0);
      const cap = m.capacity;
      const yr = [1, 2, 3].map((y) => {
        const months = y === 1 ? Math.max(0, 12 - cap.rampMonths) : 12;
        const newArr = cap.reps * (months / 12) * cap.dealsPerRep * cap.acv;
        return { y, newArr };
      });
      let book = 0;
      yr.forEach((r) => { book = book * cap.expansion + r.newArr; r.book = book; });
      const inp = (path, v, step) => `<input type="number" step="${step || 'any'}" data-p="${path}" value="${v}">`;

      root.innerHTML = `
        <div class="page-head"><div><h2>Market model</h2><p>Buying units = count × share retained × workflow-fit share (rounded half up). Users = units × users per unit. Pool = users × price. Expansion segments are shown but not added, to avoid double counting.</p></div>
          <div class="row"><button class="btn" id="addSeg">+ Add segment</button></div></div>
        <div class="grid g3">${SC.map((k) => `<div class="card kpi"><div class="label">${SCL[k]} annual pool</div><div class="value">${CIE.money(calc[k].pool)}</div><div class="foot">${CIE.num(calc[k].units)} buying units · ${CIE.num(calc[k].users)} users · ${CIE.money(m.prices[k])}/${esc(ws.offering.unit)}</div></div>`).join('')}</div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-head"><h3>Pool by segment</h3><span class="sub">core segments only</span></div>
            ${CIE.charts.columns(calc.rows.filter((r) => !r.s.expansion).map((r) => ({ label: r.s.name.length > 12 ? r.s.name.slice(0, 11) + '…' : r.s.name, values: SC.map((k) => r[k].pool) })), SC.map((k, i) => ({ label: SCL[k], color: ['var(--s3)', 'var(--s1)', 'var(--s7)'][i] })), { title: 'Pool by segment and scenario' })}</div>
          <div class="card"><div class="card-head"><h3>Reality checks</h3></div>
            <dl class="kv"><dt>Named-account view</dt><dd>${CIE.num(named)} users across ${ws.accounts.length} researched accounts = <b>${CIE.money(named * ws.offering.price)}</b> / yr at the planning price. Compare with the Base pool: the gap is the long tail you must reach with a repeatable motion.</dd>
            <dt>Prices</dt><dd class="row">${SC.map((k) => `<label class="field">${SCL[k]} ${inp('prices.' + k, m.prices[k], 100)}</label>`).join('')}</dd></dl></div>
        </div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Segment assumptions</h3><span class="sub">edit any cell · values are shares (0–1) except count and users/unit</span></div>
          <div class="table-wrap"><table><thead><tr><th>Segment</th><th class="r">Count</th>${SC.map((k) => `<th class="r">${SCL[k]} retain</th><th class="r">${SCL[k]} fit</th><th class="r">${SCL[k]} users/unit</th>`).join('')}<th class="r">Base pool</th><th>Expansion only</th><th></th></tr></thead>
          <tbody>${calc.rows.map((r, i) => `<tr><td><input data-p="segments.${i}.name" value="${esc(r.s.name)}" style="min-width:150px"></td><td>${inp(`segments.${i}.count`, r.s.count, 1)}</td>
            ${SC.map((k, j) => `<td>${inp(`segments.${i}.retain.${j}`, r.s.retain[j], 0.05)}</td><td>${inp(`segments.${i}.fit.${j}`, r.s.fit[j], 0.05)}</td><td>${inp(`segments.${i}.upu.${j}`, r.s.upu[j], 1)}</td>`).join('')}
            <td class="r num">${CIE.money(r.base.pool)}</td><td><input type="checkbox" data-exp="${i}" ${r.s.expansion ? 'checked' : ''}></td><td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table></div></div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Sales-capacity model</h3><span class="sub">can the team actually reach the market?</span></div>
          <div class="row">${[['reps', 'Account executives', 1], ['rampMonths', 'Ramp (months)', 1], ['dealsPerRep', 'Deals / ramped rep / yr', 1], ['acv', 'Average contract value ($)', 1000], ['expansion', 'Net revenue retention (×)', 0.05]].map(([k, l, s]) => `<label class="field">${l}${inp('capacity.' + k, cap[k], s)}</label>`).join('')}</div>
          <div class="grid g2" style="margin-top:12px"><div>${CIE.charts.columns(yr.map((r) => ({ label: 'Year ' + r.y, values: [r.newArr, r.book] })), [{ label: 'New ARR booked', color: 'var(--s1)' }, { label: 'Ending ARR book', color: 'var(--s3)' }], { title: 'Capacity ARR by year' })}</div>
          <div><p class="ink2">Year 3 book of <b>${CIE.money(yr[2].book)}</b> is ${CIE.pct(yr[2].book / (calc.base.pool || 1), 1)} of the Base pool. If that share looks implausibly high, the constraint is market access, not capacity; if low, it is selling capacity.</p></div></div></div>`;

      const setPath = (path, val) => {
        const ks = path.split('.');
        let o = m;
        for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
        o[ks[ks.length - 1]] = val;
      };
      root.querySelectorAll('[data-p]').forEach((el) => (el.onchange = () => { setPath(el.dataset.p, el.type === 'number' ? Number(el.value) : el.value); ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-exp]').forEach((el) => (el.onchange = () => { m.segments[el.dataset.exp].expansion = el.checked; ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-del]').forEach((el) => (el.onclick = () => { m.segments.splice(el.dataset.del, 1); ctx.save('Segment removed'); ctx.rerender(); }));
      root.querySelector('#addSeg').onclick = () => { m.segments.push({ name: 'New segment', count: 100, retain: [0.5, 0.7, 0.9], fit: [0.3, 0.5, 0.7], upu: [5, 15, 30], expansion: false }); ctx.save(); ctx.rerender(); };
    },
  });
})();
