import { financeHeading, defaultFinanceDate, toast } from '../ui.js';
import { addFinanceEntry, selectFinanceMonth, monthKey, todayISO } from '../store.js';

export function render() {
  return `${financeHeading('Nova receita', 'Planeje suas entradas e confirme quando o dinheiro chegar.')}
    <form id="income-form" class="card stack" style="gap:20px">
      <label class="field">Tipo de receita<select name="category"><option>Salário</option><option>13º salário · 1ª parcela</option><option>13º salário · 2ª parcela</option><option>13º salário · integral</option><option>Férias</option><option>Freelance</option><option>Outras receitas</option></select></label>
      <div class="form-grid"><label class="field">Valor líquido (R$)<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0,00" required></label>
      <label class="field">Data de recebimento<input name="date" type="date" value="${defaultFinanceDate()}" required></label></div>
      <label class="field">Descrição<input name="description" type="text" maxlength="120" placeholder="Ex.: salário da empresa"></label>
      <label class="field">Situação<select name="status"><option value="planned">A receber · previsto</option><option value="confirmed">Já recebi</option></select></label>
      <label class="recurring-option"><input type="checkbox" name="recurring"><span><strong>Recorrente nos próximos meses</strong><small>Repete mensalmente a partir desta data, como previsto. Deixe desmarcado para o 13º e receitas pontuais.</small></span></label>
      <p class="form-error" role="alert" id="income-error"></p>
      <button class="btn btn-primary" type="submit">Salvar receita</button>
      <a href="#/financeiro" class="btn-ghost" style="text-align:center">Cancelar</a>
    </form>`;
}
export function afterRender(container, { navigate }) {
  const form = container.querySelector('#income-form');
  const category = form.elements.category;
  category.addEventListener('change', () => {
    if (category.value.includes('13º')) form.elements.recurring.checked = false;
  });
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      if (data.status === 'confirmed' && data.date > todayISO()) throw new Error('Uma receita futura deve ficar como prevista.');
      addFinanceEntry({ type: 'income', amount: Number(data.amount), date: data.date, category: data.category,
        description: data.description.trim() || data.category, status: data.status,
        recurring: data.recurring === 'on' });
      selectFinanceMonth(data.date.slice(0,7)); navigate('/financeiro'); toast('Receita salva.');
    } catch (err) { container.querySelector('#income-error').textContent = err.message; }
  });
}
