import { registerRoute, currentPath, resolveRoute, onRouteChange, navigate } from './router.js';
import * as store from './store.js';
import { icon } from './icons.js';

import * as viewHome from './views/home.js';
import * as viewRotina from './views/rotina.js';
import * as viewBloqueio from './views/bloqueio.js';
import * as viewTreino from './views/treino.js';
import * as viewVerificacao from './views/verificacao.js';
import * as viewMetas from './views/metas.js';
import * as viewEstudos from './views/estudos.js';
import * as viewFinanceiro from './views/financeiro.js';
import * as viewPagamentos from './views/pagamentos.js';
import * as viewLancarGasto from './views/lancar-gasto.js';
import * as viewCartoes from './views/cartoes.js';
import * as viewEmprestimos from './views/emprestimos.js';
import * as viewConfig from './views/config.js';

registerRoute('/home', viewHome);
registerRoute('/rotina', viewRotina);
registerRoute('/bloqueio', viewBloqueio);
registerRoute('/treino', viewTreino);
registerRoute('/treino/verificacao', viewVerificacao);
registerRoute('/metas', viewMetas);
registerRoute('/estudos', viewEstudos);
registerRoute('/financeiro', viewFinanceiro);
registerRoute('/financeiro/pagamentos', viewPagamentos);
registerRoute('/financeiro/lancar', viewLancarGasto);
registerRoute('/financeiro/cartoes', viewCartoes);
registerRoute('/financeiro/emprestimos', viewEmprestimos);
registerRoute('/config', viewConfig);

const NAV_ITEMS = [
  { path: '/home', label: 'Início', icon: icon.home },
  { path: '/rotina', label: 'Rotina', icon: icon.clock },
  { path: '/treino', label: 'Treino', icon: icon.dumbbell },
  { path: '/estudos', label: 'Estudos', icon: icon.book },
  { path: '/metas', label: 'Metas', icon: icon.target },
  { path: '/financeiro', label: 'Financeiro', icon: icon.wallet },
];

const NO_NAV_ROUTES = new Set([
  '/bloqueio', '/treino/verificacao', '/financeiro/pagamentos',
  '/financeiro/lancar', '/financeiro/cartoes', '/financeiro/emprestimos', '/config',
]);

const viewEl = document.getElementById('view');
const navEl = document.getElementById('navbar');

function renderNav(path) {
  if (NO_NAV_ROUTES.has(path)) {
    navEl.style.display = 'none';
    navEl.innerHTML = '';
    return;
  }
  navEl.style.display = '';
  navEl.innerHTML = NAV_ITEMS.map((item) => `
    <a href="#${item.path}" class="${path === item.path ? 'active' : ''}">
      ${item.icon()}
      <span>${item.label}</span>
    </a>
  `).join('');
}

function render() {
  const path = currentPath();
  const mod = resolveRoute(path);
  viewEl.innerHTML = mod.render(store.getState(), { navigate });
  viewEl.scrollTop = 0;
  renderNav(path);
  if (mod.afterRender) mod.afterRender(viewEl, { navigate, render });
}

// ---------- central action dispatch (event delegation) ----------
// Actions that only toggle a transient UI bit (an inline "add" form's
// visibility) manage the DOM themselves and must NOT be followed by a full
// re-render, which would just redraw the form back to its default (hidden) state.
const LOCAL_ONLY_ACTIONS = new Set(['toggleAddCharge', 'toggleAddLoan']);

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const handler = ACTIONS[action];
  if (!handler) return;
  ev.preventDefault();
  handler(el.dataset, el);
  if (!LOCAL_ONLY_ACTIONS.has(action)) render();
});

function fieldsIn(scopeEl, root = document) {
  const scope = scopeEl ? root.querySelector(scopeEl) : root;
  const out = {};
  scope.querySelectorAll('[data-field]').forEach((f) => {
    out[f.dataset.field] = f.type === 'number' ? parseFloat(f.value || '0') : f.value;
  });
  return out;
}

const ACTIONS = {
  toggleBlock: (d) => store.toggleBlockDone(d.date, d.id),
  toggleKR: (d) => store.toggleKeyResult(d.goal, d.kr),
  toggleExercise: (d) => store.toggleExerciseDone(d.date, parseInt(d.idx, 10)),
  setFeeling: (d) => store.setWorkoutFeeling(d.date, d.feeling),
  completeWorkout: (d) => { store.completeWorkout(d.date); navigate('/treino'); },
  logReading: (d) => store.logReading(d.date, parseInt(d.minutes, 10)),
  togglePaid: (d) => store.togglePaid(d.ym, d.key),
  navigate: (d) => navigate(d.path),

  emergencyAccess: (d) => {
    const reason = window.prompt('Por que você precisa de acesso agora? (isso vai quebrar sua sequência de hoje)');
    if (reason && reason.trim()) store.useEmergencyAccess(d.date, reason.trim());
  },

  salvarGasto: () => {
    const f = fieldsIn(null, document);
    const amount = f.amount || 0;
    if (!amount || amount <= 0) return;
    if (f.method === 'pix' || f.method === 'dinheiro') {
      store.addVariableExpense({ amount, category: f.category, method: f.method });
    } else {
      store.addCardCharge({
        cardId: f.method,
        desc: f.desc || f.category,
        totalAmount: amount,
        installments: Math.max(parseInt(f.installments || '1', 10), 1),
      });
    }
    navigate('/financeiro');
  },

  toggleAddCharge: (d, el) => {
    const box = document.getElementById('add-charge-box');
    if (box) box.classList.toggle('hidden-box');
  },
  salvarCompraParcelada: () => {
    const f = fieldsIn('#add-charge-box', document);
    if (!f.amount || f.amount <= 0) return;
    store.addCardCharge({
      cardId: f.cardId, desc: f.desc || 'Compra', totalAmount: f.amount,
      installments: Math.max(parseInt(f.installments || '1', 10), 1),
    });
  },

  toggleAddLoan: () => {
    const box = document.getElementById('add-loan-box');
    if (box) box.classList.toggle('hidden-box');
  },
  salvarEmprestimo: () => {
    const f = fieldsIn('#add-loan-box', document);
    if (!f.totalAmount || f.totalAmount <= 0 || !f.installments) return;
    store.addLoan({
      name: f.name || 'Empréstimo', bank: f.bank || '', totalAmount: f.totalAmount,
      installments: Math.max(parseInt(f.installments, 10), 1),
    });
  },
};

// expose for inline change handlers used inside views (see lancar-gasto.js)
window.__forja = { store, render, navigate };

onRouteChange(render);
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
