-- ATENÇÃO: APAGA SOMENTE AS TABELAS DO VÉRTICE NO SCHEMA PUBLIC.
-- NÃO apaga usuários do Supabase Auth nem configurações do projeto.
drop table if exists public.auditoria cascade;
drop table if exists public.crm_tarefas cascade;
drop table if exists public.crm_interacoes cascade;
drop table if exists public.orcamento_custos cascade;
drop table if exists public.orcamento_itens cascade;
drop table if exists public.orcamentos cascade;
drop table if exists public.custos_operacionais cascade;
drop table if exists public.config_global cascade;
drop table if exists public.ferragens cascade;
drop table if exists public.chapas_mdf cascade;
drop table if exists public.crm_leads cascade;
drop table if exists public.clientes cascade;
drop table if exists public.perfis cascade;
drop table if exists public.empresas cascade;
drop function if exists public.minha_empresa() cascade;
drop function if exists public.meu_papel() cascade;
drop function if exists public.set_empresa_id() cascade;
drop function if exists public.touch_updated_at() cascade;
