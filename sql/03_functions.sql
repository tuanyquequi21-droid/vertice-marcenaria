
create or replace function public.set_empresa_id() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
 new.empresa_id := public.minha_empresa();
 if new.empresa_id is null then raise exception 'Usuário sem empresa ativa'; end if;
 return new;
end $$;

do $$ declare t text; begin
 foreach t in array array['clientes','chapas_mdf','ferragens','custos_operacionais','crm_leads','orcamentos','orcamento_itens','orcamento_custos','crm_interacoes','crm_tarefas','auditoria']
 loop execute format('drop trigger if exists trg_empresa_%I on public.%I',t,t);
 execute format('create trigger trg_empresa_%I before insert on public.%I for each row execute function public.set_empresa_id()',t,t); end loop;
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$begin new.atualizado_em=now();return new;end$$;
drop trigger if exists touch_lead on public.crm_leads; create trigger touch_lead before update on public.crm_leads for each row execute function public.touch_updated_at();
drop trigger if exists touch_orc on public.orcamentos; create trigger touch_orc before update on public.orcamentos for each row execute function public.touch_updated_at();
