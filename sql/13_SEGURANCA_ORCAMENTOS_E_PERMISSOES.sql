-- VÉRTICE MARCENARIA
-- MIGRATION 13 - CAMADA SEGURA DE PERMISSÕES E ORÇAMENTOS
-- Executar somente após a Migration 12. Não reexecutar migrations 00-12.

begin;

create or replace function public.minhas_permissoes()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_perfil public.perfis%rowtype;
  v_permissoes jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;

  select * into v_perfil
  from public.perfis
  where user_id = auth.uid()
  limit 1;

  if not found then raise exception 'Perfil do usuário não encontrado.'; end if;
  if coalesce(v_perfil.ativo,false)=false then raise exception 'Usuário desativado.'; end if;

  select coalesce(jsonb_agg(p.codigo order by p.codigo),'[]'::jsonb)
    into v_permissoes
    from public.permissoes p
   where public.tem_permissao(p.codigo);

  return jsonb_build_object(
    'user_id',v_perfil.user_id,
    'empresa_id',v_perfil.empresa_id,
    'nome',v_perfil.nome,
    'email',v_perfil.email,
    'papel',v_perfil.papel,
    'ativo',v_perfil.ativo,
    'permissoes',v_permissoes
  );
end;
$$;

revoke all on function public.minhas_permissoes() from public;
grant execute on function public.minhas_permissoes() to authenticated;

-- Views seguras. Custos/lucro só retornam dados com a permissão correspondente.

create or replace view public.orcamentos_comerciais
with (security_barrier = true)
as
select
  id,empresa_id,lead_id,cliente_id,
  cliente_nome,cliente_cpf,cliente_telefone,cliente_email,
  cliente_cep,cliente_endereco,cliente_numero,cliente_cidade,cliente_uf,
  projeto,ambiente,descricao_cliente,observacoes_internas,observacoes_cliente,
  prazo_entrega_dias,validade_dias,condicoes_pagamento,
  preco_final,status,criado_por,data_criacao,atualizado_em,
  forma_pagamento,numero_parcelas,valor_final_parcelado,
  desconto_percentual,versao_atual,aprovado_em,
  public_token,aceite_nome,aceite_em
from public.orcamentos
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver');

create or replace view public.orcamentos_custos
with (security_barrier = true)
as
select
  id,empresa_id,dias_trabalho,quantidade_pessoas,valor_dia_pessoa,
  valor_montagem,km_entrega,horas_3d,custo_producao,
  reinvestimento_materials,detalhes_calculo,taxa_parcelamento,
  valor_sem_margem,valor_antes_parcelamento
from public.orcamentos
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_custos');

create or replace view public.orcamentos_lucro
with (security_barrier = true)
as
select id,empresa_id,valor_lucro,margem_lucro,margem_minima_alerta
from public.orcamentos
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_lucro');

create or replace view public.orcamento_versoes_comerciais
with (security_barrier = true)
as
select id,empresa_id,orcamento_id,versao,preco_final,status,criado_em
from public.orcamento_versoes
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver');

create or replace view public.orcamento_versoes_custos
with (security_barrier = true)
as
select id,empresa_id,orcamento_id,versao,custo_producao
from public.orcamento_versoes
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_custos');

create or replace view public.orcamento_versoes_lucro
with (security_barrier = true)
as
select id,empresa_id,orcamento_id,versao,valor_lucro,margem_lucro
from public.orcamento_versoes
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_lucro');

create or replace view public.orcamento_versoes_dados_internos
with (security_barrier = true)
as
select id,empresa_id,orcamento_id,versao,dados
from public.orcamento_versoes
where empresa_id=public.minha_empresa()
  and public.tem_permissao('orcamentos.ver')
  and public.tem_permissao('orcamentos.ver_custos')
  and public.tem_permissao('orcamentos.ver_lucro');

revoke all on public.orcamentos_comerciais,public.orcamentos_custos,
 public.orcamentos_lucro,public.orcamento_versoes_comerciais,
 public.orcamento_versoes_custos,public.orcamento_versoes_lucro,
 public.orcamento_versoes_dados_internos from anon;

grant select on public.orcamentos_comerciais,public.orcamentos_custos,
 public.orcamentos_lucro,public.orcamento_versoes_comerciais,
 public.orcamento_versoes_custos,public.orcamento_versoes_lucro,
 public.orcamento_versoes_dados_internos to authenticated;

-- Consulta individual segura.

