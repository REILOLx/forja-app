import * as store from '../store.js';
import { monthLabel } from '../ui.js';

export function renderAnalysis(ym) {
  const current = store.monthlyAnalysis(ym);
  const points = [-3,-2,-1,0,1,2].map(offset => {
    const month = store.addMonths(ym, offset);
    return { month, ...store.monthlyAnalysis(month) };
  });
  const width = 680, height = 250, left = 62, right = 20, top = 24, bottom = 40;
  const max = Math.max(...points.flatMap(p => [p.expenses, p.ceiling]), 100);
  const limit = Math.ceil(max / 500) * 500;
  const x = i => left + i * (width - left - right) / 5;
  const y = value => top + (1 - value / limit) * (height - top - bottom);
  const ceilingPath = points.map((p,i) => `${i ? 'L' : 'M'}${x(i)},${y(p.ceiling)}`).join(' ');
  const areaPath = `${points.map((p,i) => `${i ? 'L' : 'M'}${x(i)},${y(p.expenses)}`).join(' ')} L${x(5)},${y(0)} L${x(0)},${y(0)} Z`;
  const selected = 3;
  const sign = current.change > 0 ? '+' : '';
  const trend = current.changePct === null ? 'Sem base anterior para comparar.' :
    `Gastos ${current.change === 0 ? 'estáveis' : current.change > 0 ? 'em alta' : 'em queda'}: ${sign}${current.changePct.toLocaleString('pt-BR')}% frente ao mês anterior (${sign}${store.formatMoney(current.change)}).`;
  const label = n => new Intl.NumberFormat('pt-BR', { notation:'compact', maximumFractionDigits:1 }).format(n);
  return `<section class="card finance-section" aria-label="Análise mês a mês">
    <div class="row gap-10"><div><h2>Seu ritmo financeiro</h2><p class="page-description">Gastos por mês e teto de 80% das receitas.</p></div><span class="pill ${current.headroom < 0 ? 'pill-red' : 'pill-green'}">${current.spendingRatio === null ? 'Sem receitas' : `${current.spendingRatio.toLocaleString('pt-BR')}% da renda`}</span></div>
    <div class="chart-legend"><span><i class="legend-line"></i>Despesas, incluindo faturas</span><span><i class="legend-dashed"></i>Teto de 80%</span><span>Trechos pontilhados: meses futuros</span></div>
    <svg class="analysis-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="analysis-title analysis-desc">
      <title id="analysis-title">Despesas e teto de gastos entre ${monthLabel(points[0].month)} e ${monthLabel(points[5].month)}</title>
      <desc id="analysis-desc">${monthLabel(ym)}: despesas ${store.formatMoney(current.expenses)}, teto ${store.formatMoney(current.ceiling)}. ${trend} Os valores também estão disponíveis na tabela abaixo.</desc>
      <defs><linearGradient id="expense-area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#a3d9ac" stop-opacity=".14"/><stop offset="1" stop-color="#a3d9ac" stop-opacity="0"/></linearGradient></defs>
      ${[0,.5,1].map(n => `<line x1="${left}" x2="${width-right}" y1="${y(limit*n)}" y2="${y(limit*n)}" stroke="var(--border)" stroke-dasharray="3 5"/><text x="${left-12}" y="${y(limit*n)+4}" fill="var(--text-dim)" text-anchor="end" font-size="11">${label(limit*n)}</text>`).join('')}
      <path d="${areaPath}" fill="url(#expense-area)"/>
      <line x1="${x(selected)}" x2="${x(selected)}" y1="${top}" y2="${height-bottom+4}" stroke="var(--ember-border)"/>
      <path d="${ceilingPath}" stroke="#d6c897" stroke-width="2" stroke-dasharray="5 6" fill="none"/>
      ${points.slice(1).map((p,i) => `<path d="M${x(i)},${y(points[i].expenses)} L${x(i+1)},${y(p.expenses)}" stroke="var(--ember)" stroke-width="2.5" fill="none" ${p.month > store.monthKey() ? 'stroke-dasharray="4 5"' : ''}/>`).join('')}
      ${points.map((p,i) => `<circle cx="${x(i)}" cy="${y(p.expenses)}" r="${i===selected ? 5 : 3}" fill="var(--ember)" stroke="var(--surface)" stroke-width="2"/><text x="${x(i)}" y="${height-15}" fill="${i===selected?'var(--ember)':'var(--text-dim)'}" text-anchor="middle" font-size="11">${monthLabel(p.month,true).replace(' de ','/')}</text>`).join('')}
    </svg>
    <p class="hint">${trend} ${ym > store.monthKey() ? 'Comparação entre valores previstos.' : 'Inclui compromissos previstos do mês.'}</p>
    <details class="details-panel"><summary>Ver valores mês a mês</summary><div style="overflow-x:auto"><table class="analysis-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Teto 80%</th><th>Despesas</th></tr></thead><tbody>${points.map(p=>`<tr><td>${monthLabel(p.month,true)}${p.month>store.monthKey()?' · previsto':''}</td><td>${store.formatMoney(p.income)}</td><td>${store.formatMoney(p.ceiling)}</td><td>${store.formatMoney(p.expenses)}</td></tr>`).join('')}</tbody></table></div></details>
    <p class="hint">O teto usa as receitas recebidas e a receber cadastradas no mês. Aportes ficam separados das despesas. Faturas informadas substituem as parcelas estimadas; não são somadas novamente. Dados anteriores à atualização refletem os registros disponíveis.</p>
  </section>`;
}
