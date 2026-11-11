-- Não contém credenciais. O segredo real é criado separadamente no Vault.
create extension if not exists supabase_vault with schema vault;

create or replace function public.forja_read_gemini_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret::jsonb
  from vault.decrypted_secrets
  where name = 'forja_gemini_config'
  limit 1;
$$;

revoke all on function public.forja_read_gemini_config() from public, anon, authenticated;
grant execute on function public.forja_read_gemini_config() to service_role;
