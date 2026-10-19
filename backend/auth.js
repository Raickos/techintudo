const decoder=new TextDecoder();
function decode(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
const cache=new Map();
function authError(message,code){const error=new Error(message);error.code=code;return error;}
export async function authenticate(request,env,fetchKeys=fetch){
 const team=env.ACCESS_TEAM_DOMAIN, audience=env.ACCESS_AUD;
 if(!team||!/^[-a-z0-9]+\.cloudflareaccess\.com$/.test(team)||!audience||audience==='CONFIGURAR')throw authError('AUTH_NOT_CONFIGURED','AUTH_CONFIG_MISSING');
 const allowed=(env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!allowed.length)throw authError('AUTH_NOT_CONFIGURED','AUTH_EMAILS_MISSING');
 // Access pode entregar o JWT no cabeçalho ou no cookie de sessão.
 // Ambos passam pela MESMA validação criptográfica, sem confiar em e-mail de cabeçalho.
 const cookie=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('CF_Authorization='))?.slice('CF_Authorization='.length);
 const token=request.headers.get('Cf-Access-Jwt-Assertion')||cookie;
 if(!token||token.length>16000)throw authError('UNAUTHORIZED','AUTH_TOKEN_MISSING');
 try{
  const parts=token.split('.');if(parts.length!==3)throw 0;
  const header=JSON.parse(decoder.decode(decode(parts[0]))),payload=JSON.parse(decoder.decode(decode(parts[1])));
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||payload.iss!==`https://${team}`||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+30||payload.nbf>now+30||!Array.isArray(payload.aud)||!payload.aud.includes(audience)||typeof payload.email!=='string'||!payload.sub)throw 0;
  if(!allowed.includes(payload.email.toLowerCase()))throw authError('UNAUTHORIZED','AUTH_EMAIL_NOT_ALLOWED');
  let entry=cache.get(team);
  if(!entry||entry.until<Date.now()||!entry.keys.some(k=>k.kid===header.kid)){
   const response=await fetchKeys(`https://${team}/cdn-cgi/access/certs`);
   if(!response.ok)throw 0;
   entry={keys:(await response.json()).keys,until:Date.now()+300000};cache.set(team,entry);
  }
  const jwk=entry.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)throw 0;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw 0;
  return {email:payload.email.toLowerCase(),sub:payload.sub};
 }catch(error){if(error?.code==='AUTH_EMAIL_NOT_ALLOWED')throw error;throw authError('UNAUTHORIZED','AUTH_TOKEN_INVALID');}
}
