const {app,BrowserWindow}=require('electron');const fs=require('fs');const path=require('path');
app.on('window-all-closed',()=>{});
const T='M11,265 H591 L560,385 H380 V700 H200 V385 H11 Z';
// skewed T spans about x 150..785, y 265..700: centre it in a 1024 square
const g=`<g transform="translate(512,512) scale(1.25) translate(-468,-482) translate(0,700) skewX(-24) translate(0,-700)">`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2d6a"/><stop offset="1" stop-color="#ff8a2a"/></linearGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter></defs>
<rect width="1024" height="1024" rx="200" fill="#07070a"/>
${g}<path d="${T}" fill="#ff2d6a" opacity=".7" filter="url(#glow)"/></g>
${g}<path d="${T}" transform="translate(10,16)" fill="#3a0a14"/></g>
${g}<path d="${T}" fill="url(#f)" stroke="#fff" stroke-width="22" stroke-linejoin="round"/></g>
</svg>`;
app.whenReady().then(async()=>{
 fs.writeFileSync(path.join(__dirname,'t-icon.svg'),svg);
 fs.writeFileSync(path.join(__dirname,'t.html'),'<html><body style="margin:0;background:transparent">'+svg+'</body></html>');
 const w=new BrowserWindow({show:false,width:1024,height:1024,transparent:true,webPreferences:{offscreen:true}});
 await w.loadFile(path.join(__dirname,'t.html'));await new Promise(r=>setTimeout(r,800));
 const img=await w.webContents.capturePage();fs.writeFileSync(path.join(__dirname,'t-icon-1024.png'),img.toPNG());
 for(const s of [32,48,180,192,512]) fs.writeFileSync(path.join(__dirname,'tc-'+s+'.png'),img.resize({width:s,height:s,quality:'best'}).toPNG());
 const s=nativeSheet(img);app.quit();});
function nativeSheet(){}
