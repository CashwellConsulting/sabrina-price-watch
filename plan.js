// Plan my trip: which store (or pair of stores) covers the list for the least money.
// Items are compared on equal amounts: unit price × the smallest comparable pack any store sells,
// so a 30pk at Sam's and a 10pk at Walmart are priced for the same quantity.
const LS_STOP_WORTH = "spw-stop-worth";
let planScope = null;
let stopWorth = load(LS_STOP_WORTH, 10);

function itemQuotes(id) {
  const d = mainDim(id);
  const offers = offersFor(id).filter(function (x) { return dimOf(x.o) === d; });
  if (!offers.length) return null;
  const qty = Math.min.apply(null, offers.map(function (x) { return x.o.base * ((UOM[x.o.uom] || [0, 1])[1]); }));
  const q = {};
  offers.forEach(function (x) { q[x.s] = { cost: unitOf(x.o) * qty, o: x.o }; });
  return q;
}

function planFor(stores, quotes) {
  const plan = { stores: stores, cost: 0, checkout: 0, picks: {}, missing: [] };
  Object.keys(quotes).forEach(function (id) {
    let best = null;
    stores.forEach(function (s) { const q = quotes[id] && quotes[id][s]; if (q && (!best || q.cost < best.q.cost)) best = { s: s, q: q }; });
    if (!best) { plan.missing.push(id); return; }
    plan.picks[id] = best.s; plan.cost += best.q.cost; plan.checkout += Number(best.q.o.price);
  });
  return plan;
}

function byCoverageThenCost(a, b) { return a.missing.length - b.missing.length || a.cost - b.cost; }

// Savings of plan b over plan a, counted only on items both plans can buy.
function savingsOver(a, b, quotes) {
  let saved = 0;
  Object.keys(a.picks).forEach(function (id) { if (b.picks[id]) saved += quotes[id][a.picks[id]].cost - quotes[id][b.picks[id]].cost; });
  return saved;
}

function tripPlan(ids) {
  const quotes = {};
  ids.forEach(function (id) { const q = itemQuotes(id); quotes[id] = q || {}; });
  const all = STORES.map(function (s) { return s.id; });
  const singles = all.map(function (s) { return planFor([s], quotes); }).sort(byCoverageThenCost);
  const pairs = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) pairs.push(planFor([all[i], all[j]], quotes));
  pairs.sort(byCoverageThenCost);
  const one = singles[0], two = pairs[0];
  const saved = savingsOver(one, two, quotes);
  const extra = two.missing.length < one.missing.length ? one.missing.length - two.missing.length : 0;
  const goTwo = saved >= stopWorth || extra > 0;
  return { quotes: quotes, singles: singles, one: one, two: two, every: planFor(all, quotes), saved: saved, extra: extra, pick: goTwo ? two : one };
}

function storeName(id) { return STORES.find(function (s) { return s.id === id; }).label; }
function planName(p) { return p.stores.map(storeName).join(" + "); }
function productName(id) { const p = allProducts().find(function (x) { return x.id === id; }); return p ? p.name : id; }

