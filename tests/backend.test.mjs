import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../backend/worker.js';
import {authenticate} from '../backend/auth.js';
import {validateOffer} from '../backend/validation.js';
import {initialOffers} from '../dist/data.js';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256'};
const authEnv={ACCESS_TEAM_DOMAIN:'test-suite.cloudflareaccess.com',ACCESS_AUD:'test-audience',ADMIN_EMAILS:'admin@example.org'};
const b64=v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url');
async function token(overrides={}){const now=Math.floor(Date.now()/1000);const head=b64({alg:'RS256',kid:'test-key'}),body=b64({iss:'https://'+authEnv.ACCESS_TEAM_DOMAIN,aud:[authEnv.ACCESS_AUD],email:'admin@example.org',sub:'person1',iat:now,exp:now+300,...overrides});return head+'.'+body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(head+'.'+body))).toString('base64url');}
const signedToken=await token();
const keys=async()=>Response.json({keys:[jwk]});
// Preencher cache com JWKS de teste, sem rede externa.
await authenticate(new Request('https://admin.example.org',{headers:{'Cf-Access-Jwt-Assertion':signedToken}}),authEnv,keys);
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/0001_offers.sql',import.meta.url),'utf8'));const db={prepare(sql){let params=[];const stmt=sqlite.prepare(sql);return {bind(...values){params=values;return this;},async first(){return stmt.get(...params)||null;},async all(){return {results:stmt.all(...params)};},async run(){const r=stmt.run(...params);return {meta:{changes:Number(r.changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const stmt of statements)result.push(await stmt.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};return db;}
function env(db){return {...authEnv,APP_MODE:'admin',DB:db,ASSETS:{fetch:async()=>new Response('<html>Admin</html>')}};}
function request(path,{method='GET',body,revision,origin='https://admin.example.org',jwt=signedToken}={}){return new Request('https://admin.example.org'+path,{method,headers:{'Cf-Access-Jwt-Assertion':jwt,...(body?{'Content-Type':'application/json','Origin':origin}:{}),...(revision?{'If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined});}
test('autenticação valida assinatura, emissor, audiência, validade e e-mail',async()=>{
 assert.equal((await authenticate(request('/'),authEnv,keys)).email,'admin@example.org');
 for(const overrides of [{iss:'https://evil.example'},{aud:['other-app']},{email:'intruder@example.org'},{exp:0},{iat:9999999999}])await assert.rejects(authenticate(request('/',{jwt:await token(overrides)}),authEnv,keys));
 const pieces=signedToken.split('.');pieces[1]=b64({email:'admin@example.org'});await assert.rejects(authenticate(request('/',{jwt:pieces.join('.')}),authEnv,keys));
 const signature=signedToken.split('.');signature[2]=(signature[2][0]==='A'?'B':'A')+signature[2].slice(1);await assert.rejects(authenticate(request('/',{jwt:signature.join('.')}),authEnv,keys));
});
test('painel bloqueia páginas e API sem identidade; configuração ausente falha fechada',async()=>{
 assert.equal((await worker.fetch(new Request('https://admin.example.org/'),env(database()))).status,401);
 assert.equal((await worker.fetch(request('/api/offers',{jwt:'invalid'}),env(database()))).status,401);
 assert.equal((await worker.fetch(request('/'),{...env(database()),ACCESS_AUD:''})).status,503);
});
test('catálogo público permite leitura, não permite gravação',async()=>{
 const e={...env(database()),APP_MODE:'public'};
 const res=await worker.fetch(new Request('https://catalog.example.org/api/offers'),e);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.deepEqual((await res.json()).offers,[]);
 assert.equal((await worker.fetch(request('/api/offers',{method:'POST',body:initialOffers()[0]}),e)).status,404);
});
test('importação idempotente compartilha 11 ofertas e não reinicia prazos',async()=>{
 const e=env(database());const first=await (await worker.fetch(request('/api/seed',{method:'POST',body:{}}),e)).json();const second=await (await worker.fetch(request('/api/seed',{method:'POST',body:{}}),e)).json();assert.equal(first.offers.length,11);assert.deepEqual(second.offers,first.offers);
 const publicList=await (await worker.fetch(new Request('https://catalog.example.org/api/offers'),{...e,APP_MODE:'public'})).json();assert.equal(publicList.offers.length,11);
});
test('edição persiste entre clientes, registra auditoria e rejeita versão desatualizada',async()=>{
 const e=env(database());await worker.fetch(request('/api/seed',{method:'POST',body:{}}),e);
 const old=(await (await worker.fetch(request('/api/offers'),e)).json()).offers.find(o=>o.id==='dapon');
 const changed={...old,price:79.90,checkedAt:new Date().toISOString()};
 const result=await worker.fetch(request('/api/offers/dapon',{method:'PUT',body:changed,revision:1}),e);assert.equal(result.status,200);assert.equal((await result.json()).offer.revision,2);
 assert.equal((await worker.fetch(request('/api/offers/dapon',{method:'PUT',body:old,revision:1}),e)).status,409);
 const publicList=(await (await worker.fetch(new Request('https://catalog.example.org/api/offers'),{...e,APP_MODE:'public'})).json()).offers;assert.equal(publicList.find(o=>o.id==='dapon').price,79.90);
 const log=await (await worker.fetch(request('/api/audit'),e)).json();assert.equal(log.entries.filter(a=>a.action==='update').length,1);
});
test('origem estrangeira e preços inválidos não gravam dados',async()=>{
 const e=env(database());
 assert.equal((await worker.fetch(request('/api/seed',{method:'POST',body:{},origin:'https://evil.example'}),e)).status,403);
 assert.equal((await worker.fetch(request('/api/offers',{method:'POST',body:{...initialOffers()[0],price:-1}}),e)).status,400);
 assert.equal((await worker.fetch(request('/api/offers',{method:'POST',body:{...initialOffers()[0],url:'javascript:alert(1)'}}),e)).status,400);
 assert.equal((await (await worker.fetch(request('/api/offers'),e)).json()).offers.length,0);
});
test('encerramento compartilhado e validação de cupons e verificações',async()=>{
 const e=env(database());await worker.fetch(request('/api/seed',{method:'POST',body:{}}),e);
 const dapon=(await (await worker.fetch(request('/api/offers'),e)).json()).offers.find(o=>o.id==='dapon');
 const response=await worker.fetch(request('/api/offers/dapon',{method:'PUT',revision:1,body:{...dapon,status:'soldout'}}),e);assert.equal(response.status,200);assert.equal((await response.json()).offer.status,'soldout');
 assert.throws(()=>validateOffer({...dapon,checkedAt:'2099-01-01T00:00:00Z'}));
 assert.throws(()=>validateOffer({...dapon,type:'coupon',endsAt:new Date(Date.now()+60000).toISOString(),coupon:''}));
});
