import { icon } from '../icons.js';
import { cardInvoiceForMonth, chargeRemainingInstallments, formatMoney, selectedFinanceMonth, monthsBetween, registeredCardInvoice, projectedCardInvoice } from '../store.js';

import { monthPicker, bindMonthPicker, monthLabel } from '../ui.js';

let editingCardId = null;
let showAddCard = false;
let showAddCharge = false;

export function render(state) {
  const f = state.finance;
  const ym = selectedFinanceMonth();

  return `
    <div class="row" style="gap:12px;justify-content:flex-start;">
      <a href="#/financeiro" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:18px;font-weight:700;">Cartões de crédito</div>
    </div>

    ${monthPicker()}
    ${f.cards.map((c) => {
      const invoice = cardInvoiceForMonth(c.id, ym);
      const manual = registeredCardInvoice(c.id, ym);
      const estimated = projectedCardInvoice(c.id, ym);
      const usedPct = Math.min(Math.round((invoice / c.limit) * 100), 100);
      const charges = f.cardCharges
        .map((ch) => ({ ...ch, remaining: chargeRemainingInstallments(ch, ym) }))
        .filter((ch) => ch.cardId === c.id && ch.remaining > 0 && ch.startMonth <= ym);
      const isEditing = editingCardId === c.id;
      return `
        <div class="card" style="padding:20px;">
          <div class="row" style="align-items:flex-start;margin-bottom:16px;">
            <span class="fjc" style="font-size:16px;font-weight:700;">${c.name}</span>
            <span class="row gap-8" style="width:auto;">
              <button data-toggle-edit-card="${c.id}" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.gear()}</button>
              <button data-action="removeCard" data-id="${c.id}" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.trash()}</button>
            </span>
          </div>

          ${isEditing ? `
            <div class="stack gap-8" style="margin-bottom:16px;">
              <input type="text" data-card-field="name" data-card-id="${c.id}" value="${c.name}" placeholder="Nome do cartão">
              <div class="row gap-8">
                <input type="number" data-card-field="limit" data-card-id="${c.id}" value="${c.limit}" placeholder="Limite" style="flex:1;">
                <input type="number" data-card-field="dueDay" data-card-id="${c.id}" value="${c.dueDay}" placeholder="Dia venc." style="flex:1;">
              </div>
            </div>
          ` : `
            <div class="fjc" style="font-size:26px;font-weight:700;margin-bottom:4px;">${formatMoney(invoice)}</div>
            <div class="muted" style="font-size:12px;margin-bottom:16px;">${manual ? 'Fatura informada' : 'Previsão por parcelas'} · ${monthLabel(ym, true)} · dia ${c.dueDay}</div>
            <div class="progress-track thin" style="margin-bottom:6px;"><div class="progress-fill" style="width:${usedPct}%;"></div></div>
            <div class="row" style="font-size:11.5px;color:var(--text-dim);">
              <span>${usedPct}% do limite usado</span>
              <span>limite ${formatMoney(c.limit)}</span>
            </div>
          `}

          <form class="invoice-form" data-invoice-form="${c.id}">
            <label class="field">Fatura total de ${monthLabel(ym)} (R$)<input type="number" name="amount" min="0" step="0.01" inputmode="decimal" placeholder="${estimated.toFixed(2)}" value="${manual ? manual.amount : ''}" required></label>
            <p class="hint">Informe o total da fatura, incluindo compras à vista, parcelas, taxas e ajustes. Esse total substitui a previsão de ${formatMoney(estimated)} neste mês.</p>
            <button class="btn btn-primary" type="submit">Salvar fatura do mês</button>
            ${manual ? `<button class="btn-link" type="button" data-clear-invoice="${c.id}">Usar previsão das parcelas novamente</button>` : ''}
          </form>
          ${charges.length ? `
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
              <div class="section-label">Compras parceladas em aberto</div>
              <div class="stack gap-8">
                ${charges.map((ch) => `
                  <div class="row">
                    <div class="stack">
                      <span style="font-size:13px;font-weight:600;">${ch.desc}</span>
                      <span class="muted" style="font-size:11px;">parcela ${ch.installments - ch.remaining + 1} de ${ch.installments}</span>
                    </div>
                    <span class="row gap-8" style="width:auto;">
                      <span class="fjc" style="font-size:13px;font-weight:700;">${formatMoney(ch.totalAmount / ch.installments)}</span>
                      <button data-action="removeCardCharge" data-id="${ch.id}" style="background:none;border:none;color:var(--text-dim-2);display:flex;width:14px;height:14px;">${icon.trash()}</button>
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}

    <div class="row gap-8">
      <button id="btn-toggle-add-card" class="btn-ghost" style="flex:1;">+ Novo cartão</button>
      <button id="btn-toggle-add-charge" class="btn-ghost" style="flex:1;">+ Compra parcelada</button>
    </div>

    ${showAddCard ? `
      <div class="card stack gap-8" id="add-card-box">
        <div class="section-label" style="margin:0;">Novo cartão</div>
        <input type="text" data-field="name" placeholder="Nome (ex: Nubank)">
        <div class="row gap-8">
          <input type="number" data-field="limit" placeholder="Limite (R$)" style="flex:1;">
          <input type="number" data-field="dueDay" placeholder="Dia de vencimento" style="flex:1;">
        </div>
        <button data-action="salvarCartao" class="btn btn-primary">Salvar cartão</button>
      </div>
    ` : ''}

    ${showAddCharge ? `
      <div class="card stack gap-8" id="add-charge-box">
        <div class="section-label" style="margin:0;">Nova compra parcelada</div><p class="hint">A primeira parcela entra no mês selecionado acima.</p>
        <select data-field="cardId">
          ${monthPicker()}
    ${f.cards.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <input type="text" data-field="desc" placeholder="Descrição (ex: tênis)">
        <input type="number" data-field="amount" step="0.01" min="0" placeholder="Valor total (R$)">
        <input type="number" data-field="installments" min="1" max="24" value="1" placeholder="Em quantas vezes">
        <button data-action="salvarCompraParcelada" class="btn btn-primary">Salvar compra</button>
      </div>
    ` : ''}
  `;
}

export function afterRender(container, { render }) {
  bindMonthPicker(container, render);
  container.querySelectorAll('[data-invoice-form]').forEach(form => form.addEventListener('submit', ev => {
    ev.preventDefault();
    window.__forja.store.setCardInvoice(form.dataset.invoiceForm, selectedFinanceMonth(), Number(form.elements.amount.value)); render();
  }));
  container.querySelectorAll('[data-clear-invoice]').forEach(button => button.addEventListener('click', () => {
    window.__forja.store.clearCardInvoice(button.dataset.clearInvoice, selectedFinanceMonth()); render();
  }));
  const store = window.__forja.store;

  container.querySelectorAll('[data-toggle-edit-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleEditCard;
      editingCardId = editingCardId === id ? null : id;
      render();
    });
  });

  container.querySelectorAll('[data-card-field]').forEach((input) => {
    input.addEventListener('change', () => {
      const val = input.type === 'number' ? parseFloat(input.value || '0') : input.value;
      store.updateCard(input.dataset.cardId, { [input.dataset.cardField]: val });
      render();
    });
  });

  const addCardBtn = container.querySelector('#btn-toggle-add-card');
  if (addCardBtn) addCardBtn.addEventListener('click', () => { showAddCard = !showAddCard; showAddCharge = false; render(); });
  const addChargeBtn = container.querySelector('#btn-toggle-add-charge');
  if (addChargeBtn) addChargeBtn.addEventListener('click', () => { showAddCharge = !showAddCharge; showAddCard = false; render(); });
}

export function closeForms() {
  showAddCard = false;
  showAddCharge = false;
}
