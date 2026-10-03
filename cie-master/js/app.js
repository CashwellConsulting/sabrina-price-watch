/* App shell: sidebar, routing, theme, workspace switching, drawer. Loaded after every module. */
(function () {
  'use strict';
  const CIE = window.CIE;
  const esc = CIE.esc;
  let ws = null;
  let current = null;

  async function boot() {
    // First run: seed the generic sample engagement.
    let list = CIE.listWorkspaces();
    // Rename any engagement imported before anonymisation existed.
    for (const w of list) {
      const full = await CIE.loadWorkspace(w.id);
      if (full && CIE.anonymize && CIE.anonymize(full)) { full._dsDirty = true; CIE.saveWorkspace(full); }
    }
    list = CIE.listWorkspaces();
    if (!list.length && window.CIE_SAMPLE) {
      const s = CIE.normalize(CIE.clone(window.CIE_SAMPLE));
      s._dsDirty = true;
      CIE.saveWorkspace(s);
      list = CIE.listWorkspaces();
    }
    const id = CIE.prefs.workspace && list.find((w) => w.id === CIE.prefs.workspace) ? CIE.prefs.workspace : list[0] && list[0].id;
    ws = (id && (await CIE.loadWorkspace(id))) || CIE.normalize(CIE.clone(window.CIE_SAMPLE || CIE.blankWorkspace('Sample')));
    applyTheme();
    window.addEventListener('hashchange', route);
    route();
  }

  function applyTheme() {
    const t = CIE.prefs.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  const ctx = (CIE.ctx = {
    get ws() { return ws; },
    // Call after changing ws.datasets so the large tables are rewritten too.
    saveDatasets(msg) { ws._dsDirty = true; this.save(msg); },
    save(msg) {
      const ok = CIE.saveWorkspace(ws);
      if (!ok) CIE.toast('Browser storage is unavailable — export to keep your edits');
      else if (msg) CIE.toast(msg);
      renderNav();
    },
    rerender() { renderPage(); },
    go(id) { location.hash = '#/' + id; },
    async switchWorkspace(id) {
      const next = await CIE.loadWorkspace(id);
      if (!next) return;
      ws = next;
      CIE.prefs.workspace = id;
      CIE.savePrefs();
      renderNav();
      renderPage();
    },
    replaceWorkspace(next) {
      ws = CIE.normalize(next);
      if (ws.datasets && Object.keys(ws.datasets).length) ws._dsDirty = true;
      CIE.saveWorkspace(ws);
      CIE.prefs.workspace = ws.id;
      CIE.savePrefs();
      renderNav();
      renderPage();
    },
    openDrawer(html, bind) {
      closeDrawer();
      const back = document.createElement('div');
      back.className = 'drawer-backdrop';
      const d = document.createElement('aside');
      d.className = 'drawer';
      d.innerHTML = `<div class="row" style="justify-content:flex-end;margin-bottom:6px"><button class="btn sm" data-close-drawer>Close ✕</button></div>${html}`;
      back.addEventListener('click', closeDrawer);
      d.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close-drawer')) closeDrawer(); });
      document.body.append(back, d);
      if (bind) bind(d);
      return d;
    },
    closeDrawer,
  });
  function closeDrawer() { document.querySelectorAll('.drawer, .drawer-backdrop').forEach((n) => n.remove()); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); document.querySelectorAll('.modal-back').forEach((n) => n.remove()); } });

  function route() {
    const mods = CIE.activeModules(ws);
    const want = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
    current = mods.find((m) => m.id === want) || mods[0];
    renderNav();
    renderPage();
  }

  function renderNav() {
    const mods = CIE.activeModules(ws);
    const list = CIE.listWorkspaces();
    const nav = document.getElementById('nav');
    nav.innerHTML =
      `<div class="brand"><div class="brand-mark">CIE</div><div><div class="brand-name">Commercial Intelligence</div><div class="brand-sub">Master engine · v${CIE.version}</div></div></div>
      <label class="field" style="margin:0 6px 14px">Engagement
        <select id="wsPick" class="ws-picker">${list.map((w) => `<option value="${esc(w.id)}" ${w.id === ws.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></label>` +
      CIE.groups
        .map((g) => {
          const items = mods.filter((m) => m.group === g.id);
          if (!items.length) return '';
          return `<div class="nav-group"><div class="nav-group-title">${esc(g.title)}</div>${items
            .map((m) => `<button class="nav-item ${current && m.id === current.id ? 'active' : ''}" data-go="${esc(m.id)}"><span class="dot"></span>${esc(m.title)}</button>`)
            .join('')}</div>`;
        })
        .join('');
    nav.querySelector('#wsPick').onchange = (e) => ctx.switchWorkspace(e.target.value);
    nav.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { ctx.go(b.dataset.go); nav.classList.remove('open'); }));
  }

  function renderPage() {
    closeDrawer();
    const mods = CIE.activeModules(ws);
    if (!current || !mods.find((m) => m.id === current.id)) current = mods[0];
    document.getElementById('pageTitle').textContent = current.title;
    document.getElementById('wsLabel').textContent = [ws.company || ws.name, ws.asOf ? 'as of ' + ws.asOf : ''].filter(Boolean).join(' · ');
    document.title = (ws.company || ws.name) + ' · ' + current.title + ' · CIE';
    const root = document.getElementById('page');
    root.innerHTML = '';
    try {
      current.render(root, ctx);
    } catch (err) {
      root.innerHTML = `<div class="card"><h3>This module hit an error</h3><p class="muted">${esc(err.message)}</p><p class="small">Your data is safe. Export it from Workspace → Data &amp; modules.</p></div>`;
      console.error(err);
    }
    window.scrollTo(0, 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menuBtn').onclick = () => document.getElementById('nav').classList.toggle('open');
    document.getElementById('themeBtn').onclick = () => {
      const order = [undefined, 'light', 'dark'];
      CIE.prefs.theme = order[(order.indexOf(CIE.prefs.theme) + 1) % 3];
      CIE.savePrefs();
      applyTheme();
      CIE.toast('Theme: ' + (CIE.prefs.theme || 'match system'));
    };
    const fb = document.getElementById('fallback');
    if (fb) fb.remove();
    boot();
  });
})();
