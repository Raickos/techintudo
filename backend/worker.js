import {authenticate} from './auth.js';
import {validateOffer} from './validation.js';
import {initialOffers} from '../dist/data.js';
import {expireOffers,visibleClosed} from '../dist/model.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie, Cf-Access-Jwt-Assertion'}});
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY'};
async function list(db){const result=await db.prepare('SELECT data, revision FROM offers ORDER BY updated_at DESC, id').all();return result.results.map(row=>({...JSON.parse(row.data),revision:row.revision}));}
async function get(db,id){const row=await db.prepare('SELECT data, revision FROM offers WHERE id = ?').bind(id).first();return row?expireOffers([{...JSON.parse(row.data),revision:row.revision}])[0]:null;}
export default {async fetch(request,env){
 const url=new URL(request.url),admin=env.APP_MODE==='admin';let user=null;
 try{
  // Proteger TODO o hostname administrativo, inclusive arquivos e páginas.
  if(admin)user=await authenticate(request,env);
  if(!url.pathname.startsWith('/api/')){
   if(!['GET','HEAD'].includes(request.method))return json({error:'Método não permitido.'},405);
   const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);for(const [k,v] of Object.entries(security))headers.set(k,v);
   if(admin)headers.set('Cache-Control','no-store');
   return new Response(response.body,{status:response.status,headers});
  }
  if(url.pathname==='/api/session'&&request.method==='GET')return json({mode:admin?'admin':'public',email:user?.email||null,storage:'d1'});
  if(!env.DB)return json({error:'Banco de dados ainda não configurado.'},503);
  if(request.method==='GET'&&url.pathname==='/api/offers'){
   const all=expireOffers(await list(env.DB));return json({offers:admin?all:all.filter(o=>o.status==='active'||visibleClosed([o]).length)});
  }
  if(!admin)return json({error:'Não encontrado.'},404);
  if(request.method==='GET'&&url.pathname==='/api/audit'){
   const result=await env.DB.prepare('SELECT offer_id, action, actor, created_at FROM audit_log ORDER BY id DESC LIMIT 30').all();return json({entries:result.results});
  }
  if(!['POST','PUT'].includes(request.method))return json({error:'Método não permitido.'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Origem não autorizada.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Envie JSON.'},415);
  if(Number(request.headers.get('Content-Length')||0)>20000)return json({error:'Dados excedem o limite.'},413);
  const raw=await request.text();if(raw.length>20000)return json({error:'Dados excedem o limite.'},413);
  let input;try{input=JSON.parse(raw);}catch{return json({error:'JSON inválido.'},400);}
  if(url.pathname==='/api/seed'&&request.method==='POST'){
   // Depois da primeira carga, não reintroduzir ofertas de demonstração removidas.
   const existing=await list(env.DB);if(existing.length)return json({offers:expireOffers(existing)});
   // Inserção idempotente: nunca sobrescreve ofertas editadas nem reinicia prazos existentes.
   const seed=initialOffers(),now=new Date().toISOString();
   await env.DB.batch(seed.map(o=>env.DB.prepare('INSERT OR IGNORE INTO offers (id,data,revision,updated_at) VALUES (?,?,1,?)').bind(o.id,JSON.stringify(o),now)));
   await env.DB.prepare('INSERT INTO audit_log (offer_id,action,actor,created_at) VALUES (?,?,?,?)').bind('*','import_initial',user.email,now).run();
   return json({offers:expireOffers(await list(env.DB))});
  }
  const match=url.pathname.match(/^\/api\/offers\/([a-zA-Z0-9-]{1,80})$/);
  if((url.pathname==='/api/offers'&&request.method==='POST')||(match&&request.method==='PUT')){
   const previous=match?await get(env.DB,match[1]):null;if(match&&!previous)return json({error:'Oferta não encontrada.'},404);
   if(previous&&request.headers.get('If-Match')!==String(previous.revision))return json({error:'Outra pessoa alterou esta oferta. Atualize o painel e abra a edição novamente.'},409);
   let offer;try{offer=validateOffer(input,previous);}catch(e){return json({error:e.message},400);}
   const now=new Date().toISOString(),revision=(previous?.revision||0)+1;
   // UPDATE condicional + auditoria no mesmo batch transacional; conflito não gera log.
   const stmt=previous?env.DB.prepare('UPDATE offers SET data=?, revision=?, updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(offer),revision,now,offer.id,previous.revision):env.DB.prepare('INSERT INTO offers (data,revision,updated_at,id) VALUES (?,?,?,?)').bind(JSON.stringify(offer),revision,now,offer.id);
   const result=await env.DB.batch([stmt,env.DB.prepare('INSERT INTO audit_log (offer_id,action,actor,created_at) SELECT ?,?,?,? WHERE changes() > 0').bind(offer.id,previous?'update':'create',user.email,now)]);
   if(!result[0].meta.changes)return json({error:'Conflito de edição. Atualize o painel.'},409);
   return json({offer:{...offer,revision}},previous?200:201);
  }
  return json({error:'Não encontrado.'},404);
 }catch(e){
  if(e.message==='UNAUTHORIZED')return json({error:'Entre com um e-mail autorizado pelo Cloudflare Access.',code:e.code||'AUTH_REQUIRED'},401);
  if(e.message==='AUTH_NOT_CONFIGURED')return json({error:e.code==='AUTH_EMAILS_MISSING'?'A variável ADMIN_EMAILS precisa ser configurada como Secret neste Worker.':'Login ainda não configurado. O painel permanece bloqueado.',code:e.code||'AUTH_CONFIG_MISSING'},503);
  console.error('Falha no backend:',e.name);return json({error:'Serviço indisponível. Confira o banco e as migrações.'},503);
 }
}};
