import * as hub from './hub-model.js';
import { sb } from './supabase-client.js';
import { normalizeFinance, billsAt, loanAt, installmentAt, entriesAt, portfolioAt, lisAt, budgetAt, sum } from './finance-model.js';

// ---------- date helpers ----------
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthKey(d = new Date()) {
  return todayISO(d).slice(0, 7); // mês local, sem virar o dia às 21h
}
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
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

let state = hub.normalizeHub(normalizeFinance(load(), monthKey()));
persist(state);

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

let cloudUserId = null;
let cloudReady = false;
let syncStatus = 'local';
export function cloudSyncStatus() { return syncStatus; }
export function currentUserId() {return cloudUserId;}
let pushTimer = null;

// Chamado pelo app.js assim que o login resolve. Na primeira vez que este
// usuário loga, a nuvem ainda não tem linha nenhuma — nesse caso o que já
// está salvo localmente (mesmo que seja só a semente inicial) vira o ponto
// de partida e sobe para a nuvem. Da segunda vez em diante, a nuvem manda.
export async function setCloudUser(userId) {
  cloudUserId = userId;
  cloudReady = false;
  syncStatus = 'loading';
  if (!userId) return;
  const { data: row, error } = await sb.from('app_state').select('data').eq('user_id', userId).maybeSingle();
  if (error) { syncStatus = 'error'; throw error; }
  if (row && row.data) {
    const needsReadingMigration=!row.data.readingPlan;
    state = hub.normalizeHub(normalizeFinance(row.data, monthKey()));
    persist(state);
    cloudReady = true; syncStatus = 'ready';
    if(needsReadingMigration)await pushToCloudNow();
  } else {
    cloudReady = true; syncStatus = 'ready';
    await pushToCloudNow();
  }
}

export function clearCloudUser() {
  cloudUserId = null;
  cloudReady = false; syncStatus = 'local';
  clearTimeout(pushTimer);
}

async function pushToCloudNow() {
  if (!cloudUserId || !cloudReady) return;
  const { error } = await sb.from('app_state').upsert({
    user_id: cloudUserId, data: state, updated_at: new Date().toISOString(),
  });
  if (error) { syncStatus = 'error'; console.error('Supabase (salvar estado):', error.message); } else syncStatus = 'ready';
  window.dispatchEvent(new Event('forja:sync'));
}

function scheduleCloudPush() {
  if (!cloudUserId || !cloudReady) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloudNow, 800);
}

export function save() {
  persist(state);
  scheduleCloudPush();
}