create or replace function public.obter_orcamento_seguro(p_orcamento_id bigint)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_result jsonb;
  v_extra jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if not public.tem_permissao('orcamentos.ver') then
    raise exception 'Sem permissão para visualizar orçamentos.';
  end if;

  select to_jsonb(o) into v_result
  from public.orcamentos_comerciais o
  where o.id=p_orcamento_id limit 1;

  if v_result is null then raise exception 'Orçamento não encontrado ou sem acesso.'; end if;

  if public.tem_permissao('orcamentos.ver_custos') then
    select to_jsonb(c)-'id'-'empresa_id' into v_extra
    from public.orcamentos_custos c where c.id=p_orcamento_id limit 1;
    v_result:=v_result||coalesce(v_extra,'{}'::jsonb);
  end if;

  if public.tem_permissao('orcamentos.ver_lucro') then
    select to_jsonb(l)-'id'-'empresa_id' into v_extra
    from public.orcamentos_lucro l where l.id=p_orcamento_id limit 1;
    v_result:=v_result||coalesce(v_extra,'{}'::jsonb);
  end if;

  return v_result;
end;
$$;

revoke all on function public.obter_orcamento_seguro(bigint) from public;
grant execute on function public.obter_orcamento_seguro(bigint) to authenticated;

-- Listagem segura que substitui orcamentos.select("*") no frontend.

create or replace function public.listar_orcamentos_seguros()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if not public.tem_permissao('orcamentos.ver') then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(
    to_jsonb(o)
    || case when public.tem_permissao('orcamentos.ver_custos') then
       coalesce((select to_jsonb(c)-'id'-'empresa_id'
                 from public.orcamentos_custos c where c.id=o.id limit 1),'{}'::jsonb)
       else '{}'::jsonb end
    || case when public.tem_permissao('orcamentos.ver_lucro') then
       coalesce((select to_jsonb(l)-'id'-'empresa_id'
                 from public.orcamentos_lucro l where l.id=o.id limit 1),'{}'::jsonb)
       else '{}'::jsonb end
    order by o.data_criacao desc,o.id desc
  ),'[]'::jsonb)
  into v_result
  from public.orcamentos_comerciais o;

  return v_result;
end;
$$;

revoke all on function public.listar_orcamentos_seguros() from public;
grant execute on function public.listar_orcamentos_seguros() to authenticated;

-- Listagem segura que substitui orcamento_versoes.select("*") no frontend.

create or replace function public.listar_orcamento_versoes_seguras()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if not public.tem_permissao('orcamentos.ver') then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(
    to_jsonb(v)
    || case when public.tem_permissao('orcamentos.ver_custos') then
       coalesce((select to_jsonb(c)-'id'-'empresa_id'-'orcamento_id'-'versao'
                 from public.orcamento_versoes_custos c where c.id=v.id limit 1),'{}'::jsonb)
       else '{}'::jsonb end
    || case when public.tem_permissao('orcamentos.ver_lucro') then
       coalesce((select to_jsonb(l)-'id'-'empresa_id'-'orcamento_id'-'versao'
                 from public.orcamento_versoes_lucro l where l.id=v.id limit 1),'{}'::jsonb)
       else '{}'::jsonb end
    || case when public.tem_permissao('orcamentos.ver_custos')
             and public.tem_permissao('orcamentos.ver_lucro') then
       coalesce((select to_jsonb(d)-'id'-'empresa_id'-'orcamento_id'-'versao'
                 from public.orcamento_versoes_dados_internos d where d.id=v.id limit 1),'{}'::jsonb)
       else '{}'::jsonb end
    order by v.orcamento_id desc,v.versao desc
  ),'[]'::jsonb)
  into v_result
  from public.orcamento_versoes_comerciais v;

  return v_result;
end;
$$;

revoke all on function public.listar_orcamento_versoes_seguras() from public;
grant execute on function public.listar_orcamento_versoes_seguras() to authenticated;

-- Mantém SELECT * da tabela-base bloqueado.
-- O frontend V8 passará a usar as RPCs acima.

revoke select on public.orcamentos from authenticated;
grant select (
  id,empresa_id,lead_id,cliente_id,cliente_nome,cliente_cpf,
  cliente_telefone,cliente_email,cliente_cep,cliente_endereco,
  cliente_numero,cliente_cidade,cliente_uf,projeto,ambiente,
  descricao_cliente,observacoes_internas,observacoes_cliente,
  prazo_entrega_dias,validade_dias,condicoes_pagamento,preco_final,
  status,criado_por,data_criacao,atualizado_em,forma_pagamento,
  numero_parcelas,valor_final_parcelado,desconto_percentual,
  versao_atual,aprovado_em,public_token,aceite_nome,aceite_em
) on public.orcamentos to authenticated;

revoke select on public.orcamento_versoes from authenticated;
grant select (
  id,empresa_id,orcamento_id,versao,preco_final,status,criado_em
) on public.orcamento_versoes to authenticated;

insert into public.sistema_migrations(versao,descricao)
values(
  '13-v7.4-seguranca-orcamentos',
  'RPC de permissoes efetivas e camada segura de leitura de orcamentos e versoes'
)
on conflict(versao) do nothing;

commit;
