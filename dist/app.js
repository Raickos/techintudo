import {paginate} from './pagination.js';
import {api,localPreview} from './api.js';
import {productImages} from './product-images.js';
import {categories,initialOffers,whatsapp} from './data.js';
import {storageKey,expireOffers,visibleClosed,matches,countdown,safeUrl,dateTime,localInput} from './model.js';
import {illustration} from './art.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
let memoryOnly=false,offers=[],canEdit=localPreview,editingOffer=null,refreshing=false;
document.body.dataset.mode=localPreview?'local':'public';
if(localPreview)try{const stored=JSON.parse(localStorage.getItem(storageKey));offers=Array.isArray(stored)&&stored.every(o=>o.id&&o.title&&Number.isFinite(o.price))?stored:initialOffers();}catch{offers=initialOffers();memoryOnly=true;}
function persist(){if(!localPreview)return;try{localStorage.setItem(storageKey,JSON.stringify(offers));}catch{if(!memoryOnly)toast('Armazenamento indisponível: alterações só nesta sessão.');memoryOnly=true;}}
offers=expireOffers(offers);persist();
const filters={search:'',category:'Todas',store:'',type:'all'};
let sort='featured';
const pages={active:1,closed:1};
function resetPages(){pages.active=pages.closed=1;}
function renderPagination(kind,data){
 const nav=$('#'+kind+'-pagination');nav.hidden=data.totalPages<=1;
 const first=Math.max(1,Math.min(data.page-2,data.totalPages-4));
 const numbers=Array.from({length:Math.min(5,data.totalPages)},(_,i)=>first+i);
 nav.innerHTML=`<button data-page="${data.page-1}" ${data.page===1?'disabled':''} aria-label="Página anterior">← Anterior</button><div class="page-numbers">${numbers.map(n=>`<button data-page="${n}" ${n===data.page?'aria-current="page"':''} aria-label="Página ${n}">${n}</button>`).join('')}</div><span class="page-summary">Página ${data.page} de ${data.totalPages}</span><button data-page="${data.page+1}" ${data.page===data.totalPages?'disabled':''} aria-label="Próxima página">Próxima →</button>`;
}
for(const kind of ['active','closed'])$('#'+kind+'-pagination').addEventListener('click',e=>{
 const button=e.target.closest('[data-page]');if(!button||button.disabled)return;
 pages[kind]=Number(button.dataset.page);render();
 const heading=$(kind==='active'?'#offers-title':'#closed-section h2');
 heading.focus({preventScroll:true});heading.scrollIntoView({behavior:'smooth',block:'start'});
});
const labels={ended:'Oferta encerrada','coupon-ended':'Cupom encerrado',soldout:'Esgotado'};
const closeLabels={common:'Oferta encerrada',flash:'Oferta encerrada',coupon:'Cupom encerrado'};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function info(title,html){$('#info-title').textContent=title;$('#info-body').innerHTML=html;$('#info-dialog').showModal();}
$$('[data-whatsapp]').forEach(a=>a.href=whatsapp);$('#year').textContent=new Date().getFullYear();
$('#categories').innerHTML=categories.map((c,i)=>`<button data-category="${esc(c)}" aria-pressed="${i===0}">${esc(c)}</button>`).join('');
$('#form-category').innerHTML=categories.slice(1).map(c=>`<option>${esc(c)}</option>`).join('');
function card(o){const closed=o.status!=='active';const badge=closed?'':o.type==='flash'?'<span class="badge flash">ϟ Relâmpago'+(o.fictionalDeadline?' · teste':'')+'</span>':o.type==='coupon'?'<span class="badge coupon">◇ Cupom'+(o.demo?' · teste':'')+'</span>':o.featured?'<span class="badge">☆ Escolha da curadoria</span>':'';const image=safeUrl(o.image)||productImages[o.id];return `<article class="card ${closed?'closed':''}" data-offer-id="${esc(o.id)}"><div class="product-visual ${image?'has-image':''}">${image?`<img src="${esc(image)}" alt="${esc(o.title)}" loading="lazy" referrerpolicy="no-referrer">`:illustration(o.art)}${badge}<span class="image-note">${image?'':'Ilustração provisória'}</span>${closed?`<div class="closed-banner">${labels[o.status]||'Oferta encerrada'}</div>`:''}</div><div class="card-body"><div class="card-meta"><span class="store-label ${o.store==='Amazon'?'amazon':o.store==='Shopee'?'shopee':''}">${esc(o.store)}</span>${o.demo?'<span class="demo-label">DEMONSTRAÇÃO</span>':''}</div><h3>${esc(o.title)}</h3><p class="specs">${esc(o.specs||o.category)}</p><p class="price-label">${o.demo?'Preço fictício':'Preço informado'}</p><div class="price"><span>R$</span> ${money(o.price).replace(/R\$\s*/,'')}</div><p class="terms">${esc(o.terms)}</p><p class="shipping">♧ ${esc(o.shipping||'Consulte frete e condições na loja')}</p>${!closed&&o.endsAt?`<div class="clock-box"><div><span>Termina em</span><span class="clock" data-deadline="${esc(o.endsAt)}">${countdown(o.endsAt)}</span></div><small>${o.fictionalDeadline||o.demo?'Demonstração — prazo fictício · ':''}${dateTime(o.endsAt)} (Brasília)</small></div>`:''}${o.type==='coupon'?`<button class="coupon-copy" data-copy="${esc(o.id)}" ${closed?'disabled':''}>${esc(o.coupon)} ${closed?'':'⧉'}</button><p class="coupon-terms">${esc(o.couponTerms)}</p>`:''}<div class="card-bottom"><p class="verify">${o.checkedAt?'Última verificação: '+dateTime(o.checkedAt)+' (Brasília)':'Última verificação: pendente'}<br>Confirme as condições finais na loja.</p>${closed?`<button class="offer-button" disabled>${labels[o.status]||'Oferta encerrada'}</button>`:`<button class="offer-button" data-visit="${esc(o.id)}">${o.demo?'Ver demonstração':`Ver oferta no${o.store==='Amazon'||o.store==='Shopee'?'a':''} ${esc(o.store)}`} <span>↗</span></button>`}</div></div></article>`;}
function render(){let active=offers.filter(o=>o.status==='active'&&matches(o,filters));active.sort((a,b)=>sort==='price-asc'?a.price-b.price:sort==='price-desc'?b.price-a.price:sort==='name'?a.title.localeCompare(b.title,'pt-BR'):Number(b.featured)-Number(a.featured));const activePage=paginate(active,pages.active);pages.active=activePage.page;$('#offers-grid').innerHTML=activePage.items.map(card).join('');renderPagination('active',activePage);$('#empty').hidden=active.length>0;$('#result-count').textContent=`${active.length} oferta${active.length===1?'':'s'} encontrada${active.length===1?'':'s'}`;if(activePage.totalPages>1)$('#result-count').textContent+=` · Exibindo ${activePage.start}–${activePage.end}`;const closed=visibleClosed(offers).filter(o=>matches(o,filters));$('#closed-section').hidden=!closed.length;const closedPage=paginate(closed,pages.closed);pages.closed=closedPage.page;$('#closed-grid').innerHTML=closedPage.items.map(card).join('');renderPagination('closed',closedPage);$$('[data-visit]').forEach(button=>{const o=offers.find(o=>o.id===button.dataset.visit);if(o.demo)return;const link=document.createElement('a');link.className=button.className;link.innerHTML=button.innerHTML;link.href=safeUrl(o.url)||'#';link.target='_blank';link.rel='sponsored noopener noreferrer';link.setAttribute('aria-label',`Ver oferta de ${o.title} na loja ${o.store} (abre em nova aba)`);button.replaceWith(link);});renderAdmin();}
function renderAdmin(){$('#admin-list').innerHTML=offers.map(o=>`<div class="admin-item"><div><h3>${esc(o.title)}</h3><p>${money(o.price)} · ${esc(o.store)} · ${o.status==='active'?'Ativa':labels[o.status]}${o.demo?' · Demonstração':''}</p></div><div class="admin-item-actions"><button data-edit="${esc(o.id)}">Editar</button>${o.type==='flash'&&o.status==='active'?`<button data-expire="${esc(o.id)}">Expirar em 15 s</button>`:''}<button data-end="${esc(o.id)}" ${o.status!=='active'?'disabled':''}>Encerrar</button></div></div>`).join('');}
$('#search').addEventListener('input',e=>{filters.search=e.target.value.trim();resetPages();render();});$('#store').addEventListener('change',e=>{filters.store=e.target.value;resetPages();render();});$('#sort').addEventListener('change',e=>{sort=e.target.value;resetPages();render();});
$('#categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;resetPages();filters.category=b.dataset.category;$$('[data-category]').forEach(x=>x.setAttribute('aria-pressed',x===b));render();});
$('#type-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(!b)return;resetPages();filters.type=b.dataset.type;$$('[data-type]').forEach(x=>x.setAttribute('aria-pressed',x===b));render();});
$('#clear-filters').onclick=()=>{resetPages();Object.assign(filters,{search:'',category:'Todas',store:'',type:'all'});$('#search').value='';$('#store').value='';$$('[data-category]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.category==='Todas'));$$('[data-type]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.type==='all'));render();};
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#open-admin').onclick=()=>{if(!canEdit)return;renderAdmin();$('#admin-dialog').showModal();};
$('#about-test').onclick=()=>info('Uma prévia para experimentar','<p>Este é o ambiente de homologação do TechInTudo Ofertas. Os 11 produtos e links foram fornecidos pela curadoria; preços, parcelamentos e frete ainda não foram verificados na loja.</p><p>As artes dos produtos foram fornecidas pela curadoria. Prazos fictícios são identificados nos cartões e não reiniciam ao atualizar a página. Os cupons demonstrativos não são válidos para compras.</p><p>O painel online utiliza autenticação e banco compartilhado quando configurados na Cloudflare. A prévia local continua isolada no navegador. Antes da operação real, confira os dados e as regras dos programas de afiliados.</p>');
function openEdit(id){if(!canEdit)return;editingOffer=structuredClone(offers.find(o=>o.id===id)||null);const form=$('#offer-form');form.reset();$('#form-error').textContent='';const o=offers.find(x=>x.id===id);$('#edit-title').textContent=o?'Editar oferta':'Cadastrar oferta';for(const name of ['id','title','price','store','url','terms','shipping','category','type','coupon','couponTerms','image','status','specs'])if(o)form.elements[name].value=o[name]??'';form.elements.endsAt.value=o?localInput(o.endsAt):'';form.elements.checkedAt.value=o?localInput(o.checkedAt):'';form.elements.fictionalDeadline.checked=!!o?.fictionalDeadline;form.elements.featured.checked=!!o?.featured;form.elements.demo.checked=o?!!o.demo:true;if(!o){form.elements.shipping.value='Consulte frete e condições na loja';}updateForm();$('#edit-dialog').showModal();}
function updateForm(){const type=$('#offer-form').elements.type.value;$('#deadline-label').hidden=type==='common';$('#offer-form').elements.endsAt.required=type!=='common';$('#coupon-fields').hidden=type!=='coupon';$('#offer-form').elements.coupon.required=type==='coupon';$('#offer-form').elements.couponTerms.required=type==='coupon';}
$('#offer-form').elements.type.onchange=updateForm;$('#new-offer').onclick=()=>openEdit();
async function refreshOffers(){
 if(localPreview||refreshing)return;refreshing=true;
 try{offers=expireOffers((await api('/offers')).offers);render();$('#sync-status').textContent='Catálogo sincronizado · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
 finally{refreshing=false;}
}
async function saveOffer(offer,previous){
 if(!canEdit)throw new Error('Entre no painel com uma conta autorizada.');
 let saved=offer;
 if(!localPreview)saved=(await api(previous?'/offers/'+encodeURIComponent(previous.id):'/offers',{method:previous?'PUT':'POST',body:offer,revision:previous?.revision})).offer;
 offers=previous?offers.map(x=>x.id===saved.id?saved:x):[saved,...offers];persist();render();return saved;
}
$('#offer-form').onsubmit=async e=>{e.preventDefault();const f=e.target.elements,old=editingOffer;
 const submit=e.target.querySelector('[type=submit]');submit.disabled=true;$('#form-error').textContent='';
 try{
 const url=safeUrl(f.url.value),image=f.image.value?safeUrl(f.image.value):'';if(!url||image===null)throw new Error('Use links HTTPS válidos, sem usuário ou senha.');
 const deadline=f.type.value==='common'?null:new Date(f.endsAt.value+':00-03:00').toISOString();
 if(deadline&&f.status.value==='active'&&Date.parse(deadline)<=Date.now())throw new Error('Para uma oferta ativa, informe um término no futuro (Brasília).');
 const checkedAt=f.checkedAt.value?new Date(f.checkedAt.value+':00-03:00').toISOString():null;
 if(checkedAt&&Date.parse(checkedAt)>Date.now()+60000)throw new Error('A verificação não pode estar no futuro.');
 const o={...old,id:old?.id||crypto.randomUUID(),title:f.title.value.trim(),price:Number(f.price.value),store:f.store.value,url,terms:f.terms.value.trim(),shipping:f.shipping.value.trim(),category:f.category.value,type:f.type.value,endsAt:deadline,fictionalDeadline:f.fictionalDeadline.checked,coupon:f.coupon.value.trim(),couponTerms:f.couponTerms.value.trim(),image,featured:f.featured.checked,demo:f.demo.checked,status:f.status.value,art:old?.art||'generic',checkedAt,specs:f.specs.value.trim(),endedAt:f.status.value==='active'?null:old?.endedAt||new Date().toISOString()};
 if(!o.title||!Number.isFinite(o.price)||o.price<=0)throw new Error('Informe nome e preço válidos.');
 await saveOffer(o,old);$('#edit-dialog').close();toast(localPreview?'Oferta salva no navegador de teste.':'Oferta salva no banco compartilhado.');
 }catch(error){$('#form-error').textContent=error.message;}finally{submit.disabled=false;}
};
$('#admin-list').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||!canEdit)return;
 if(b.dataset.edit){openEdit(b.dataset.edit);return;}
 const old=offers.find(o=>o.id===(b.dataset.end||b.dataset.expire));if(!old)return;b.disabled=true;
 try{await saveOffer(b.dataset.end?{...old,status:old.type==='coupon'?'coupon-ended':'ended',endedAt:new Date().toISOString()}:{...old,endsAt:new Date(Date.now()+15000).toISOString(),fictionalDeadline:true},old);toast(b.dataset.end?'Oferta encerrada para todos os visitantes.':'Prazo fictício de 15 segundos salvo.');}
 catch(error){toast(error.message);b.disabled=false;}
});
$('#demo-coupon').onclick=async()=>{if(!canEdit)return;const old=offers.find(o=>o.title==='Exemplo de cupom — apenas para testar');if(old){openEdit(old.id);return;}
 try{await saveOffer({id:crypto.randomUUID(),title:'Exemplo de cupom — apenas para testar',price:99.90,terms:'Valor fictício. Não corresponde a um produto real.',shipping:'Exemplo sem frete ou estoque real',url:'https://www.amazon.com.br/',store:'Amazon',category:'Acessórios',type:'coupon',coupon:'TESTE10',couponTerms:'Cupom fictício: 10% em pedidos a partir de R$ 100, limitado a R$ 20. Não é válido em nenhuma loja.',endsAt:new Date(Date.now()+3600000).toISOString(),fictionalDeadline:true,featured:false,demo:true,status:'active',checkedAt:null,endedAt:null,art:'generic',image:'',specs:''},null);toast('Cupom demonstrativo adicionado.');}catch(error){toast(error.message);}
};
$('#reset-demo').onclick=()=>{if(!localPreview||!canEdit)return;info('Restaurar o teste?','<p>Esta ação substitui as alterações locais pelas 11 ofertas iniciais e cria novos prazos fictícios.</p><button id="confirm-reset" class="button navy">Restaurar agora</button>');$('#confirm-reset').onclick=()=>{offers=initialOffers();persist();render();$('#info-dialog').close();toast('Versão local restaurada.');};};
$('#import-initial').onclick=async()=>{if(!canEdit||localPreview)return;const b=$('#import-initial');b.disabled=true;try{await api('/seed',{method:'POST',body:{}});await refreshOffers();toast('Ofertas iniciais importadas. Registros existentes foram preservados.');}catch(error){toast(error.message);}finally{b.disabled=false;}};
$('#refresh-catalog').onclick=()=>refreshOffers().catch(error=>toast(error.message));
document.addEventListener('click',async e=>{const visit=e.target.closest('[data-visit]');if(visit){const o=offers.find(x=>x.id===visit.dataset.visit);if(!o||o.status!=='active')return;if(o.demo){info('Oferta demonstrativa','<p>Este cartão serve apenas para testar o layout. Não há oferta real ou cupom válido associado.</p>');return;}info('Você vai para '+o.store,`<p><strong>${esc(o.title)}</strong></p><p>Preço informado: ${money(o.price)}. Ainda não verificado na loja. Confira preço, parcelamento, vendedor e frete antes de comprar.</p><p>Este é um link de afiliado e podemos receber comissão pela compra.</p><a class="button lime" href="${esc(safeUrl(o.url)||'#')}" target="_blank" rel="sponsored noopener noreferrer">Continuar para ${esc(o.store)} ↗</a>`);}const copy=e.target.closest('[data-copy]');if(copy){const o=offers.find(x=>x.id===copy.dataset.copy);if(o?.status!=='active')return;try{await navigator.clipboard.writeText(o.coupon);toast(o.demo?'Código copiado — cupom fictício, sem validade na loja.':'Código copiado. Confira as condições na loja.');}catch{toast('Código demonstrativo: '+o.coupon);}}});
function tick(){const next=expireOffers(offers);if(next.some((o,i)=>o!==offers[i])){offers=next;persist();render();}$$('[data-deadline]').forEach(el=>el.textContent=countdown(el.dataset.deadline));const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());if(tick.day&&tick.day!==day)render();tick.day=day;}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(!localPreview)refreshOffers().catch(error=>$('#sync-status').textContent=error.message);}});
window.addEventListener('storage',e=>{if(localPreview&&e.key===storageKey){try{const next=JSON.parse(e.newValue);if(Array.isArray(next)){offers=expireOffers(next);render();}}catch{}}});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&e.target.closest('.product-visual')){const el=e.target;el.replaceWith(Object.assign(document.createElement('span'),{textContent:'Imagem indisponível'}));}},true);
render();setInterval(tick,1000);
async function connect(){
 if(localPreview){$('#sync-status').textContent='Prévia local: alterações apenas neste navegador.';return;}
 $('#sync-status').textContent='Conectando ao catálogo…';
 try{
 const session=await api('/session');canEdit=session.mode==='admin';document.body.dataset.mode=session.mode;
 $('#open-admin').textContent='Gerenciar ofertas ↗';$('#admin-dialog h2').textContent='Painel da curadoria';
 $('#admin-dialog .admin-warning').textContent='Login: '+(session.email||'')+'. As alterações são salvas no banco compartilhado. Confira as condições na loja antes de registrar uma verificação.';
 $('#edit-dialog [type=submit]').textContent='Salvar oferta';
 $('.selection-note').textContent='Seleção da curadoria TechInTudo';
 await refreshOffers();
 }catch(error){$('#sync-status').textContent=error.message;$('#empty h3').textContent='Catálogo indisponível no momento';$('#empty p').textContent='Tente novamente em instantes. Nenhuma alteração local será enviada.';}
}
connect();setInterval(()=>{if(!localPreview&&!document.hidden&&!$('#edit-dialog').open)refreshOffers().catch(error=>$('#sync-status').textContent='Falha na sincronização: '+error.message);},30000);

