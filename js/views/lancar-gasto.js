import { icon } from '../icons.js';
import { formatMoney } from '../store.js';

const CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'];

export function render(state) {
  return `
    <div class="row" style="gap:12px;justify-content:flex-start;">
      <a href="#/financeiro" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:18px;font-weight:700;">Lançar gasto</div>
    </div>

    <div>
      <div class="section-label">Valor (R$)</div>
      <input type="number" data-field="amount" id="lg-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" style="font-size:22px;font-family:'Space Grotesk',sans-serif;font-weight:700;text-align:center;padding:16px;">
    </div>

    <div>
      <div class="section-label">Categoria</div>
      <select data-field="category" id="lg-category">
        ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>

    <div>
      <div class="section-label">Forma de pagamento</div>
      <select data-field="method" id="lg-method">
        <option value="pix">Pix</option>
        <option value="dinheiro">Dinheiro</option>
        ${state.finance.cards.map((c) => `<option value="${c.id}">Cartão · ${c.name}</option>`).join('')}
      </select>
    </div>

    <div id="lg-installments-box" class="card hidden-box">
      <div class="section-label">Em quantas vezes?</div>
      <input type="number" data-field="installments" id="lg-installments" min="1" max="24" value="1" style="margin-bottom:8px;">
      <div class="muted" id="lg-preview" style="font-size:12px;"></div>
    </div>

    <div>
      <div class="section-label">Descrição (opcional)</div>
      <input type="text" data-field="desc" placeholder="Ex: tênis de treino">
    </div>

    <button data-action="salvarGasto" class="btn btn-primary">Salvar lançamento</button>
  `;
}

export function afterRender(container) {
  const methodSel = container.querySelector('#lg-method');
  const box = container.querySelector('#lg-installments-box');
  const installmentsInput = container.querySelector('#lg-installments');
  const amountInput = container.querySelector('#lg-amount');
  const preview = container.querySelector('#lg-preview');

  function isCard() {
    return methodSel.value !== 'pix' && methodSel.value !== 'dinheiro';
  }
  function updatePreview() {
    if (!isCard()) { box.classList.add('hidden-box'); return; }
    box.classList.remove('hidden-box');
    const amount = parseFloat(amountInput.value || '0');
    const n = Math.max(parseInt(installmentsInput.value || '1', 10), 1);
    preview.textContent = amount > 0
      ? `${n}× de ${formatMoney(amount / n)} — entra nas próximas ${n} faturas`
      : '';
  }

  methodSel.addEventListener('change', updatePreview);
  installmentsInput.addEventListener('input', updatePreview);
  amountInput.addEventListener('input', updatePreview);
  updatePreview();
}
