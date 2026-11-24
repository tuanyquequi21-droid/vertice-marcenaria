
-- Vértice Gestão — correções de isolamento por empresa e salvamento de orçamento
-- Aplicado no projeto Supabase aikwxstfjftfgmmjhqyn em 24/11/2026.

-- Garante empresa_id nos itens do orçamento usando a empresa do orçamento pai.
create or replace function public.preencher_empresa_orcamento_item()
returns trigger language plpgsql set search_path = public as $$
declare v_empresa_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  select o.empresa_id into v_empresa_id
    from public.orcamentos o
   where o.id = new.orcamento_id
     and o.empresa_id = public.minha_empresa();
  if v_empresa_id is null then
    raise exception 'Orçamento não encontrado ou não pertence à empresa do usuário.';
  end if;
  new.empresa_id := v_empresa_id;
  return new;
end;
$$;

drop trigger if exists preencher_empresa_orcamento_item on public.orcamento_itens;
create trigger preencher_empresa_orcamento_item
before insert or update of orcamento_id, empresa_id on public.orcamento_itens
for each row execute function public.preencher_empresa_orcamento_item();

-- Substitui projetos, materiais e mão de obra em uma única transação.
-- Se qualquer insert falhar, o PostgreSQL desfaz também os deletes anteriores.
create or replace function public.substituir_itens_orcamento(
  p_orcamento_id bigint,
  p_projetos jsonb default '[]'::jsonb,
  p_materiais jsonb default '[]'::jsonb,
  p_mao_obra jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_empresa_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if not public.tem_permissao('orcamentos.editar') then
    raise exception 'Sem permissão para editar orçamentos.';
  end if;
  select o.empresa_id into v_empresa_id
    from public.orcamentos o
   where o.id = p_orcamento_id and o.empresa_id = public.minha_empresa();
  if v_empresa_id is null then raise exception 'Orçamento não encontrado ou sem acesso.'; end if;
  if jsonb_typeof(coalesce(p_projetos,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_materiais,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_mao_obra,'[]'::jsonb)) <> 'array' then
    raise exception 'Os itens do orçamento devem ser enviados em listas.';
  end if;

  delete from public.orcamento_itens where orcamento_id=p_orcamento_id;
  delete from public.orcamento_mao_obra where orcamento_id=p_orcamento_id;
  delete from public.orcamento_projetos where orcamento_id=p_orcamento_id;

  insert into public.orcamento_projetos(orcamento_id,nome,descricao_cliente,ordem)
  select p_orcamento_id,x.nome,x.descricao_cliente,coalesce(x.ordem,0)
    from jsonb_to_recordset(coalesce(p_projetos,'[]'::jsonb))
      as x(nome text,descricao_cliente text,ordem integer)
   where nullif(trim(x.nome),'') is not null;

  insert into public.orcamento_itens(
    orcamento_id,empresa_id,tipo,descricao,material_id,nome_material,
    categoria_material,unidade,quantidade,valor_unitario,subtotal
  )
  select p_orcamento_id,v_empresa_id,x.tipo,x.descricao,x.material_id,
         x.nome_material,x.categoria_material,x.unidade,x.quantidade,
         x.valor_unitario,x.subtotal
    from jsonb_to_recordset(coalesce(p_materiais,'[]'::jsonb))
      as x(tipo text,descricao varchar(200),material_id bigint,
           nome_material text,categoria_material text,unidade text,
           quantidade numeric(12,3),valor_unitario numeric(12,2),subtotal numeric(12,2));

  insert into public.orcamento_mao_obra(
    orcamento_id,funcionario_id,funcionario_nome,funcao_id,funcao_nome,
    unidade,quantidade_pessoas,quantidade_tempo,valor_unitario,subtotal
  )
  select p_orcamento_id,x.funcionario_id,x.funcionario_nome,x.funcao_id,
         x.funcao_nome,x.unidade,x.quantidade_pessoas,x.quantidade_tempo,
         x.valor_unitario,x.subtotal
    from jsonb_to_recordset(coalesce(p_mao_obra,'[]'::jsonb))
      as x(funcionario_id bigint,funcionario_nome text,funcao_id bigint,
           funcao_nome text,unidade text,quantidade_pessoas numeric,
           quantidade_tempo numeric,valor_unitario numeric,subtotal numeric);

  return jsonb_build_object('ok',true,'orcamento_id',p_orcamento_id);
end;
$$;
revoke all on function public.substituir_itens_orcamento(bigint,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.substituir_itens_orcamento(bigint,jsonb,jsonb,jsonb) to authenticated;

-- Preenche automaticamente empresa_id nos módulos que gravam dados sem enviar esse campo.
-- A política RLS continua validando a empresa do usuário.
drop trigger if exists gestao_empresa_auto on public.auditoria;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.auditoria for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.automacoes_crm;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.automacoes_crm for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.calculadora_nichos_config;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.calculadora_nichos_config for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.chapas_mdf;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.chapas_mdf for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.clientes;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.clientes for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.config_global;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.config_global for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.crm_interacoes;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.crm_interacoes for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.crm_leads;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.crm_leads for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.crm_tarefas;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.crm_tarefas for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.custos_operacionais;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.custos_operacionais for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.estoque_inteligente;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.estoque_inteligente for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.estoque_movimentos;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.estoque_movimentos for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.estoque_reservas;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.estoque_reservas for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.ferragens;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.ferragens for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.gestao2_registros;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.gestao2_registros for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.gestao_plus_registros;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.gestao_plus_registros for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.mensagens_modelo;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.mensagens_modelo for each row execute function public.gestao_preencher_empresa();
drop trigger if exists gestao_empresa_auto on public.orcamento_custos;
create trigger gestao_empresa_auto before insert or update of empresa_id on public.orcamento_custos for each row execute function public.gestao_preencher_empresa();
