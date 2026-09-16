# CHECKLIST V6 — Vértice Gestão

## Orçamento
- [x] Vários projetos/móveis em um orçamento
- [x] Descrição individual de cada projeto
- [x] Observação ao cliente separada
- [x] Observação interna não impressa
- [x] Seleção de vários materiais cadastrados
- [x] Unidade, quantidade, preço e subtotal por material
- [x] Snapshot do preço do material no orçamento
- [x] Campos genéricos Ferragens/Insumos removidos do cálculo
- [x] Custo real sem margem em tela
- [x] Margem (%) em tela
- [x] Valor do lucro (R$) em tela
- [x] Preço à vista em tela
- [x] Taxa de parcelamento como percentual TOTAL, não mensal
- [x] Valor da taxa em R$
- [x] Total parcelado e valor da parcela
- [x] Editar, recalcular e excluir orçamento
- [x] Impressão refeita para buscar os projetos salvos
- [x] Impressão mostra projeto, descrição, montagem, frete, total, pagamento, prazo, validade e observação ao cliente
- [x] Impressão NÃO mostra material, custo, mão de obra, margem, lucro ou observação interna

## Clientes
- [x] Pesquisa por texto na tela
- [x] Sugestão de clientes conforme digita o nome no orçamento
- [x] CPF existente oferece reutilização do cliente
- [x] Dados informados no orçamento criam/completam cadastro
- [x] Máscaras de CPF, telefone e CEP
- [x] Consulta de CEP mantida

## CRM
- [x] Origens em lista
- [x] Cadastro/edição de origens
- [x] Classificação A/B/C/D com significado
- [x] Registrar interação/contato
- [x] Criar retorno/tarefa
- [x] Concluir retorno
- [x] Abrir WhatsApp com mensagem preenchida (sem envio automático)
- [x] Converter lead em cliente
- [x] Pipeline mantido

## Mão de obra
- [x] Cadastro de funcionários
- [x] Cadastro de funções
- [x] Valor padrão por função
- [x] Forma de cálculo: dia, hora ou fixo
- [x] Funcionário pode ter função padrão
- [x] Campos da linha de mão de obra possuem rótulos
- [x] Várias linhas de mão de obra no orçamento
- [x] Snapshot do funcionário, função e valor no orçamento

## Materiais / Produção / Financeiro
- [x] Materiais com edição/exclusão
- [x] Produção e cronograma interno mantidos
- [x] Financeiro integrado ao menu
- [x] Entradas, saídas e saldo
- [x] Novo lançamento financeiro
- [x] Tabela transacoes preservada/adaptada por migração incremental

## Validações executadas antes da entrega
- [x] JavaScript validado com Node --check
- [x] Referências de funções principais verificadas
- [x] Fórmula de margem conferida: preço = custo / (1 - margem)
- [x] Lucro conferido: preço à vista - custo
- [x] Taxa parcelada conferida: preço à vista × taxa TOTAL
- [x] Parcelado conferido: preço à vista + valor da taxa
- [x] SQL é incremental: não contém DROP TABLE nem TRUNCATE
- [x] Correção de tipo/descricao de orcamento_itens incorporada
