/* Buyer economics: per-account value streams, year-1 / steady-state / 3-year view, pricing scenarios. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const view = { id: '' };

  CIE.registerModule({
    id: 'economics',
    group: 'market',
    title: 'Buyer economics',
    order: 21,
    describe: 'What the buyer gets for each dollar: value streams, 3-year economics and price scenarios.',
    render(root, ctx) {
      const ws = ctx.ws;
      const e = ws.economics || (ws.economics = { implementation: 0.25, screen: 3, streams: [], prices: [] });
      const ranked = CIE.rank(ws, null);
      if (!view.id || !CIE.findAccount(ws, view.id)) view.id = ranked[0] ? ranked[0].a.id : '';
      const a = CIE.findAccount(ws, view.id);
      if (!a) { root.innerHTML = '<div class="card">Add an account first.</div>'; return; }
      const units = Number(a.value.users) || 0;
      const price = Number(a.value.price) || ws.offering.price;
      const streams = e.streams.map((s) => ({ ...s, total: units * (Number(s.perUnit) || 0) * (Number(s.share) || 0) }));
      const counted = streams.filter((s) => s.counted).reduce((t, s) => t + s.total, 0);
      const notCounted = streams.filter((s) => !s.counted).reduce((t, s) => t + s.total, 0);
      const fee = units * price;
      const y1Cost = fee * (1 + e.implementation);
      const rows = [
        ['Year 1', counted, y1Cost],
        ['Year 2 steady state', counted, fee],
        ['3-year cumulative', counted * 3, fee * 3 + fee * e.implementation],
      ];
      const prices = (e.prices.length ? e.prices : [price * 0.6, price * 0.8, price, price * 1.25]).map(Number);
      const mix = streams.map((s, i) => ({ label: s.label + (s.counted ? '' : ' (not counted)'), value: s.total, color: s.counted ? CIE.SERIES[i % 8] : 'var(--muted)' })).concat([{ label: 'Total counted value', value: counted, color: 'var(--ink)' }, { label: 'Your fee', value: fee, color: 'var(--s7)' }]);

      root.innerHTML = `
        <div class="page-head"><div><h2>Buyer economics</h2><p>Value streams are per ${esc(ws.offering.unit)} per year, discounted by the share the buyer's finance team will actually count. Streams marked “not counted” are shown but never enter the return.</p></div>
          <label class="field">Account<select id="acc">${ranked.map((r) => `<option value="${esc(r.a.id)}" ${r.a.id === a.id ? 'selected' : ''}>${esc(r.a.name)} · fit ${r.s.fit}</option>`).join('')}</select></label></div>
        <div class="grid g4">
          <div class="card kpi"><div class="label">${esc(ws.offering.unit)}s in scope</div><div class="value">${CIE.num(units)}</div><div class="foot">from the account's value inputs</div></div>
          <div class="card kpi"><div class="label">Annual counted value</div><div class="value">${CIE.money(counted)}</div><div class="foot">+ ${CIE.money(notCounted)} shown, not counted</div></div>
          <div class="card kpi"><div class="label">Annual fee</div><div class="value">${CIE.money(fee)}</div><div class="foot">${CIE.money(price)} per ${esc(ws.offering.unit)}</div></div>
          <div class="card kpi"><div class="label">Steady-state return</div><div class="value">${(counted / (fee || 1)).toFixed(2)}×</div><div class="foot">screen: ${e.screen}× · <span class="status ${counted / (fee || 1) >= e.screen ? 'good' : 'serious'}">${counted / (fee || 1) >= e.screen ? 'passes' : 'below screen'}</span></div></div>
        </div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-head"><h3>Value mix</h3><span class="sub">annual, this account</span></div>${CIE.charts.barList(mix, { format: CIE.money, labelWidth: 210, title: 'Value mix' })}</div>
          <div class="card"><div class="card-head"><h3>Three-year buyer economics</h3><span class="sub">implementation ${CIE.pct(e.implementation)} of year-1 fee</span></div>
            <div class="table-wrap"><table><thead><tr><th>Period</th><th class="r">Value</th><th class="r">Cost</th><th class="r">Net</th><th class="r">Return</th></tr></thead>
            <tbody>${rows.map(([p, v, c]) => `<tr><td><b>${p}</b></td><td class="r num">${CIE.money(v)}</td><td class="r num">${CIE.money(c)}</td><td class="r num">${CIE.money(v - c)}</td><td class="r num">${(v / (c || 1)).toFixed(2)}×</td></tr>`).join('')}</tbody></table></div>
            <div class="row" style="margin-top:10px"><label class="field">Implementation (share of fee)<input type="number" step="0.05" data-e="implementation" value="${e.implementation}"></label><label class="field">Return screen (×)<input type="number" step="0.5" data-e="screen" value="${e.screen}"></label></div></div>
        </div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Pricing scenarios</h3><span class="sub">the bold row is the account's current price</span></div>
          <div class="table-wrap"><table><thead><tr><th class="r">Price / ${esc(ws.offering.unit)}</th><th class="r">Annual fee</th><th class="r">Buyer value</th><th class="r">Return</th><th class="r">Buyer keeps</th><th class="r">You capture</th><th class="r">3-yr return</th><th class="r">Payback</th></tr></thead>
          <tbody>${prices.map((p) => { const f = units * p, kept = counted - f, three = (counted * 3) / (f * 3 + f * e.implementation || 1), pay = (f * (1 + e.implementation)) / (counted || 1) * 12;
            return `<tr ${Math.abs(p - price) < 0.5 ? 'style="font-weight:700"' : ''}><td class="r num">${CIE.money(p)}</td><td class="r num">${CIE.money(f)}</td><td class="r num">${CIE.money(counted)}</td><td class="r num">${(counted / (f || 1)).toFixed(2)}×</td><td class="r num">${CIE.money(kept)}</td><td class="r num">${CIE.pct(f / (counted || 1))}</td><td class="r num">${three.toFixed(2)}×</td><td class="r num">${counted ? pay.toFixed(1) + ' mo' : '—'}</td></tr>`; }).join('')}</tbody></table></div>
          <label class="field" style="margin-top:10px">Price points (comma-separated)<input id="prices" value="${esc(e.prices.join(', '))}" placeholder="Leave blank for 60% / 80% / 100% / 125% of current price"></label></div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Value streams</h3><span class="sub">shared by every account in this engagement</span><button class="btn sm" id="addStream">+ Add stream</button></div>
          <div class="table-wrap"><table><thead><tr><th>Stream</th><th class="r">$ / ${esc(ws.offering.unit)} / yr</th><th class="r">Share counted</th><th>In return?</th><th>Basis</th><th></th></tr></thead>
          <tbody>${e.streams.map((s, i) => `<tr><td><input data-s="${i}" data-k="label" value="${esc(s.label)}"></td><td><input type="number" data-s="${i}" data-k="perUnit" value="${s.perUnit}"></td><td><input type="number" step="0.05" data-s="${i}" data-k="share" value="${s.share}"></td><td><input type="checkbox" data-s="${i}" data-k="counted" ${s.counted ? 'checked' : ''}></td><td><input data-s="${i}" data-k="basis" value="${esc(s.basis || '')}"></td><td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table></div></div>`;

      root.querySelector('#acc').onchange = (ev) => { view.id = ev.target.value; ctx.rerender(); };
      root.querySelectorAll('[data-e]').forEach((el) => (el.onchange = () => { e[el.dataset.e] = Number(el.value); ctx.save(); ctx.rerender(); }));
      root.querySelector('#prices').onchange = (ev) => { e.prices = ev.target.value.split(',').map((x) => Number(x.trim())).filter((x) => x > 0); ctx.save(); ctx.rerender(); };
      root.querySelectorAll('[data-s]').forEach((el) => (el.onchange = () => { const s = e.streams[el.dataset.s]; s[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value; ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-del]').forEach((el) => (el.onclick = () => { e.streams.splice(el.dataset.del, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addStream').onclick = () => { e.streams.push({ label: 'New value stream', perUnit: 1000, share: 0.5, counted: true, basis: '' }); ctx.save(); ctx.rerender(); };
    },
  });
})();
