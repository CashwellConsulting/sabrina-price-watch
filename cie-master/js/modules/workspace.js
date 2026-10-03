/* Workspace: engagement settings, segments, lenses, module manager, custom modules, save/export/import. */
(function () {
  'use strict';
  const CIE = window.CIE, esc = CIE.esc;

  /* ---------- custom (no-code) table modules ---------- */
  CIE.customModule = function (c) {
    return {
      id: 'custom-' + c.id, group: 'custom', title: c.title, order: 60, describe: c.description || 'Custom table',
      render(root, ctx) {
        root.innerHTML = `<div class="page-head"><div><h2>${esc(c.title)}</h2><p>${esc(c.description || 'A custom module. Edit cells directly; add columns in Workspace → Modules.')}</p></div>
          <div class="row"><button class="btn" id="addRow">+ Row</button><button class="btn" id="csv">Export CSV</button></div></div>
          <div class="table-wrap"><table><thead><tr>${c.columns.map((col) => `<th>${esc(col)}</th>`).join('')}<th></th></tr></thead><tbody>
          ${c.rows.map((r, i) => `<tr>${c.columns.map((col, j) => `<td><input data-r="${i}" data-c="${j}" value="${esc(r[j] || '')}" style="min-width:120px"></td>`).join('')}<td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`).join('') || `<tr><td colspan="${c.columns.length + 1}" class="muted">No rows yet.</td></tr>`}
          </tbody></table></div>`;
        root.querySelectorAll('[data-r]').forEach((el) => (el.onchange = () => { c.rows[el.dataset.r][el.dataset.c] = el.value; ctx.save(); }));
        root.querySelectorAll('[data-del]').forEach((el) => (el.onclick = () => { c.rows.splice(el.dataset.del, 1); ctx.save(); ctx.rerender(); }));
        root.querySelector('#addRow').onclick = () => { c.rows.push(c.columns.map(() => '')); ctx.save(); ctx.rerender(); };
        root.querySelector('#csv').onclick = () => CIE.download(CIE.slug(c.title) + '.csv', CIE.toCSV(c.rows, c.columns.map((l, j) => ({ label: l, get: (r) => r[j] }))), 'text/csv');
      },
    };
  };

  const MODULE_TEMPLATES = [
    { title: 'Competitor tracker', columns: ['Competitor', 'Where they win', 'Where they lose', 'Pricing signal', 'Source'] },
    { title: 'Partner routes', columns: ['Partner', 'Route type', 'Accounts reached', 'Economics', 'Status'] },
    { title: 'Risk register', columns: ['Risk', 'Likelihood', 'Impact', 'Mitigation', 'Owner', 'Trigger'] },
    { title: 'Interview log', columns: ['Date', 'Who', 'What they said', 'Implication', 'Follow-up'] },
    { title: 'Blank table', columns: ['Item', 'Detail', 'Status'] },
  ];

  CIE.registerModule({
    id: 'workspace',
    group: 'system',
    title: 'Data & modules',
    order: 90,
    describe: 'Engagement settings, segments, lenses, modules, and save / export / import.',
    render(root, ctx) {
      const ws = ctx.ws;
      const all = CIE.modules.filter((m) => m.group !== 'system');
      const enabled = (id) => !ws.enabledModules || ws.enabledModules.includes(id);
      const list = CIE.listWorkspaces();

      root.innerHTML = `
        <div class="page-head"><div><h2>Data & modules</h2><p>Everything for this engagement lives in one workspace. Edits save in this browser automatically; export a file to keep them safe or move them to another computer.</p></div></div>
        <div class="grid g2">
          <div class="card"><div class="card-head"><h3>Engagement</h3><span class="sub">what the header and overview show</span></div>
            <div class="stack">
              ${[['name', 'Workspace name'], ['company', 'Company being analysed'], ['subtitle', 'One-line description'], ['asOf', 'Data as of']].map(([k, l]) => `<label class="field">${l}<input data-w="${k}" value="${esc(ws[k] || '')}"></label>`).join('')}
              <label class="field">Start-here thesis<textarea data-w="thesis">${esc(ws.thesis || '')}</textarea></label>
              <div class="row"><label class="field">Pricing unit<input data-o="unit" value="${esc(ws.offering.unit)}"></label><label class="field">Planning price / unit / yr ($)<input type="number" data-o="price" value="${ws.offering.price}"></label></div>
            </div></div>
          <div class="card"><div class="card-head"><h3>Engagements</h3><span class="sub">${list.length} in this browser</span></div>
            <div class="table-wrap"><table><tbody>${list.map((w) => `<tr><td>${w.id === ws.id ? '<b>' + esc(w.name) + '</b> <span class="tag">open</span>' : esc(w.name)}</td><td class="r">${w.id !== ws.id ? `<button class="btn sm" data-open="${esc(w.id)}">Open</button> <button class="btn sm danger" data-delws="${esc(w.id)}">Delete</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
            <div class="row" style="margin-top:10px"><button class="btn primary" id="newBlank">+ New blank engagement</button><button class="btn" id="newSample">+ New from sample</button><button class="btn" id="dup">Duplicate this one</button></div>
            <h3 style="margin:18px 0 8px">Save & export</h3>
            <div class="row"><button class="btn primary" id="exp">Export workspace (.json)</button><label class="btn">Import workspace (.json)<input type="file" id="imp" accept=".json,application/json" hidden></label><button class="btn" id="expAcc">Accounts CSV</button></div>
            <h3 style="margin:18px 0 8px">Import an existing CIE file</h3>
            <p class="small ink2">Pick one of your original single-file CIEs (.html). Its accounts, scores, sources, glossary, decisions and any facility infection (HAI) table become a new engagement. The file is read in this browser only — nothing is uploaded, and its scripts are not run.</p>
            <label class="btn primary">Choose a CIE .html file…<input type="file" id="impHtml" accept=".html,.htm,text/html" hidden></label>
            <p class="small muted" style="margin-top:8px">Recognised layouts: ${CIE.importers.map((a) => esc(a.label)).join(' · ')}.</p>
            <p class="small muted" style="margin-top:8px">Import adds the file as a new engagement; it never overwrites one you have. Browser storage is per browser and per file location — clearing site data erases it, so export after each working session.</p></div>
        </div>

        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Modules</h3><span class="sub">turn tabs on or off for this engagement · add your own</span></div>
          <div class="grid g3">${CIE.groups.filter((g) => !['system', 'custom'].includes(g.id)).map((g) => `<div><div class="nav-group-title" style="padding:0 0 6px">${esc(g.title)}</div>
            ${all.filter((m) => m.group === g.id).map((m) => `<label class="check" style="align-items:flex-start"><input type="checkbox" data-mod="${esc(m.id)}" ${enabled(m.id) ? 'checked' : ''}><span><b>${esc(m.title)}</b><div class="small muted">${esc(m.describe || '')}</div></span></label>`).join('')}</div>`).join('')}
          <div><div class="nav-group-title" style="padding:0 0 6px">Custom modules</div>
            ${ws.custom.map((c, i) => `<div class="check" style="justify-content:space-between"><span><b>${esc(c.title)}</b> <span class="small muted">${c.columns.length} columns · ${c.rows.length} rows</span></span><span><button class="btn sm" data-editc="${i}">Edit</button> <button class="btn sm danger" data-delc="${i}">✕</button></span></div>`).join('') || '<p class="small muted">None yet.</p>'}
            <button class="btn" id="addMod" style="margin-top:8px">+ Add a module</button></div></div></div>

        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-head"><h3>Segments</h3><span class="sub">colour follows the segment, in this order</span><button class="btn sm" id="addSeg">+ Segment</button></div>
            ${ws.segments.map((s, i) => `<div class="row" style="margin-bottom:6px;flex-wrap:nowrap"><i style="width:12px;height:12px;border-radius:3px;background:${CIE.segmentColor(ws, s.id)};flex:none"></i><input data-seg="${i}" value="${esc(s.name)}" style="flex:1"><span class="small muted num">${ws.accounts.filter((a) => a.segment === s.id).length}</span><button class="btn sm danger" data-delseg="${i}">✕</button></div>`).join('')}
            ${ws.segments.length > 8 ? '<p class="small muted">Segments past the eighth share a neutral colour. Fold small ones together.</p>' : ''}</div>
          <div class="card"><div class="card-head"><h3>Lenses</h3><span class="sub">one-click views on Target accounts</span><button class="btn sm" id="addLens">+ Lens</button></div>
            ${ws.lenses.map((l, i) => `<div class="card" style="padding:10px;margin-bottom:8px;box-shadow:none"><div class="row" style="flex-wrap:nowrap"><input data-lens="${i}" data-k="label" value="${esc(l.label)}" style="flex:1;font-weight:600">${l.id !== 'all' ? `<button class="btn sm danger" data-dellens="${i}">✕</button>` : ''}</div>
              ${l.id !== 'all' ? `<div class="row" style="margin-top:6px"><label class="field" style="flex:1">Segments<select multiple data-lens="${i}" data-k="segments" style="min-height:60px">${ws.segments.map((s) => `<option value="${esc(s.id)}" ${(l.filter.segments || []).includes(s.id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
              <label class="field" style="flex:1">Any of these tags<input data-lens="${i}" data-k="tags" value="${esc((l.filter.tags || []).join(', '))}"></label>
              <label class="check"><input type="checkbox" data-lens="${i}" data-k="access" ${l.access ? 'checked' : ''}> + access</label></div>` : ''}</div>`).join('')}</div>
        </div>`;

      // engagement fields
      root.querySelectorAll('[data-w]').forEach((el) => (el.onchange = () => { ws[el.dataset.w] = el.value; ctx.save('Saved'); }));
      root.querySelectorAll('[data-o]').forEach((el) => (el.onchange = () => { ws.offering[el.dataset.o] = el.type === 'number' ? Number(el.value) : el.value; ctx.save('Saved'); }));
      // engagements
      root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => ctx.switchWorkspace(b.dataset.open)));
      root.querySelectorAll('[data-delws]').forEach((b) => (b.onclick = () => {
        const w = list.find((x) => x.id === b.dataset.delws);
        CIE.modal('Delete engagement?', `<p>This permanently removes “${esc(w.name)}” from this browser. Export it first if you may want it back.</p>`, [{ label: 'Delete', run() { CIE.deleteWorkspace(w.id); ctx.rerender(); ctx.save(); } }]);
      }));
      const create = (w) => { w.id = CIE.uid('ws'); ctx.replaceWorkspace(w); CIE.toast('Opened “' + w.name + '”'); };
      root.querySelector('#newBlank').onclick = () => {
        CIE.modal('New engagement', '<label class="field">Name<input id="nm" placeholder="e.g. Company X — CRO prep"></label>', [{ label: 'Create', primary: true, run(m) {
          const n = m.querySelector('#nm').value.trim() || 'New engagement';
          const w = CIE.blankWorkspace(n); w.company = n; create(w);
        } }]);
      };
      root.querySelector('#newSample').onclick = () => { const w = CIE.clone(window.CIE_SAMPLE); w.name += ' (copy)'; create(w); };
      root.querySelector('#dup').onclick = () => { const w = CIE.clone(ws); w.name += ' (copy)'; create(w); };
      // export / import
      root.querySelector('#exp').onclick = () => CIE.download(CIE.slug(ws.name) + '-' + new Date().toISOString().slice(0, 10) + '.cie.json', JSON.stringify({ format: 'cie-master-workspace', version: CIE.version, exportedAt: new Date().toISOString(), workspace: ws }, null, 2), 'application/json');
      root.querySelector('#imp').onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const data = JSON.parse(rd.result);
            const w = data.workspace || data;
            if (!w.accounts || !w.dimensions) throw new Error('This file is not a CIE workspace export.');
            w.name = (w.name || 'Imported') + (list.find((x) => x.name === w.name) ? ' (imported)' : '');
            create(w);
          } catch (err) { CIE.modal('Could not import', `<p>${esc(err.message)}</p>`); }
        };
        rd.readAsText(f);
      };
      root.querySelector('#impHtml').onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        CIE.toast('Reading ' + f.name + '…');
        const rd = new FileReader();
        rd.onload = () => {
          setTimeout(() => {
            try {
              const { ws: w, adapter } = CIE.importCIE(rd.result, f.name);
              const Q = w.datasets && w.datasets.quality;
              create(w);
              CIE.modal('Imported', `<p><b>${esc(w.name)}</b> was created with the ${esc(adapter.label.toLowerCase())} layout.</p><ul class="ink2">
                <li>${w.accounts.length} accounts · ${w.segments.length} segments · ${w.dimensions.length} scoring dimensions</li>
                ${Q ? `<li>${Q.rows.length.toLocaleString()} facilities with ${Q.measures.length} infection measures — open <b>Facility quality (HAI)</b></li>` : ''}
                <li>${w.sources.length} sources · ${w.glossary.length} glossary terms · ${w.decisions.length} decisions · ${(w.diligence || []).length} diligence items</li></ul>
                <p class="small muted">Review the scoring dimensions in the Scoring workbench — imported scores keep their original evidence status where the file recorded one.</p>`, Q ? [{ label: 'Open HAI data', primary: true, run() { ctx.go('quality'); } }] : []);
            } catch (err) { CIE.modal('Could not import', `<p>${esc(err.message)}</p>`); }
          }, 30);
        };
        rd.readAsText(f);
      };
      root.querySelector('#expAcc').onclick = () => {
        const rows = CIE.rank(ws, null);
        CIE.download(CIE.slug(ws.name) + '-accounts.csv', CIE.toCSV(rows, [{ label: 'Account', get: (r) => r.a.name }, { label: 'Segment', get: (r) => CIE.segmentName(ws, r.a.segment) }, { label: 'State', get: (r) => r.a.state }, { label: 'Fit', get: (r) => r.s.fit }, { label: 'Evidence share', get: (r) => Math.round(r.s.completeness * 100) + '%' }, { label: 'Stage', get: (r) => CIE.stageLabel(r.a.stage) }, { label: 'Users', get: (r) => r.a.value.users }, { label: 'Notes', get: (r) => r.a.notes }]), 'text/csv');
      };
      // modules
      root.querySelectorAll('[data-mod]').forEach((el) => (el.onchange = () => {
        const ids = ws.enabledModules || all.map((m) => m.id);
        ws.enabledModules = el.checked ? [...new Set(ids.concat(el.dataset.mod))] : ids.filter((x) => x !== el.dataset.mod);
        ctx.save(el.checked ? 'Module on' : 'Module off');
      }));
      root.querySelector('#addMod').onclick = () => {
        CIE.modal('Add a module', `<p class="ink2">A module is a new tab with its own editable table, saved and exported with this engagement. Start from a template or a blank table.</p>
          <label class="field">Template<select id="tpl">${MODULE_TEMPLATES.map((t, i) => `<option value="${i}">${esc(t.title)}</option>`).join('')}</select></label>
          <label class="field" style="margin-top:8px">Tab name<input id="tt" placeholder="Defaults to the template name"></label>
          <label class="field" style="margin-top:8px">Columns (comma-separated)<input id="tc" placeholder="Defaults to the template's columns"></label>
          <p class="small muted" style="margin-top:8px">Need charts or calculations? Developers can add a full module as one JavaScript file — see README “Adding a module”.</p>`, [{ label: 'Add module', primary: true, run(m) {
          const t = MODULE_TEMPLATES[m.querySelector('#tpl').value];
          const cols = m.querySelector('#tc').value.split(',').map((x) => x.trim()).filter(Boolean);
          const c = { id: CIE.uid('mod'), title: m.querySelector('#tt').value.trim() || t.title, columns: cols.length ? cols : t.columns.slice(), rows: [] };
          ws.custom.push(c); ctx.save('Module added'); ctx.go('custom-' + c.id);
        } }]);
      };
      root.querySelectorAll('[data-editc]').forEach((b) => (b.onclick = () => {
        const c = ws.custom[b.dataset.editc];
        CIE.modal('Edit module', `<label class="field">Tab name<input id="tt" value="${esc(c.title)}"></label><label class="field" style="margin-top:8px">Columns (comma-separated — renaming keeps data by position)<input id="tc" value="${esc(c.columns.join(', '))}"></label>`, [{ label: 'Save', primary: true, run(m) {
          c.title = m.querySelector('#tt').value.trim() || c.title;
          const cols = m.querySelector('#tc').value.split(',').map((x) => x.trim()).filter(Boolean);
          if (cols.length) c.columns = cols;
          ctx.save('Module updated'); ctx.rerender();
        } }]);
      }));
      root.querySelectorAll('[data-delc]').forEach((b) => (b.onclick = () => {
        const c = ws.custom[b.dataset.delc];
        CIE.modal('Remove module?', `<p>Removes “${esc(c.title)}” and its ${c.rows.length} rows.</p>`, [{ label: 'Remove', run() { ws.custom.splice(b.dataset.delc, 1); ctx.save('Module removed'); ctx.rerender(); } }]);
      }));
      // segments
      root.querySelectorAll('[data-seg]').forEach((el) => (el.onchange = () => { ws.segments[el.dataset.seg].name = el.value; ctx.save(); }));
      root.querySelectorAll('[data-delseg]').forEach((el) => (el.onclick = () => { ws.segments.splice(el.dataset.delseg, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addSeg').onclick = () => { ws.segments.push({ id: CIE.uid('seg'), name: 'New segment' }); ctx.save(); ctx.rerender(); };
      // lenses
      root.querySelectorAll('[data-lens]').forEach((el) => (el.onchange = () => {
        const l = ws.lenses[el.dataset.lens], k = el.dataset.k;
        if (k === 'label') l.label = el.value;
        else if (k === 'access') l.access = el.checked;
        else if (k === 'segments') l.filter.segments = [...el.selectedOptions].map((o) => o.value);
        else if (k === 'tags') l.filter.tags = el.value.split(',').map((x) => x.trim()).filter(Boolean);
        ctx.save();
      }));
      root.querySelectorAll('[data-dellens]').forEach((el) => (el.onclick = () => { ws.lenses.splice(el.dataset.dellens, 1); ctx.save(); ctx.rerender(); }));
      root.querySelector('#addLens').onclick = () => { ws.lenses.push({ id: CIE.uid('lens'), label: 'New lens', filter: {} }); ctx.save(); ctx.rerender(); };
    },
  });
})();
