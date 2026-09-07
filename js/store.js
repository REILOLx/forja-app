// ---------- date helpers ----------
export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d);
}
export function monthsBetween(ymStart, ymEnd) {
  const [y1, m1] = ymStart.split('-').map(Number);
  const [y2, m2] = ymEnd.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}
export function formatMoney(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function weekdayLabel(idx) {
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][idx];
}
export function formatDateLong(d = new Date()) {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function formatHM(minutesTotal) {
  const h = Math.floor(minutesTotal / 60);
  const m = Math.round(minutesTotal % 60);
  if (h <= 0) return `${m}min`;
  return `${h}h ${m}min`;
}
function dowOf(dateISO) {
  return new Date(dateISO + 'T12:00:00').getDay();
}
function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const STORAGE_KEY = 'forja:v2';

function seedState() {
  const thisMonth = monthKey();
  const thisYear = String(new Date().getFullYear());

  return {
    version: 2,
    profile: { budgetMensal: 3000 },

    goalsByYear: {
      [thisYear]: [
        {
          id: 'corpo', title: 'Corpo', color: 'ember',
          keyResults: [
            { id: 'kr1', title: 'Faixa roxa no jiu-jitsu', done: false },
            { id: 'kr2', title: 'Agachar com 100kg × 5', done: false },
            { id: 'kr3', title: '90% de adesão nos treinos do ano', done: false },
          ],
        },
        {
          id: 'mente', title: 'Mente', color: 'cyan',
          keyResults: [
            { id: 'kr4', title: 'Concluir curso de inglês avançado', done: false },
            { id: 'kr5', title: 'Ler 24 livros no ano', done: false },
            { id: 'kr6', title: 'Reduzir tempo de redes para <30min/dia', done: false },
          ],
        },
        {
          id: 'carreira', title: 'Carreira', color: 'green',
          keyResults: [
            { id: 'kr7', title: 'Lançar projeto pessoal', done: false },
            { id: 'kr8', title: 'Certificação técnica', done: false },
          ],
        },
      ],
    },

    // Tarefas recorrentes (estilo agenda): cada uma tem uma regra de repetição.
    // recurrence: 'daily' | 'weekly' (usa days:[0-6]) | 'once' (usa date:'YYYY-MM-DD')
    routineTasks: [
      { id: 't01', title: 'Acordar + água + luz solar', type: 'rotina', start: '05:30', end: '05:45', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },
      { id: 't02', title: 'Trabalho focado', type: 'foco', start: '08:00', end: '12:00', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },
      { id: 't03', title: 'Almoço + pausa', type: 'rotina', start: '12:00', end: '13:00', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },
      { id: 't04', title: 'Trabalho focado', type: 'foco', start: '13:00', end: '18:00', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },
      { id: 't05', title: 'Jantar', type: 'rotina', start: '20:00', end: '20:30', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },
      { id: 't06', title: 'Journaling + dormir', type: 'rotina', start: '23:00', end: '23:15', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },

      { id: 't07', title: 'Treino', type: 'treino', start: '06:00', end: '07:00', recurrence: 'weekly', days: [1, 2] },
      { id: 't08', title: 'Leitura / Estudo dirigido', type: 'estudo', start: '20:30', end: '21:30', recurrence: 'weekly', days: [1, 2] },
      { id: 't09', title: 'Janela livre — redes sociais', type: 'livre', start: '21:30', end: '22:30', recurrence: 'weekly', days: [1, 2] },

      { id: 't10', title: 'Jiu-jitsu — treino técnico', type: 'treino', start: '18:30', end: '20:00', recurrence: 'weekly', days: [3, 5] },
      { id: 't11', title: 'Leitura / Estudo dirigido', type: 'estudo', start: '20:30', end: '21:30', recurrence: 'weekly', days: [3, 5] },
      { id: 't12', title: 'Janela livre — redes sociais', type: 'livre', start: '21:30', end: '22:30', recurrence: 'weekly', days: [3, 5] },

      { id: 't13', title: 'Leitura / Estudo dirigido', type: 'estudo', start: '20:30', end: '21:00', recurrence: 'weekly', days: [4] },
      { id: 't14', title: 'Janela livre — redes sociais', type: 'livre', start: '21:00', end: '22:30', recurrence: 'weekly', days: [4] },

      { id: 't15', title: 'Acordar + água', type: 'rotina', start: '07:30', end: '07:45', recurrence: 'weekly', days: [6] },
      { id: 't16', title: 'Treino', type: 'treino', start: '08:00', end: '09:00', recurrence: 'weekly', days: [6] },
      { id: 't17', title: 'Janela livre — redes sociais', type: 'livre', start: '10:00', end: '22:00', recurrence: 'weekly', days: [6] },

      { id: 't18', title: 'Descanso — sem cobrança', type: 'rotina', start: '09:00', end: '10:00', recurrence: 'weekly', days: [0] },
      { id: 't19', title: 'Revisão semanal', type: 'estudo', start: '19:00', end: '20:00', recurrence: 'weekly', days: [0] },
      { id: 't20', title: 'Janela livre — redes sociais', type: 'livre', start: '20:00', end: '22:30', recurrence: 'weekly', days: [0] },
    ],
    taskExceptions: {}, // { 'YYYY-MM-DD': { taskId: true } } — remove uma ocorrência sem apagar a regra

    lockApps: [
      { id: 'ig', name: 'Instagram', blocked: true },
      { id: 'tiktok', name: 'TikTok', blocked: true },
      { id: 'x', name: 'X / Twitter', blocked: true },
      { id: 'yt', name: 'YouTube', blocked: false },
    ],

    // Plano de treino por dia da semana (0=domingo ... 6=sábado). null = dia de descanso ("off").
    workoutPlans: {
      0: null,
      1: { name: 'Full Body A', exercises: [
        { name: 'Agachamento livre', sets: '4×8' },
        { name: 'Puxada frente', sets: '4×10' },
        { name: 'Levantamento terra romeno', sets: '3×10' },
        { name: 'Desenvolvimento halteres', sets: '3×10' },
        { name: 'Prancha', sets: '3×45s' },
      ]},
      2: { name: 'Full Body B', exercises: [
        { name: 'Agachamento livre', sets: '4×8' },
        { name: 'Supino reto', sets: '4×8' },
        { name: 'Remada curvada', sets: '4×10' },
        { name: 'Desenvolvimento militar', sets: '3×10' },
        { name: 'Levantamento terra romeno', sets: '3×10' },
        { name: 'Prancha', sets: '3×45s' },
      ]},
      3: null,
      4: null,
      5: null,
      6: { name: 'Full Body C', exercises: [
        { name: 'Levantamento terra', sets: '4×6' },
        { name: 'Elevação pélvica', sets: '4×10' },
        { name: 'Desenvolvimento militar', sets: '3×10' },
        { name: 'Face pull', sets: '3×12' },
        { name: 'Prancha lateral', sets: '3×30s' },
      ]},
    },
    workoutLog: {}, // { 'YYYY-MM-DD': { exercisesDone: [idx,...], feeling, note, completed: bool } }

    studyTrack: { title: 'Inglês avançado', module: 6, totalModules: 8, nextTopic: 'Conversação técnica' },
    currentBook: { title: 'Hábitos Atômicos', author: 'James Clear', pageCurrent: 112, pageTotal: 254 },
    bookQueue: [{ title: 'Foco Total — Cal Newport' }, { title: 'O Corpo Guarda as Marcas' }],
    dailyReadingGoalMin: 20,
    readingLog: {}, // { 'YYYY-MM-DD': minutes }

    completionLog: {}, // { 'YYYY-MM-DD': { taskId: true } }
    emergencyLog: {}, // { 'YYYY-MM-DD': { reason, at } }

    finance: {
      fixedBills: [
        { id: 'aluguel', name: 'Aluguel', amount: 1200, dueDay: 5 },
        { id: 'internet', name: 'Internet', amount: 120, dueDay: 8 },
        { id: 'academia', name: 'Academia / jiu-jitsu', amount: 220, dueDay: 15 },
      ],
      cards: [
        { id: 'nubank', name: 'Nubank', limit: 4000, dueDay: 10 },
        { id: 'inter', name: 'Inter', limit: 2000, dueDay: 18 },
      ],
      cardCharges: [
        { id: 'c1', cardId: 'nubank', desc: 'Tênis de treino', totalAmount: 87.90, installments: 3, startMonth: addMonths(thisMonth, -1) },
        { id: 'c2', cardId: 'nubank', desc: 'Notebook — acessório', totalAmount: 899.00, installments: 10, startMonth: addMonths(thisMonth, -3) },
      ],
      loans: [
        { id: 'l1', name: 'Empréstimo pessoal', bank: 'Caixa Econômica', totalAmount: 6800, installments: 20, paidInstallments: 6, monthlyAmount: 340 },
        { id: 'l2', name: 'Financiamento moto', bank: 'Honda / banco parceiro', totalAmount: 13940, installments: 34, paidInstallments: 29, monthlyAmount: 410 },
      ],
      lis: { limit: 1500, used: 850 },
      variableSpend: {}, // { 'YYYY-MM': [{id, date, amount, category, method:'pix'|'dinheiro'}] }
      monthlyPayments: {}, // { 'YYYY-MM': { [key]: true } }
    },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupt storage, fall through to seed */ }
  const fresh = seedState();
  persist(fresh);
  return fresh;
}

function persist(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getState() {
  return state;
}

export function save() {
  persist(state);
}

export function resetApp() {
  state = seedState();
  persist(state);
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

// Substitui todo o estado a partir de um backup — lança erro se o arquivo
// não parecer um backup do Forja, para não sobrescrever dados com lixo.
export function importData(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object' || !parsed.finance || !parsed.goalsByYear) {
    throw new Error('Arquivo não parece ser um backup válido do Forja.');
  }
  state = parsed;
  persist(state);
}

// ---------- rotina (tarefas recorrentes) ----------
export function tasksForDate(dateISO) {
  const dow = dowOf(dateISO);
  return state.routineTasks
    .filter((t) => {
      if (state.taskExceptions[dateISO] && state.taskExceptions[dateISO][t.id]) return false;
      if (t.recurrence === 'once') return t.date === dateISO;
      if (t.recurrence === 'daily') return true;
      if (t.recurrence === 'weekly') return (t.days || []).includes(dow);
      return false;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function todaysBlocks(d = new Date()) {
  return tasksForDate(todayISO(d));
}

export function addRoutineTask({ title, type, start, end, recurrence, days, date }) {
  const task = {
    id: uid('task'), title, type, start, end, recurrence,
    days: recurrence === 'weekly' ? (days || []) : [],
    date: recurrence === 'once' ? date : null,
  };
  state.routineTasks.push(task);
  save();
  return task.id;
}

export function updateRoutineTask(id, patch) {
  const t = state.routineTasks.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  save();
}

// Remove só a ocorrência deste dia, mantendo a regra recorrente intacta.
export function removeTaskOccurrence(taskId, dateISO) {
  if (!state.taskExceptions[dateISO]) state.taskExceptions[dateISO] = {};
  state.taskExceptions[dateISO][taskId] = true;
  save();
}

// Apaga a tarefa/regra inteira (todas as ocorrências, passadas e futuras).
export function deleteRoutineTask(taskId) {
  state.routineTasks = state.routineTasks.filter((t) => t.id !== taskId);
  save();
}

export function weekdayHasTreino(dow) {
  return state.routineTasks.some((t) => t.type === 'treino'
    && ((t.recurrence === 'weekly' && (t.days || []).includes(dow)) || t.recurrence === 'daily'));
}

export function isBlockDone(dateISO, blockId) {
  return !!(state.completionLog[dateISO] && state.completionLog[dateISO][blockId]);
}

export function toggleBlockDone(dateISO, blockId) {
  if (!state.completionLog[dateISO]) state.completionLog[dateISO] = {};
  state.completionLog[dateISO][blockId] = !state.completionLog[dateISO][blockId];
  save();
}

export function dayProgress(dateISO, d = new Date()) {
  const blocks = todaysBlocks(d).filter((b) => b.type !== 'livre');
  const total = blocks.length;
  const done = blocks.filter((b) => isBlockDone(dateISO, b.id)).length;
  return { done, total, pct: total ? done / total : 0 };
}

export function requiredBlocksTypes() {
  return ['foco', 'treino', 'estudo'];
}

export function emergencyUsedToday(dateISO) {
  return !!(state.emergencyLog && state.emergencyLog[dateISO]);
}

export function useEmergencyAccess(dateISO, reason) {
  if (!state.emergencyLog) state.emergencyLog = {};
  state.emergencyLog[dateISO] = { reason, at: new Date().toISOString() };
  save();
}

export function isDayFullyDone(dateISO, d = new Date()) {
  if (emergencyUsedToday(dateISO)) return false; // acesso de emergência quebra a sequência do dia
  const required = todaysBlocks(d).filter((b) => requiredBlocksTypes().includes(b.type));
  if (required.length === 0) return true;
  return required.every((b) => isBlockDone(dateISO, b.id));
}

export function currentStreak(d = new Date()) {
  let streak = 0;
  const cursor = new Date(d);
  if (!isDayFullyDone(todayISO(cursor), cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 400; i++) {
    const iso = todayISO(cursor);
    if (isDayFullyDone(iso, cursor)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function isFreeWindowNow(d = new Date()) {
  const hhmm = d.toTimeString().slice(0, 5);
  return todaysBlocks(d).some((b) => b.type === 'livre' && hhmm >= b.start && hhmm <= b.end);
}

export function currentBlock(d = new Date()) {
  const hhmm = d.toTimeString().slice(0, 5);
  return todaysBlocks(d).find((b) => hhmm >= b.start && hhmm <= b.end) || null;
}

export function nextBlocks(n = 2, d = new Date()) {
  const hhmm = d.toTimeString().slice(0, 5);
  return todaysBlocks(d).filter((b) => b.start > hhmm).slice(0, n);
}

// Redes sociais só destravam durante uma janela livre E com os blocos
// obrigatórios do dia já concluídos — ver Regra 4 da documentação.
export function socialLockActive(d = new Date()) {
  const iso = todayISO(d);
  const unlocked = isFreeWindowNow(d) && isDayFullyDone(iso, d);
  return !unlocked;
}

// ---------- metas (por ano) ----------
function ensureYearGoals(year) {
  if (!state.goalsByYear[year]) {
    state.goalsByYear[year] = [
      { id: 'corpo', title: 'Corpo', color: 'ember', keyResults: [] },
      { id: 'mente', title: 'Mente', color: 'cyan', keyResults: [] },
      { id: 'carreira', title: 'Carreira', color: 'green', keyResults: [] },
    ];
    save();
  }
  return state.goalsByYear[year];
}

export function availableYears() {
  const now = new Date().getFullYear();
  const years = new Set();
  for (let y = now - 1; y <= now + 4; y++) years.add(String(y));
  Object.keys(state.goalsByYear).forEach((y) => years.add(y));
  return Array.from(years).sort();
}

export function getGoalsForYear(year) {
  return ensureYearGoals(year);
}

export function goalProgress(goal) {
  const total = goal.keyResults.length;
  const done = goal.keyResults.filter((k) => k.done).length;
  return total ? done / total : 0;
}

export function toggleKeyResult(year, goalId, krId) {
  const goal = ensureYearGoals(year).find((g) => g.id === goalId);
  const kr = goal.keyResults.find((k) => k.id === krId);
  kr.done = !kr.done;
  save();
}

export function addKeyResult(year, goalId, title) {
  const goal = ensureYearGoals(year).find((g) => g.id === goalId);
  goal.keyResults.push({ id: uid('kr'), title, done: false });
  save();
}

export function removeKeyResult(year, goalId, krId) {
  const goal = ensureYearGoals(year).find((g) => g.id === goalId);
  goal.keyResults = goal.keyResults.filter((k) => k.id !== krId);
  save();
}

// ---------- treino ----------
export function todaysWorkoutPlan(d = new Date()) {
  return state.workoutPlans[d.getDay()] || null;
}

export function setWorkoutPlanForDay(dow, plan) {
  state.workoutPlans[dow] = plan; // null = dia off
  save();
}

export function renameWorkoutPlan(dow, name) {
  if (state.workoutPlans[dow]) state.workoutPlans[dow].name = name;
  save();
}

export function addExerciseToPlan(dow, exercise) {
  if (!state.workoutPlans[dow]) state.workoutPlans[dow] = { name: 'Treino', exercises: [] };
  state.workoutPlans[dow].exercises.push(exercise);
  save();
}

export function updateExerciseInPlan(dow, idx, patch) {
  const plan = state.workoutPlans[dow];
  if (plan && plan.exercises[idx]) Object.assign(plan.exercises[idx], patch);
  save();
}

export function removeExerciseFromPlan(dow, idx) {
  const plan = state.workoutPlans[dow];
  if (plan) plan.exercises.splice(idx, 1);
  save();
}

export function toggleExerciseDone(dateISO, idx) {
  const log = state.workoutLog[dateISO] || (state.workoutLog[dateISO] = { exercisesDone: [] });
  const i = log.exercisesDone.indexOf(idx);
  if (i >= 0) log.exercisesDone.splice(i, 1); else log.exercisesDone.push(idx);
  save();
}

export function setWorkoutNote(dateISO, note) {
  const log = state.workoutLog[dateISO] || (state.workoutLog[dateISO] = { exercisesDone: [] });
  log.note = note;
  save();
}

export function setWorkoutFeeling(dateISO, feeling) {
  const log = state.workoutLog[dateISO] || (state.workoutLog[dateISO] = { exercisesDone: [] });
  log.feeling = feeling;
  save();
}

export function completeWorkout(dateISO) {
  const log = state.workoutLog[dateISO] || (state.workoutLog[dateISO] = { exercisesDone: [] });
  log.completed = true;
  save();
  const block = tasksForDate(dateISO).find((b) => b.type === 'treino');
  if (block && !isBlockDone(dateISO, block.id)) toggleBlockDone(dateISO, block.id);
}

export function weekWorkoutSummary(d = new Date()) {
  let planned = 0, done = 0;
  const cursor = new Date(d);
  cursor.setDate(cursor.getDate() - cursor.getDay()); // back to Sunday
  for (let i = 0; i < 7; i++) {
    const plan = state.workoutPlans[cursor.getDay()];
    if (plan) {
      planned++;
      const log = state.workoutLog[todayISO(cursor)];
      if (log && log.completed) done++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { planned, done };
}

export function weeksStreak(d = new Date()) {
  let weeks = 0;
  const cursor = new Date(d);
  cursor.setDate(cursor.getDate() - 7);
  for (let i = 0; i < 104; i++) {
    const { planned, done } = weekWorkoutSummary(cursor);
    const ok = planned === 0 || done / planned >= 0.8;
    if (!ok) break;
    weeks++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return weeks;
}

// ---------- estudos ----------
export function updateStudyTrack(patch) {
  Object.assign(state.studyTrack, patch);
  save();
}

export function updateCurrentBook(patch) {
  Object.assign(state.currentBook, patch);
  save();
}

export function setDailyReadingGoal(minutes) {
  state.dailyReadingGoalMin = minutes;
  save();
}

export function addBookToQueue(title) {
  state.bookQueue.push({ title });
  save();
}

export function removeBookFromQueue(idx) {
  state.bookQueue.splice(idx, 1);
  save();
}

export function startBookFromQueue(idx) {
  const next = state.bookQueue[idx];
  if (!next) return;
  state.currentBook = { title: next.title, author: next.author || '', pageCurrent: 0, pageTotal: next.pageTotal || 0 };
  state.bookQueue.splice(idx, 1);
  save();
}

export function logReading(dateISO, minutes) {
  state.readingLog[dateISO] = (state.readingLog[dateISO] || 0) + minutes;
  save();
  if (state.readingLog[dateISO] >= state.dailyReadingGoalMin) {
    const block = tasksForDate(dateISO).find((b) => b.type === 'estudo');
    if (block && !isBlockDone(dateISO, block.id)) toggleBlockDone(dateISO, block.id);
  }
}

// ---------- finance ----------
export function cardInvoiceForMonth(cardId, ym = monthKey()) {
  return state.finance.cardCharges
    .filter((c) => c.cardId === cardId)
    .reduce((sum, c) => {
      const monthly = c.totalAmount / c.installments;
      const idx = monthsBetween(c.startMonth, ym);
      if (idx >= 0 && idx < c.installments) return sum + monthly;
      return sum;
    }, 0);
}

export function chargeRemainingInstallments(charge, ym = monthKey()) {
  const idx = monthsBetween(charge.startMonth, ym);
  return Math.max(charge.installments - idx, 0);
}

export function addCardCharge({ cardId, desc, totalAmount, installments }) {
  state.finance.cardCharges.push({
    id: uid('charge'), cardId, desc, totalAmount, installments, startMonth: monthKey(),
  });
  save();
}

export function removeCardCharge(id) {
  state.finance.cardCharges = state.finance.cardCharges.filter((c) => c.id !== id);
  save();
}

export function addCard({ name, limit, dueDay }) {
  state.finance.cards.push({ id: uid('card'), name, limit, dueDay });
  save();
}

export function updateCard(id, patch) {
  const c = state.finance.cards.find((x) => x.id === id);
  if (c) Object.assign(c, patch);
  save();
}

export function removeCard(id) {
  state.finance.cards = state.finance.cards.filter((c) => c.id !== id);
  state.finance.cardCharges = state.finance.cardCharges.filter((c) => c.cardId !== id);
  save();
}

export function addLoan({ name, bank, totalAmount, installments, monthlyAmount }) {
  state.finance.loans.push({
    id: uid('loan'), name, bank, totalAmount, installments, paidInstallments: 0,
    monthlyAmount: monthlyAmount || Math.round((totalAmount / installments) * 100) / 100,
  });
  save();
}

export function updateLoan(id, patch) {
  const l = state.finance.loans.find((x) => x.id === id);
  if (l) Object.assign(l, patch);
  save();
}

export function removeLoan(id) {
  state.finance.loans = state.finance.loans.filter((l) => l.id !== id);
  save();
}

export function addFixedBill({ name, amount, dueDay }) {
  state.finance.fixedBills.push({ id: uid('bill'), name, amount, dueDay });
  save();
}

export function updateFixedBill(id, patch) {
  const b = state.finance.fixedBills.find((x) => x.id === id);
  if (b) Object.assign(b, patch);
  save();
}

export function removeFixedBill(id) {
  state.finance.fixedBills = state.finance.fixedBills.filter((b) => b.id !== id);
  save();
}

export function updateLis(patch) {
  Object.assign(state.finance.lis, patch);
  save();
}

export function updateBudget(amount) {
  state.profile.budgetMensal = amount;
  save();
}

export function addVariableExpense({ amount, category, method }) {
  const ym = monthKey();
  if (!state.finance.variableSpend[ym]) state.finance.variableSpend[ym] = [];
  state.finance.variableSpend[ym].push({
    id: uid('spend'), date: todayISO(), amount, category, method,
  });
  save();
}

export function variableSpendTotal(ym = monthKey()) {
  return (state.finance.variableSpend[ym] || []).reduce((s, t) => s + t.amount, 0);
}

export function activeLoanBalance(loan) {
  return Math.max(loan.installments - loan.paidInstallments, 0);
}

export function isPaid(ym, key) {
  return !!(state.finance.monthlyPayments[ym] && state.finance.monthlyPayments[ym][key]);
}

export function togglePaid(ym, key) {
  if (!state.finance.monthlyPayments[ym]) state.finance.monthlyPayments[ym] = {};
  const wasPaid = !!state.finance.monthlyPayments[ym][key];
  state.finance.monthlyPayments[ym][key] = !wasPaid;

  if (key.startsWith('loan:')) {
    const loanId = key.slice(5);
    const loan = state.finance.loans.find((l) => l.id === loanId);
    if (loan) {
      if (!wasPaid) loan.paidInstallments = Math.min(loan.paidInstallments + 1, loan.installments);
      else loan.paidInstallments = Math.max(loan.paidInstallments - 1, 0);
    }
  }
  save();
}

export function monthCommitted(ym = monthKey()) {
  const f = state.finance;
  const bills = f.fixedBills.reduce((s, b) => s + b.amount, 0);
  const cards = f.cards.reduce((s, c) => s + cardInvoiceForMonth(c.id, ym), 0);
  const loans = f.loans.filter((l) => activeLoanBalance(l) > 0).reduce((s, l) => s + l.monthlyAmount, 0);
  const lis = f.lis.used;
  const variable = variableSpendTotal(ym);
  return { bills, cards, loans, lis, variable, total: bills + cards + loans + lis + variable };
}

export function monthPercent(ym = monthKey()) {
  const committed = monthCommitted(ym).total;
  const budget = state.profile.budgetMensal || 1;
  return { committed, budget, pct: Math.round((committed / budget) * 1000) / 10 };
}
