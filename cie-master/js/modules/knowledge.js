/* Knowledge: decision log (the calls, with confidence), diligence queue, source register, glossary. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;
  const CONF = ['High', 'Medium-high', 'Medium', 'Medium-low', 'Low'];
  const kview = { q: '' };

  // A small editable-list renderer shared by the knowledge pages.
  function listEditor(root, ctx, arr, fields, opts) {
    const rows = arr.map((r, i) => ({ r, i })).filter(({ r }) => !kview.q || JSON.stringify(r).toLowerCase().includes(kview.q.toLowerCase()));
    root.insertAdjacentHTML('beforeend', `<div class="table-wrap"><table><thead><tr>${fields.map((f) => `<th>${esc(f.label)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${rows.map(({ r, i }) => `<tr>${fields.map((f) => `<td>${f.options ? `<select data-i="${i}" data-k="${f.key}">${f.options.map((o) => `<option ${o === r[f.key] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : f.long ? `<textarea data-i="${i}" data-k="${f.key}" style="min-width:${f.width || 200}px;min-height:56px">${esc(r[f.key] || '')}</textarea>` : `<input data-i="${i}" data-k="${f.key}" value="${esc(r[f.key] || '')}" style="min-width:${f.width || 120}px">`}${f.link && r[f.key] && /^https?:/.test(r[f.key]) ? ` <a href="${esc(r[f.key])}" target="_blank" rel="noopener" class="small">open</a>` : ''}</td>`).join('')}<td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`).join('') || `<tr><td colspan="${fields.length + 1}" class="muted">Nothing here yet.</td></tr>`}
      </tbody></table></div>`);
    root.querySelectorAll('[data-i]').forEach((el) => (el.onchange = () => { arr[el.dataset.i][el.dataset.k] = el.value; ctx.save(); }));
    root.querySelectorAll('[data-del]').forEach((el) => (el.onclick = () => { arr.splice(el.dataset.del, 1); ctx.save(); ctx.rerender(); }));
    const add = root.querySelector('#add');
    if (add) add.onclick = () => { arr.unshift(opts.blank()); ctx.save(); ctx.rerender(); };
    const q = root.querySelector('#kq');
    if (q) q.oninput = () => { kview.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { ctx.rerender(); const n = document.getElementById('kq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  }
  const head = (title, desc, n) => `<div class="page-head"><div><h2>${title}</h2><p>${desc}</p></div><div class="row"><input id="kq" placeholder="Search…" value="${esc(kview.q)}"><button class="btn" id="add">+ Add</button><span class="muted small">${n} items</span></div></div>`;

  CIE.registerModule({
    id: 'decisions', group: 'knowledge', title: 'Decision log', order: 40,
    describe: 'The calls made, the reason, the confidence, what each changed — and your note.',
    render(root, ctx) {
      const ws = ctx.ws;
      const counts = CONF.map((c) => ({ label: c, value: ws.decisions.filter((d) => d.confidence === c).length, color: 'var(--s1)' }));
      root.innerHTML = head('Decision log', 'Each call shows the reason, the confidence and what it changed in the model. Overrule any of them in “Your note” and set the status.', ws.decisions.length) +
        `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Confidence of the calls</h3></div>${CIE.charts.barList(counts, { labelWidth: 120, row: 20, title: 'Decisions by confidence' })}</div>`;
      listEditor(root, ctx, ws.decisions, [
        { key: 'topic', label: 'Topic', width: 110 }, { key: 'question', label: 'Question', long: true, width: 200 }, { key: 'call', label: 'The call', long: true, width: 240 },
        { key: 'why', label: 'Why', long: true, width: 220 }, { key: 'confidence', label: 'Confidence', options: CONF }, { key: 'effect', label: 'What it changed', long: true, width: 160 },
        { key: 'status', label: 'Status', options: ['Open', 'Accepted', 'Changed'] }, { key: 'mine', label: 'Your note', long: true, width: 180 },
      ], { blank: () => ({ topic: '', question: '', call: '', why: '', confidence: 'Medium', effect: '', status: 'Open', mine: '' }) });
    },
  });

  CIE.registerModule({
    id: 'diligence', group: 'knowledge', title: 'Diligence queue', order: 41,
    describe: 'The questions that decide whether the plan is fundable and repeatable.',
    render(root, ctx) {
      const ws = ctx.ws;
      ws.diligence = ws.diligence || [];
      root.innerHTML = head('Diligence queue', 'Facts before promises. Each item names why it matters, who can answer it and where it stands.', ws.diligence.length);
      listEditor(root, ctx, ws.diligence, [
        { key: 'question', label: 'Question', long: true, width: 260 }, { key: 'why', label: 'Why it matters', long: true, width: 240 },
        { key: 'owner', label: 'Who can answer' }, { key: 'priority', label: 'Priority', options: ['P1', 'P2', 'P3'] },
        { key: 'status', label: 'Status', options: ['Open', 'Asked', 'Answered', 'Blocked'] }, { key: 'answer', label: 'Answer / evidence', long: true, width: 200 },
      ], { blank: () => ({ question: '', why: '', owner: '', priority: 'P2', status: 'Open', answer: '' }) });
    },
  });

  CIE.registerModule({
    id: 'sources', group: 'knowledge', title: 'Sources', order: 42,
    describe: 'Source register: every source dated, with what it supports.',
    render(root, ctx) {
      const ws = ctx.ws;
      root.innerHTML = head('Sources', 'Every source dated. Mark how far each can be trusted: public record, customer testimony, vendor claim, or our assumption.', ws.sources.length);
      listEditor(root, ctx, ws.sources, [
        { key: 'title', label: 'Source', width: 200 }, { key: 'publisher', label: 'Publisher' }, { key: 'date', label: 'Date', width: 96 },
        { key: 'kind', label: 'Kind', options: ['Public record', 'Research', 'Customer testimony', 'Vendor claim', 'Interview', 'Assumption'] },
        { key: 'supports', label: 'What it supports', long: true, width: 220 }, { key: 'url', label: 'Link', width: 180, link: true },
      ], { blank: () => ({ title: '', publisher: '', date: new Date().toISOString().slice(0, 10), kind: 'Public record', supports: '', url: '' }) });
    },
  });

  CIE.registerModule({
    id: 'glossary', group: 'knowledge', title: 'Glossary', order: 43,
    describe: 'Every abbreviation spelled out, with why it matters commercially.',
    render(root, ctx) {
      const ws = ctx.ws;
      ws.glossary.sort((a, b) => (a.term || '').localeCompare(b.term || ''));
      root.innerHTML = head('Glossary', 'Every abbreviation spelled out in full, defined in plain English, with its commercial relevance.', ws.glossary.length);
      listEditor(root, ctx, ws.glossary, [
        { key: 'term', label: 'Term', width: 90 }, { key: 'full', label: 'Full name', width: 200 }, { key: 'definition', label: 'Plain-English definition', long: true, width: 280 }, { key: 'relevance', label: 'Why it matters', long: true, width: 220 },
      ], { blank: () => ({ term: '', full: '', definition: '', relevance: '' }) });
    },
  });
})();
