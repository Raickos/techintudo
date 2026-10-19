const decoder=new TextDecoder();
function decode(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
const cache=new Map();
export async function authenticate(request,env,fetchKeys=fetch){
 const team=env.ACCESS_TEAM_DOMAIN, audience=env.ACCESS_AUD;
 if(!team||!/^[-a-z0-9]+\.cloudflareaccess\.com$/.test(team)||!audience)throw new Error('AUTH_NOT_CONFIGURED');
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token||token.length>16000)throw new Error('UNAUTHORIZED');
 try{
  const parts=token.split('.');if(parts.length!==3)throw 0;
  const header=JSON.parse(decoder.decode(decode(parts[0]))),payload=JSON.parse(decoder.decode(decode(parts[1])));
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||payload.iss!==`https://${team}`||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+30||payload.nbf>now+30||!Array.isArray(payload.aud)||!payload.aud.includes(audience)||typeof payload.email!=='string'||!payload.sub)throw 0;
  const allowed=(env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(!allowed.includes(payload.email.toLowerCase()))throw 0;
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
 }catch{throw new Error('UNAUTHORIZED');}
}
