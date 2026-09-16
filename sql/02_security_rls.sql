
-- SEGURANÇA: RLS + grants mínimos
create or replace function public.minha_empresa() returns uuid language sql stable security definer set search_path=public as $$
 select empresa_id from public.perfis where user_id=auth.uid() and ativo=true limit 1
$$;
create or replace function public.meu_papel() returns text language sql stable security definer set search_path=public as $$
 select papel from public.perfis where user_id=auth.uid() and ativo=true limit 1
$$;

alter table public.empresas enable row level security;
alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.chapas_mdf enable row level security;
alter table public.ferragens enable row level security;
alter table public.config_global enable row level security;
alter table public.custos_operacionais enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamento_custos enable row level security;
alter table public.crm_leads enable row level security;
alter table public.orcamentos enable row level security;
alter table public.crm_interacoes enable row level security;
alter table public.crm_tarefas enable row level security;
alter table public.auditoria enable row level security;

revoke all on public.empresas,public.perfis,public.clientes,public.chapas_mdf,public.ferragens,public.config_global,public.custos_operacionais,public.orcamento_itens,public.orcamento_custos,public.crm_leads,public.orcamentos,public.crm_interacoes,public.crm_tarefas,public.auditoria from anon;
grant select on public.empresas,public.perfis,public.clientes,public.chapas_mdf,public.ferragens,public.config_global,public.custos_operacionais,public.orcamento_itens,public.orcamento_custos,public.crm_leads,public.orcamentos,public.crm_interacoes,public.crm_tarefas,public.auditoria to authenticated;
grant insert,update on public.clientes,public.crm_leads,public.orcamentos,public.crm_interacoes,public.crm_tarefas to authenticated;
grant insert,update,delete on public.chapas_mdf,public.ferragens,public.config_global to authenticated;
grant usage,select on all sequences in schema public to authenticated;

create policy empresa_select on public.empresas for select to authenticated using(id=public.minha_empresa());
create policy perfil_select on public.perfis for select to authenticated using(empresa_id=public.minha_empresa());
create policy clientes_select on public.clientes for select to authenticated using(empresa_id=public.minha_empresa());
create policy clientes_insert on public.clientes for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy clientes_update on public.clientes for update to authenticated using(empresa_id=public.minha_empresa()) with check(empresa_id=public.minha_empresa());
create policy leads_select on public.crm_leads for select to authenticated using(empresa_id=public.minha_empresa());
create policy leads_insert on public.crm_leads for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy leads_update on public.crm_leads for update to authenticated using(empresa_id=public.minha_empresa()) with check(empresa_id=public.minha_empresa());
create policy orc_select on public.orcamentos for select to authenticated using(empresa_id=public.minha_empresa());
create policy orc_insert on public.orcamentos for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy orc_update on public.orcamentos for update to authenticated using(empresa_id=public.minha_empresa()) with check(empresa_id=public.minha_empresa());
create policy inter_select on public.crm_interacoes for select to authenticated using(empresa_id=public.minha_empresa());
create policy inter_insert on public.crm_interacoes for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy tarefa_select on public.crm_tarefas for select to authenticated using(empresa_id=public.minha_empresa());
create policy tarefa_insert on public.crm_tarefas for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy tarefa_update on public.crm_tarefas for update to authenticated using(empresa_id=public.minha_empresa()) with check(empresa_id=public.minha_empresa());
create policy mdf_select on public.chapas_mdf for select to authenticated using(empresa_id=public.minha_empresa());
create policy mdf_write on public.chapas_mdf for all to authenticated using(empresa_id=public.minha_empresa() and public.meu_papel()='admin') with check(empresa_id=public.minha_empresa() and public.meu_papel()='admin');
create policy ferr_select on public.ferragens for select to authenticated using(empresa_id=public.minha_empresa());
create policy ferr_write on public.ferragens for all to authenticated using(empresa_id=public.minha_empresa() and public.meu_papel()='admin') with check(empresa_id=public.minha_empresa() and public.meu_papel()='admin');
create policy cfg_select on public.config_global for select to authenticated using(empresa_id=public.minha_empresa());
create policy cfg_write on public.config_global for all to authenticated using(empresa_id=public.minha_empresa() and public.meu_papel()='admin') with check(empresa_id=public.minha_empresa() and public.meu_papel()='admin');
create policy audit_select on public.auditoria for select to authenticated using(empresa_id=public.minha_empresa() and public.meu_papel()='admin');

create policy custos_select on public.custos_operacionais for select to authenticated using(empresa_id=public.minha_empresa());
create policy custos_write on public.custos_operacionais for all to authenticated using(empresa_id=public.minha_empresa() and public.meu_papel()='admin') with check(empresa_id=public.minha_empresa() and public.meu_papel()='admin');
create policy itens_select on public.orcamento_itens for select to authenticated using(empresa_id=public.minha_empresa());
create policy itens_insert on public.orcamento_itens for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy itens_update on public.orcamento_itens for update to authenticated using(empresa_id=public.minha_empresa()) with check(empresa_id=public.minha_empresa());
create policy custos_orc_select on public.orcamento_custos for select to authenticated using(empresa_id=public.minha_empresa());
create policy custos_orc_insert on public.orcamento_custos for insert to authenticated with check(empresa_id=public.minha_empresa());
create policy custos_orc_update on public.orcamento_custos for update to authenticated using(empresa_id=public.minha_empresa()) with check(empresa_id=public.minha_empresa());
