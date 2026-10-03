/* Generic sample engagement. Every organisation, person and number here is fictional and exists only
   to demonstrate the engine. Accounts are generated deterministically so every browser sees the same sample. */
(function () {
  'use strict';
  let seed = 20261003;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const int = (lo, hi) => Math.floor(lo + rnd() * (hi - lo + 1));

  const segments = [
    { id: 'provider', name: 'Provider groups' },
    { id: 'health_center', name: 'Community health centers' },
    { id: 'vbc', name: 'Value-based care' },
    { id: 'payer', name: 'Health plans' },
    { id: 'senior', name: 'Senior care operators' },
    { id: 'behavioral', name: 'Behavioral health' },
  ];
  const cities = [
    ['NY', 'New York', -74.0, 40.71], ['NY', 'Albany', -73.76, 42.65], ['NY', 'Buffalo', -78.88, 42.89], ['CA', 'Los Angeles', -118.24, 34.05],
    ['CA', 'Oakland', -122.27, 37.8], ['CA', 'San Diego', -117.16, 32.72], ['CA', 'Fresno', -119.79, 36.74], ['TX', 'Houston', -95.37, 29.76],
    ['TX', 'Dallas', -96.8, 32.78], ['TX', 'San Antonio', -98.49, 29.42], ['FL', 'Tampa', -82.46, 27.95], ['FL', 'Miami', -80.19, 25.76],
    ['IL', 'Chicago', -87.63, 41.88], ['PA', 'Philadelphia', -75.17, 39.95], ['PA', 'Pittsburgh', -79.99, 40.44], ['OH', 'Columbus', -82.99, 39.96],
    ['MA', 'Boston', -71.06, 42.36], ['GA', 'Atlanta', -84.39, 33.75], ['NC', 'Charlotte', -80.84, 35.23], ['TN', 'Nashville', -86.78, 36.16],
    ['MI', 'Detroit', -83.05, 42.33], ['AZ', 'Phoenix', -112.07, 33.45], ['CO', 'Denver', -104.99, 39.74], ['WA', 'Seattle', -122.33, 47.61],
    ['MN', 'Minneapolis', -93.27, 44.98], ['MO', 'St. Louis', -90.2, 38.63], ['OR', 'Portland', -122.68, 45.52], ['NJ', 'Newark', -74.17, 40.74],
  ];
  const first = ['Harbor', 'Summit', 'Riverbend', 'Lakeview', 'Cedar', 'Northfield', 'Bluewater', 'Granite', 'Meadow', 'Pinecrest', 'Ironwood', 'Silverline', 'Crescent', 'Oakridge', 'Westgate', 'Brightpath', 'Keystone', 'Sunrise', 'Evergreen', 'Prairie', 'Copperleaf', 'Highland', 'Bayside', 'Redstone'];
  const suffix = {
    provider: ['Physicians Group', 'Medical Associates', 'Independent Physician Association', 'Medical Group'],
    health_center: ['Community Health Center', 'Family Health Services', 'Neighborhood Health'],
    vbc: ['Value Care Partners', 'Primary Care Network', 'Accountable Care'],
    payer: ['Health Plan', 'Community Health Plan', 'Medicaid Plan'],
    senior: ['Senior Care', 'Elder Care Partners', 'All-Inclusive Senior Care'],
    behavioral: ['Behavioral Health', 'Care Coordination Network', 'Recovery Services'],
  };
  const tagPool = ['Investor-linked', 'Builds own platform', 'Existing customer', 'Reference to verify', 'Design partner candidate', 'Multi-state'];
  const buyers = { provider: 'Chief medical officer / VP care management', health_center: 'CEO or COO', vbc: 'VP clinical operations', payer: 'VP care management', senior: 'Executive director', behavioral: 'Director of care coordination' };
  const firstUses = ['Outbound outreach calls documented automatically', 'Care-plan notes drafted from member calls', 'Transition-of-care follow-up within 48 hours', 'Intake and enrolment calls structured into the record'];
  const evStatus = () => { const r = rnd(); return r < 0.45 ? 'evidenced' : r < 0.8 ? 'estimated' : 'unknown'; };

  const used = new Set();
  const accounts = [];
  for (let i = 0; i < 52; i++) {
    const seg = segments[i % segments.length].id;
    let name;
    do { name = pick(first) + ' ' + pick(suffix[seg]); } while (used.has(name));
    used.add(name);
    const c = pick(cities);
    const users = seg === 'payer' ? int(40, 220) : seg === 'provider' ? int(20, 140) : int(8, 80);
    const scores = {};
    ['workflow', 'scale', 'integration', 'budget', 'trigger', 'relationship'].forEach((k) => {
      const s = k === 'relationship' && rnd() < 0.5 ? 'unknown' : evStatus();
      scores[k] = { v: s === 'unknown' ? 0 : int(seg === 'vbc' || seg === 'behavioral' ? 2 : 1, 5), s };
    });
    const tags = [];
    if (rnd() < 0.18) tags.push(pick(tagPool));
    if (rnd() < 0.08) tags.push('Multi-state');
    const checks = { identity: rnd() < 0.8, workflow: scores.workflow.s === 'evidenced', buyer: rnd() < 0.5, trigger: scores.trigger.s === 'evidenced' };
    const allChecks = checks.identity && checks.workflow && checks.buyer && checks.trigger;
    const stage = allChecks ? 'outreach_ready' : checks.workflow && checks.buyer ? 'research_ready' : checks.workflow ? 'workflow_evidenced' : checks.identity ? 'identity_resolved' : 'identified';
    const relRoll = rnd();
    accounts.push({
      id: 'acc_' + (i + 1),
      name,
      segment: seg,
      state: c[0],
      city: c[1],
      lon: c[2] + (rnd() - 0.5) * 0.6,
      lat: c[3] + (rnd() - 0.5) * 0.4,
      stage,
      tags: [...new Set(tags)],
      scores,
      checks,
      why: 'Care team works the phones daily under a risk-bearing contract; documentation load is the stated constraint.',
      user: 'Care managers and outreach coordinators',
      buyer: buyers[seg],
      firstUse: pick(firstUses),
      pilotEndpoint: 'Minutes of documentation per call and contacts completed per FTE, 60-day pilot',
      uncertainty: pick(['Budget owner not yet named', 'May build in-house', 'Contract renewal timing unknown', 'Integration path to the record unclear']),
      nextAction: pick(['Confirm the economic buyer', 'Find the care-management leader', 'Validate call volume', 'Check build-versus-buy stance']),
      people: rnd() < 0.3 ? [{ name: 'Example Person', role: 'VP Care Management', source: '' }] : [],
      signals: rnd() < 0.35 ? [{ date: '2026-0' + int(4, 9) + '-1' + int(0, 9), fact: pick(['Announced expansion into two new counties', 'Posted three care-manager openings', 'Joined a new value-based contract', 'Named a new chief operating officer']) }] : [],
      relationship: { owner: relRoll < 0.15 ? 'Investor / board' : relRoll < 0.3 ? 'Leadership team' : '', strength: relRoll < 0.1 ? 'warm' : relRoll < 0.2 ? 'possible' : relRoll < 0.24 ? 'direct' : 'none', note: '' },
      value: { users, hours: 3, rate: 48, share: 0.6, multiple: 3 },
      notes: '',
    });
  }

  window.CIE_SAMPLE = {
    id: 'ws_sample',
    schema: 1,
    name: 'Sample engagement',
    company: 'Example Co. — care-team workflow software',
    subtitle: 'Generic demonstration data. Replace with your engagement in Workspace → Data & modules.',
    asOf: '2026-10-03',
    thesis: 'Lead with provider-side care teams already working under risk contracts; prove one workflow with three design partners before funding a payer motion.',
    offering: { unit: 'user', price: 2400 },
    enabledModules: null,
    dimensions: [
      { key: 'workflow', label: 'Workflow fit', weight: 30 },
      { key: 'scale', label: 'Scale', weight: 20 },
      { key: 'integration', label: 'Integration', weight: 20 },
      { key: 'budget', label: 'Budget', weight: 15 },
      { key: 'trigger', label: 'Trigger', weight: 10 },
      { key: 'relationship', label: 'Relationship', weight: 5 },
    ],
    segments,
    lenses: [
      { id: 'all', label: 'All accounts', filter: {} },
      { id: 'provider_first', label: 'Provider-first', description: 'Provider groups, health centers, behavioral health', filter: { segments: ['provider', 'health_center', 'behavioral'] } },
      { id: 'vbc', label: 'Value-based care', filter: { segments: ['vbc', 'senior'] } },
      { id: 'payer', label: 'Payer track', filter: { segments: ['payer'] } },
      { id: 'warm', label: 'Warm introductions', description: 'Fit plus recorded relationships', filter: {}, access: true },
      { id: 'independent', label: 'Independent demand', description: 'Excludes investor-linked routes', filter: { excludeTags: ['Investor-linked', 'Existing customer'] } },
    ],
    accounts,
    findings: [
      { kind: 'supports', label: 'Supports the thesis', confidence: 'High', title: 'Provider care teams lead the ranking', body: 'Most of the top 15 are provider-side teams already making outbound calls under risk contracts. Payers appear mainly as the funding source behind them.' },
      { kind: 'challenges', label: 'Challenges the plan', confidence: 'Medium-high', title: 'Warm doors skew to builders', body: 'Investor-linked accounts are over-represented among outreach-ready accounts. Wins there open doors but do not prove the open market will buy.' },
      { kind: 'sizing', label: 'Sizing reality', confidence: 'High', title: 'The market is a long tail', body: 'Named accounts add up to a small fraction of the Base pool. The pool only exists across hundreds of mid-size organisations — a repeatable segment motion beats whale-hunting.' },
      { kind: 'pricing', label: 'Pricing reality', confidence: 'Medium', title: 'Time savings alone do not carry the high price', body: 'At 3 hours a week and $48 an hour with 60% counted, a user is worth about $4,500 a year. A 3-to-1 return supports roughly $1,500; the higher price must be earned with revenue protected.' },
    ],
    market: {
      prices: { low: 1800, base: 2400, high: 3600 },
      segments: [
        { name: 'Provider groups', count: 1800, retain: [0.4, 0.55, 0.7], fit: [0.25, 0.4, 0.55], upu: [8, 20, 45], expansion: false },
        { name: 'Health centers', count: 1400, retain: [0.5, 0.65, 0.8], fit: [0.3, 0.45, 0.6], upu: [6, 14, 30], expansion: false },
        { name: 'Value-based care', count: 450, retain: [0.6, 0.75, 0.9], fit: [0.4, 0.55, 0.7], upu: [15, 35, 80], expansion: false },
        { name: 'Health plans', count: 300, retain: [0.3, 0.45, 0.6], fit: [0.2, 0.35, 0.5], upu: [40, 90, 200], expansion: false },
        { name: 'Senior care operators', count: 180, retain: [0.6, 0.75, 0.9], fit: [0.4, 0.55, 0.7], upu: [10, 22, 40], expansion: false },
        { name: 'Behavioral health', count: 600, retain: [0.5, 0.65, 0.8], fit: [0.35, 0.5, 0.65], upu: [6, 12, 25], expansion: false },
        { name: 'Outsourced care-management firms', count: 120, retain: [0.5, 0.6, 0.7], fit: [0.3, 0.4, 0.5], upu: [30, 60, 120], expansion: true },
      ],
      capacity: { reps: 4, rampMonths: 6, dealsPerRep: 6, acv: 60000, expansion: 1.15 },
    },
    economics: {
      implementation: 0.25, screen: 3, prices: [1500, 2000, 2400, 3000, 3600],
      streams: [
        { label: 'Time returned to care staff', perUnit: 7488, share: 0.6, counted: true, basis: '3 h/week × 52 × $48 loaded' },
        { label: 'Billable services protected', perUnit: 2200, share: 0.5, counted: true, basis: 'documented contacts that meet billing rules' },
        { label: 'Turnover avoided', perUnit: 900, share: 0.3, counted: true, basis: 'recruiting cost × attrition change' },
        { label: 'Quality / audit readiness', perUnit: 1200, share: 1, counted: false, basis: 'shown, never in the return' },
      ],
    },
    bridge: {
      start: 4000000, target: 12000000,
      steps: [
        { label: 'Installed-base expansion', kind: 'expansion', count: 20, avg: 90000, sign: 1 },
        { label: 'Enterprise wins', kind: 'new', count: 6, avg: 350000, sign: 1 },
        { label: 'Mid-market wins', kind: 'new', count: 25, avg: 80000, sign: 1 },
        { label: 'Churn / contraction', kind: 'churn', count: 8, avg: 60000, sign: -1 },
      ],
    },
    truth: {
      groups: [
        { title: 'ARR inputs', note: 'Stamp every number. Unknowns render hatched and never enter totals.', fields: [
          { label: 'Starting ARR ($M)', value: '4.0', stamp: 'claim' }, { label: 'Management ARR testimony ($M)', value: '4.6', stamp: 'testimony' },
          { label: 'Active paying logos', value: '', stamp: 'unknown' }, { label: 'Net revenue retention (cohort)', value: '1.25', stamp: 'claim' }, { label: 'Whole-base gross retention', value: '', stamp: 'unknown' }] },
        { title: 'Concentration', note: 'Leave blank until verified — hatched does not assume diversification.', fields: [
          { label: 'Top 1 customer % of ARR', value: '', stamp: 'unknown' }, { label: 'Top 5 % of ARR', value: '', stamp: 'unknown' }, { label: 'Top 10 % of ARR', value: '', stamp: 'unknown' }] },
        { title: 'Revenue mix (%)', note: 'Software vs services. A preference is not an audited mix.', fields: [
          { label: 'Software subscription', value: '70', stamp: 'claim' }, { label: 'Implementation / services', value: '', stamp: 'unknown' }, { label: 'Advisory / consulting', value: '15', stamp: 'preference' }] },
      ],
      questions: [
        'Which ARR number does the board use, and as of what date?',
        'What is top-1 and top-5 customer concentration, and what renews in the next 12 months?',
        'Software vs services vs pass-through over the trailing twelve months?',
        'How many active paying logos versus lifetime customers served?',
        'Whole-base gross and net retention versus the best cohort?',
      ],
    },
    gates: {
      oneLine: 'Make the product the easiest reliable way for a care team to complete and document an outreach call — and prove it pays before expanding.',
      stopRules: 'a wrong-patient record, an unsupported billing statement or unauthorised access appears; review work erases the time saved; or results cannot be repeated outside the champion site.',
      gates: [
        { name: 'Data access agreed', criteria: 'Signed data-sharing terms and a named data owner at each pilot site', owner: 'Legal / customer', status: 'passed' },
        { name: 'Workflow baseline measured', criteria: 'Two weeks of minutes-per-call and contacts-per-FTE before go-live', owner: 'Ops lead', status: 'in_progress' },
        { name: 'Accuracy threshold', criteria: '≥ 95% of drafted notes accepted with minor edits on a 200-note audit', owner: 'Clinical lead', status: 'not_started' },
        { name: 'Value reconciles', criteria: 'Customer finance agrees the time and revenue numbers', owner: 'Customer CFO', status: 'not_started' },
        { name: 'Repeatable outside champion', criteria: 'Same result at a second site with a different team', owner: 'Customer success', status: 'not_started' },
      ],
      cohort: [],
      valueTypes: [
        { label: 'Loss prevented', low: 120000, base: 260000, high: 480000, note: 'Avoided write-offs and penalties' },
        { label: 'Growth (more patients served)', low: 80000, base: 210000, high: 520000, note: 'Capacity turned into appropriate volume' },
        { label: 'Cash timing (one-time)', low: 150000, base: 300000, high: 600000, note: 'Collected sooner — not profit' },
      ],
    },
    deals: {
      byAccount: {},
      plays: [
        { situation: 'Champion loves it, nobody owns the budget', signal: 'Enthusiastic meetings, no named economic buyer after 30 days', move: 'Ask the champion to co-write a one-page business case with the CFO’s numbers, and request the meeting together.' },
        { situation: 'Stuck in security review', signal: 'Questionnaire returned, then silence', move: 'Offer a call between your security lead and theirs; send the standard pack and a dated close plan for the review.' },
        { situation: '“Build it ourselves”', signal: 'Their engineering team asks for API docs early', move: 'Price the build honestly with them — time to value, maintenance, compliance — and propose a component deal.' },
        { situation: 'Pilot succeeded, no expansion', signal: 'Good metrics, renewal talk stalls', move: 'Re-run the value reconciliation with finance; tie expansion to the next budget cycle with a named sponsor.' },
      ],
    },
    diligence: [
      { question: 'What is actual ARR, and how is services revenue recognised?', why: 'Sets the denominator for every growth claim', owner: 'CFO', priority: 'P1', status: 'Open', answer: '' },
      { question: 'Which customers are paying references versus pilots?', why: 'Determines what proof can be used in sales', owner: 'CEO', priority: 'P1', status: 'Open', answer: '' },
      { question: 'What does integration cost per customer today?', why: 'Drives gross margin and time to value', owner: 'VP Engineering', priority: 'P2', status: 'Open', answer: '' },
    ],
    sources: [
      { title: 'Example public registry (placeholder)', publisher: 'Government agency', date: '2026-09-01', kind: 'Public record', supports: 'Segment counts in the market model', url: '' },
      { title: 'Example industry survey (placeholder)', publisher: 'Industry association', date: '2026-06-15', kind: 'Research', supports: 'Users-per-unit assumptions', url: '' },
      { title: 'Management interview', publisher: 'Internal', date: '2026-09-20', kind: 'Interview', supports: 'ARR testimony', url: '' },
    ],
    glossary: [
      { term: 'ARR', full: 'Annual recurring revenue', definition: 'Yearly value of subscription contracts in force.', relevance: 'The denominator for growth and valuation.' },
      { term: 'NRR', full: 'Net revenue retention', definition: 'Revenue kept from a customer cohort a year later, including expansion, minus churn.', relevance: 'Above 1.0× means the installed base grows on its own.' },
      { term: 'GRR', full: 'Gross revenue retention', definition: 'Revenue kept from a cohort excluding expansion.', relevance: 'Shows true churn; cannot exceed 100%.' },
      { term: 'ACV', full: 'Annual contract value', definition: 'Average yearly value of one contract.', relevance: 'Drives sales-capacity math.' },
      { term: 'MEDDPICC', full: 'Metrics, Economic buyer, Decision criteria, Decision process, Paper process, Identify pain, Champion, Competition', definition: 'A deal qualification framework.', relevance: 'Separates real pipeline from hope.' },
      { term: 'VBC', full: 'Value-based care', definition: 'Payment tied to outcomes and total cost rather than volume.', relevance: 'Risk contracts create budget for care-team productivity.' },
    ],
    decisions: [
      { topic: 'Segment', question: 'Lead with providers or payers?', call: 'Providers first; reach payers through the providers they fund.', why: 'Shorter cycles and the workflow owner is the buyer.', confidence: 'Medium-high', effect: 'Provider-first lens is the default view.', status: 'Open', mine: '' },
      { topic: 'Pipeline', question: 'Use investor introductions as the first pipeline?', call: 'No — cap at about a quarter of early pipeline and report separately.', why: 'Warm wins do not prove open-market demand.', confidence: 'High', effect: '“Independent demand” lens added.', status: 'Open', mine: '' },
      { topic: 'Pricing', question: 'Plan at the low or high price?', call: 'Plan at $2,400 per user; the higher price must be earned.', why: 'Time savings alone support ~$1,500 at a 3× return.', confidence: 'Medium-low', effect: 'Planning price set to $2,400.', status: 'Open', mine: '' },
    ],
    custom: [],
  };
})();
