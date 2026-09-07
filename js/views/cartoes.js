import { icon } from '../icons.js';
import { cardInvoiceForMonth, chargeRemainingInstallments, formatMoney } from '../store.js';

export function render(state) {
  const f = state.finance;

  return `
    <div class="row" style="gap:12px;justify-content:flex-start;">
      <a href="#/financeiro" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:18px;font-weight:700;">Cartões de crédito</div>
    </div>

    ${f.cards.map((c) => {
      const invoice = cardInvoiceForMonth(c.id);
      const usedPct = Math.min(Math.round((invoice / c.limit) * 100), 100);
      const charges = f.cardCharges
        .map((ch) => ({ ...ch, remaining: chargeRemainingInstallments(ch) }))
        .filter((ch) => ch.cardId === c.id && ch.remaining > 0);
      return `
        <div class="card" style="padding:20px;">
          <div class="row" style="align-items:flex-start;margin-bottom:22px;">
            <span class="fjc" style="font-size:16px;font-weight:700;">${c.name}</span>
            <span class="muted" style="font-size:11.5px;">vence dia ${c.dueDay}</span>
          </div>
          <div class="fjc" style="font-size:26px;font-weight:700;margin-bottom:4px;">${formatMoney(invoice)}</div>
          <div class="muted" style="font-size:12px;margin-bottom:16px;">fatura atual</div>
          <div class="progress-track thin" style="margin-bottom:6px;"><div class="progress-fill" style="width:${usedPct}%;"></div></div>
          <div class="row" style="font-size:11.5px;color:var(--text-dim);">
            <span>${usedPct}% do limite usado</span>
            <span>limite ${formatMoney(c.limit)}</span>
          </div>

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
                    <span class="fjc" style="font-size:13px;font-weight:700;">${formatMoney(ch.totalAmount / ch.installments)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}

    <button data-action="toggleAddCharge" class="btn-ghost">+ Lançar compra parcelada</button>

    <div id="add-charge-box" class="card hidden-box stack gap-8">
      <div class="section-label" style="margin-bottom:0;">Novo lançamento no cartão</div>
      <select data-field="cardId">
        ${f.cards.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <input type="text" data-field="desc" placeholder="Descrição (ex: tênis)">
      <input type="number" data-field="amount" step="0.01" min="0" placeholder="Valor total (R$)">
      <input type="number" data-field="installments" min="1" max="24" value="1" placeholder="Em quantas vezes">
      <button data-action="salvarCompraParcelada" class="btn btn-primary">Salvar compra</button>
    </div>
  `;
}
