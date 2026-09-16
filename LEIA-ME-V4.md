# Vértice Gestão V4

Nova interface profissional em preto, grafite, branco/cinza claro e dourado, com fontes e componentes mais compactos.

## Principais mudanças
- menu lateral retrátil;
- “MDF e Ferragens” substituído por “Materiais”;
- materiais com cadastro, edição, exclusão, fornecedor, unidade, preço e estoque;
- preços novos não alteram o histórico dos orçamentos já gravados;
- orçamento editável, recalculável, excluível e imprimível;
- CPF, CEP e telefone com máscara;
- busca automática de endereço pelo CEP;
- orçamento comercial com dados completos do cliente, prazo, montagem e frete discriminados;
- custos internos, mão de obra, pessoas, margem e lucro não aparecem na impressão;
- módulo Produção com início de fabricação, duração, conclusão, montagem, entrega e status;
- orçamento pode ser enviado para Produção;
- CRM, clientes, pipeline, agenda, custos e relatórios permanecem integrados.

## Atualização do Supabase
Se a V3/V3.1 já está instalada, execute SOMENTE:
`sql/06_ATUALIZACAO_V4_PRODUCAO_MATERIAIS.sql`

Não zere o banco.

## Configuração
Mantenha no `config.js` a Project URL e a Publishable Key do seu projeto Supabase.
Nunca coloque Secret Key/service_role no navegador.
