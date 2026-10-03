/* Inline-SVG charts. Thin marks, rounded data-ends on the baseline, recessive axes,
   per-mark tooltips through data-tip. No dependencies. */
(function () {
  'use strict';
  const CIE = window.CIE;
  const esc = CIE.esc;
  const C = (CIE.charts = {});

  const nice = (max) => {
    if (max <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    const m = max / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  };
  // Bar with 4px rounding on the data end only.
  const hbarPath = (x, y, w, h, r = 4) => {
    if (w <= 0) return '';
    r = Math.min(r, w, h / 2);
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  };
  const vbarPath = (x, y, w, h, r = 4) => {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  };
  C.hbarPath = hbarPath;

  /* Horizontal bar list. items: [{label, value, color?, tip?, id?, marker?}] */
  C.barList = function (items, opt = {}) {
    const W = opt.width || 640, row = opt.row || 24, labelW = opt.labelWidth || 190, valW = 64;
    const H = items.length * row + 6;
    const max = opt.max || Math.max(1, ...items.map((d) => d.value));
    const plotW = W - labelW - valW;
    const fmt = opt.format || ((v) => CIE.num(v));
    const bars = items
      .map((d, i) => {
        const y = i * row + 4, bh = Math.min(14, row - 8), w = (Math.max(0, d.value) / max) * plotW;
        const label = d.label.length > 30 ? d.label.slice(0, 29) + '…' : d.label;
        const marker = d.marker != null ? `<line x1="${labelW + d.marker * plotW}" x2="${labelW + d.marker * plotW}" y1="${y - 2}" y2="${y + bh + 2}" stroke="var(--ink)" stroke-width="2"/>` : '';
        return `<g ${d.id ? `data-id="${esc(d.id)}"` : ''} data-tip="${esc(d.tip || d.label + ': ' + fmt(d.value))}" style="${d.id ? 'cursor:pointer' : ''}">
          <rect x="0" y="${i * row}" width="${W}" height="${row}" class="hit"/>
          <text x="${labelW - 8}" y="${y + bh - 3}" text-anchor="end">${esc(label)}</text>
          <path d="${hbarPath(labelW, y, w, bh)}" fill="${d.color || 'var(--s1)'}" class="mark"/>${marker}
          <text x="${labelW + w + 6}" y="${y + bh - 3}" class="value-label">${esc(fmt(d.value))}</text></g>`;
      })
      .join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.title || 'Bar chart')}"><line class="baseline" x1="${labelW}" x2="${labelW}" y1="0" y2="${H}"/>${bars}</svg>`;
  };

  /* Stacked single bar (composition), with 2px surface gaps between segments. */
  C.stackBar = function (parts, opt = {}) {
    const W = opt.width || 640, H = 22;
    const tot = parts.reduce((s, p) => s + p.value, 0) || 1;
    let x = 0;
    const segs = parts
      .map((p) => {
        const w = (p.value / tot) * W;
        const s = `<rect x="${x}" y="0" width="${Math.max(0, w - 2)}" height="${H}" rx="3" fill="${p.color}" data-tip="${esc(p.label)}: ${CIE.num(p.value)} (${Math.round((p.value / tot) * 100)}%)"/>`;
        x += w;
        return s;
      })
      .join('');
    const legend = `<div class="legend">${parts.map((p) => `<span><i style="background:${p.color}"></i>${esc(p.label)} · ${CIE.num(p.value)}</span>`).join('')}</div>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.title || 'Composition')}">${segs}</svg>${legend}`;
  };

  /* Waterfall: steps [{label, value}] from a start value; total drawn at end. */
  C.waterfall = function (start, steps, opt = {}) {
    const W = opt.width || 1040, H = opt.height || 300, padL = 64, padB = 46, padT = 16;
    const fmt = opt.format || CIE.money;
    const bars = [{ label: opt.startLabel || 'Start', value: start, kind: 'total' }];
    let run = start;
    steps.forEach((s) => { bars.push({ label: s.label, value: s.value, from: run, kind: s.value >= 0 ? 'up' : 'down' }); run += s.value; });
    bars.push({ label: opt.endLabel || 'End', value: run, kind: 'total' });
    const hi = nice(Math.max(...bars.map((b) => (b.kind === 'total' ? b.value : Math.max(b.from, b.from + b.value))), 1));
    const lo = Math.min(0, ...bars.map((b) => (b.kind === 'total' ? b.value : Math.min(b.from, b.from + b.value))));
    const y = (v) => padT + ((hi - v) / (hi - lo || 1)) * (H - padT - padB);
    const bw = (W - padL) / bars.length;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + t * (hi - lo));
    const grid = ticks.map((t) => `<line class="gridline" x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('');
    const color = { total: 'var(--s1)', up: 'var(--s3)', down: 'var(--s2)' };
    const marks = bars
      .map((b, i) => {
        const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
        const a = b.kind === 'total' ? 0 : b.from, z = b.kind === 'total' ? b.value : b.from + b.value;
        const top = y(Math.max(a, z)), h = Math.max(1, Math.abs(y(a) - y(z)));
        const lbl = b.label.length > 14 ? b.label.slice(0, 13) + '…' : b.label;
        const vtxt = b.kind === 'total' ? fmt(b.value) : (b.value >= 0 ? '+' : '') + fmt(b.value);
        return `<g data-tip="${esc(b.label)}: ${esc(vtxt)}"><rect x="${x}" y="${top}" width="${w}" height="${h}" rx="3" fill="${color[b.kind]}"/>
          <text x="${x + w / 2}" y="${top - 5}" text-anchor="middle" class="value-label">${esc(vtxt)}</text>
          <text x="${x + w / 2}" y="${H - padB + 16}" text-anchor="middle">${esc(lbl)}</text></g>`;
      })
      .join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.title || 'Waterfall')}">${grid}<line class="baseline" x1="${padL}" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>${marks}</svg>
      <div class="legend"><span><i style="background:var(--s1)"></i>Total</span><span><i style="background:var(--s3)"></i>Increase</span><span><i style="background:var(--s2)"></i>Decrease</span></div>`;
  };

  /* Single-series line with an optional horizontal reference line. points: [{x, y}] */
  C.line = function (points, opt = {}) {
    const W = opt.width || 560, H = opt.height || 200, padL = 46, padB = 28, padT = 10, padR = 12;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const yMax = nice(Math.max(...ys, opt.ref || 0, 0.0001));
    const sx = (v) => padL + ((v - x0) / (x1 - x0 || 1)) * (W - padL - padR);
    const sy = (v) => padT + (1 - v / yMax) * (H - padT - padB);
    const fx = opt.formatX || CIE.num, fy = opt.formatY || CIE.num;
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const grid = ticks.map((t) => `<line class="gridline" x1="${padL}" x2="${W - padR}" y1="${sy(t * yMax)}" y2="${sy(t * yMax)}"/><text x="${padL - 6}" y="${sy(t * yMax) + 4}" text-anchor="end">${esc(fy(t * yMax))}</text>`).join('');
    const xt = ticks.map((t) => { const v = x0 + t * (x1 - x0); return `<text x="${sx(v)}" y="${H - 8}" text-anchor="middle">${esc(fx(v))}</text>`; }).join('');
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    const ref = opt.ref != null ? `<line x1="${padL}" x2="${W - padR}" y1="${sy(opt.ref)}" y2="${sy(opt.ref)}" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${W - padR}" y="${sy(opt.ref) - 5}" text-anchor="end">${esc(opt.refLabel || '')}</text>` : '';
    const mark = opt.markX != null ? (() => { const p = points.reduce((b, q) => (Math.abs(q.x - opt.markX) < Math.abs(b.x - opt.markX) ? q : b)); return `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>`; })() : '';
    const hits = points.map((p, i) => { const w = (W - padL - padR) / points.length; return `<rect class="hit" x="${sx(p.x) - w / 2}" y="${padT}" width="${w}" height="${H - padT - padB}" data-tip="${esc((opt.tipX || fx)(p.x))}: ${esc(fy(p.y))}"/>`; }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.title || 'Line chart')}">${grid}${xt}${ref}<path d="${d}" fill="none" stroke="var(--s1)" stroke-width="2"/>${mark}${hits}</svg>`;
  };

  /* Grouped columns: categories × series (≤3 series). data: [{label, values:[...]}] */
  C.columns = function (data, series, opt = {}) {
    const W = opt.width || 640, H = opt.height || 220, padL = 54, padB = 30, padT = 12;
    const fmt = opt.format || CIE.money;
    const max = nice(Math.max(1, ...data.flatMap((d) => d.values)));
    const sy = (v) => padT + (1 - v / max) * (H - padT - padB);
    const gw = (W - padL) / data.length, bw = Math.min(28, (gw * 0.7) / series.length);
    const grid = [0, 0.5, 1].map((t) => `<line class="gridline" x1="${padL}" x2="${W}" y1="${sy(t * max)}" y2="${sy(t * max)}"/><text x="${padL - 6}" y="${sy(t * max) + 4}" text-anchor="end">${esc(fmt(t * max))}</text>`).join('');
    const marks = data
      .map((d, i) => {
        const gx = padL + i * gw + (gw - bw * series.length - 2 * (series.length - 1)) / 2;
        return d.values.map((v, j) => `<path d="${vbarPath(gx + j * (bw + 2), sy(v), bw, sy(0) - sy(v))}" fill="${series[j].color}" data-tip="${esc(d.label)} · ${esc(series[j].label)}: ${esc(fmt(v))}"/>`).join('') +
          `<text x="${padL + i * gw + gw / 2}" y="${H - 10}" text-anchor="middle">${esc(d.label)}</text>`;
      })
      .join('');
    const legend = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>` : '';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.title || 'Columns')}">${grid}<line class="baseline" x1="${padL}" x2="${W}" y1="${sy(0)}" y2="${sy(0)}"/>${marks}</svg>${legend}`;
  };

  /* Sequential color for magnitude (7 steps of one hue). */
  C.seq = (t) => `var(--seq-${Math.max(1, Math.min(7, 1 + Math.round(t * 6)))})`;

  /* Albers equal-area conic matching d3.geoAlbersUsa's lower-48 projection (scale 1300, 975×610). */
  C.project = function (lon, lat) {
    const R = Math.PI / 180, k = 1300, tx = 487.5, ty = 305;
    const s0 = Math.sin(29.5 * R), n = (s0 + Math.sin(45.5 * R)) / 2, c = 1 + s0 * (2 * n - s0), r0 = Math.sqrt(c) / n;
    const raw = (x, y) => { const r = Math.sqrt(c - 2 * n * Math.sin(y)) / n; return [r * Math.sin(x * n), r0 - r * Math.cos(x * n)]; };
    const p = raw(-0.6 * R, 38.7 * R), q = raw((lon + 96) * R, lat * R);
    return [tx - k * p[0] + k * q[0], ty + k * p[1] - k * q[1]];
  };
})();
