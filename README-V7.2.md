# Vértice Gestão CRM V7.2

Projeto completo para abrir no VS Code e versionar no Git.

## Banco já existente
Não execute novamente os SQL antigos. No banco que já recebeu V7/V7.1, execute somente:
`sql/11_ATUALIZACAO_V7_2_ARQUIVAMENTO.sql`

## Configuração local
Preencha `config.js` somente com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`.
Nunca use `service_role`, secret key ou senha do banco no navegador/Git.

## Rodar localmente
Sirva a pasta por HTTP (ex.: extensão Live Server do VS Code ou outro servidor estático).
Abra `index.html` pelo servidor, não diretamente por `file://`.

## V7.2
Clientes e leads agora podem ser arquivados. Exclusão permanente exige digitar `EXCLUIR`.
Clientes com registros vinculados não são excluídos: devem ser arquivados.
