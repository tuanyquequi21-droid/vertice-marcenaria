# Auditoria técnica — Vértice Gestão / Studio 3D

Data: 2026-10-13
Status: EM ANDAMENTO — análise estática inicial, sem execução do sistema nem acesso ao banco de produção.
Origem: branch main, repositório tuanyquequi21-droid/vertice-marcenaria.

## Objetivo
Preservar as funcionalidades atuais; diagnosticar erros; definir testes de regressão; implementar Studio 3D e integração com CRM, orçamento, materiais, produção e compartilhamento seguro.

## Evidências iniciais
- index.html carrega config.js, assets/js/app-v6.js e assets/js/app-v7.js nessa ordem.
- app-v7.js guarda referências a funções V6 e redefine load, page, dashboard, leads, clientes, openClient e outras funções. Isso exige mapa de dependências e testes antes de refatoração.
- app-v6.js usa Supabase Auth e consultas a tabelas crm_leads, clientes, orcamentos, materiais, custos_operacionais, producao, crm_tarefas, crm_interacoes, chapas_mdf, ferragens, mao_obra_funcoes, origens_lead, funcionarios, transacoes, config_global.
- app-v6.js consulta orçamentos por RPC listar_orcamentos_seguros; app-v7.js usa RPC listar_orcamento_versoes_seguras. Precisamos conferir definições e permissões no banco.
- Funções q/v7q devolvem [] em erros de consulta; isso pode mascarar indisponibilidade ou erro de permissão como conjunto vazio.
- config.js contém URL Supabase e chave publishable. A chave publishable é destinada ao cliente; conferir RLS e nunca introduzir service_role no navegador.
- package.json e README.md não encontrados na raiz por consulta direta. Não implica ausência de testes em outros diretórios.

## Matriz de preservação (a validar funcionalmente)
1. Login, sessão, logout e permissões.
2. Dashboard, leads, pipeline, classificação e tarefas.
3. Cadastro de clientes, CPF, busca, interações e pós-venda.
4. Orçamentos: itens, custos, margens, versões, aprovação e propostas.
5. Produção: ordens, prazos, status e integração com orçamento.
6. Chapas MDF, ferragens, materiais e mão de obra.
7. Financeiro, transações, relatórios e comunicação.
8. Responsividade e compatibilidade com navegador móvel.

## Riscos e prioridades
P0: Não alterar main nem dados reais antes de testes, backups e validação de políticas.
P1: Mapear esquema/RLS/RPC e fluxo de aprovação de orçamento.
P1: Adicionar observabilidade de erros e testes de regressão.
P2: Desacoplar camadas V6/V7 de modo incremental.
P2: Definir tabelas studio_projects, studio_scenes, studio_modules, studio_materials, studio_shares com migrações reversíveis.
P2: Prototipar editor 3D paramétrico, lista de corte, orçamento e visualizador público com token e expiração.
P3: Avaliar importação de planta, reconstrução por fotos, instalações elétricas/hidráulicas/gás como funcionalidades assistidas, não automáticas sem validação técnica.

## Critérios para liberar
- Nenhuma regressão nas rotinas existentes.
- Migrações versionadas, revisadas e reversíveis.
- Testes automatizados e testes manuais documentados.
- Compartilhamento cliente somente leitura, com regras RLS testadas.
- Conferência de valores, unidades, espessuras, fitas e ferragens.
- Aprovação explícita antes de integrar na main ou modificar banco de produção.

## Próxima etapa
Inventariar todos os arquivos e fluxos, verificar esquema SQL, consolidar relatório com gravidade/evidências e construir suíte de testes. Atualizar este documento à medida que a auditoria avançar.

## Revisão incremental — 2026-10-13
- Confirmado no código V7: há também camada V8/V8.1 com permissões por usuário e orçamento comercial via Edge Function `manage-quote`. Essa camada deve entrar na matriz de preservação; não presumir que o sistema seja apenas V6/V7.
- `proposta.html` usa RPCs `get_proposta_publica` e `aprovar_proposta_publica`. Verificar política de tokens, expiração, escopo de dados e idempotência do aceite antes de adicionar tours públicos.
- `financeiro()` na V6 usava `x.valor || x.valor_total`; um valor zero explícito podia ser trocado por `valor_total`. Corrigido na branch com `transactionAmount` e testes em `tests/financeiro.test.cjs`. A correção ainda não foi validada em navegador/banco reais.
- `convertLead()` na V6 cria cliente e depois atualiza lead em duas operações independentes, sem transação; pode deixar estado parcialmente convertido. Revisar possibilidade de RPC transacional e permissões antes de corrigir.
- Próxima validação: executar `node --test tests/financeiro.test.cjs`, analisar funções de permissão V8, conferir schema/RLS/RPC e reproduzir os fluxos críticos em ambiente de teste.
