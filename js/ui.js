import { icon } from './icons.js';
import { selectedFinanceMonth, selectFinanceMonth, monthKey, addMonths } from './store.js';
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function monthLabel(ym, short = false) {
  return new Intl.DateTimeFormat('pt-BR', { month: short ? 'short' : 'long', year: 'numeric' }).format(new Date(ym + '-15T12:00:00'));
}
export function monthPicker() {
  const ym = selectedFinanceMonth();
  return `<div class="month-picker" aria-label="Navegação por mês">
    <button class="icon-button" data-month-shift="-1" aria-label="Mês anterior">${icon.back()}</button>
    <label><span class="hint">Mês de referência</span><input type="month" id="finance-month" aria-label="Mês de referência" value="${ym}"></label>
    ${ym !== monthKey() ? '<button class="btn-ghost" id="month-today">Atual</button>' : ''}
    <button class="icon-button" data-month-shift="1" aria-label="Próximo mês">${icon.chevronRight()}</button>
  </div>`;
}
export function bindMonthPicker(container, render) {
  container.querySelectorAll('[data-month-shift]').forEach(el => el.addEventListener('click', () => {
    selectFinanceMonth(addMonths(selectedFinanceMonth(), Number(el.dataset.monthShift))); render();
  }));
  container.querySelector('#finance-month')?.addEventListener('change', ev => { selectFinanceMonth(ev.target.value); render(); });
  container.querySelector('#month-today')?.addEventListener('click', () => { selectFinanceMonth(monthKey()); render(); });
}
export function financeHeading(title, description) {
  return `<div class="page-heading"><div><div class="eyebrow">Seu dinheiro, com direção</div><h1>${title}</h1>${description ? `<p class="page-description">${description}</p>` : ''}</div><a class="icon-button" href="#/financeiro" aria-label="Voltar ao financeiro">${icon.back()}</a></div>`;
}
export function defaultFinanceDate() {
  const ym = selectedFinanceMonth();
  return ym === monthKey() ? `${ym}-${String(new Date().getDate()).padStart(2,'0')}` : `${ym}-01`;
}
export function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role','status');
  el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 3500);
}
