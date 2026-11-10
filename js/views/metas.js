import { icon } from '../icons.js';
import { goalProgress, availableYears, getGoalsForYear } from '../store.js';
import { escapeHTML as esc, toast } from '../ui.js';
const COLOR={ember:{text:'var(--ember)',fill:'var(--ember)'},cyan:{text:'var(--cyan)',fill:'var(--cyan)'},green:{text:'var(--green)',fill:'var(--green)'}};
const ICONS={corpo:'dumbbell',mente:'book',carreira:'target'};
let selectedYear=String(new Date().getFullYear()),editing=null,lastSaved=null;
const keyFor=(goalId,id)=>`${selectedYear}:${goalId}:${id}`;
export function render() {
  const years=availableYears(),goals=getGoalsForYear(selectedYear);
  return `<header><div class="eyebrow">Intenção que vira direção</div><h1>Metas</h1><p class="page-description">Defina o que quer conquistar e detalhe como pretende chegar lá.</p></header>
    <div class="row gap-8" style="overflow-x:auto;justify-content:flex-start;padding-bottom:2px;flex-shrink:0" aria-label="Ano das metas">${years.map(year=>`<button data-select-year="${esc(year)}" aria-pressed="${year===selectedYear}" class="pill" style="flex-shrink:0;${year===selectedYear?'background:var(--ember-bg);border:1px solid var(--ember-border);color:var(--ember)':'background:var(--surface-3);color:var(--text-dim);border:1px solid transparent'}">${esc(year)}</button>`).join('')}</div>
    ${goals.map(goal=>{
      const pct=Math.round(goalProgress(goal)*100),color=COLOR[goal.color]||COLOR.ember;
      return `<section class="card hub-section" data-goal-area="${esc(goal.id)}"><div class="row gap-10"><span class="hub-icon" style="color:${color.text}">${icon[ICONS[goal.id]]?icon[ICONS[goal.id]]():icon.target()}</span><h2 style="flex:1">${esc(goal.title)}</h2><span class="pill pill-green">${goal.keyResults.filter(k=>k.done).length}/${goal.keyResults.length} · ${pct}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${color.fill}"></div></div>
        <div class="stack gap-10">${goal.keyResults.length?goal.keyResults.map(kr=>{
          const key=keyFor(goal.id,kr.id),isEditing=editing===key;
          return `<article class="goal-item" data-goal-item="${esc(kr.id)}"><div class="goal-item-row"><button data-action="toggleKR" data-year="${esc(selectedYear)}" data-goal="${esc(goal.id)}" data-kr="${esc(kr.id)}" class="goal-check" aria-pressed="${kr.done}"><span class="check ${kr.done?'checked':''}">${icon.check()}</span><span class="${kr.done?'positive':''}">${esc(kr.title)}</span></button><button data-action="removeKR" data-year="${esc(selectedYear)}" data-goal="${esc(goal.id)}" data-kr="${esc(kr.id)}" class="icon-button goal-delete" aria-label="Excluir meta: ${esc(kr.title)}">${icon.trash()}</button></div>
          ${isEditing?`<form data-edit-goal-notes="${esc(kr.id)}" data-goal-id="${esc(goal.id)}" class="stack gap-10 goal-notes-form"><label class="field">Observações / detalhamento<textarea name="notes" rows="5" maxlength="6000" placeholder="Por que essa meta importa? Como pretende alcançá-la? Inclua etapas, prazos e outros detalhes.">${esc(kr.notes||'')}</textarea></label><p class="form-error" role="alert"></p><div class="hub-actions"><button class="btn btn-primary">Salvar observações</button><button type="button" class="btn-ghost" data-cancel-goal-notes>Cancelar</button></div></form>`:`${kr.notes?`<details class="goal-notes" ${lastSaved===key?'open':''}><summary>Observações / detalhamento</summary><p class="hub-note">${esc(kr.notes)}</p></details>`:''}<button class="btn-link" data-detail-goal="${esc(kr.id)}" data-goal-id="${esc(goal.id)}">${kr.notes?'Editar observações':'Detalhar meta'}</button>`}</article>`;
        }).join(''):'<p class="hint">Nenhuma meta nesta área. Adicione a primeira abaixo.</p>'}</div>
        <form data-add-goal="${esc(goal.id)}" class="goal-create-form stack gap-10"><label class="field">Nova meta de ${esc(goal.title)}<input type="text" name="title" maxlength="240" placeholder="O que você quer conquistar?" required></label><details><summary>Adicionar observações (opcional)</summary><label class="field" style="margin-top:12px">Detalhamento da nova meta<textarea name="notes" rows="4" maxlength="6000" placeholder="Contexto, plano de ação, critérios de sucesso…"></textarea></label></details><p class="form-error" role="alert"></p><button class="btn-ghost">+ Adicionar meta</button></form>
      </section>`;
    }).join('')}`;
}
export function afterRender(container,{render}) {
  const store=window.__forja.store,year=selectedYear;
  container.querySelectorAll('[data-select-year]').forEach(button=>button.addEventListener('click',()=>{selectedYear=button.dataset.selectYear;editing=null;lastSaved=null;render();}));
  container.querySelectorAll('[data-detail-goal]').forEach(button=>button.addEventListener('click',()=>{
    editing=keyFor(button.dataset.goalId,button.dataset.detailGoal);render();
    const form=[...container.querySelectorAll('[data-edit-goal-notes]')].find(el=>el.dataset.editGoalNotes===button.dataset.detailGoal&&el.dataset.goalId===button.dataset.goalId);
    form?.querySelector('textarea').focus({preventScroll:true});form?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }));
  container.querySelectorAll('[data-cancel-goal-notes]').forEach(button=>button.addEventListener('click',()=>{editing=null;render();}));
  container.querySelectorAll('[data-edit-goal-notes]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    try{store.updateKeyResultNotes(year,form.dataset.goalId,form.dataset.editGoalNotes,form.elements.notes.value);lastSaved=keyFor(form.dataset.goalId,form.dataset.editGoalNotes);editing=null;render();toast('Observações salvas.');}
    catch(error){form.querySelector('.form-error').textContent=error.message;}
  }));
  container.querySelectorAll('[data-add-goal]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    try{store.addKeyResult(year,form.dataset.addGoal,form.elements.title.value,form.elements.notes.value);const added=store.getGoalsForYear(year).find(goal=>goal.id===form.dataset.addGoal).keyResults.at(-1);lastSaved=keyFor(form.dataset.addGoal,added.id);editing=null;render();toast('Meta adicionada.');}
    catch(error){form.querySelector('.form-error').textContent=error.message;}
  }));
}
