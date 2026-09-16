-- V3.1 - Execute uma vez no SQL Editor. NÃO precisa zerar o banco.
drop policy if exists orcamentos_delete on public.orcamentos;
create policy orcamentos_delete on public.orcamentos
for delete to authenticated
using (empresa_id = public.minha_empresa());
