import {readFile,writeFile} from 'node:fs/promises';
const id=process.argv[2];
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw new Error('Informe o UUID do banco D1: node scripts/configure-d1.mjs UUID');
for(const file of ['wrangler.jsonc','wrangler.admin.jsonc']){const config=JSON.parse(await readFile(file,'utf8'));config.d1_databases[0].database_id=id;await writeFile(file,JSON.stringify(config,null,2)+'\n');}
console.log('Banco configurado para catálogo e painel.');
