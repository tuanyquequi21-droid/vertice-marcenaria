# Vértice Gestão V5
Execute somente `sql/07_ATUALIZACAO_V5_ORCAMENTO_COMPLETO.sql` sobre a V4.

Inclui: funções/mão de obra cadastráveis; seleção de vários materiais com quantidade/unidade/preço; vários projetos por orçamento; pesquisa; sugestão/reutilização de clientes; CPF duplicado tratado; origens de lead; pagamento e parcelamento; custo real sem margem.

IMPORTANTE: como a forma exata da taxa de 9% não foi definida, a V5 usa provisoriamente 9% ao mês com capitalização composta, aplicados após a primeira parcela. A taxa fica editável na tela.
Não execute novamente os scripts 00–06 e não zere o banco.
