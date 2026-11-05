-- VÉRTICE GESTÃO — endurecimento de segurança da homologação
-- Aplicado no projeto Supabase aikwxstfjftfgmmjhqyn em 2026-11-05.
-- Não apaga dados nem altera registros existentes.

begin;

-- Remove políticas antigas que permitiam acesso irrestrito a qualquer linha
-- para qualquer usuário autenticado, anulando o isolamento por empresa.
drop policy if exists "auth chapas" on public.chapas_mdf;
drop policy if exists "auth ferragens" on public.ferragens;
drop policy if exists "auth config" on public.config_global;
drop policy if exists "auth orcamentos" on public.orcamentos;
drop policy if exists "auth itens" on public.orcamento_itens;

-- Mantém as operações de exclusão previstas no Gestão, sempre limitadas
-- à empresa ativa e à permissão funcional do usuário.
drop policy if exists orcamentos_delete_company on public.orcamentos;
create policy orcamentos_delete_company
on public.orcamentos for delete to authenticated
using (empresa_id = public.minha_empresa() and public.tem_permissao('orcamentos.excluir'));

drop policy if exists itens_delete_company on public.orcamento_itens;
create policy itens_delete_company
on public.orcamento_itens for delete to authenticated
using (empresa_id = public.minha_empresa() and public.tem_permissao('orcamentos.editar'));

-- Remove privilégios estruturais desnecessários no cliente/API.
revoke truncate, references, trigger, maintain
on all tables in schema public
from anon, authenticated;

-- Evita múltiplas políticas permissivas para SELECT; operações de escrita
-- ficam separadas e continuam restritas ao administrador da empresa.
drop policy if exists mdf_write on public.chapas_mdf;
create policy mdf_insert on public.chapas_mdf for insert to authenticated
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy mdf_update on public.chapas_mdf for update to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin')
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy mdf_delete on public.chapas_mdf for delete to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');

drop policy if exists ferr_write on public.ferragens;
create policy ferr_insert on public.ferragens for insert to authenticated
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy ferr_update on public.ferragens for update to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin')
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy ferr_delete on public.ferragens for delete to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');

drop policy if exists cfg_write on public.config_global;
create policy cfg_insert on public.config_global for insert to authenticated
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy cfg_update on public.config_global for update to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin')
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy cfg_delete on public.config_global for delete to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');

drop policy if exists custos_write on public.custos_operacionais;
create policy custos_insert on public.custos_operacionais for insert to authenticated
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy custos_update on public.custos_operacionais for update to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin')
with check (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');
create policy custos_delete on public.custos_operacionais for delete to authenticated
using (empresa_id = public.minha_empresa() and public.meu_papel() = 'admin');

commit;

-- Corrige o RPC utilizado pelo módulo de versões no app-v7.
create or replace function public.listar_orcamento_versoes_seguras()
returns setof public.orcamento_versoes
language sql
stable
security invoker
set search_path = public
as $
  select v.*
  from public.orcamento_versoes v
  join public.orcamentos o on o.id = v.orcamento_id
  where o.empresa_id = public.minha_empresa()
    and public.tem_permissao('orcamentos.ver')
  order by v.orcamento_id, v.versao desc;
$;
revoke all on function public.listar_orcamento_versoes_seguras() from public, anon;
grant execute on function public.listar_orcamento_versoes_seguras() to authenticated, service_role;

-- Endurece os privilégios padrão de objetos criados pelo papel postgres.
-- Aplicado em migration própria no Supabase em 2026-11-05.
alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
revoke execute on functions from anon, authenticated;

-- PENDÊNCIA: ALTER DEFAULT PRIVILEGES para os proprietários postgres e
-- supabase_admin não foi aplicado pela integração (permissão negada).
-- Deve ser executado por um papel proprietário autorizado após validar
-- a matriz de grants das futuras tabelas/funções.
