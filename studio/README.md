# Vértice Studio 3D — protótipo inicial

## Estado
Protótipo isolado na branch `auditoria-studio-3d`. Não altera o site principal, tabelas do Supabase nem dados de clientes.

## Abrir
Sirva a raiz do repositório em servidor HTTP local (por exemplo, `python -m http.server 8000`) e abra `http://localhost:8000/studio/`. Requer internet para carregar a biblioteca Three.js por CDN.

## Escopo implementado
- Visualização 3D de armário paramétrico simples, com largura, altura, profundidade, espessura, prateleiras e 0–2 portas.
- Lista preliminar de peças e cálculo estimado de área de MDF, fita de borda e custo.
- Testes unitários do núcleo sem dependências externas.

## Testes
`node --test studio/engine.test.mjs tests/financeiro.test.cjs`

Ainda não há execução comprovada desses testes em ambiente de navegador ou com Supabase. Antes de produção, validar todos os casos reais e conferir a compatibilidade do motor com padrões de fabricação.

## Limitações importantes
- Sem gravação no Supabase, cadastro de projetos, vínculo com CRM/orçamentos ou publicação de tours.
- Sem planos de corte otimizados, dobradiças, corrediças, usinagem, folgas específicas ou modelagem de ferragens.
- Portas e fundo são aproximações geométricas; não equivalem a um projeto executivo.
- Preço informado manualmente, sem vínculo com tabela de custos real.
- Não interpreta automaticamente fotos, plantas, instalações elétricas, hidráulicas ou gás.
- Não utilizar o quantitativo para fabricar sem revisão humana.

## Preservação e backups
O snapshot do código principal foi preservado na branch `backup-site-2026-10-13`. Essa branch **não** é backup do banco Supabase, Storage, autenticação ou configurações de deploy. Gerar backup do banco por meios oficiais, verificar restauração em ambiente isolado e proteger os arquivos antes de migrações.

## Próximos marcos
1. Executar testes e inspecionar manualmente interface desktop e celular.
2. Inventariar esquema Supabase, RLS, RPCs, Edge Functions e fluxo V8 de orçamentos.
3. Definir modelo de dados versionado e integração segura com orçamentos.
4. Criar projetos persistidos, editor com módulos, ferragens e orçamento detalhado.
5. Implementar compartilhamento somente leitura e testes de acesso.
6. Expandir importação de planta/fotos e validação de instalações com limites claros.


## Recursos adicionais (13/10/2026)
- Arrastar o modelo com mouse ou toque para girar a visualização.
- Salvar e recuperar um projeto de armário no armazenamento **local do navegador** (um projeto por navegador).
- Exportar e importar projeto JSON com validação de parâmetros.
- Exportar lista preliminar de peças CSV (separador `;`, UTF-8 BOM).
- Centralizar a visualização.

**Limitações:** dados locais podem ser apagados ao limpar o navegador; faça backup pelo botão Exportar. Não existe sincronização com Supabase nem autenticação no Studio nesta etapa. A lista de peças não é plano de corte otimizado e requer conferência antes da fabricação. Ainda não há teste funcional no navegador ou implantação homologada.
