# Forja

Aplicativo pessoal de rotina, metas, treino, estudos e finanças.

## Abrir localmente

Com Node.js instalado, execute `node dev-server.mjs` nesta pasta e abra
http://localhost:5173. A autenticação e a sincronização usam o projeto configurado
em `js/supabase-client.js` e a tabela Supabase `app_state` já utilizada pelo app.

## Financeiro

- O mês selecionado vale para resumo, lançamentos, cartões, pagamentos e investimentos.
- Marque **Recorrente nos próximos meses** em receitas e despesas para repetir a partir da data indicada. As ocorrências futuras começam previstas.
- Salário e 13º são receitas com valor líquido informado. Lance cada parcela do 13º em sua data.
- O teto mensal equivale a **80% das receitas cadastradas naquele mês**, recebidas e previstas. Aportes não contam como despesa de consumo.
- A fatura total informada para um cartão/mês **substitui** a previsão das parcelas desse cartão naquele mês. Não é somada às parcelas novamente.
- Compras parceladas mantêm sua projeção para os meses seguintes, até que cada fatura seja informada. A primeira parcela entra no mês da data de referência.
- Em Lançamentos, confirme, edite ou exclua uma ocorrência. Encerrar repetição mantém as ocorrências anteriores.
- Contas fixas e orçamento legado são versionados a partir do mês selecionado. Os valores anteriores são preservados.
- O resumo e as projeções exibem despesas e investimentos separadamente. O disponível na conta desconta os aportes por serem transferências para a carteira, sem incluí-los nos gastos ou no teto de 80%.
- Investimentos aceitam saldo inicial/atual, aporte, resgate e rendimento. Só registros confirmados compõem o patrimônio; saldos não movimentam caixa. Não há conexão automática com bancos.
- O patrimônio previsto acumula os investimentos confirmados e os movimentos previstos até o mês selecionado. Ex.: R$ 2.080 em novembro + aporte previsto de R$ 1.000 em dezembro = R$ 3.080 previstos; dezembro registra só R$ 1.000 de aporte e nenhum gasto por esse investimento. Previsões podem ser editadas ou excluídas em Lançamentos.
- Em Investimentos, Aporte soma dinheiro novo; Saldo total substitui a posição anterior e não representa um aporte. Em Lançamentos, é possível corrigir o tipo e a aplicação de um registro já feito. Não são reclassificados registros antigos automaticamente.
- Em **Conciliar mês inicial**, informe o saldo real da conta e identifique aplicações formadas neste mês e empréstimos já descontados do salário líquido. O patrimônio não é somado novamente. A diferença inicial é registrada como conciliação, fora de receitas, despesas e teto, e não se repete em meses seguintes. Novos lançamentos continuam alterando o saldo previsto.
- Empréstimos já descontados do salário líquido permanecem no controle da dívida, sem novo débito no caixa ou no teto. A opção vale a partir do mês selecionado e pode ser alterada na edição do contrato.
- O planejamento dos próximos meses destaca a margem até o teto de 80%, as faturas já incluídas nas despesas e o potencial total de investimento (receitas menos despesas). Esse potencial inclui aportes já planejados; não gera um aporte extra nem muda o patrimônio. Compras no crédito são consideradas no mês da fatura.
- Em **Empréstimos → engrenagem → Salvar cronograma**, defina a primeira cobrança, quantidade e valor das parcelas. Marque **Provisionar a parcela mensal no planejamento** para reservar o valor de cada parcela como despesa desde a primeira cobrança. Desmarque somente se a receita líquida já veio com esse desconto. O cronograma lista cada mês como previsto ou pago; confirme em **Pagamentos** no mês da cobrança ou depois. Ex.: 45 parcelas desde fevereiro/2027 vão até outubro/2030, sem provisão antes ou depois.
- O gráfico compara seis meses; os trechos futuros são pontilhados. A comparação inclui obrigações previstas, não apenas pagamentos confirmados.
- O LIS é provisionado integralmente a partir do primeiro registro até uma nova atualização, sem estimar juros.

## Dados antigos

A atualização mantém a chave local `forja:v2` e adiciona campos ao JSON existente.
Não cria nem altera tabelas. O início dos empréstimos legados é estimado com base nas
parcelas pagas; pode ser corrigido na edição do contrato. Períodos sem registros
históricos completos refletem as regras disponíveis, não extratos bancários importados.

## Verificação

Execute `node --test tests/*.test.mjs` para verificar os cálculos.
Para conferir as telas sem usar uma conta real: `node tests/preview-server.mjs`.
Essa prévia roda somente em http://127.0.0.1:5174 com autenticação simulada no servidor
de teste; não acessa Supabase. `tests/mobile.html` contém uma janela de teste com 390 pixels.
