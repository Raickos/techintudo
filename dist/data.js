export const categories=['Todas','Áudio','Games e monitores','Acessórios','Casa e utilidades','Segurança','Beleza','Esporte'];
export const whatsapp='https://chat.whatsapp.com/Lf3GE5wPuzVCqGtrSuyWyG?s=cl&p=a&mlu=4&ilr=4';
export function initialOffers(now=Date.now()){
 const entries=[
 ['dapon','Headphone Dapon H02D Bluetooth 5.1, preto',78.90,'12x de R$ 7,77','1wEdSmb','Áudio','Bluetooth 5.1 · Over-ear · Autonomia informada de 22h','headphone',true],
 ['redmi','Fone Bluetooth Xiaomi Redmi Buds 6 Play, preto',86.91,'Ou R$ 99,90 em outros meios','17tgVBh','Áudio','Redmi Buds 6 Play · Bluetooth · Preto','buds',false],
 ['perfume','Jean Paul Gaultier Le Male Elixir Absolu Parfum Intense 75 ml',519.25,'10x de R$ 51,92 sem juros · R$ 6.923,33 por litro','1oV21eV','Beleza','Perfume masculino · 75 ml','perfume',false],
 ['cabo','Cabo USB-C Ugreen 100 W, 1,5 metro',84.54,'3x de R$ 28,18 sem juros','2SZvyVf','Acessórios','USB-C · Carregamento rápido · 1,5 m','cable',false],
 ['airfryer','Air Fryer Philco 6,5 L Visor Glass e Redstone PAF65A',283.10,'Ou R$ 298,00 em outros meios','2sJgeas','Casa e utilidades','6,5 litros · Visor Glass · 1700 W','airfryer',true],
 ['monitor','Monitor gamer AOC AGON CS2 25″ CS25G',1157.09,'Ou R$ 1.361,28 em 10x de R$ 136,13 sem juros','14EuEBo','Games e monitores','310 Hz · 0,3 ms · IPS · HDR400 · Base ajustável','monitor',true],
 ['projetor','Projetor Kateluo HY320 Full HD com Android',209.95,'Ou R$ 221,00 em outros meios','33ySxMc','Casa e utilidades','390 ANSI lumens · Suporte a 4K · Wi-Fi 6 · HDMI · Bluetooth · Bivolt','projector',true],
 ['camera','Câmera externa TP-Link Tapo C320WS 2K',209.92,'Ou R$ 279,90 em 6x de R$ 46,65 sem juros','16AkbTH','Segurança','Wi-Fi · 4 MP · IP66 · Branca','camera',false],
 ['controle','Controle Sony DualSense Hyperpop PS5 Techno Red',370.60,'Ou R$ 436,00 em 8x de R$ 54,50 sem juros','23aRm8N','Games e monitores','Sem fio · PlayStation 5 · Vermelho Techno Red','controller',true],
 ['bike','Bicicleta spinning Sevenfit, preta e vermelha',460.74,'Ou R$ 484,99 em outros meios','2VnP8vk','Esporte','6 kg de sensação de inércia · Para cardio','bike',false],
 ['lavadora','Lavadora WAP Ousada Plus 2200 de alta pressão',426.21,'Ou R$ 489,90 em outros meios','2Rgaeji','Casa e utilidades','1500 W · 1750 PSI','washer',false]
 ];
 return entries.map(([id,title,price,terms,link,category,specs,art,featured])=>({id,title,price,terms,url:'https://meli.la/'+link,category,specs,art,featured,store:'Mercado Livre',shipping:'Frete grátis: consulte condições para seu CEP',type:['projetor','camera'].includes(id)?'flash':'common',endsAt:['projetor','camera'].includes(id)?new Date(now+(id==='projetor'?2:4)*3600000).toISOString():null,status:'active',demo:false,fictionalDeadline:['projetor','camera'].includes(id),checkedAt:null,image:'',coupon:'',couponTerms:'',endedAt:null}));
}