export function resetApp() {
  state = hub.normalizeHub(normalizeFinance(seedState(), monthKey()));
  save();
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
  state = hub.normalizeHub(normalizeFinance(parsed, monthKey()));
  save();
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

function goalNotes(notes) {
  if(typeof notes !== 'string' || notes.length > 6000)throw new Error('As observações devem ter até 6.000 caracteres.');
  return notes.trim();
}

export function addKeyResult(year, goalId, title, notes = '') {
  const detail = goalNotes(notes);
  if(typeof title !== 'string' || !title.trim())throw new Error('Informe o título da meta.');
  const goal = ensureYearGoals(year).find((g) => g.id === goalId);
  if(!goal)throw new Error('Área da meta não encontrada.');
  goal.keyResults.push({ id: uid('kr'), title: title.trim(), notes: detail, done: false });
  save();
}

export function updateKeyResultNotes(year, goalId, krId, notes) {
  const detail = goalNotes(notes);
  const goal = state.goalsByYear[year]?.find(g => g.id === goalId);
  const result = goal?.keyResults.find(k => k.id === krId);
  if(!result)throw new Error('Meta não encontrada.');
  result.notes = detail;
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
  const legacy=state.studyCourses?.find(c=>c.legacyTrack);
  if(legacy)Object.assign(legacy,{title:state.studyTrack.title,module:state.studyTrack.module,totalModules:state.studyTrack.totalModules,nextTopic:state.studyTrack.nextTopic});
  save();
}

export function updateCurrentBook(patch) {
  Object.assign(state.currentBook, patch);
  save();
}

export function setDailyReadingGoal(minutes) {
  if(minutes!==state.readingPlan.dailyMinutes)throw new Error('A meta de leitura deste plano é de 20 minutos por dia.');
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

export function logReading() {throw new Error('Use o cronômetro para registrar a leitura de hoje.');}

// ---------- finance ----------
export function cardInvoiceForMonth(cardId, ym = monthKey()) {
  const invoice = state.finance.cardInvoices[`${cardId}:${ym}`];
  if (invoice) return invoice.amount;
  return projectedCardInvoice(cardId, ym);
}

export function chargeRemainingInstallments(charge, ym = monthKey()) {
  const idx = monthsBetween(charge.startMonth, ym);
  return Math.max(charge.installments - Math.max(idx, 0), 0);
}

export function addCardCharge({ cardId, desc, totalAmount, installments, startMonth = selectedFinanceMonth() }) {
  state.finance.cardCharges.push({
    id: uid('charge'), cardId, desc, totalAmount, installments, startMonth,
  });
  save();
}

export function removeCardCharge(id) {
  state.finance.cardCharges = state.finance.cardCharges.filter((c) => c.id !== id);
  save();
}

export function addCard({ name, limit, dueDay }) {
  state.finance.cards.push({ id: uid('card'), name, limit, dueDay, startMonth: selectedFinanceMonth() });
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

export function addLoan({ name, bank, totalAmount, installments, monthlyAmount, startMonth = selectedFinanceMonth() }) {
  state.finance.loans.push({
    id: uid('loan'), name, bank, totalAmount, installments, paidInstallments: 0, startMonth,
    monthlyAmount: monthlyAmount || Math.round((totalAmount / installments) * 100) / 100,
  });
  save();
}

export function updateLoan(id, patch) {
  const l = state.finance.loans.find((x) => x.id === id);
  if (l) {
    const { includedInNetSalary, ...fields } = patch;
    Object.assign(l, fields);
    if (includedInNetSalary !== undefined) {
      l.salaryDeductionHistory ||= [];
      const month = selectedFinanceMonth();
      l.salaryDeductionHistory = l.salaryDeductionHistory.filter(v => v.month !== month);
      l.salaryDeductionHistory.push({ month, value: !!includedInNetSalary });
    }
  }
  save();
}
export function loanDeductedFromNetSalary(loan, ym = selectedFinanceMonth()) {
  return (loan.salaryDeductionHistory || []).filter(v => v.month <= ym)
    .sort((a,b) => a.month.localeCompare(b.month)).at(-1)?.value || false;
}
export function loanProgress(loan, ym = selectedFinanceMonth()) {
  const automatic = loan.automaticProgress ?? /consignado|credito do trabalhador/.test(
    loan.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  const scheduled = Math.min(loan.installments, Math.max(0,monthsBetween(loan.startMonth,ym)+1));
  const confirmed = Math.min(loan.installments,Math.max(0,loan.paidInstallments));
  const completed = automatic ? scheduled : confirmed;
  return { automatic, completed, confirmed, remaining: Math.max(0,loan.installments-completed),
    ratio: loan.installments > 0 ? completed/loan.installments : 0 };
}
export function configureLoanSchedule(id, { startMonth, installments, monthlyAmount, provisionMonthly, automaticProgress }) {
  const loan = state.finance.loans.find(l => l.id === id);
  if (!loan || !/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) ||
      !Number.isInteger(installments) || installments < 1 || installments > 600 ||
      !Number.isFinite(monthlyAmount) || Math.round(monthlyAmount * 100) < 1 || typeof provisionMonthly !== 'boolean' ||
      (automaticProgress !== undefined && typeof automaticProgress !== 'boolean')) {
    throw new Error('Informe o mês inicial, a quantidade de parcelas e o valor mensal válidos.');
  }
  if ((startMonth !== loan.startMonth || installments !== loan.installments) &&
      Object.values(state.finance.monthlyPayments).some(payments => payments['loan:' + id])) {
    throw new Error('Há parcelas confirmadas neste contrato. Desfaça as confirmações antes de reprogramar o cronograma.');
  }
  loan.startMonth = startMonth;
  loan.installments = installments;
  loan.monthlyAmount = Math.round(monthlyAmount * 100) / 100;
  if (automaticProgress !== undefined) loan.automaticProgress = automaticProgress;
  // A escolha passa a valer na primeira parcela e substitui configurações
  // futuras do mesmo contrato, sem criar pagamentos confirmados.
  loan.salaryDeductionHistory = (loan.salaryDeductionHistory || []).filter(v => v.month < startMonth);
  loan.salaryDeductionHistory.push({ month: startMonth, value: !provisionMonthly });
  save();
}
export function loanSchedule(loan) {
  return Array.from({ length: loan.installments }, (_, index) => {
    const month = addMonths(loan.startMonth,index);
    return { month, number: index + 1, amount: loanAmountForMonth(loan,month),
      status: isPaid(month,'loan:' + loan.id) ? 'confirmed' : 'planned',
      inNetSalary: loanDeductedFromNetSalary(loan,month) };
  });
}

export function removeLoan(id) {
  state.finance.loans = state.finance.loans.filter((l) => l.id !== id);
  save();
}

export function addFixedBill({ name, amount, dueDay }) {
  state.finance.fixedBills.push({ id: uid('bill'), name, amount, dueDay, startMonth: selectedFinanceMonth(), versions: [] });
  save();
}

export function updateFixedBill(id, patch) {
  const b = state.finance.fixedBills.find((x) => x.id === id);
  if (b) {
    const month = selectedFinanceMonth();
    let v = b.versions.find(v => v.month === month);
    if (!v) { v = { month }; b.versions.push(v); }
    Object.assign(v, patch);
  }
  save();
}

export function removeFixedBill(id) {
  const bill = state.finance.fixedBills.find(b => b.id === id);
  if (bill) bill.endMonth = selectedFinanceMonth();
  save();
}

export function updateLis(patch) {
  const ym = selectedFinanceMonth();
  state.finance.lisHistory[ym] = { ...lisAt(state.finance, ym), ...patch };
  if (ym === monthKey()) Object.assign(state.finance.lis, patch);
  save();
}

export function updateBudget(amount) {
  state.finance.budgets[selectedFinanceMonth()] = Math.max(0, amount);
  if (selectedFinanceMonth() === monthKey()) state.profile.budgetMensal = amount;
  save();
}

export function addVariableExpense({ amount, category, method, date = todayISO(), desc = '' }) {
  const ym = date.slice(0, 7);
  if (!state.finance.variableSpend[ym]) state.finance.variableSpend[ym] = [];
  state.finance.variableSpend[ym].push({
    id: uid('spend'), date, amount, category, method, desc,
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
  if (key.startsWith('loan:')) {
    const loan = state.finance.loans.find(l => l.id === key.slice(5));
    if (!loan || loanAt(loan,ym) <= 0) throw new Error('Não existe parcela deste empréstimo neste mês.');
    if (ym > monthKey()) throw new Error('A parcela futura permanece prevista até o mês da cobrança.');
  }
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
  const bills = sum(billsAt(f, ym).map(b => b.amount));
  const cards = sum(f.cards.map(c => cardInvoiceForMonth(c.id, ym)));
  const loans = sum(f.loans.filter(l => !loanDeductedFromNetSalary(l, ym)).map(l => loanAt(l, ym)));
  const payrollLoans = sum(f.loans.filter(l => loanDeductedFromNetSalary(l, ym)).map(l => loanAt(l, ym)));
  const lis = lisAt(f, ym).used;
  const entries = entriesAt(f, ym);
  const variable = sum([variableSpendTotal(ym), ...entries.filter(e => e.type === 'expense').map(e => e.amount)]);
  return { bills, cards, loans, payrollLoans, lis, variable, total: sum([bills, cards, loans, lis, variable]) };
}

// Detalhamento de leitura: usa as mesmas ocorrências e faturas do resumo mensal.
export function expenseBreakdown(ym = selectedFinanceMonth()) {
  const f=state.finance,paid=key=>isPaid(ym,key)?'Pago':'Previsto';
  const groups=[
    {id:'bills',label:'Contas fixas',items:billsAt(f,ym).map(b=>({id:'bill:'+b.id,label:b.name,amount:b.amount,status:paid('bill:'+b.id),detail:'Vence dia '+b.dueDay}))},
    {id:'cards',label:'Faturas de cartão',items:f.cards.map(c=>{
      const invoice=registeredCardInvoice(c.id,ym),amount=cardInvoiceForMonth(c.id,ym);
      const installments=invoice?[]:f.cardCharges.filter(charge=>charge.cardId===c.id).map(charge=>({id:charge.id,label:charge.desc||'Compra parcelada',amount:installmentAt(charge,ym),number:monthsBetween(charge.startMonth,ym)+1,total:charge.installments})).filter(row=>row.amount>0);
      return {id:'card:'+c.id,label:'Fatura '+c.name,amount,status:paid('card:'+c.id),detail:(invoice?'Fatura informada':'Estimativa pelas parcelas')+' · vence dia '+c.dueDay,invoice:!!invoice,installments};
    }).filter(row=>row.amount!==0||row.invoice)},
    {id:'loans',label:'Empréstimos',items:f.loans.filter(l=>!loanDeductedFromNetSalary(l,ym)).map(l=>({id:'loan:'+l.id,label:l.name,amount:loanAt(l,ym),status:paid('loan:'+l.id),detail:(l.bank?l.bank+' · ':'')+'Parcela '+(monthsBetween(l.startMonth,ym)+1)+' de '+l.installments})).filter(row=>row.amount>0)},
    {id:'variable',label:'Despesas avulsas e recorrentes',items:[
      ...entriesAt(f,ym).filter(e=>e.type==='expense').map(e=>({id:'entry:'+e.id,label:e.description||e.category||'Despesa',amount:e.amount,status:e.status==='confirmed'?'Pago':'Previsto',detail:e.date.slice(8)+'/'+e.date.slice(5,7)+(e.recurring?' · recorrente':'')})),
      ...(f.variableSpend[ym]||[]).map(e=>({id:'legacy:'+e.id,label:e.desc||e.category||'Despesa',amount:e.amount,status:'Pago',detail:(e.date?e.date.slice(8)+'/'+e.date.slice(5,7)+' · ':'')+'Registro anterior'}))
    ]},
    {id:'lis',label:'Limite especial provisionado',items:lisAt(f,ym).used?[{id:'lis',label:'Limite especial utilizado',amount:lisAt(f,ym).used,status:paid('lis'),detail:'Valor integral utilizado · sem juros estimados'}]:[]},
  ];
  groups.forEach(group=>{group.total=sum(group.items.map(item=>item.amount));});
  const payrollLoans=f.loans.filter(l=>loanDeductedFromNetSalary(l,ym)).map(l=>({id:l.id,label:l.name,amount:loanAt(l,ym)})).filter(l=>l.amount>0);
  return {month:ym,groups,total:sum(groups.map(group=>group.total)),payrollLoans};
}

export function monthPercent(ym = monthKey()) {
  const committed = monthCommitted(ym).total;
  const budget = budgetAt(state, ym);
  return { committed, budget, pct: budget > 0 ? Math.round((committed / budget) * 1000) / 10 : 0 };
}

let financeMonth = monthKey();
export function selectedFinanceMonth() { return financeMonth; }
export function selectFinanceMonth(ym) { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) financeMonth = ym; }
export function fixedBillsForMonth(ym = financeMonth) { return billsAt(state.finance, ym); }
export function loanAmountForMonth(l, ym = financeMonth) { return loanAt(l, ym); }
export function lisForMonth(ym = financeMonth) { return lisAt(state.finance, ym); }
export function financeEntries(ym = financeMonth) { return entriesAt(state.finance, ym); }
export function investmentPortfolio(ym = financeMonth, throughDate) { return portfolioAt(state.finance, ym, throughDate); }
export function projectedInvestmentPortfolio(ym = financeMonth) { return portfolioAt(state.finance, ym, undefined, { includePlanned: true }); }
export function financialSummary(ym = financeMonth) {
  const entries = financeEntries(ym);
  const amount = (type, status) => sum(entries.filter(e => e.type === type && (!status || e.status === status)).map(e => e.amount));
  const income = amount('income');
  const received = amount('income', 'confirmed');
  const invested = sum([amount('investment'), ...entries.filter(e => e.type === 'valuation' && e.cashContribution).map(e => e.amount)]);
  const redeemed = amount('redemption');
  const expenses = monthCommitted(ym).total;
  const unreconciledBalance = sum([income, redeemed, -expenses, -invested]);
  const reconciliationAdjustment = state.finance.cashReconciliations[ym]?.adjustment || 0;
  return { income, received, invested, redeemed, expenses,
    unreconciledBalance, reconciliationAdjustment,
    balance: sum([unreconciledBalance, reconciliationAdjustment]),
    assets: sum(investmentPortfolio(ym).map(a => a.balance)),
    projectedAssets: sum(projectedInvestmentPortfolio(ym).map(a => a.balance)) };
}
export function reconcileInitialMonth({ accountBalance, includeValuationsAsContributions = false, payrollLoanIds = [] }, ym = financeMonth) {
  if (ym !== financeMonth || ym > monthKey() || !Number.isFinite(accountBalance) || accountBalance < 0 ||
      payrollLoanIds.some(id => !state.finance.loans.some(l => l.id === id))) throw new Error('Informe o saldo real e um mês atual ou anterior.');
  const entries = financeEntries(ym);
  const snapshots = new Map();
  if (includeValuationsAsContributions) {
    const priorAssets = investmentPortfolio(addMonths(ym,-1));
    entries.filter(e => e.type === 'valuation' && e.status === 'confirmed' && !e.recurring)
      .sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      .forEach(e => snapshots.set(e.asset, e));
    for (const [asset] of snapshots) {
      if (priorAssets.some(a => a.name === asset && a.balance !== 0) ||
          entries.some(e => e.asset === asset && ['investment','redemption','yield'].includes(e.type))) {
        throw new Error('Esta aplicação já tem histórico ou movimentos no mês. Corrija seus aportes em Lançamentos para evitar duplicidade.');
      }
    }
  }
  // O saldo continua sendo uma posição da carteira. O marcador reconhece o
  // dinheiro guardado neste mês sem somá-lo novamente ao patrimônio.
  for (const e of entries.filter(e => e.type === 'valuation')) {
    const key = `${e.id}:${ym}`;
    state.finance.entryOverrides[key] = { ...state.finance.entryOverrides[key], cashContribution: snapshots.get(e.asset)?.id === e.id };
  }
  for (const loan of state.finance.loans) {
    loan.salaryDeductionHistory ||= [];
    loan.salaryDeductionHistory = loan.salaryDeductionHistory.filter(v => v.month !== ym);
    loan.salaryDeductionHistory.push({ month: ym, value: payrollLoanIds.includes(loan.id) });
  }
  const before = financialSummary(ym).unreconciledBalance;
  state.finance.cashReconciliations[ym] = {
    accountBalance: Math.round(accountBalance * 100) / 100,
    adjustment: sum([accountBalance, -before]),
    recordedAt: new Date().toISOString(),
  };
  save();
}
export function clearCashReconciliation(ym = financeMonth) {
  delete state.finance.cashReconciliations[ym];
  save();
}
export function addFinanceEntry(entry) {
  if (!Number.isFinite(Number(entry.amount)) || Number(entry.amount) < 0 ||
      (Number(entry.amount) === 0 && entry.type !== 'valuation') ||
      !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(entry.date) ||
      Number.isNaN(new Date(entry.date + 'T12:00:00').getTime())) throw new Error('Informe uma data e um valor válidos.');
  state.finance.entries.push({ ...entry, amount: Math.round(Number(entry.amount) * 100) / 100,
    id: uid('entry'), createdAt: new Date().toISOString() });
  save();
}
export function updateFinanceOccurrence(id, ym, patch) {
  const key = `${id}:${ym}`;
  state.finance.entryOverrides[key] = { ...state.finance.entryOverrides[key], ...patch };
  save();
}
export function endFinanceRecurrence(id, ym) {
  const entry = state.finance.entries.find(e => e.id === id);
  if (entry) entry.endMonth = ym;
  save();
}
export function removeVariableExpense(id, ym) {
  state.finance.variableSpend[ym] = (state.finance.variableSpend[ym] || []).filter(e => e.id !== id);
  save();
}

export function projectedCardInvoice(cardId, ym = selectedFinanceMonth()) {
  return sum(state.finance.cardCharges.filter(c => c.cardId === cardId).map(c => installmentAt(c, ym)));
}
export function registeredCardInvoice(cardId, ym = selectedFinanceMonth()) {
  return state.finance.cardInvoices[`${cardId}:${ym}`];
}
export function setCardInvoice(cardId, ym, amount) {
  if (!state.finance.cards.some(c => c.id === cardId) || !Number.isFinite(amount) || amount < 0) throw new Error('Informe um valor válido para a fatura.');
  state.finance.cardInvoices[`${cardId}:${ym}`] = { amount: Math.round(amount * 100) / 100 };
  save();
}
export function clearCardInvoice(cardId, ym) {
  delete state.finance.cardInvoices[`${cardId}:${ym}`];
  save();
}
export function monthlyAnalysis(ym = selectedFinanceMonth()) {
  const summary = financialSummary(ym);
  const ceiling = Math.round(summary.income * 80) / 100;
  const previous = financialSummary(addMonths(ym, -1));
  return { ...summary, ceiling, headroom: sum([ceiling, -summary.expenses]),
    spendingRatio: summary.income > 0 ? Math.round(summary.expenses / summary.income * 1000) / 10 : null,
    change: sum([summary.expenses, -previous.expenses]),
    changePct: previous.expenses > 0 ? Math.round((summary.expenses / previous.expenses - 1) * 1000) / 10 : null };
}

export function monthlySpendingPlan(ym = selectedFinanceMonth()) {
  const analysis = monthlyAnalysis(ym);
  const cardExpenses = monthCommitted(ym).cards;
  return { ...analysis, cardExpenses,
    investmentPotential: Math.max(0, sum([analysis.income, -analysis.expenses])),
    investmentShortfall: Math.max(0, sum([analysis.expenses, analysis.invested, -analysis.income, -analysis.redeemed])) };
}

// ---------- treinos, biblioteca e negócios ----------
export function trainingSummary(date=todayISO()) { return hub.trainingSummary(state,date); }
export function saveTrainingSession(input,id) {
  const data=hub.trainingInput(input,todayISO());
  const entry=id?state.trainingSessions.find(e=>e.id===id):null;
  if(id&&!entry)throw new Error('Treino não encontrado.');
  if(entry)Object.assign(entry,data);else state.trainingSessions.push({...data,id:uid('training'),createdAt:new Date().toISOString()});
  save();
}
export function removeTrainingSession(id) { state.trainingSessions=state.trainingSessions.filter(e=>e.id!==id);save(); }
export function setWeeklyTrainingGoal(value) {
  if(!Number.isInteger(value)||value<1||value>21)throw new Error('Escolha uma meta de 1 a 21 treinos por semana.');
  state.weeklyTrainingGoal=value;save();
}
export function saveBook(input,id) {
  if(id&&state.activeReadingTimer?.bookId===id)throw new Error('Conclua a sessão deste livro antes de editá-lo.');
  const data=hub.bookInput(input),book=id?state.books.find(b=>b.id===id):null;
  if(id&&!book)throw new Error('Livro não encontrado.');
  if(book)Object.assign(book,data);else state.books.push({...data,id:uid('book')});
  save();
}
export function removeBook(id) {if(state.activeReadingTimer?.bookId===id)throw new Error('Conclua a sessão deste livro antes de removê-lo.');state.books=state.books.filter(b=>b.id!==id);save();}
export function registerReading() {throw new Error('Os minutos são registrados somente pelo cronômetro de hoje.');}
export function removeReadingSession() {throw new Error('Os registros de leitura são permanentes e não podem ser excluídos.');}
function saveImmediately() {save();clearTimeout(pushTimer);if(cloudUserId&&cloudReady)void pushToCloudNow();}
export function readingDay(date=todayISO()) {return hub.readingDay(state,date,todayISO());}
export function readingMonth(month=monthKey()) {return hub.readingMonth(state,month,todayISO());}
export function readingHistory() {return hub.readingHistory(state,todayISO());}
export function expireReadingTimer() {
  const timer=state.activeReadingTimer;
  if(!timer||timer.date===todayISO()&&Date.now()<timer.endsAt)return false;
  if(!state.readingSessions.some(e=>e.id===timer.id))state.readingSessions.push({id:timer.id,source:'timer',status:'expired',bookId:timer.bookId,bookTitle:timer.bookTitle,date:timer.date,minutes:0,pagesRead:0,elapsedMs:0,createdAt:new Date().toISOString()});
  state.activeReadingTimer=null;saveImmediately();return true;
}
export function startReadingTimer(bookId) {
  expireReadingTimer();
  if(state.activeReadingTimer)throw new Error('Finalize a sessão em andamento antes de começar outra.');
  const book=state.books.find(b=>b.id===bookId);
  if(!book||book.status==='finished')throw new Error('Selecione um livro em leitura, pausado ou na fila.');
  const now=new Date(),end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
  state.activeReadingTimer={id:uid('timed-reading'),bookId:book.id,bookTitle:book.title,date:todayISO(now),startedAt:now.getTime(),endsAt:end,stoppedAt:null,startPage:book.pageCurrent};
  saveImmediately();
}
export function stopReadingTimer() {
  if(expireReadingTimer())throw new Error('O dia da sessão terminou. Não é possível registrar uma leitura de ontem.');
  const timer=state.activeReadingTimer;
  if(!timer)throw new Error('Inicie uma leitura primeiro.');
  if(timer.stoppedAt!==null)return;
  if(Date.now()-timer.startedAt<1000)throw new Error('O cronômetro precisa registrar pelo menos um segundo.');
  timer.stoppedAt=Date.now();saveImmediately();
}
export function completeReadingTimer(pagesRead) {
  if(expireReadingTimer())throw new Error('O dia terminou e o registro não pode ser preenchido retroativamente.');
  const timer=state.activeReadingTimer;
  if(!timer||timer.stoppedAt===null)throw new Error('Finalize o cronômetro antes de informar as páginas lidas.');
  const book=state.books.find(b=>b.id===timer.bookId);
  if(!book||!Number.isInteger(pagesRead)||pagesRead<0)throw new Error('Informe uma quantidade válida de páginas lidas.');
  const page=timer.startPage+pagesRead;
  if(book.pageTotal&&page>book.pageTotal)throw new Error('A quantidade ultrapassa as páginas restantes do livro.');
  if(state.readingSessions.some(e=>e.id===timer.id))throw new Error('Esta sessão já foi registrada.');
  const elapsedMs=hub.timerElapsed(timer),seconds=Math.floor(elapsedMs/1000),minutes=seconds/60;
  state.readingSessions.push({...timer,source:'timer',status:'completed',elapsedMs,minutes,pagesRead,page,createdAt:new Date().toISOString()});
  state.readingLog[timer.date]=(Math.round((state.readingLog[timer.date]||0)*60)+seconds)/60;
  book.pageCurrent=page;book.status=book.pageTotal&&page===book.pageTotal?'finished':'reading';
  state.activeReadingTimer=null;saveImmediately();
}
export function businessSummary(ym=monthKey(),businessId='all') { return hub.businessSummary(state,ym,businessId); }
export function saveBusinessEntry(input,id) {
  const data=hub.businessEntryInput(state,input,todayISO()),entry=id?state.businessEntries.find(e=>e.id===id):null;
  if(id&&!entry)throw new Error('Lançamento não encontrado.');
  if(entry)Object.assign(entry,data);else state.businessEntries.push({...data,id:uid('business-entry')});save();
}
export function removeBusinessEntry(id) { state.businessEntries=state.businessEntries.filter(e=>e.id!==id);save(); }
export function saveBusinessClient(input,id) {
  const data=hub.clientInput(state,input),client=id?state.businessClients.find(e=>e.id===id):null;
  if(id&&!client)throw new Error('Cliente não encontrado.');
  if(client&&client.businessId!==data.businessId&&state.businessEntries.some(e=>e.clientId===id))throw new Error('Este cliente tem lançamentos. Cadastre outro cliente na empresa de destino.');
  if(client)Object.assign(client,data);else state.businessClients.push({...data,id:uid('client')});save();
}
export function removeBusinessClient(id) {
  state.businessClients=state.businessClients.filter(e=>e.id!==id);
  state.businessEntries.forEach(e=>{if(e.clientId===id)e.clientId='';});save();
}
export function setBusinessGoal(businessId,ym,amount) {
  if(!state.businesses.some(b=>b.id===businessId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)||!Number.isFinite(amount)||amount<0)throw new Error('Informe uma meta mensal válida.');
  state.businessGoals[`${businessId}:${ym}`]=Math.round(amount*100)/100;save();
}

// ---------- cursos e diário de aprendizados ----------
export function saveStudyCourse(input,id) {
  const course=id?state.studyCourses.find(c=>c.id===id):null;
  if(id&&!course)throw new Error('Curso não encontrado.');
  const data=hub.courseInput({...course,...input});
  if(course)Object.assign(course,data);else state.studyCourses.push({...data,id:uid('course'),createdAt:new Date().toISOString()});
  if(course?.legacyTrack)Object.assign(state.studyTrack,{title:course.title,module:course.module,totalModules:course.totalModules,nextTopic:course.nextTopic});
  saveImmediately();
}
export function saveLearningEntry(input,id) {
  const data=hub.learningInput(state,input,todayISO()),entry=id?state.learningEntries.find(e=>e.id===id):null;
  if(id&&!entry)throw new Error('Aprendizado não encontrado.');
  if(entry)Object.assign(entry,data,{updatedAt:new Date().toISOString()});
  else state.learningEntries.push({...data,id:uid('learning'),createdAt:new Date().toISOString()});
  save();
}
export function removeLearningEntry(id) {state.learningEntries=state.learningEntries.filter(e=>e.id!==id);save();}
export function courseSummary(courseId='all',month) {return hub.courseSummary(state,courseId,month);}

export function courseStudyDays(courseId='all',month) {return hub.courseStudyDays(state,courseId,month,todayISO());}
function checkCourseToday(course) {
  const date=todayISO();
  if(hub.courseStudyDays(state,course.id,undefined,date).some(day=>day.date===date))return false;
  state.courseCheckins.push({id:uid('course-check'),courseId:course.id,courseTitle:course.title,date,createdAt:new Date().toISOString()});
  return true;
}
export function markCourseToday(courseId) {
  const course=state.studyCourses.find(c=>c.id===courseId);
  if(!course)throw new Error('Curso não encontrado.');
  const added=checkCourseToday(course);if(added)saveImmediately();return added;
}
export function unmarkCourseToday(courseId) {
  if(!state.studyCourses.some(c=>c.id===courseId))throw new Error('Curso não encontrado.');
  // Somente o check de hoje pode ser desfeito. Anotações e dias anteriores são preservados.
  state.courseCheckins=state.courseCheckins.filter(e=>e.courseId!==courseId||e.date!==todayISO());saveImmediately();
}
function syncLegacyCourse(course) {
  if(course.legacyTrack)Object.assign(state.studyTrack,{title:course.title,module:course.module,totalModules:course.totalModules,nextTopic:course.nextTopic});
}
export function completeStudyModule(courseId) {
  const course=state.studyCourses.find(c=>c.id===courseId);
  if(!course)throw new Error('Curso não encontrado.');
  if(!course.totalModules||course.module>=course.totalModules)throw new Error('Todos os módulos já foram concluídos ou o total ainda não foi definido.');
  course.module++;if(course.module===course.totalModules)course.status='completed';
  checkCourseToday(course);syncLegacyCourse(course);saveImmediately();
}
export function undoStudyModule(courseId) {
  const course=state.studyCourses.find(c=>c.id===courseId);
  if(!course||course.module<1)throw new Error('Não há módulo concluído para desfazer.');
  course.module--;if(course.status==='completed')course.status='active';
  syncLegacyCourse(course);saveImmediately();
}


// ---------- autocuidado ----------
export function meditationSummary(year=new Date().getFullYear()) {return hub.meditationSummary(state.selfCare,year);}
export function updateMeditationSettings({minutes,sound,enabled,day,time}) {
  if(![5,10].includes(minutes)||!Number.isInteger(day)||day<0||day>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw new Error('Confira a duração, o dia e o horário.');
  Object.assign(state.selfCare,{minutes,sound:!!sound,schedule:{enabled:!!enabled,day,time}});save();
}
export function startMeditation() {
  const c=state.selfCare;
  if(c.active)throw new Error('Conclua ou encerre a sessão em andamento primeiro.');
  const startedAt=Date.now();
  c.active={id:uid('meditation'),minutes:c.minutes,startedAt,endsAt:startedAt+c.minutes*60000,alertedAt:null};
  saveImmediately();
}
export function markMeditationFinished() {
  const timer=state.selfCare.active;
  if(!timer||Date.now()<timer.endsAt||timer.alertedAt!==null)return false;
  timer.alertedAt=Date.now();saveImmediately();return true;
}
export function completeMeditation() {
  const c=state.selfCare,timer=c.active;
  if(!timer||Date.now()<timer.endsAt)throw new Error('Aguarde o fim do tempo para registrar a sessão completa.');
  if(!c.sessions.some(s=>s.id===timer.id))c.sessions.push({id:timer.id,minutes:timer.minutes,date:todayISO(new Date(timer.endsAt)),startedAt:timer.startedAt,endedAt:timer.endsAt,confirmedAt:Date.now()});
  c.active=null;saveImmediately();
}
export function cancelMeditation() {state.selfCare.active=null;saveImmediately();}
export function toggleSelfCareHabit(id) {
  const c=state.selfCare,habit=c.habits.find(h=>h.id===id);
  if(!habit||!habit.enabled)throw new Error('Cuidado não encontrado na rotina.');
  const day=c.daily[todayISO()] ||= {};day[id]=!day[id];save();
}
export function enableSelfCareHabit(id,enabled) {
  const habit=state.selfCare.habits.find(h=>h.id===id);
  if(!habit)throw new Error('Cuidado não encontrado.');
  habit.enabled=!!enabled;save();
}
export function addSelfCareHabit(title) {
  title=String(title||'').trim().slice(0,120);
  if(!title)throw new Error('Dê um nome ao seu cuidado.');
  state.selfCare.habits.push({id:uid('care'),title,detail:'Cuidado definido por você.',enabled:true});save();
}
export function saveCareReminder(input,id) {
  const data=hub.reminderInput(input),entry=id?state.selfCare.reminders.find(r=>r.id===id):null;
  if(id&&!entry)throw new Error('Lembrete não encontrado.');
  if(entry)Object.assign(entry,data);else state.selfCare.reminders.push({...data,id:uid('care-reminder'),done:false});save();
}
export function toggleCareReminder(id) {
  const r=state.selfCare.reminders.find(r=>r.id===id);
  if(!r)throw new Error('Lembrete não encontrado.');
  r.done=!r.done;r.completedDate=r.done?todayISO():null;save();
}
export function removeCareReminder(id) {state.selfCare.reminders=state.selfCare.reminders.filter(r=>r.id!==id);save();}

export function setReflectionSources(sources) {state.selfCare.reflectionSources=hub.philosopherPreferences(sources);saveImmediately();}

export function financialInsightSnapshot(ym=selectedFinanceMonth()) {
  const months=Array.from({length:12},(_,i)=>{const month=addMonths(ym,i),summary=financialSummary(month);return {month,income:summary.income,expenses:summary.expenses,invested:summary.invested,groups:expenseBreakdown(month).groups};});
  return hub.financialSnapshot(ym,todayISO(),months);
}
