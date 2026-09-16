
const cfg=window.VERTICE_CONFIG||{};
if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){
  console.warn("Configure config.js antes de usar o Supabase.");
}
window.sb = (cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY)
 ? supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}})
 : null;
