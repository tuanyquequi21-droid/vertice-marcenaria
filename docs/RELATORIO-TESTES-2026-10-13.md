# Relatório de testes — 13/10/2026

## Realizado
- Backup do código principal preservado na branch `backup-site-2026-10-13`.
- Protótipo 3D independente disponível em `studio/index.html` (Three.js por CDN).
- Núcleo de materiais disponível em `studio/engine.mjs`.
- Verificações diretas do núcleo: 6/6 passaram (padrão, sem portas, sem prateleiras, custo positivo, largura inválida, portas inválidas).
- Workflow GitHub Actions adicionado em `.github/workflows/studio-tests.yml` para rodar `node --test studio/engine.test.mjs tests/financeiro.test.cjs`.

## Ainda não validado
- Resultado do workflow GitHub Actions.
- Abertura do protótipo em navegador real, incluindo celular.
- Persistência de projetos e integração Supabase.
- Backups do banco de dados e Storage.
- Segurança dos RPCs e views sinalizados pela auditoria.
- Qualquer cálculo como plano de corte ou projeto executivo.

## Teste manual sem afetar produção
Baixe o repositório pela branch `auditoria-studio-3d`, abra um servidor HTTP local na pasta raiz (`python -m http.server 8000`) e acesse `http://localhost:8000/studio/`. O protótipo usa a biblioteca Three.js hospedada em CDN e não acessa o banco de produção.

## Próxima entrega
Executar CI e teste visual; corrigir falhas; preparar hospedagem de homologação isolada antes de divulgar um endereço público.