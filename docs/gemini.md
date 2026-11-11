# Insights com Gemini

## Publicação atual

O serviço `forja-insights` foi ativado no projeto Supabase da Forja em
11/11/2026 (UTC). A configuração está no Vault e a leitura é exclusiva de
`service_role`; `anon` e `authenticated` não têm permissão de execução na função
de configuração. A conta proprietária está autorizada no servidor.

Uma verificação de implantação, com dados simulados, executou o handler no
Supabase e consultou o Gemini real: resposta HTTP 200, 48 avaliações mensais,
7 prioridades e 10 ações de economia aceitas pela validação. O teste interno
foi removido da versão definitiva. Requisições externas sem sessão continuam
retornando HTTP 401. O diagnóstico dos dados reais é gerado pela própria conta
ao abrir Financeiro → Insights. Nenhum lançamento é alterado.

## Configuração e manutenção

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

   O projeto fornece `SUPABASE_URL` e suas chaves no ambiente da função.
   O handler aceita as variáveis legadas e os mapas JSON de chaves nomeadas
   `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS`. Chaves secretas novas
   são enviadas somente no header `apikey`, sem tratá-las como JWT.
   O arquivo `supabase/config.toml` desliga apenas a verificação legada no gateway;
   **o handler sempre verifica o token do usuário em `/auth/v1/user`** e confere
   a lista de UUIDs autorizados antes de consultar Gemini.
5. Na Forja autenticada, abra Financeiro → Insights. A conexão é verificada e a
   análise de todo o horizonte começa automaticamente, sem selecionar mês. O botão
   de atualização serve para solicitar uma nova leitura quando desejar.

Não basta cadastrar um segredo no GitHub Pages: ele não executa um backend.
Publicar a interface também não publica automaticamente a Edge Function.

## Dados enviados e comportamento

Cada consulta começa SEMPRE no mês atual do dispositivo, independentemente do mês
selecionado em outras telas. O período vai até o fim dos empréstimos, compras
parceladas e lançamentos futuros conhecidos, com no mínimo 12 meses. Recorrências
sem data de fim são projetadas dentro desse intervalo; não há previsão infinita.

São enviados todos os itens de despesa de cada mês, sem limites de “top 6” ou “top
3”: contas fixas, faturas, empréstimos, limite especial e despesas avulsas, com nome,
valor em centavos, categoria, data/vencimento conhecido, recorrência, situação e
parcelas conhecidas do cartão. Também seguem todas as ocorrências de receita e
movimentos de investimentos do período, saldos previstos, patrimônio confirmado e
previsto, ajustes de conciliação separados, descontos já feitos na folha e os
cronogramas completos dos contratos.

Uma fatura informada continua substituindo a estimativa. Suas parcelas conhecidas
são referências marcadas com `includedInInvoiceTotal=false`, sem dupla contagem.
O app não conhece compras que nunca foram discriminadas; o modelo recebe essa
limitação. Não se envia o restante de `app_state`, dados de clientes/empresas,
leituras, autocuidado, e-mail, senha ou credenciais bancárias. O JWT é usado somente
para autenticação no servidor e a chave Gemini vai no header `x-goog-api-key`.

O contrato `schemaVersion: 2` valida meses consecutivos a partir do mês atual,
todas as despesas e sua soma por categoria, saldos e parcelas. A resposta contém
um diagnóstico atual, prioridades obrigatórias para o mês atual e o próximo mês,
plano prático com hipóteses de economia ligadas
a itens cadastrados e avaliação de CADA mês em ordem. Uma economia quantificada
não pode exceder a despesa, ser repetida no mesmo item/mês nem incidir em fatura já
assumida, empréstimo, limite especial ou item pago. São hipóteses condicionadas,
não descontos confirmados. Nenhum lançamento ou transação é alterado.

O servidor aceita até 4 MiB por consulta e até 720 meses; se exceder, a análise
falha explicitamente, sem cortar gastos silenciosamente. Os limites de saída e
o timeout do Gemini foram ampliados para o detalhamento completo. O status da
conexão é verificado antes de habilitar a análise: publicar o frontend não deixa
um serviço inexistente aparecer como “conectado”.

A tela não tem seletor de mês. O mês atual e o próximo aparecem juntos, e os
demais meses trazem sua avaliação e detalhes dos gastos. Novos dados ou a virada
do dia invalidam a leitura anterior. Uma tentativa que falhou não fica se
repetindo sozinha; o usuário pode tentar novamente. Um cache validado na sessão
do navegador, separado por usuário e resumo SHA-256 do retrato, dura até 24 horas
e evita novas consultas ao recarregar sem alterações. Não contém credenciais nem
o retrato financeiro completo e funciona como otimização opcional.

Há allowlist de origens e usuários, cache de cinco minutos por retrato/usuário e
limite POR INSTÂNCIA de três consultas por minuto e vinte por dia. Para múltiplas
instâncias use um limitador persistente e quotas/orçamento no projeto Google.
Nenhuma chave ou conteúdo financeiro é escrito em logs pelo handler. Respostas
são validadas e renderizadas como texto, sem HTML executável.

### Alternativa de configuração privada pelo Vault

Quando a publicação administrativa disponibiliza SQL e Edge Functions, mas não
edição de Secrets, o handler também pode ler a configuração do Supabase Vault.
A migração `supabase/migrations/202611100001_forja_ai_private_config.sql` cria
apenas uma função de leitura com execução revogada de `public`, `anon` e
`authenticated`, e concedida exclusivamente a `service_role`.

O administrador cria separadamente um segredo `forja_gemini_config`, cujo valor
JSON contém `apiKey` e `allowedUserIds`. O valor real nunca entra na migração,
no repositório nem no frontend. O servidor usa sua chave de serviço, fornecida
pelo ambiente Supabase, para essa leitura DEPOIS de verificar o usuário no Auth;
em seguida confere a allowlist antes de chamar Google. A configuração não é
retornada ao cliente. Secrets de ambiente continuam tendo preferência.

## Reflexões

`js/reflections.js` reúne 70 reflexões filosóficas e 28 bíblicas. Cada dia tem
**dois blocos independentes**, um filosófico e um bíblico, ambos com referência,
explicação e aplicação prática. Traduções livres de trechos e paráfrases são
identificadas; uma paráfrase não é apresentada como citação literal.

O acervo filosófico inclui Nietzsche, Maquiavel, Marco Aurélio, Sêneca, Epicteto,
Camus, Sartre, Kierkegaard, Simone de Beauvoir e Dostoiévski. As correntes e o
caráter literário de alguns textos são distinguidos. O usuário escolhe os autores;
o bloco bíblico continua aparecendo independentemente dessa seleção.

A escolha usa a data local. Reabrir não troca os textos e a virada do dia atualiza
os dois. Com todos os dez autores ativos, o ciclo filosófico tem 70 dias; o bíblico
faz um ciclo próprio de 28 dias. Com menos autores, o ciclo filosófico fica menor.
A expansão é aplicada uma única vez ao cadastro anterior, sem reativar autores que
o usuário desmarcar depois. Os textos não são gerados pelo Gemini e não dependem
da disponibilidade da API.
