-- VÉRTICE GESTÃO
-- MIGRATION 14 - ORÇAMENTO COMERCIAL SEGURO
-- Permite que operações internas executadas exclusivamente com service_role
-- gravem custos calculados no backend, sem expor esses campos ao navegador.

begin;

create or replace function public.proteger_campos_internos_orcamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Edge Functions confiáveis usam service_role. O token service_role nunca fica no frontend.
    if auth.role() = 'service_role' then
        return new;
    end if;

    if tg_op = 'INSERT' then
        if not public.tem_permissao('orcamentos.ver_custos') and (
            coalesce(new.dias_trabalho,0) <> 0
            or coalesce(new.quantidade_pessoas,1) <> 1
            or coalesce(new.valor_dia_pessoa,0) <> 0
            or coalesce(new.valor_montagem,0) <> 0
            or coalesce(new.km_entrega,0) <> 0
            or coalesce(new.horas_3d,0) <> 0
            or coalesce(new.custo_producao,0) <> 0
            or coalesce(new.reinvestimento_materials,0) <> 0
            or coalesce(new.detalhes_calculo,'{}'::jsonb) <> '{}'::jsonb
            or coalesce(new.taxa_parcelamento,9) <> 9
            or coalesce(new.valor_sem_margem,0) <> 0
            or coalesce(new.valor_antes_parcelamento,0) <> 0
        ) then
            raise exception 'Sem permissão para informar custos internos do orçamento.';
        end if;
        if not public.tem_permissao('orcamentos.alterar_margem') and new.margem_lucro is not null then
            raise exception 'Sem permissão para definir a margem do orçamento.';
        end if;
        if not public.tem_permissao('orcamentos.ver_lucro') and coalesce(new.valor_lucro,0) <> 0 then
            raise exception 'Sem permissão para informar lucro do orçamento.';
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if not public.tem_permissao('orcamentos.ver_custos') and (
            new.dias_trabalho is distinct from old.dias_trabalho
            or new.quantidade_pessoas is distinct from old.quantidade_pessoas
            or new.valor_dia_pessoa is distinct from old.valor_dia_pessoa
            or new.valor_montagem is distinct from old.valor_montagem
            or new.km_entrega is distinct from old.km_entrega
            or new.horas_3d is distinct from old.horas_3d
            or new.custo_producao is distinct from old.custo_producao
            or new.reinvestimento_materials is distinct from old.reinvestimento_materials
            or new.detalhes_calculo is distinct from old.detalhes_calculo
            or new.taxa_parcelamento is distinct from old.taxa_parcelamento
            or new.valor_sem_margem is distinct from old.valor_sem_margem
            or new.valor_antes_parcelamento is distinct from old.valor_antes_parcelamento
        ) then
            raise exception 'Sem permissão para alterar custos internos do orçamento.';
        end if;
        if not public.tem_permissao('orcamentos.alterar_margem') and new.margem_lucro is distinct from old.margem_lucro then
            raise exception 'Sem permissão para alterar a margem do orçamento.';
        end if;
        if not public.tem_permissao('orcamentos.ver_lucro') and new.valor_lucro is distinct from old.valor_lucro then
            raise exception 'Sem permissão para alterar o lucro do orçamento.';
        end if;
        return new;
    end if;
    return new;
end;
$$;

create or replace function public.proteger_campos_internos_orcamento_versao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.role() = 'service_role' then
        return new;
    end if;
    if tg_op = 'INSERT' then
        if not public.tem_permissao('orcamentos.ver_custos')
           and (coalesce(new.custo_producao,0) <> 0 or coalesce(new.dados,'{}'::jsonb) <> '{}'::jsonb) then
            raise exception 'Sem permissão para gravar custos na versão do orçamento.';
        end if;
        if not public.tem_permissao('orcamentos.ver_lucro')
           and (coalesce(new.valor_lucro,0) <> 0 or new.margem_lucro is not null) then
            raise exception 'Sem permissão para gravar lucro ou margem na versão do orçamento.';
        end if;
        return new;
    end if;
    if tg_op = 'UPDATE' then
        if not public.tem_permissao('orcamentos.ver_custos')
           and (new.custo_producao is distinct from old.custo_producao or new.dados is distinct from old.dados) then
            raise exception 'Sem permissão para alterar custos na versão do orçamento.';
        end if;
        if not public.tem_permissao('orcamentos.ver_lucro')
           and (new.valor_lucro is distinct from old.valor_lucro or new.margem_lucro is distinct from old.margem_lucro) then
            raise exception 'Sem permissão para alterar lucro ou margem na versão do orçamento.';
        end if;
        return new;
    end if;
    return new;
end;
$$;

insert into public.sistema_migrations (versao, descricao)
values ('14-v8-orcamento-comercial-seguro', 'Backend seguro para cálculo e gravação de orçamento comercial')
on conflict (versao) do nothing;

commit;
