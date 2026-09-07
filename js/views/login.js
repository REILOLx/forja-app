import { sb } from '../supabase-client.js';

let error = '';
let info = '';
let busy = false;
let typedEmail = '';
let typedPassword = '';

export function render() {
  return `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;">
      <div style="text-align:center;margin-bottom:8px;">
        <div class="fjc" style="font-size:30px;font-weight:700;color:var(--ember);">FORJA</div>
        <div class="muted" style="font-size:13px;margin-top:6px;">Entre com seu e-mail e senha</div>
      </div>

      <input type="email" id="login-email" placeholder="E-mail" autocomplete="username" value="${typedEmail}">
      <input type="password" id="login-password" placeholder="Senha" autocomplete="current-password" value="${typedPassword}">

      ${error ? `<div style="color:var(--red);font-size:13px;text-align:center;">${error}</div>` : ''}
      ${info ? `<div style="color:var(--green);font-size:13px;text-align:center;">${info}</div>` : ''}

      <button id="btn-login" class="btn btn-primary" ${busy ? 'disabled' : ''}>${busy ? 'Entrando…' : 'Entrar'}</button>
      <button id="btn-signup" class="btn-ghost" ${busy ? 'disabled' : ''}>Criar conta com esse e-mail e senha</button>
    </div>
  `;
}

export function afterRender(container, { render: rerender }) {
  const emailInput = container.querySelector('#login-email');
  const passInput = container.querySelector('#login-password');

  function setState({ err = '', inf = '', busyState = false }) {
    typedEmail = emailInput.value;
    typedPassword = passInput.value;
    error = err;
    info = inf;
    busy = busyState;
    rerender();
  }

  container.querySelector('#btn-login').addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passInput.value;
    setState({ busyState: true });
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err) setState({ err: traduzErro(err.message) });
    // sucesso: onAuthStateChange no app.js cuida do redirecionamento
  });

  container.querySelector('#btn-signup').addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passInput.value;
    setState({ busyState: true });
    const { data, error: err } = await sb.auth.signUp({ email, password });
    if (err) { setState({ err: traduzErro(err.message) }); return; }
    if (!data.session) {
      setState({ inf: 'Conta criada! Veja seu e-mail para confirmar antes de entrar.' });
    }
  });
}

function traduzErro(msg) {
  if (/already registered/i.test(msg)) return 'Já existe uma conta com esse e-mail — tente entrar.';
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (/password/i.test(msg) && /6/.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  return msg;
}
