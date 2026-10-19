export const localPreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
export async function api(path,{method='GET',body,revision}={}){
 const response=await fetch('/api'+path,{method,credentials:'same-origin',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(revision?{'If-Match':String(revision)}:{})},body:body?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>null);
 if(!response.ok||!data){const error=new Error(data?.error||'Não foi possível acessar o servidor. Recarregue a página e confira o login.');error.status=response.status;throw error;}
 return data;
}
