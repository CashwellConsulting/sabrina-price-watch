/* Workbench: change scoring weights and dimensions; watch the ranking move. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  let baseline = null; // ranking snapshot when the page opened, to show movement

  CIE.registerModule({
    id: 'workbench',
    group: 'intel',
    title: 'Scoring workbench',
    order: 13,
    describe: 'Edit dimensions and weights; see rank movement live.',
    render(root, ctx) {
      const ws = ctx.ws;
      const ranked = CIE.rank(ws, null);
      if (!baseline) baseline = new Map(ranked.map((r, i) => [r.a.id, i + 1]));
      const tot = ws.dimensions.reduce((s, d) => s + Number(d.weight || 0), 0);
      root.innerHTML = `
        <div class="page-head"><div><h2>Scoring workbench</h2><p>fit = Σ(weight × score ÷ 5) ÷ Σweight × 100. Unknown dimensions score zero. Change a weight to test your own view — every tab updates.</p></div>
          <div class="row"><button class="btn" id="snap">Reset movement baseline</button><button class="btn" id="addDim">+ Add dimension</button></div></div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)">
          <div class="card"><div class="card-head"><h3>Dimensions and weights</h3><span class="sub">total weight ${tot}</span></div>
            ${ws.dimensions.map((d, i) => `<div class="dimrow" style="grid-template-columns:1fr 1.2fr 46px 34px">
              <input data-i="${i}" data-k="label" value="${esc(d.label)}">
              <input type="range" min="0" max="50" data-i="${i}" data-k="weight" value="${d.weight}">
              <span class="num r">${d.weight}</span>
              <button class="btn sm danger" data-del="${i}" title="Remove dimension">✕</button></div>`).join('')}
            <p class="small muted" style="margin-top:10px">Relationship should stay a small weight; warm routes belong in the access lenses so they cannot inflate fit.</p></div>
          <div class="card"><div class="card-head"><h3>Top 20 under these weights</h3><span class="sub">▲▼ = places moved since baseline</span></div>
            <div class="table-wrap"><table><thead><tr><th class="r">#</th><th>Account</th><th>Fit · evidence</th><th class="r">Move</th></tr></thead><tbody>
            ${ranked.slice(0, 20).map((r, i) => { const mv = (baseline.get(r.a.id) || i + 1) - (i + 1); return `<tr class="clickable" data-id="${esc(r.a.id)}"><td class="r num">${i + 1}</td><td>${esc(r.a.name)}</td><td>${CIE.fitBar(r.s.fit, r.s.completeness)}</td><td class="r num" style="color:${mv > 0 ? 'var(--good-ink)' : mv < 0 ? 'var(--critical)' : 'var(--muted)'}">${mv > 0 ? '▲' + mv : mv < 0 ? '▼' + -mv : '–'}</td></tr>`; }).join('')}
            </tbody></table></div></div>
        </div>`;
      root.querySelectorAll('input[data-k]').forEach((inp) => {
        const ev = inp.type === 'range' ? 'input' : 'change';
        inp.addEventListener(ev, () => {
          const d = ws.dimensions[inp.dataset.i];
          d[inp.dataset.k] = inp.dataset.k === 'weight' ? Number(inp.value) : inp.value;
          ctx.save();
          if (inp.type === 'range') { clearTimeout(root._t); root._t = setTimeout(() => ctx.rerender(), 120); } else ctx.rerender();
        });
      });
      root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (ws.dimensions.length < 2) return; ws.dimensions.splice(b.dataset.del, 1); ctx.save('Dimension removed'); ctx.rerender(); }));
      root.querySelector('#addDim').onclick = () => { ws.dimensions.push({ key: CIE.uid('dim'), label: 'New dimension', weight: 10 }); ctx.save(); ctx.rerender(); };
      root.querySelector('#snap').onclick = () => { baseline = null; ctx.rerender(); };
      root.querySelectorAll('tr[data-id]').forEach((tr) => (tr.onclick = () => CIE.openAccount(ctx, tr.dataset.id)));
    },
  });
})();
