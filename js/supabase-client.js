// Projeto Supabase "Forja" (REILOLx). A publishable key é segura para uso no
// navegador — ela só funciona porque a Row Level Security nas tabelas
// restringe cada usuário aos próprios dados (ver policies de app_state).
const SUPABASE_URL = 'https://hmzourunlnbwduxfwoom.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1qDGAp60RH97aLGOXJu-6A__D1VdWSm';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
