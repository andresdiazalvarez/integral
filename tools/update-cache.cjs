// Actualiza la lista de recursos locales tras añadir archivos al generador.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),target=path.join(root,'sw.js');
const source=fs.readFileSync(target,'utf8');
const existing=JSON.parse(source.match(/const ASSETS=(\[.*?\]);/)[1]);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const assets=walk(path.join(root,'informes')).map(file=>'./'+path.relative(root,file).split(path.sep).join('/'));
const html=fs.readFileSync(path.join(root,'informes/index.html'),'utf8');for(const match of html.matchAll(/src="([^"?]+\?[^\"]+)"/g))assets.push('./informes/'+match[1]);
fs.writeFileSync(target,source.replace(/const ASSETS=\[.*?\];/,'const ASSETS='+JSON.stringify([...new Set([...existing.filter(p=>!p.startsWith('./informes/')),...assets])])+';'));
