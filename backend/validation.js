import {categories} from '../dist/data.js';
import {safeUrl} from '../dist/model.js';
export function validateOffer(input,previous=null,now=Date.now()){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Dados inválidos.');
 const text=(key,max,required=false)=>{const v=input[key]??'';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('Campo inválido: '+key);return v.trim();};
 const title=text('title',240,true),url=safeUrl(text('url',2000,true)),image=text('image',2000);
 if(!url||(image&&!safeUrl(image)))throw new Error('Os links precisam usar HTTPS.');
 const price=input.price;if(typeof price!=='number'||!Number.isFinite(price)||price<=0||price>100000000)throw new Error('Preço inválido.');
 if(!['Mercado Livre','Amazon','Shopee'].includes(input.store)||!categories.slice(1).includes(input.category)||!['common','flash','coupon'].includes(input.type)||!['active','ended','coupon-ended','soldout'].includes(input.status))throw new Error('Loja, categoria, tipo ou status inválido.');
 const date=(v)=>{if(!v)return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw new Error('Data inválida.');return new Date(v).toISOString();};
 const endsAt=input.type==='common'?null:date(input.endsAt);
 if(input.type!=='common'&&!endsAt)throw new Error('Informe data e hora de término.');
 if(input.status==='active'&&endsAt&&Date.parse(endsAt)<=now)throw new Error('Uma oferta ativa precisa de prazo futuro.');
 const coupon=text('coupon',60),couponTerms=text('couponTerms',300);
 if(input.type==='coupon'&&(!coupon||!couponTerms))throw new Error('Informe código e condições do cupom.');
 const checkedAt=date(input.checkedAt);if(checkedAt&&Date.parse(checkedAt)>now+60000)throw new Error('A verificação não pode estar no futuro.');
 const endedAt=input.status==='active'?null:previous?.endedAt||new Date(now).toISOString();
 return {id:previous?.id||crypto.randomUUID(),title,url,image,price:Math.round(price*100)/100,store:input.store,category:input.category,type:input.type,status:input.status,terms:text('terms',300),shipping:text('shipping',200),specs:text('specs',400),art:previous?.art||'generic',featured:input.featured===true,demo:input.demo===true,fictionalDeadline:!!endsAt&&input.fictionalDeadline===true,endsAt,checkedAt,endedAt,coupon:input.type==='coupon'?coupon:'',couponTerms:input.type==='coupon'?couponTerms:''};
}
