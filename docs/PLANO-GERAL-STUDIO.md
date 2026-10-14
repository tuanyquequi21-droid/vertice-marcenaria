# Vértice Studio — arquitetura geral (fase de integração)

## Estado validado pelo usuário
A demonstração local V7 do editor modular foi aprovada visualmente. Isso **não** constitui homologação de produção nem validação dimensional de fabricação. A V7 foi entregue como HTML local e precisa ser incorporada ao repositório antes de servir como base de integração.

## Objetivo
Criar projetos por ambiente, inserir móveis parametrizados por módulos e transformar a lista de peças em insumos para orçamento e produção, sem alterar os dados de clientes/orçamentos existentes.

## Entidades propostas
- **studio_projects**: id UUID, organization/user ownership, cliente_id opcional, orçamento_id opcional, nome, status, version, created_at, updated_at.
- **studio_rooms**: id UUID, project_id, nome, largura_mm, comprimento_mm, altura_mm, aberturas JSON validado.
- **studio_furniture**: id UUID, room_id, nome, tipo, posição/rotação, dimensões, parâmetros JSON versionados.
- **studio_modules**: id UUID, furniture_id, ordem, largura_mm, configuração JSON (portas, gavetas, prateleiras, cabideiro, acabamento).
- **studio_material_snapshots**: project_id, versão de cálculo, peças e custos calculados, criado_em.
- **studio_public_shares**: id, project_id, token hash, escopo somente leitura, validade, revogação.

## Regras de cálculo e fabricação
1. Um módulo tem largura própria; os módulos são dispostos sequencialmente sem sobreposição.
2. Divisórias estruturais compartilhadas são contabilizadas uma única vez, com espessura explícita.
3. Frentes e caixas de gavetas respeitam a largura útil do módulo e folgas parametrizáveis por tipo de corrediça.
4. Materiais e espessuras podem variar por componente; bordas, veios, fundos, folgas, ferragens e usinagens são registrados separadamente.
5. Plano de corte e preço só são liberados para fabricação após validação de dimensões, regras construtivas e conferência humana.
6. A estimativa deve registrar hipóteses, versão do algoritmo e origem dos preços.

## Etapas técnicas
1. **Base V7**: incorporar o HTML aprovado ao GitHub, extrair núcleo de cálculos puro e testes automatizados.
2. **Projeto e ambientes**: cadastro local versionado, paredes, aberturas, móveis, posicionamento e câmera.
3. **Editor modular**: configurações por módulo, arrastar/reordenar, prateleiras com alturas, gavetas por vão, materiais, portas e ferragens.
4. **Orçamento**: composição de peças, chapas, fita, ferragens, perdas, mão de obra, preço e vínculo opcional ao orçamento.
5. **Persistência Supabase**: migrações aditivas, RLS por usuário/organização, validação de ownership, logs e recuperação de versões.
6. **Compartilhamento**: apresentação de cliente somente leitura, expiração e revogação de links.
7. **Homologação**: testes unitários, regressão de Vértice Gestão, navegador e celular, testes de autorização e recuperação de backup.

## Portões para produção
- Backup verificável de Postgres, Storage e configurações relevantes; teste de restauração.
- Revisão das policies RLS, views SECURITY DEFINER, RPCs e Edge Functions existentes.
- Ambiente de homologação isolado, sem dados sensíveis reais.
- CI verde, testes de interface e checklist de fabricação concluídos.
- Aprovação explícita de publicação após demonstração.

**Não executar migrações nem deploy em produção durante esta etapa de desenho.**
