# Ativar os insights com Gemini

A Forja é estática no GitHub Pages. A chave do Gemini **não** faz parte do
JavaScript, do JSON `app_state`, do backup ou do cache offline. A página
`#/financeiro/insights` chama a função autenticada `forja-insights` no projeto
Supabase já usado pelo app. Os cálculos de orçamento e as reflexões diárias
funcionam sem Gemini.

## Servidor preparado

Código: `supabase/functions/forja-insights/`. O adaptador `index.ts` usa Deno;
`handler.js` exporta um handler HTTP também testável com Node 24. Se o Gemini
já estiver no servidor da LumeqIA, esse handler pode ser adaptado ao servidor
existente depois de conferir sua URL, autenticação e repositório. Não copie
segredos para arquivos rastreados nem para variáveis públicas do frontend.

Para usar o Supabase:

1. Nas configurações de Secrets das Edge Functions do projeto Forja, cadastre
   `GEMINI_API_KEY` com uma chave válida e restrita à Gemini API. Não use uma chave
   que tenha sido publicada em chat ou repositório; substitua-a antes.
2. Defina `FORJA_AI_ALLOWED_USER_IDS` com o UUID da conta autorizada, encontrado
   em Authentication → Users. É obrigatório: contas não listadas são rejeitadas.
3. Opcionalmente configure `GEMINI_MODEL` (padrão `gemini-flash-latest`) para um modelo
   de texto disponível no projeto Google que aceite saída JSON estruturada.
   `FORJA_ALLOWED_ORIGINS` tem padrão `https://reilolx.github.io`.
4. Com o Supabase CLI autenticado como administrador do projeto, publique:

   ```sh
   supabase functions deploy forja-insights --project-ref hmzourunlnbwduxfwoom
   ```

   O projeto fornece `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente da função.
   O arquivo `supabase/config.toml` desliga apenas a verificação legada no gateway;
   **o handler sempre verifica o token do usuário em `/auth/v1/user`** e confere
   a lista de UUIDs autorizados antes de consultar Gemini.
5. Na Forja autenticada, abra Financeiro → Insights → Analisar com Gemini.

Não basta cadastrar um segredo no GitHub Pages: ele não executa um backend.
Publicar a interface também não publica automaticamente a Edge Function.

## Dados enviados e comportamento

Cada consulta envia um retrato de 12 meses: receitas, teto, despesas, aportes
separados, valores por categoria, até seis despesas principais e até três despesas
avulsas previstas de cada mês. Não envia o restante de `app_state`, dados de
clientes/empresas, leitura, autocuidado, e-mail, senha, tokens Supabase ou dados
bancários de autenticação. O JWT é usado apenas para autenticar a consulta no
servidor; a chave Gemini vai apenas no header `x-goog-api-key` ao Google.

Os valores são validados em centavos antes da consulta. O modelo recebe instruções
para não tratar investimento como despesa, não cortar parcelas obrigatórias, não
somar faturas com parcelas substituídas e não inventar economias garantidas.
Os números da interface são sempre calculados pela Forja, não pelo modelo.
Respostas são validadas e renderizadas como texto, sem HTML executável.

Há limite de tamanho da requisição, timeout de autenticação/provedor, allowlist de
origens/usuários, cache de cinco minutos por retrato/usuário e limite **por instância**
de três consultas por minuto e vinte por dia. Para um serviço com múltiplas
instâncias ou vários usuários, use um limitador persistente no servidor e ajuste
também quotas/orçamento do projeto Google; a memória de uma função isolada não
é um limite global. Nenhum segredo ou conteúdo financeiro é escrito em logs pelo
handler. A consulta nunca altera lançamentos nem executa transações.

## Reflexões

`js/reflections.js` reúne 28 traduções livres curtas, com referências e links para
leitura no contexto, explicações próprias e uma aplicação. Não são citações geradas
pelo Gemini. A escolha usa a data local e as fontes selecionadas; recarregar a tela
não troca o texto e a virada do dia atualiza a reflexão. As sugestões iniciais são
Marco Aurélio, Sêneca, Epicteto e Bíblia; isso não afirma conhecer preferências que
estejam em outros chats. O acervo faz um ciclo de 28 dias com todas as fontes ativas;
com menos fontes, o ciclo fica menor. Não promete 365 textos inéditos.
