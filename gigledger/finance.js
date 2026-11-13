/* Pure monetary calculations used by the dashboard, reports and tests.
   All values are integer cents. No currency conversion is performed. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GigFinance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const integer = n => Number.isSafeInteger(n) ? n : 0;
  const sum = (xs, fn) => (xs || []).reduce((acc, x) => acc + integer(fn(x)), 0);
  const money = value => {
    if (value === '' || value === null || value === undefined) return 0;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1000000000) throw new Error('Enter a valid non-negative amount.');
    return Math.round((n + Number.EPSILON) * 100);
  };
  const dollars = cents => (integer(cents) / 100).toFixed(2);
  function totals(gig) {
    const fee = integer(gig.feeCents);
    const allocation = integer(gig.selfFeeCents);
    const received = sum(gig.receipts, p => p.amountCents);
    const receivedDirectly = sum((gig.receipts || []).filter(p => p.destination === 'self'), p => p.amountCents);
    const businessReceipts = received - receivedDirectly;
    const selfPayout = sum(gig.selfPayments, p => p.amountCents);
    const selfPaid = receivedDirectly + selfPayout;
    const crewFee = sum(gig.crew, c => c.feeCents);
    const crewPaid = sum(gig.crew, c => sum(c.payments, p => p.amountCents));
    const expenses = sum(gig.expenses, e => e.amountCents);
    const businessExpenses = sum((gig.expenses || []).filter(e => e.paidBy !== 'personal'), e => e.amountCents);
    return {
      fee, received, receivable: Math.max(fee - received, 0), overreceived: Math.max(received - fee, 0),
      allocation, selfPaid, selfPayout, selfOwed: Math.max(allocation - selfPaid, 0), selfOverpaid: Math.max(selfPaid - allocation, 0),
      crewFee, crewPaid, crewOwed: Math.max(crewFee - crewPaid, 0),
      expenses, businessExpenses,
      margin: fee - allocation - crewFee - expenses,
      cash: businessReceipts - selfPayout - crewPaid - businessExpenses
    };
  }
  function dashboard(gigs, currency, today) {
    const list = (gigs || []).filter(g => g.currency === currency && g.status !== 'cancelled');
    const keys = ['fee','received','receivable','allocation','selfPaid','selfOwed','crewFee','crewPaid','crewOwed','expenses','margin','cash'];
    const output = Object.fromEntries(keys.map(k => [k, 0]));
    list.forEach(g => { const t = totals(g); keys.forEach(k => { output[k] += t[k]; }); });
    output.gigs = list.length;
    output.overdue = list.filter(g => g.dueDate && g.dueDate < today && totals(g).receivable > 0).length;
    output.upcoming = list.filter(g => g.date >= today && g.status !== 'completed').sort((a,b) => a.date.localeCompare(b.date));
    return output;
  }
  function ledger(gigs) {
    const entries = [];
    (gigs || []).forEach(g => {
      const base = {gigId: g.id, gigTitle: g.title, currency: g.currency};
      (g.receipts || []).forEach(p => entries.push({...base, ...p, type: 'Client receipt', party: p.from || g.client, destination: p.destination || 'business'}));
      (g.selfPayments || []).forEach(p => entries.push({...base, ...p, type: 'Self payout', party: 'Self'}));
      (g.expenses || []).forEach(p => entries.push({...base, ...p, type: 'Expense', party: p.description, destination: p.paidBy || 'business'}));
      (g.crew || []).forEach(c => (c.payments || []).forEach(p => entries.push({...base, ...p, type: 'Crew payout', party: c.name})));
    });
    return entries.sort((a,b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
  }
  return { money, dollars, totals, dashboard, ledger };
});