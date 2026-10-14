/* Navegação independente: sem alterar app-v6/v7 ou permissões. */
(function(){
 'use strict';
 const style=document.createElement('style');
 style.textContent=`
 .sidebar nav .studio-nav-link{display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:5px;color:#bbb;text-decoration:none;font-size:13px}
 .sidebar nav .studio-nav-link:hover{background:#292929;color:#fff}
 .sidebar nav .studio-nav-link span{width:18px;text-align:center;color:var(--gold);font-size:16px}
 .sidebar nav .studio-nav-link em{font-style:normal;white-space:nowrap}
 .sidebar.collapsed nav .studio-nav-link em{display:none}
 .top-actions{display:flex;flex-wrap:wrap;align-items:center;gap:7px}
 #studioMenuToggle{white-space:nowrap}
 @media(max-width:650px){
  .topbar{height:auto;min-height:68px;padding:10px 12px;gap:8px;flex-wrap:wrap}
  .top-actions{width:100%;gap:6px}
  .top-actions .btn{font-size:12px;padding:8px 10px}
  .sidebar{width:225px}
  .sidebar.collapsed{width:66px}
  .main{margin-left:225px}
  .sidebar.collapsed~.main{margin-left:66px}
 }
 `;
 document.head.append(style);
 function init(){
  const sidebar=document.getElementById('sidebar');
  const toggle=document.getElementById('studioMenuToggle');
  const native=document.getElementById('collapseBtn');
  if(!sidebar||!toggle||!native)return;
  const sync=()=>{
   const expanded=!sidebar.classList.contains('collapsed');
   native.setAttribute('aria-expanded',String(expanded));
   toggle.setAttribute('aria-expanded',String(expanded));
   toggle.textContent=expanded?'☰ Recolher menu':'☰ Expandir menu';
  };
  toggle.addEventListener('click',()=>{native.click();sync()});
  native.addEventListener('click',()=>queueMicrotask(sync));
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
