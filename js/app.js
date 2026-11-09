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
import * as viewLogin from './views/login.js';
import * as viewReceita from './views/receita.js';
import * as viewInvestimentos from './views/investimentos.js';
import { toast } from './ui.js';
import { sb } from './supabase-client.js';
import { closeAddForm as closeRotinaAddForm } from './views/rotina.js';
import { closeForms as closeCartoesForms } from './views/cartoes.js';
import { closeForms as closeEmprestimosForms } from './views/emprestimos.js';
import { closeForms as closeFinanceiroForms } from './views/financeiro.js';

registerRoute('/financeiro/receita', viewReceita);
registerRoute('/financeiro/investimentos', viewInvestimentos);
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
  '/financeiro/lancar', '/financeiro/cartoes', '/financeiro/emprestimos', '/financeiro/receita', '/config',
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
    <a href="#${item.path}" aria-label="${item.label}" ${path === item.path || path.startsWith(item.path + '/') ? 'aria-current="page"' : ''} class="${(path === item.path || path.startsWith(item.path + '/')) ? 'active' : ''}">
      ${item.icon()}
      <span>${item.label}</span>
    </a>
  `).join('');
}

let authReady = false;
let currentSession = null;

function render() {
  if (!authReady) {
    viewEl.innerHTML = '<div class="muted" style="padding:60px 20px;text-align:center;">Carregando…</div>';
    navEl.innerHTML = '';
    return;
  }
  document.getElementById('sync-status').hidden = !currentSession || store.cloudSyncStatus() !== 'error';
  if (!currentSession) {
    document.getElementById('app-header').hidden = true;
    navEl.style.display = 'none';
    viewEl.innerHTML = viewLogin.render();
    navEl.innerHTML = '';
    if (viewLogin.afterRender) viewLogin.afterRender(viewEl, { navigate, render });
    return;
  }

  const path = currentPath();
  const mod = resolveRoute(path);
  document.getElementById('app-header').hidden = false;
  const previousPath = viewEl.dataset.path;
  const previousScroll = viewEl.scrollTop;
  viewEl.dataset.path = path;
  viewEl.innerHTML = mod.render(store.getState(), { navigate });
  viewEl.classList.remove('route-enter');
  void viewEl.offsetWidth;
  viewEl.classList.add('route-enter');
  viewEl.scrollTop = previousPath === path ? previousScroll : 0;
  renderNav(path);
  if (mod.afterRender) mod.afterRender(viewEl, { navigate, render });
  viewEl.querySelectorAll('button, a').forEach(el => {
    if (el.getAttribute('aria-label') || el.textContent.trim()) return;
    const label = el.title || (el.dataset.action?.startsWith('remove') ? 'Remover registro' :
      el.dataset.action?.startsWith('toggle') ? 'Alternar conclusão' :
      el.dataset.toggleEditCard ? 'Editar cartão' : el.dataset.toggleEditLoan ? 'Editar empréstimo' :
      el.dataset.removeBook !== undefined ? 'Remover livro' : el.dataset.removeEx ? 'Remover exercício' :
      el.id.includes('prev') ? 'Anterior' : el.id.includes('next') ? 'Próximo' :
      el.id.includes('add') ? 'Adicionar' : el.id.includes('edit') || el.id.includes('lis') ? 'Editar' :
      el.tagName === 'A' ? 'Voltar' : 'Abrir opções');
    el.setAttribute('aria-label', label);
  });
  viewEl.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
    if (!el.labels?.length && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.placeholder);
  });
}

// ---------- central action dispatch (event delegation) ----------
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const handler = ACTIONS[action];
  if (!handler) return;
  ev.preventDefault();
  handler(el.dataset, el);
  render();
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
  toggleKR: (d) => store.toggleKeyResult(d.year, d.goal, d.kr),
  removeKR: (d) => store.removeKeyResult(d.year, d.goal, d.kr),
  toggleExercise: (d) => store.toggleExerciseDone(d.date, parseInt(d.idx, 10)),

  skipTaskToday: (d) => store.removeTaskOccurrence(d.taskId, d.date),
  deleteTaskRule: (d) => {
    if (d.recurrence === 'once') {
      if (window.confirm('Remover esta tarefa?')) store.deleteRoutineTask(d.taskId);
    } else if (window.confirm('Isso remove essa tarefa de TODOS os dias em que ela se repete, não só hoje. Continuar?')) {
      store.deleteRoutineTask(d.taskId);
    }
  },
  saveNewTask: (d) => {
    const f = fieldsIn(null, document);
    if (!f.title?.trim() || !f.start || !f.end) { toast('Preencha o título e os horários da tarefa.'); return; }
    if (f.end <= f.start) { toast('O término deve ser depois do início, no mesmo dia.'); return; }
    let days = [];
    if (f.recurrence === 'weekly') {
      days = Array.from(document.querySelectorAll('#add-task-days input:checked')).map((el) => parseInt(el.dataset.day, 10));
    }
    if (f.recurrence === 'weekly' && !days.length) { toast('Escolha pelo menos um dia da semana.'); return; }
    store.addRoutineTask({
      title: f.title, type: f.type, start: f.start, end: f.end,
      recurrence: f.recurrence, days, date: f.recurrence === 'once' ? d.date : null,
    });
    closeRotinaAddForm();
  },
  setFeeling: (d) => store.setWorkoutFeeling(d.date, d.feeling),
  completeWorkout: (d) => { store.completeWorkout(d.date); navigate('/treino'); },
  logReading: (d) => store.logReading(d.date, parseInt(d.minutes, 10)),
  togglePaid: (d) => { if (d.ym > store.monthKey()) { toast('Pagamentos futuros permanecem previstos.'); return; } store.togglePaid(d.ym, d.key); },
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

  salvarCompraParcelada: () => {
    const f = fieldsIn('#add-charge-box', document);
    if (!f.amount || f.amount <= 0) return;
    store.addCardCharge({
      cardId: f.cardId, desc: f.desc || 'Compra', totalAmount: f.amount,
      installments: Math.max(parseInt(f.installments || '1', 10), 1),
    });
    closeCartoesForms();
  },
  salvarCartao: () => {
    const f = fieldsIn('#add-card-box', document);
    if (!f.name || !f.limit) return;
    store.addCard({ name: f.name, limit: f.limit, dueDay: f.dueDay || 10 });
    closeCartoesForms();
  },
  removeCard: (d) => {
    if (window.confirm('Remover este cartão e todas as compras parceladas ligadas a ele?')) store.removeCard(d.id);
  },
  removeCardCharge: (d) => {
    if (window.confirm('Remover esta compra parcelada?')) store.removeCardCharge(d.id);
  },

  salvarEmprestimo: () => {
    const f = fieldsIn('#add-loan-box', document);
    if (!f.totalAmount || f.totalAmount <= 0 || !f.installments) return;
    store.addLoan({
      name: f.name || 'Empréstimo', bank: f.bank || '', totalAmount: f.totalAmount,
      installments: Math.max(parseInt(f.installments, 10), 1),
      startMonth: f.startMonth || store.selectedFinanceMonth(), monthlyAmount: f.monthlyAmount || undefined,
    });
    closeEmprestimosForms();
  },
  removeLoan: (d) => {
    if (window.confirm('Remover este empréstimo?')) store.removeLoan(d.id);
  },

  salvarContaFixa: () => {
    const f = fieldsIn(null, document);
    if (!f.name || !f.amount) return;
    store.addFixedBill({ name: f.name, amount: f.amount, dueDay: f.dueDay || 10 });
    closeFinanceiroForms();
  },
  removeFixedBill: (d) => {
    if (window.confirm('Encerrar esta conta fixa a partir do mês selecionado? Os meses anteriores serão preservados.')) store.removeFixedBill(d.id);
  },

  logout: () => { sb.auth.signOut(); },
};

// expose for inline change handlers used inside views (see lancar-gasto.js)
window.__forja = { store, render, navigate, sb };

onRouteChange(render);
window.addEventListener('forja:sync', () => { document.getElementById('sync-status').hidden = store.cloudSyncStatus() !== 'error'; });

// A busca de dados não pode ser aguardada dentro do callback de autenticação:
// o SDK ainda pode estar segurando o bloqueio de sessão nesse momento.
let authRevision = 0;
sb.auth.onAuthStateChange((_event, session) => {
  const revision = ++authRevision;
  const changedUser = currentSession?.user?.id !== session?.user?.id;
  currentSession = session;
  if (!session) {
    store.clearCloudUser(); authReady = true; render(); return;
  }
  if (authReady && !changedUser) return;
  authReady = false; render();
  setTimeout(async () => {
    try { await store.setCloudUser(session.user.id); }
    catch (error) { console.error('Não foi possível carregar os dados:', error); }
    finally { if (revision === authRevision) { authReady = true; render(); } }
  }, 0);
});
render();
