// Cálculos sem acesso à rede ou ao navegador. Valores monetários em centavos
// durante a soma para evitar diferenças de arredondamento.
export const money = n => Math.round(Number(n || 0) * 100) / 100;
export const sum = values => values.reduce((a, n) => a + Math.round(Number(n || 0) * 100), 0) / 100;
export function shiftMonth(ym, offset) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 7);
}
export function distance(start, end) {
  const [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return (ey - y) * 12 + em - m;
}
export function normalizeFinance(state, currentMonth) {
  const f = state.finance;
  f.entries ||= [];
  f.cardInvoices ||= {};
  f.entryOverrides ||= {};
  f.budgets ||= {};
  f.cashReconciliations ||= {};
  f.budgetBaseline ??= state.profile.budgetMensal;
  f.lisHistory ||= { [currentMonth]: { ...f.lis } };
  f.fixedBills.forEach(b => { b.startMonth ||= '1900-01'; b.versions ||= []; });
  f.cards.forEach(c => { c.startMonth ||= '1900-01'; });
  f.loans.forEach(l => {
    // O legado só guardava a quantidade paga. Preserva-a e ancora o cronograma
    // uma única vez; marcar pagamentos nunca desloca as parcelas futuras.
    l.startMonth ||= shiftMonth(currentMonth, -Math.max(0,
      l.paidInstallments - (f.monthlyPayments[currentMonth]?.['loan:' + l.id] ? 1 : 0)));
  });
  return state;
}
export function versionAt(item, ym) {
  return (item.versions || []).filter(v => v.month <= ym).sort((a,b) => a.month.localeCompare(b.month))
    .reduce((out, v) => ({ ...out, ...v }), { ...item });
}
export function billsAt(f, ym) {
  return f.fixedBills.filter(b => b.startMonth <= ym && (!b.endMonth || ym < b.endMonth))
    .map(b => versionAt(b, ym));
}
export function loanAt(loan, ym) {
  const idx = distance(loan.startMonth, ym);
  return idx >= 0 && idx < loan.installments ? loan.monthlyAmount : 0;
}
export function installmentAt(charge, ym) {
  const idx = distance(charge.startMonth, ym);
  if (idx < 0 || idx >= charge.installments) return 0;
  const total = Math.round(charge.totalAmount * 100);
  const base = Math.floor(total / charge.installments);
  return (base + (idx < total % charge.installments ? 1 : 0)) / 100;
}
export function entriesAt(f, ym) {
  return f.entries.filter(e => e.date.slice(0,7) === ym ||
    (e.recurring && e.date.slice(0,7) <= ym && (!e.endMonth || ym < e.endMonth)))
    .map(e => {
      const date = `${ym}-${String(Math.min(Number(e.date.slice(8)), new Date(Number(ym.slice(0,4)), Number(ym.slice(5)), 0).getDate())).padStart(2,'0')}`;
      const override = f.entryOverrides[`${e.id}:${ym}`] || {};
      return { ...e, status: e.date.slice(0,7) === ym ? e.status : 'planned', ...override, date };
    }).filter(e => !e.deleted);
}
export function lisAt(f, ym) {
  const key = Object.keys(f.lisHistory).filter(k => k <= ym).sort().pop();
  return key ? f.lisHistory[key] : { used: 0, limit: 0 };
}
export function budgetAt(state, ym) {
  const key = Object.keys(state.finance.budgets).filter(k => k <= ym).sort().pop();
  return key ? state.finance.budgets[key] : state.finance.budgetBaseline;
}
export function portfolioAt(f, ym, throughDate, { includePlanned = false } = {}) {
  const assets = new Map();
  const end = throughDate || `${ym}-31`;
  f.entries.map(e => ({ ...e, ...(f.entryOverrides[`${e.id}:${e.date.slice(0,7)}`] || {}) }))
    .filter(e => e.date <= end && !e.recurring && ['investment','redemption','yield','valuation'].includes(e.type))
    .sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .forEach(e => {
      const item = e;
      if (!(item.status === 'confirmed' || (includePlanned && item.status === 'planned')) || item.deleted) return;
      const asset = assets.get(e.asset) || { name: e.asset, balance: 0, category: e.category };
      asset.balance = money(e.type === 'valuation' ? item.amount : asset.balance + (e.type === 'redemption' ? -item.amount : item.amount));
      assets.set(e.asset, asset);
    });
  return [...assets.values()];
}
