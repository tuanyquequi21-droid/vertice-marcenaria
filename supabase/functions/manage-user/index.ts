import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const ROLES = new Set(["admin", "comercial", "producao", "financeiro", "personalizado"]);
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const text = (v: unknown, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
const emailOf = (v: unknown) => text(v, 320).toLowerCase();
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Método não permitido." });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply(500, { ok: false, error: "Configuração interna incompleta." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply(401, { ok: false, error: "Sessão não informada." });
  const token = authHeader.slice(7).trim();

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    const caller = authData?.user;
    if (authError || !caller) return reply(401, { ok: false, error: "Sessão inválida ou expirada." });

    const { data: callerProfile, error: profileError } = await userClient
      .from("perfis").select("user_id,empresa_id,papel,ativo").eq("user_id", caller.id).maybeSingle();
    if (profileError || !callerProfile || !callerProfile.ativo)
      return reply(403, { ok: false, error: "Usuário sem perfil ativo na empresa." });

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return reply(400, { ok: false, error: "JSON inválido." }); }

    const action = text(body.action, 30);
    if (!['create','update'].includes(action))
      return reply(400, { ok: false, error: "Ação inválida. Use create ou update." });

    const permissionCode = action === 'create' ? 'usuarios.criar' : 'usuarios.editar';
    const { data: allowed, error: permissionError } = await userClient.rpc('tem_permissao', { p_codigo: permissionCode });
    if (permissionError) return reply(500, { ok: false, error: "Falha ao validar permissão." });
    if (allowed !== true) return reply(403, { ok: false, error: `Sem permissão: ${permissionCode}.` });

    const nome = text(body.nome, 120);
    const email = emailOf(body.email);
    const papel = text(body.papel, 30) || 'personalizado';
    const ativo = body.ativo === undefined ? true : body.ativo === true;
    const password = typeof body.password === 'string' ? body.password : '';
    const targetUserId = text(body.user_id, 80);

    if (!nome) return reply(400, { ok: false, error: "Informe o nome." });
    if (!validEmail(email)) return reply(400, { ok: false, error: "Informe um e-mail válido." });
    if (!ROLES.has(papel)) return reply(400, { ok: false, error: "Perfil inválido." });
    if (action === 'create' && password.length < 8)
      return reply(400, { ok: false, error: "A senha inicial deve ter pelo menos 8 caracteres." });
    if (action === 'update' && !targetUserId)
      return reply(400, { ok: false, error: "user_id é obrigatório para editar." });
    if (action === 'update' && password && password.length < 8)
      return reply(400, { ok: false, error: "A nova senha deve ter pelo menos 8 caracteres." });

    const raw = Array.isArray(body.permissoes) ? body.permissoes : [];
    const overrides = raw.filter((x) => x && typeof x === 'object').map((x) => {
      const item = x as Record<string, unknown>;
      return { codigo: text(item.codigo, 120), permitido: item.permitido === true };
    }).filter((x) => x.codigo);

    const managesPermissions = overrides.length > 0 || papel === 'admin' || body.limpar_permissoes === true;
    if (managesPermissions) {
      const { data: can, error } = await userClient.rpc('tem_permissao', { p_codigo: 'usuarios.permissoes' });
      if (error || can !== true)
        return reply(403, { ok: false, error: "Sem permissão para definir perfil administrativo ou permissões." });
    }
    if (papel === 'admin' && callerProfile.papel !== 'admin')
      return reply(403, { ok: false, error: "Somente administrador pode conceder perfil Administrador." });

    if (action === 'update') {
      const { data: target, error } = await adminClient.from('perfis')
        .select('user_id,empresa_id,papel,ativo').eq('user_id', targetUserId).maybeSingle();
      if (error || !target) return reply(404, { ok: false, error: "Usuário não encontrado." });
      if (target.empresa_id !== callerProfile.empresa_id)
        return reply(403, { ok: false, error: "Usuário pertence a outra empresa." });
      if (target.papel === 'admin' && callerProfile.papel !== 'admin')
        return reply(403, { ok: false, error: "Somente administrador pode alterar outro administrador." });
    }

    if (overrides.length) {
      const codes = [...new Set(overrides.map((x) => x.codigo))];
      const { data: knownRows, error } = await adminClient.from('permissoes').select('codigo').in('codigo', codes);
      if (error) return reply(500, { ok: false, error: "Falha ao validar catálogo de permissões." });
      const known = new Set((knownRows ?? []).map((x) => x.codigo));
      const invalid = codes.filter((x) => !known.has(x));
      if (invalid.length) return reply(400, { ok: false, error: `Permissões inválidas: ${invalid.join(', ')}` });
    }

    let userId = targetUserId;
    let created = false;
    if (action === 'create') {
      const { data, error } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { nome },
      });
      if (error || !data.user) return reply(400, { ok: false, error: error?.message || "Falha ao criar usuário." });
      userId = data.user.id;
      created = true;
      const { error: insertError } = await adminClient.from('perfis').insert({
        user_id: userId, empresa_id: callerProfile.empresa_id, nome, email, papel, ativo,
      });
      if (insertError) {
        await adminClient.auth.admin.deleteUser(userId);
        return reply(400, { ok: false, error: insertError.message });
      }
    } else {
      const authPatch: Record<string, unknown> = { email, user_metadata: { nome } };
      if (password) authPatch.password = password;
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authPatch);
      if (authUpdateError) return reply(400, { ok: false, error: authUpdateError.message });
      const { error: updateError } = await adminClient.from('perfis').update({ nome, email, papel, ativo })
        .eq('user_id', userId).eq('empresa_id', callerProfile.empresa_id);
      if (updateError) return reply(400, { ok: false, error: updateError.message });
    }

    if (body.limpar_permissoes === true || overrides.length) {
      const { error } = await adminClient.from('usuario_permissoes').delete().eq('user_id', userId);
      if (error) {
        if (created) { await adminClient.from('perfis').delete().eq('user_id', userId); await adminClient.auth.admin.deleteUser(userId); }
        return reply(400, { ok: false, error: error.message });
      }
    }
    if (overrides.length) {
      const rows = overrides.map((x) => ({ user_id: userId, permissao_codigo: x.codigo, permitido: x.permitido }));
      const { error } = await adminClient.from('usuario_permissoes').insert(rows);
      if (error) {
        if (created) {
          await adminClient.from('usuario_permissoes').delete().eq('user_id', userId);
          await adminClient.from('perfis').delete().eq('user_id', userId);
          await adminClient.auth.admin.deleteUser(userId);
        }
        return reply(400, { ok: false, error: error.message });
      }
    }

    return reply(200, {
      ok: true, action, user_id: userId,
      message: action === 'create' ? 'Usuário criado com sucesso.' : 'Usuário atualizado com sucesso.',
    });
  } catch (error) {
    console.error('manage-user:', error);
    return reply(500, { ok: false, error: error instanceof Error ? error.message : 'Erro interno inesperado.' });
  }
});