import { sb } from '../supabase-client.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../ui.js';

let error = '', info = '', busy = false, typedEmail = '', typedPassword = '';
export function render() {
  return `<div class="login-layout">
    <div class="login-story">
      <div class="brand-mark">${icon.flame()}</div>
      <div class="eyebrow">Construa o que importa</div>
      <h1>FORJA<span style="color:var(--ember)">.</span></h1>
      <p>Clareza na rotina.<br>Consistência nas escolhas.<br>Espaço para o seu próximo passo.</p>
    </div>
    <form class="login-form" id="login-form">
      <div><h2>Seu espaço de evolução</h2><p class="page-description">Entre para continuar de onde parou.</p></div>
      <label class="field">E-mail<input type="email" id="login-email" placeholder="voce@exemplo.com" autocomplete="username" required value="${escapeHTML(typedEmail)}"></label>
      <label class="field">Senha<span class="password-wrap"><input type="password" id="login-password" placeholder="Sua senha" autocomplete="current-password" required minlength="6" value="${escapeHTML(typedPassword)}"><button type="button" id="show-password" aria-label="Mostrar senha">Mostrar</button></span></label>
      <div role="alert" class="form-error">${escapeHTML(error)}</div>
      ${info ? `<p class="hint" role="status">${escapeHTML(info)}</p>` : ''}
      <button type="submit" class="btn btn-primary" ${busy ? 'disabled' : ''}>${busy ? 'Entrando…' : 'Entrar no Forja'}</button>
      <button type="button" id="btn-signup" class="btn-ghost" ${busy ? 'disabled' : ''}>Criar minha conta</button>
      <div class="brand-credit">By Alfa tauri innovation group</div>
    </form>
  </div>`;
}
export function afterRender(container, { render: rerender }) {
  const form = container.querySelector('#login-form');
  const email = container.querySelector('#login-email');
  const password = container.querySelector('#login-password');
  email.addEventListener('input', () => typedEmail = email.value);
  password.addEventListener('input', () => typedPassword = password.value);
  container.querySelector('#show-password').addEventListener('click', ev => {
    const show = password.type === 'password'; password.type = show ? 'text' : 'password';
    ev.target.textContent = show ? 'Ocultar' : 'Mostrar'; ev.target.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
  async function submit(signup) {
    if (busy || !form.reportValidity()) return;
    typedEmail = email.value.trim(); typedPassword = password.value;
    busy = true; error = ''; info = ''; rerender();
    try {
      const result = await (signup ? sb.auth.signUp({ email: typedEmail, password: typedPassword }) : sb.auth.signInWithPassword({ email: typedEmail, password: typedPassword }));
      if (result.error) throw result.error;
      if (signup && !result.data.session) info = 'Conta criada. Confirme seu e-mail antes de entrar.';
      else typedPassword = '';
    } catch (err) { error = translate(err.message || ''); }
    finally { busy = false; rerender(); }
  }
  form.addEventListener('submit', ev => { ev.preventDefault(); submit(false); });
  container.querySelector('#btn-signup').addEventListener('click', () => submit(true));
}
function translate(msg) {
  if (/fetch|network|resolve/i.test(msg)) return 'Não foi possível conectar ao serviço de login. Verifique sua conexão ou tente novamente em instantes.';
  if (/already registered/i.test(msg)) return 'Já existe uma conta com esse e-mail. Tente entrar.';
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  if (/password/i.test(msg)) return 'Use uma senha com pelo menos 6 caracteres.';
  return msg || 'Não foi possível entrar. Tente novamente.';
}