function renderPlan() {
  const cartIds = Object.keys(cart);
  if (planScope == null) planScope = cartIds.length ? "cart" : "all";
  const ids = planScope === "cart" ? cartIds : allProducts().map(function (p) { return p.id; });
  const dlg = document.getElementById("planDlg");
  const scope = '<div class="seg" role="group" aria-label="What to plan"><button data-scope="cart" class="' + (planScope === "cart" ? "on" : "") + '"' + (cartIds.length ? "" : " disabled") + '>My cart (' + cartIds.length + ')</button><button data-scope="all" class="' + (planScope === "all" ? "on" : "") + '">Her whole list (' + allProducts().length + ')</button></div>';
  const head = '<div class="planhead"><h3>Plan my trip</h3><button class="x" data-plan="close" aria-label="Close">×</button></div>' + scope;
  if (!ids.length) { dlg.innerHTML = head + '<div class="empty"><b>Nothing to plan yet</b>Add items to the cart, or plan her whole list.</div>'; return; }
  const t = tripPlan(ids);
  const n = ids.length;
  const verdict = t.pick === t.two
    ? '<div class="verdict go2"><small>Recommended</small><b>' + planName(t.two) + '</b><p>' + (t.saved >= stopWorth ? 'The second stop saves <strong>$' + t.saved.toFixed(2) + '</strong> versus ' + planName(t.one) + ' alone.' : 'Adds ' + t.extra + (t.extra === 1 ? ' item ' : ' items ') + planName(t.one) + ' doesn’t carry' + (t.saved > 0.005 ? ', and saves $' + t.saved.toFixed(2) + ' on the rest.' : '.')) + '</p></div>'
    : '<div class="verdict go1"><small>Recommended</small><b>Just ' + planName(t.one) + '</b><p>' + (t.saved > 0.005 ? 'A second stop (' + planName(t.two) + ') would only save $' + t.saved.toFixed(2) + '.' : 'A second stop wouldn’t save anything.') + '</p></div>';
  const worth = '<div class="worth">A second stop is worth it if it saves at least <span class="stepper"><button data-worth="-5" aria-label="Less">−</button><b>$' + stopWorth + '</b><button data-worth="5" aria-label="More">+</button></span></div>';
  const rows = t.singles.concat([t.two, t.every]);
  // Cost bars are only fair when every option buys the same items; otherwise chart coverage.
  const byCost = rows.every(function (p) { return !p.missing.length; });
  const max = byCost ? Math.max.apply(null, rows.map(function (p) { return p.cost; })) || 1 : n;
  const bars = '<div class="bars">' + rows.map(function (p, i) {
    const label = i === rows.length - 1 ? "All four stores" : planName(p);
    const dots = p.stores.map(function (s) { return '<i style="background:var(--' + s + ')"></i>'; }).join("");
    const cover = n - p.missing.length;
    return '<div class="bar' + (p === t.pick ? " pick" : "") + '"><div class="bl">' + (i === rows.length - 1 ? "" : dots) + label + '</div><div class="bt"><span style="width:' + Math.max(4, (byCost ? p.cost : cover) / max * 100).toFixed(1) + '%"></span></div><div class="bv">' + (byCost ? '$' + p.cost.toFixed(2) + '<small>all ' + n + ' items</small>' : cover + ' of ' + n + '<small>$' + p.cost.toFixed(2) + '</small>') + '</div></div>';
  }).join("") + '</div>';
  const list = t.pick.stores.map(function (s) {
    const mine = Object.keys(t.pick.picks).filter(function (id) { return t.pick.picks[id] === s; });
    if (!mine.length) return "";
    const checkout = mine.reduce(function (a, id) { return a + Number(t.quotes[id][s].o.price); }, 0);
    return '<div class="stop"><div class="stophead"><span><i style="background:var(--' + s + ')"></i>' + storeName(s) + '</span><span>' + mine.length + (mine.length === 1 ? ' item' : ' items') + ' · ~$' + checkout.toFixed(2) + ' at checkout</span></div><ul>' + mine.sort(function (a, b) { return productName(a).localeCompare(productName(b)); }).map(function (id) {
      const o = t.quotes[id][s].o;
      return '<li><span>' + esc(productName(id)) + '</span><span>$' + Number(o.price).toFixed(2) + ' · ' + esc(o.pack) + '</span></li>';
    }).join("") + '</ul></div>';
  }).join("");
  const missing = t.pick.missing.length ? '<div class="stop miss"><div class="stophead"><span>Not on this route</span><span>' + t.pick.missing.length + '</span></div><ul>' + t.pick.missing.map(function (id) { return '<li><span>' + esc(productName(id)) + '</span><span>no price at these stores</span></li>'; }).join("") + '</ul></div>' : "";
  dlg.innerHTML = head + verdict + worth + '<div class="eyebrow">' + (byCost ? 'Cost for the same amount of each item' : 'Items each option can price') + '</div>' + bars + '<div class="eyebrow">Shopping list</div>' + list + missing +
    '<div class="planfoot"><button class="btn berry" data-plan="use">' + (planScope === "cart" ? "Update cart to this plan" : "Put this plan in my cart") + '</button><p>Totals compare equal amounts (unit price × the smallest pack any store sells). Checkout amounts are what the listed packs cost.</p></div>';
  dlg._plan = t;
}

function openPlan() { planScope = null; renderPlan(); const dlg = document.getElementById("planDlg"); if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0; }

document.getElementById("planDlg").addEventListener("click", function (e) {
  const dlg = this;
  if (e.target === dlg) { dlg.close(); return; }
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.plan === "close") dlg.close();
  if (b.dataset.scope) { planScope = b.dataset.scope; renderPlan(); }
  if (b.dataset.worth) { stopWorth = Math.max(0, stopWorth + Number(b.dataset.worth)); save(LS_STOP_WORTH, stopWorth); renderPlan(); }
  if (b.dataset.plan === "use") {
    const picks = dlg._plan.pick.picks;
    Object.keys(picks).forEach(function (id) { cart[id] = picks[id]; });
    save(LS_CART, cart); dlg.close(); render();
  }
});
