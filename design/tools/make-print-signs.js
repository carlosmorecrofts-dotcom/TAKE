const {app,BrowserWindow}=require('electron');const fs=require('fs');const path=require('path');
app.on('window-all-closed',()=>{});process.on('unhandledRejection',e=>{console.log('ERR',e&&e.message||e);app.quit()});
const L='C:/Users/carlo/OneDrive/Djinja/Clients/TAKE/design/logo',O='C:/Users/carlo/OneDrive/Djinja/Clients/TAKE/design/print';
const jobs=[['take-eat-figma.png','TAKE-Coffee-Eatery-sign'],['take-ride-figma.png','TAKE-Scooter-Rental-sign']];
const UP=`(async(b64)=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
 let c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);
 for(let i=0;i<3;i++){const n=document.createElement('canvas');n.width=c.width*2;n.height=c.height*2;const x=n.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,n.width,n.height);c=n;}
 const x=c.getContext('2d');const bl=document.createElement('canvas');bl.width=c.width;bl.height=c.height;const bx=bl.getContext('2d');bx.filter='blur(3px)';bx.drawImage(c,0,0);
 const a=x.getImageData(0,0,c.width,c.height),e=bx.getImageData(0,0,c.width,c.height).data,d=a.data;
 for(let i=0;i<d.length;i+=4)for(let k=0;k<3;k++)d[i+k]=d[i+k]+0.6*(d[i+k]-e[i+k]);
 x.putImageData(a,0,0);return c.toDataURL('image/png').split(',')[1];})`;
app.whenReady().then(async()=>{
 for(const [src,name] of jobs){
  const w=new BrowserWindow({show:false,webPreferences:{offscreen:true}});
  fs.writeFileSync(path.join(__dirname,'b.html'),'<html></html>');await w.loadFile(path.join(__dirname,'b.html'));
  const b64=fs.readFileSync(path.join(L,src)).toString('base64');
  const out=await w.webContents.executeJavaScript(UP+'('+JSON.stringify(b64)+')');
  const pp=path.join(O,name+'-12288x8192.png');fs.writeFileSync(pp,Buffer.from(out,'base64'));console.log('png',name);
  const html=path.join(O,'_'+name+'.html');
  fs.writeFileSync(html,'<html><style>@page{size:2000mm 1333.3mm;margin:0}html,body{margin:0}img{width:2000mm;height:1333.3mm;display:block}</style><img src="'+path.basename(pp)+'"></html>');
  await w.loadFile(html);await new Promise(r=>setTimeout(r,2000));
  const pdf=await w.webContents.printToPDF({pageSize:{width:2000/25.4,height:1333.3/25.4},margins:{marginType:'none'},printBackground:true});
  fs.writeFileSync(path.join(O,name+'-2000x1333mm.pdf'),pdf);fs.unlinkSync(html);console.log('pdf',name);w.destroy();
 }
 app.quit();});
