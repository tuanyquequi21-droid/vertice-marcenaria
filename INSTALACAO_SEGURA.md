# Vértice Gestão V3 — instalação no Supabase novo

## Se você já executou scripts da versão anterior
No Supabase > SQL Editor, execute primeiro `sql/00_ZERAR_BANCO.sql`.
ATENÇÃO: ele apaga as tabelas do Vértice no schema public. Use somente porque este projeto/banco foi criado do zero e ainda não contém dados que você queira preservar.
Ele NÃO apaga usuários de Authentication.

## Criar o banco V3
Execute, nesta ordem:
1. `sql/01_schema.sql`
2. `sql/02_security_rls.sql`
3. `sql/03_functions.sql`

Depois crie seu usuário em Authentication > Users.

Abra `sql/04_primeiro_admin_e_config.sql`, troque `SEU_EMAIL` pelo e-mail exato do usuário e execute.

## Conectar o CRM
Em `config.js`, informe apenas Project URL e Publishable Key.
Nunca use service_role, Secret key ou sb_secret_ no navegador.

## Rodar local
Na pasta do projeto:
`python -m http.server 5500`
Acesse `http://localhost:5500`.

## Orçamento V3
Inclui dados completos do cliente; MDF; ferragens; dias; quantidade de pessoas; valor/dia/pessoa; montagem; entrega; projeto 3D; custos operacionais cadastráveis; margem; custo; lucro; reinvestimento; prazo; validade; pagamento; observações internas e ao cliente.
A impressão para o cliente omite custos internos, mão de obra, quantidade de pessoas, montagem, margem, lucro e reinvestimento.
