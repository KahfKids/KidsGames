/* Spider IK — vanilla build for Kahf KidsGames (no React, no CDN, offline-friendly).
   Assets come from js/assets.js (sprites, layouts, cards) and levels/*.webp (level art). */
'use strict';
let Z=.95;const W=1440,H=1080,K=3,TAU=Math.PI*2,LEVELS=21;
const L1=26,L2=35,MAXR=L1+L2,HOVER=34,RB=16,N=8;
const rng=s=>{s>>>=0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)};
const DATA=window.SPIDER_ASSETS;
const svgUrl=s=>URL.createObjectURL(new Blob([s],{type:'image/svg+xml'}));
for(const k in DATA.CARDS)DATA.CARDS[k].u=svgUrl(DATA.CARDS[k].s);

const fade=v=>{const f=document.getElementById('fade');if(f)f.style.opacity=v;};
const wx=x=>(x+240)*K,wy=y=>(180-y)*K;
const CACHE={};
const loadImg=u=>new Promise((res,rej)=>{const i=new Image();i.decoding='async';i.onload=()=>res(i);i.onerror=()=>rej(new Error('load '+u));i.src=u;});
const levelUrl=(k,n)=>'levels/'+k+'-'+n+'.webp';
let SPRITES=null;
async function need(n){
  if(!SPRITES){const all=[];
    for(const k of['spin','orb','elec','portal','tele'])all.push(...DATA.A[k]);
    for(const k in DATA.A.blob)all.push(DATA.A.blob[k]);
    SPRITES=Promise.all(all.map(a=>loadImg(svgUrl(a.s)).then(i=>{a.img=i;})));
    SPRITES.catch(()=>{SPRITES=null;});}
  await SPRITES;
  if(!CACHE[n]){
    const [under,main,fore]=await Promise.all(['under','main','fore'].map(k=>loadImg(levelUrl(k,n))));
    for(const k in CACHE)delete CACHE[k];CACHE[n]={under,main,fore};}
  if(n<LEVELS)for(const k of['under','main','fore'])new Image().src=levelUrl(k,n+1); // warm next level
}
function makeEdge(n){
  const r=rng(n*977+13),c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d');g.fillStyle=levelColor(n);
  const P=len=>{const ph=[r()*6,r()*6,r()*6],a=[];for(let x=0;x<=len;x+=4)a.push(x,24+4.5*Math.sin(x*.035+ph[0])+2.5*Math.sin(x*.09+ph[1])+1*Math.sin(x*.18+ph[2]));return a;};
  let a=P(W);g.beginPath();g.moveTo(0,0);g.lineTo(W,0);for(let i=a.length-2;i>=0;i-=2)g.lineTo(a[i],a[i+1]);g.fill();
  a=P(W);g.beginPath();g.moveTo(0,H);g.lineTo(W,H);for(let i=a.length-2;i>=0;i-=2)g.lineTo(a[i],H-a[i+1]);g.fill();
  a=P(H);g.beginPath();g.moveTo(0,0);g.lineTo(0,H);for(let i=a.length-2;i>=0;i-=2)g.lineTo(a[i+1],a[i]);g.fill();
  a=P(H);g.beginPath();g.moveTo(W,0);g.lineTo(W,H);for(let i=a.length-2;i>=0;i-=2)g.lineTo(W-a[i+1],a[i]);g.fill();
  return c;
}
function spawnPos(m,L){
  let sx=wx(L.sp[0]),sy=wy(L.sp[1]);const dd=Math.hypot(W/2-sx,H/2-sy)||1;
  for(let t=75;t>0;t-=5){
    const x=sx+(W/2-sx)/dd*t,y=sy+(H/2-sy)/dd*t;let ok=true;
    for(let i=0;i<12&&ok;i++)if(solid(m,x+Math.cos(i*.5236)*26,y+Math.sin(i*.5236)*26))ok=false;
    if(ok)return{sx:x,sy:y};
  }
  return{sx,sy};
}
function buildLevel(n){CUR.c=levelColor(n);
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(CACHE[n].main,0,0,W,H);
  const d=g.getImageData(0,0,W,H).data,m=new Uint8Array(W*H);
  for(let i=0;i<m.length;i++)m[i]=d[i*4+3]>127?1:0;
  const edge=makeEdge(n);{const ed=edge.getContext('2d').getImageData(0,0,W,H).data;for(let i=0;i<m.length;i++)if(ed[i*4+3]>127)m[i]=1;}
  const L=DATA.L[n-1];
  return{m,n,L,main:CACHE[n].main,under:CACHE[n].under,fore:CACHE[n].fore,edge,...spawnPos(m,L)};
}
function drawSpiderBody(g){
  g.lineWidth=1.4;g.strokeStyle='#33606a';g.fillStyle='#0c1b1e';
  g.beginPath();g.ellipse(0,-9,13,12,0,0,TAU);g.fill();g.stroke();
  g.beginPath();g.ellipse(0,3,12,10.5,0,0,TAU);g.fill();g.stroke();
  g.fillStyle='#1c3a42';g.beginPath();g.ellipse(0,-10,4,6,0,0,TAU);g.fill();
  g.fillStyle='#e6e6e6';
  for(const s of[-1,1]){g.beginPath();g.moveTo(s*2,10);g.lineTo(s*6.5,10);g.quadraticCurveTo(s*6,15,s*3.4,19);g.quadraticCurveTo(s*3,14,s*2,10);g.fill();}
  const eye=(x,y,r,c)=>{g.fillStyle='rgba(255,40,40,.28)';g.beginPath();g.arc(x,y,r*1.9,0,TAU);g.fill();g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle='#000';g.beginPath();g.ellipse(x,y,r*.28,r*.85,0,0,TAU);g.fill();};
  eye(-5,1,3.6,'#ff2b2b');eye(5,1,3.6,'#ff2b2b');
  for(const p of[[-9,-3],[9,-3],[-3.5,-4.5],[3.5,-4.5]])eye(p[0],p[1],1.8,'#ff6b6b');
}
const levelColor=n=>n<=5?'#0c1b1e':n<=10?'#081225':n<=15?'#201533':n<=20?'#320e0e':'#151515';
const CUR={c:'#0c1b1e'};
function drawFace(g){
  g.fillStyle='#000';g.beginPath();g.arc(0,0,17,0,TAU);g.fill();
  g.fillStyle='#fff';
  g.fillStyle='#000';for(const s of[-1,1]){g.beginPath();g.moveTo(s*13,-8);g.lineTo(s*10,-22);g.lineTo(s*3,-14);g.closePath();g.fill();}
  g.fillStyle='#fff';for(const s of[-1,1]){g.beginPath();g.ellipse(s*6,-1,4,5.3,0,0,TAU);g.fill();}
  
  
}
// On-screen sprites are drawn from small bitmaps of the SVG, rendered once at 2x their on-screen size (sizes bucketed in 2%
// steps), instead of re-rasterising the SVG on every draw, which was the other big cost on phones. The hidden collision
// canvases still draw the SVG itself, so gameplay is unchanged. VIS = the on-screen context, VS = its device px per level px.
let VIS=null,VS=0,SPR_RASTER=true;
function sprRaster(a,d){
  const q=Math.round(Math.log(d)/Math.log(1.02)),m=a.rc||(a.rc=new Map());
  let r=m.get(q);if(r)return r;
  if(m.size>32)m.clear();
  const dq=Math.pow(1.02,q)*2,pad=2,c=document.createElement('canvas');
  c.width=Math.ceil(a.img.width*dq)+pad*2;c.height=Math.ceil(a.img.height*dq)+pad*2;
  c.getContext('2d').drawImage(a.img,pad,pad,a.img.width*dq,a.img.height*dq);
  r={c,dq,pad};m.set(q,r);return r;
}
function spr(g,a,x,y,dir,size,alpha){
  g.save();g.translate(wx(x),wy(y));g.rotate((dir-90)*Math.PI/180);
  const s=K*size/100/a.r;g.globalAlpha=Math.max(0,Math.min(1,alpha));
  if(g===VIS&&VS&&SPR_RASTER&&a.img.width){const r=sprRaster(a,s*VS);g.scale(s/r.dq,s/r.dq);g.drawImage(r.c,-a.x*r.dq-r.pad,-a.y*r.dq-r.pad);}
  else{g.scale(s,s);g.drawImage(a.img,-a.x,-a.y);}
  g.restore();
}
const SP={1:[1,'r',235,175,-1],2:[2,'r',-22,-4,-1.5],3:[3,'y',150,38,0,0],4:[4,'y',150,38,180,0],5:[5,'y',300,38,0,0],6:[6,'y',100,105,0,20],7:[7,'r',20,0,-1.5],8:[8,'x',150,40,0,0],9:[6,'y',70,100,0,-60],10:[9,'x',150,40,0,0],11:[10,'y',150,43,0,0],12:[11,'r',185,15,-2],13:[12,'x',90,145,0,0,1],14:[13,'x',130,40,0,0,1],15:[14,'o',70],16:[14,'o',-70],17:[15,'r',180,0,-1.2],18:[16,'y',150,38,0,0],19:[17,'y',200,52,0,0],20:[18,'y',200,52,180,0],21:[19,'r',30,50,1],22:[20,'y',225,52,180,0],23:[21,'y',225,52,0,0],24:[22,'r',0,0,1.8],25:[23,'r',15,-10,2.5]};
const rad=a=>a*Math.PI/180;
const themeFx=n=>n<=5?['#8fe0bd','#2f8f77']:n<=10?['#8fb4ff','#2c62c7']:n<=15?['#cba6ff','#7a4bd1']:n<=20?['#ff8f80','#c42a2a']:['#e4e4e4','#808080'];
function makeObjs(S,b,legs,setLevel,keys,settle){
  // Collision canvases only cover the area around the spider (not the full level), and are never drawn
  // to screen: the visible sprites are drawn straight onto the main canvas in above().
  const HR=13,DW=360;
  const L=S.L,hz=document.createElement('canvas');hz.width=hz.height=2*HR;
  const hg=hz.getContext('2d',{willReadFrequently:true});
  const sg=document.createElement('canvas');sg.width=sg.height=DW;const sgc=sg.getContext('2d',{willReadFrequently:true});DYN.d=null;
  let T=0,TS=0,SPD=S.n==21?.9:S.n==18?.65:1,fxs=[],boom=false,acc=0,col=0,won=0,tpc=0,sf=null,blobs,orbs,spins,elec;
  const reset=()=>{T=0;TS=0;col=0;fxs=[];
    blobs=L.blobs.map(([x,y,t])=>({x,y,ox:x,oy:y,t,rot:Math.random()*360,sz:t==1?10:40,fr:0,gh:0,vis:true}));
    orbs=L.orbs.map(([x,y,s])=>({x,y,s,gh:100,fade:0,sz:60}));
    spins=L.spin.map(([x,y,t])=>({x,y,t,dir:90,br:0}));
    elec=L.elec.map(([x,y,r,sz,ty,sec,st,sa])=>({x,y,r,sz,sec,st,sa,gh:100,f:0}));
    for(const l of legs){l.att=false;l.stepping=false;l.fx=b.x;l.fy=b.y+20;}
  };
  const die=()=>{b.x=S.sx;b.y=S.sy;b.vx=b.vy=0;reset();if(settle)settle();};
  reset();
  const tickOnce=(px,py)=>{
    T+=1/30;TS+=SPD/30;
    for(const f of fxs)f.t+=1/18;fxs=fxs.filter(f=>f.t<1);
    for(let i=0;i<blobs.length;i++){const a=blobs[i];if(a.dead||!a.vis||a.fr<1||!(a.t==2||a.t==4)||a.gh>60)continue;
      for(let j=i+1;j<blobs.length;j++){const c=blobs[j];if(c.dead||!c.vis||c.fr<1||!(c.t==2||c.t==4)||c.gh>60)continue;
        if(Math.hypot(a.x-c.x,a.y-c.y)<(a.sz+c.sz)*.17){a.dead=c.dead=true;fxs.push({x:(a.x+c.x)/2,y:(a.y+c.y)/2,t:0,s:a.sz+c.sz});break;}}}
    for(const o of blobs){
      if(o.dead)continue;const dx=px-o.x,dy=py-o.y,d=Math.hypot(dx,dy)||1,big=o.t==2||o.t==4,f=(S.n==21&&(o.t==3||o.t==5))?.55:(o.t==2||o.t==4)?.6:1,mv=s=>{o.x+=dx/d*s*f;o.y+=dy/d*s*f;};
      if(o.t==1){const gf=(S.n>=16&&S.n<=20)?.45:1;if(d<50){o.w=(o.w||0)+1;if(o.w>10)o.sz+=1.5*gf;}else{o.w=0;o.sz+=(1-d/50)*gf;if(o.sz<10)o.sz=10;}o.sz=Math.min(o.sz,220);continue;}
      if(o.t==2||o.t==4){o.rot+=4;if(o.fuse===undefined)o.fuse=-1;if(o.fuse<0){if(d<45)o.fuse=0;}else{o.fuse++;o.sz=40+(o.fuse%4<2?7:0);if(o.fuse>=12){o.dead=true;fxs.push({x:o.x,y:o.y,t:0,s:48});}}continue;}
      o.rot+=4;
      if(d<140&&o.fr<2){if(big){o.sz=40;o.fr=1;}else o.fr++;o.vis=true;o.gh=Math.max(0,o.gh-5);mv(o.t==2?1:o.t==4?1.7:2);}
      else if(o.fr>0){
        if(big)o.sz+=3;mv(o.t==2?.4:o.t==4?1.7:2);o.gh=Math.min(100,o.gh+(big?5:1));o.fr++;
        if(o.fr>(big?20:100))o.vis=false;
        if(o.fr>120){o.x=o.ox;o.y=o.oy;o.sz=35;o.gh=big?100:0;o.vis=true;o.fr=0;}
      }
    }
    for(const o of spins){
      const s=SP[o.t];if(!s)continue;
      if(s[1]=='r'){o.x=s[2];o.y=s[3];o.br+=((Math.hypot(px-30,py-50)<100)?(100-o.br)/4:-o.br/8);o.dir+=(s[4]==1&&o.t==21?1+2*o.br/100:s[4])*SPD;}
      else if(s[1]=='y'){o.y=Math.sin(rad(TS*s[2]+s[4]))*s[3]+s[5];}
      else if(s[1]=='x'){o.x=Math.sin(rad(TS*s[2]))*s[3];if(s[6])o.y=0;}
      else{const k=s[2];o.y=Math.cos(rad(TS*k))*137;o.x=Math.sin(rad(TS*k))*185;o.dir=90-Math.atan2(py-o.y,px-o.x)*180/Math.PI;}
    }
    for(const e of elec){
      let on=e.sec==-1||(e.sec==-2&&col<=1)||(e.sec==-3&&col<=2)||(e.sec>=0&&e.sec==col);
      if(on&&e.st>0)on=((Math.floor(T*30)+e.sa)%(e.st*2))<e.st;
      e.gh=Math.max(0,Math.min(100,e.gh+(on?-10:10)));
    }
    for(const o of orbs){
      if(o.fade){o.sz+=3;o.gh+=20;o.fade++;continue;}
      o.gh=Math.max(0,Math.min(100,o.gh+(o.s>col?10:-10)));
      if(o.gh<50&&Math.hypot(px-o.x,py-o.y)<10){col++;o.fade=1;}
    }
    orbs=orbs.filter(o=>o.fade<11);
  };
  const A=DATA.A;
  const spinAt=(x,y)=>{if(x<0||y<0||x>=W||y>=H||S.m[(y|0)*W+(x|0)])return -1;let bi=-1,bd=1e9;spins.forEach((o,i)=>{if(!SP[o.t])return;const d=Math.hypot(x-wx(o.x),y-wy(o.y));if(d<bd){bd=d;bi=i;}});return bi;};
  const xf=(q,o,x,y)=>{const rot=SP[o.t]&&SP[o.t][1]=='o'?0:rad(o.dir-q[2]),c=Math.cos(rot),s=Math.sin(rot),rx=x-wx(q[0]),ry=y-wy(q[1]);return[wx(o.x)+rx*c-ry*s,wy(o.y)+rx*s+ry*c,c,s];};
  const carry=pre=>{
    const cnt={};
    for(const l of legs){if(l.att&&!l.stepping&&l.sp>=0&&pre[l.sp]){const o=spins[l.sp],t=xf(pre[l.sp],o,l.fx,l.fy);l.fx=t[0];l.fy=t[1];const nx=l.nx*t[2]-l.ny*t[3],ny=l.nx*t[3]+l.ny*t[2];l.nx=nx;l.ny=ny;cnt[l.sp]=(cnt[l.sp]||0)+1;}}
    let best=-1,bc=0;for(const k in cnt)if(cnt[k]>bc){bc=cnt[k];best=+k;}
    if(best>=0&&bc>=2){const t=xf(pre[best],spins[best],b.x,b.y);b.x=t[0];b.y=t[1];}
  };
  const update=dt=>{
    if(keys.r){keys.r=0;die();return;}
    {let n=0;for(let i=0;i<12;i++)if(solid(S.m,b.x+Math.cos(i*.5236)*12,b.y+Math.sin(i*.5236)*12))n++;if(solid(S.m,b.x,b.y)||n>=5){die();return;}}
    const px=b.x/K-240,py=180-b.y/K;
    const pre=spins.map(o=>[o.x,o.y,o.dir]);acc+=Math.min(dt,.05)*30;while(acc>=1){acc--;tickOnce(px,py);}
    carry(pre);for(const f of fxs)if(Math.hypot(px-f.x,py-f.y)<(10+f.t*f.s*.8)*.95){die();return;}
    // hazards
    const bx=Math.round(b.x),by=Math.round(b.y),r=HR;
    hg.setTransform(1,0,0,1,0,0);hg.clearRect(0,0,2*r,2*r);hg.translate(r-bx,r-by);drawHaz(hg);
    if(spins.length||blobs.some(o=>o.t==1)){const X0=Math.max(0,Math.min(W-DW,bx-DW/2)),Y0=Math.max(0,Math.min(H-DW,by-DW/2));
      sgc.setTransform(1,0,0,1,0,0);sgc.clearRect(0,0,DW,DW);sgc.translate(-X0,-Y0);drawSolids(sgc);
      DYN.d=sgc.getImageData(0,0,DW,DW).data;DYN.x0=X0;DYN.y0=Y0;DYN.w=DW;DYN.h=DW;}
    const im=hg.getImageData(0,0,2*r,2*r).data;
    let hit=0;for(let y=0;y<2*r&&!hit;y+=2)for(let x=0;x<2*r;x+=2)if(im[(y*2*r+x)*4+3]>110&&Math.hypot(x-r,y-r)<r){hit=1;break;}
    if(hit){die();return;}
    // teleportals
    tpc=Math.max(0,tpc-dt);
    if(!tpc)for(const p of L.port){if(Math.hypot(px-p[0],py-p[1])<8){const q=L.port.find(z=>z!==p&&z[2]==p[2]);if(q){b.x=wx(q[0]);b.y=wy(q[1]);b.vx=b.vy=0;tpc=1;for(const l of legs){l.att=false;l.stepping=false;l.fx=b.x;l.fy=b.y;}}break;}}
    // finish
    if(!won&&col>=L.req&&Math.hypot(px-L.en[0],py-L.en[1])<16){won=1;levelDone(S.n);
      if(S.n>=LEVELS){endSeq().then(async()=>{const f=document.getElementById('fade');if(f)f.style.transition='opacity 2.5s ease';fade(1);await cardClose();if(f)f.style.transition='';openMenu(true);});}
      else{fade(1);setTimeout(()=>setLevel(S.n+1),450);}}
    hud(S.n,col,L.req);
  };
  const below=g=>{
    if(LC.on)blitLayer(g,LC.base);else{g.drawImage(S.under,0,0,W,H);g.drawImage(S.edge,0,0);}
    for(const o of orbs)spr(g,A.orb[Math.floor(T*15+o.x)%14&13],o.x,o.y,90,o.sz,1-o.gh/100);
    if(LC.on)blitLayer(g,LC.main);else g.drawImage(S.main,0,0,W,H);
    const open=col>=L.req,al=open?1:.3,pb=1+.1*Math.sin(T*1.6);
    spr(g,A.portal[0],L.en[0],L.en[1],90+T*90,55*pb,al);spr(g,A.portal[1],L.en[0],L.en[1],90-T*130,55*pb,al);
    for(const p of L.port)spr(g,A.tele[0],p[0],p[1],90+T*60,60*pb,1);
  };
  function drawSolids(g){for(const o of blobs)if(o.t==1&&o.vis)spr(g,A.blob['costume3'],o.x,o.y,90+o.rot,o.sz,1);for(const o of spins){const s=SP[o.t];if(s)spr(g,A.spin[s[0]-1],o.x,o.y,o.dir,DATA.S['Spinny / Movey'],1);}}
  function drawHaz(g){
    for(const o of blobs){if(!o.vis||o.dead||o.t==1)continue;const a=A.blob[(o.t==2||o.t==4)?'costume4':'costume5'];spr(g,a,o.x,o.y,90+o.rot,o.sz,1-o.gh/100);}
    for(const e of elec){if(e.gh>=100)continue;spr(g,A.elec[Math.floor(T*15)%5],e.x,e.y,e.r-90,e.sz,1-e.gh/100);}}
  const above=g=>{drawSolids(g);drawHaz(g);
    for(const f of fxs){const x=wx(f.x),y=wy(f.y),r=(10+f.t*f.s*.8)*K;g.globalAlpha=1-f.t;g.fillStyle=themeFx(S.n)[0];g.beginPath();g.arc(x,y,r*.7,0,TAU);g.fill();g.strokeStyle=themeFx(S.n)[1];g.lineWidth=5;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();for(let i=0;i<10;i++){const a=i*.628+f.t;g.beginPath();g.moveTo(x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.6);g.lineTo(x+Math.cos(a)*r*1.5,y+Math.sin(a)*r*1.5);g.stroke();}g.globalAlpha=1;}if(LC.on)blitLayer(g,LC.fore);else g.drawImage(S.fore,0,0,W,H);};
  return{update,below,above,spinAt};
}

const CTL={ax:0,ay:0,jump:0};
const DYN={d:null,x0:0,y0:0,w:0,h:0};
// Level art pre-scaled to the screen once per level/size: resampling four full-level layers every frame was what made
// phones lag. base = under + edge, then main, then fore; each frame copies only the visible part, 1:1, at whole device pixels.
// Very large screens (where three screen-size copies would cost too much memory) keep the old per-frame path.
const LC={on:false,S:null,s:0,base:null,main:null,fore:null,ox:0,oy:0,vw:0,vh:0};
function freeLayers(){for(const k of['base','main','fore'])if(LC[k]){LC[k].width=LC[k].height=0;LC[k]=null;}LC.on=false;LC.S=null;LC.s=0;}
function buildLayers(S,s){
  if(LC.S===S&&LC.s===s)return;
  freeLayers();
  const cw=Math.ceil(W*s),ch=Math.ceil(H*s);
  LC.S=S;LC.s=s;if(cw*ch>8e6)return;
  const mk=(draw,opaque)=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d',opaque?{alpha:false}:undefined);g.setTransform(s,0,0,s,0,0);draw(g);return c;};
  LC.base=mk(g=>{g.drawImage(S.under,0,0,W,H);g.drawImage(S.edge,0,0);},true); // under-*.webp is fully opaque
  LC.main=mk(g=>g.drawImage(S.main,0,0,W,H));
  LC.fore=mk(g=>g.drawImage(S.fore,0,0,W,H));
  LC.on=true;
}
function blitLayer(g,c){
  const x0=Math.max(0,LC.ox),y0=Math.max(0,LC.oy),x1=Math.min(c.width,LC.ox+LC.vw),y1=Math.min(c.height,LC.oy+LC.vh);
  if(x1<=x0||y1<=y0)return;
  g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
  g.drawImage(c,x0,y0,x1-x0,y1-y0,x0-LC.ox,y0-LC.oy,x1-x0,y1-y0);g.restore();
}
const solid=(m,x,y)=>{if(x<0||y<0||x>=W||y>=H)return 1;if(m[(y|0)*W+(x|0)])return 1;
  if(DYN.d){const dx=(x|0)-DYN.x0,dy=(y|0)-DYN.y0;if(dx>=0&&dy>=0&&dx<DYN.w&&dy<DYN.h&&DYN.d[(dy*DYN.w+dx)*4+3]>110)return 1;}return 0;};
function ray(m,x,y,a,R){
  if(solid(m,x,y))return null;
  const dx=Math.cos(a),dy=Math.sin(a);
  for(let d=3;d<=R;d+=3){
    if(solid(m,x+dx*d,y+dy*d)){
      let lo=d-3,hi=d;
      for(let k=0;k<4;k++){const mid=(lo+hi)/2;solid(m,x+dx*mid,y+dy*mid)?hi=mid:lo=mid;}
      return hi;
    }
  }
  return null;
}
function normalAt(m,x,y){
  let nx=0,ny=0;
  for(let i=0;i<16;i++){const a=i/16*TAU,c=Math.cos(a),s=Math.sin(a);if(!solid(m,x+c*7,y+s*7)){nx+=c;ny+=s;}}
  const l=Math.hypot(nx,ny);return l<.01?[0,-1]:[nx/l,ny/l];
}
function findTarget(S,leg,ox,oy,ba,legs){
  let best=null;
  for(let k=0;k<28;k++){
    const a=k/28*TAU,d=ray(S.m,ox,oy,a,MAXR);
    if(d==null)continue;
    const diff=Math.abs(((a-(ba+leg.th))%TAU+3*Math.PI)%TAU-Math.PI);
    const px=ox+Math.cos(a)*d,py=oy+Math.sin(a)*d;
    let sc=d+diff*14;
    for(const o of legs)if(o!==leg&&o.att&&Math.hypot(o.fx-px,o.fy-py)<11)sc+=45;
    if(!best||sc<best.sc)best={px,py,sc,d};
  }
  return best;
}

const CARDS=DATA.CARDS;
let PAUSE=false,INTRO=false,FLOW=0;const SEEN={};
const CHAP={1:'c1',6:'c2',11:'c3',16:'c4',21:'c5'};
const cardEl=()=>document.getElementById('cards');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const csc=()=>Math.min(innerWidth/480,innerHeight/360);
const cimg=(k,x,y,size,cls)=>{const a=CARDS[k],s=csc(),f=size/100;return '<img class="ci '+(cls||'')+'" src="'+a.u+'" style="width:'+(a.w*f*s)+'px;height:'+(a.h*f*s)+'px;left:'+(innerWidth/2+(x-a.rx*f)*s)+'px;top:'+(innerHeight/2+(-y-a.ry*f)*s)+'px">';};
const ringHtml=()=>{const a=CARDS.ring,s=csc(),w=a.w*.6*s;return '<img class="ci ring" src="'+a.u+'" style="width:'+w+'px;height:'+w+'px;left:'+(innerWidth/2-w/2)+'px;top:'+(innerHeight/2+90*s-w/2)+'px">';};
async function cardOpen(html){const c=cardEl();c.innerHTML=html;c.style.opacity=0;void c.offsetWidth;c.style.opacity=1;await sleep(1600);}
async function cardClose(){const c=cardEl();c.style.opacity=0;await sleep(1600);c.innerHTML='';}
// Tap the ring, or anywhere on the card, to continue.
const waitRing=()=>new Promise(res=>{const c=cardEl();c.style.pointerEvents='auto';c.onclick=()=>{c.onclick=null;c.style.pointerEvents='';res();};});
function startFlow(n){
  const my=++FLOW,c=cardEl();PAUSE=false;INTRO=false;if(c){c.style.opacity=0;c.style.pointerEvents='';c.onclick=null;}
  if(SEEN[n])return;SEEN[n]=1;
  (async()=>{
    const live=()=>my===FLOW;
    if(n==1&&!SEEN.intro){SEEN.intro=1;PAUSE=true;INTRO=true;
      await cardOpen(cimg('intro',0,0,66,'iz'));if(!live())return;
      await sleep(1700);if(!live())return;await cardClose();if(!live())return;await sleep(500);if(!live())return;}
    if(CHAP[n]){PAUSE=true;INTRO=true;
      await cardOpen(cimg(CHAP[n],0,20,80)+ringHtml());if(!live())return;
      await waitRing();setTimeout(()=>{if(my===FLOW)INTRO=false;},1600);if(!live())return;await cardClose();if(!live())return;}
    PAUSE=false;
  })();
}
async function endSeq(){
  PAUSE=true;
  await cardOpen(cimg('c6',0,20,80)+ringHtml());
  await waitRing();await cardClose();await cardOpen(cimg('end',0,0,80));await sleep(3500);
}
function game(level){
    const cv=document.getElementById('cv'),ctx=cv.getContext('2d'),S=buildLevel(level);
    const prefs=[-20,10,40,70,110,140,170,200];
    const b={x:S.sx,y:S.sy,vx:0,vy:0,ux:0,uy:-1,a:0,fs:1,face:1,jump:0};
    const legs=prefs.map(p=>{const th=p*Math.PI/180;return{th,hx:Math.cos(th)*11,hy:Math.sin(th)*8,fx:b.x,fy:b.y+40,att:false,stepping:false,t:0,ax:0,ay:0,tx:0,ty:0,nx:0,ny:-1,cool:0,sg:1};});
    const keys=KEYS,cam={x:0,y:0};
    let vw=0,vh=0,dpr=1,raf,last=performance.now();
    const resize=()=>{Z=zoomFor(innerWidth,innerHeight);dpr=Math.min(2,window.devicePixelRatio||1);vw=innerWidth/Z;vh=innerHeight/Z;cv.width=Math.round(innerWidth*dpr);cv.height=Math.round(innerHeight*dpr);};
    resize();
    addEventListener('resize',resize);
    cam.x=Math.max(0,Math.min(W-vw,b.x-vw/2));cam.y=Math.max(0,Math.min(H-vh,b.y-vh/2));

    const O=makeObjs(S,b,legs,setLevel,keys,()=>settle());RETRY=()=>{keys.r=1;};hud(S.n,0,S.L.req);fade(0);startFlow(S.n);
    const step=dt=>{
      let ax=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
      let ay=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
      ax+=CTL.ax;ay+=CTL.ay;
      const il=Math.hypot(ax,ay);if(il>1){ax/=il;ay/=il;}
      const att=legs.filter(l=>l.att);
      // up vector from foot normals
      let tx=0,ty=0;att.forEach(l=>{tx+=l.nx;ty+=l.ny;});
      const tl=Math.hypot(tx,ty);
      if(tl>.2){tx/=tl;ty/=tl;}else{tx=0;ty=-1;}
      const k=Math.min(1,dt*(att.length?9:2));
      b.ux+=(tx-b.ux)*k;b.uy+=(ty-b.uy)*k;
      const ul=Math.hypot(b.ux,b.uy)||1;b.ux/=ul;b.uy/=ul;
      b.a=Math.atan2(b.ux,-b.uy);
      b.jump=Math.max(0,b.jump-dt);
      if(keys.jump||CTL.jump){keys.jump=0;CTL.jump=0;if(att.length&&b.jump<=0){b.vx+=b.ux*520;b.vy+=b.uy*520;b.jump=.3;}}
      // forces
      let fx=ax*1400,fy=ay*1400;
      if(att.length&&b.jump<=0){
        let sx=0,sy=0;
        att.forEach(l=>{const off=(b.x-l.fx)*l.nx+(b.y-l.fy)*l.ny,e=HOVER-off;sx+=e*l.nx;sy+=e*l.ny;});
        fx+=70*sx/att.length;fy+=70*sy/att.length;
        const vn=b.vx*b.ux+b.vy*b.uy;fx-=12*vn*b.ux;fy-=12*vn*b.uy;
      }
      fy+=1500*(1-Math.min(1,att.length/4));
      b.vx+=fx*dt;b.vy+=fy*dt;
      const dm=Math.exp(-3.5*dt);b.vx*=dm;b.vy*=dm;
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      for(let it=0;it<3;it++)for(let i=0;i<14;i++){
        const a=i/14*TAU,c=Math.cos(a),s=Math.sin(a);
        if(solid(S.m,b.x+c*RB,b.y+s*RB)){b.x-=c*3;b.y-=s*3;const vn=b.vx*c+b.vy*s;if(vn>0){b.vx-=vn*c;b.vy-=vn*s;}}
      }
      const vr=b.vx*Math.cos(b.a)+b.vy*Math.sin(b.a);
      if(vr>25)b.face=1;else if(vr<-25)b.face=-1;
      b.fs+=(b.face-b.fs)*Math.min(1,dt*12);
      // legs
      const ca=Math.cos(b.a),sa=Math.sin(b.a);
      legs.forEach((l,i)=>{
        const hx=b.x+ca*l.hx-sa*l.hy,hy=b.y+sa*l.hx+ca*l.hy;
        l.hwx=hx;l.hwy=hy;
        if(l.stepping){
          l.t+=dt/.12;
          if(l.t>=1){l.stepping=false;l.att=true;l.fx=l.tx;l.fy=l.ty;l.sp=O.spinAt(l.fx,l.fy);}
          else{const e=1-Math.pow(1-l.t,2),lift=Math.sin(Math.PI*l.t)*9;
            l.fx=l.ax+(l.tx-l.ax)*e+l.nx*lift;l.fy=l.ay+(l.ty-l.ay)*e+l.ny*lift;}
          return;
        }
        l.cool-=dt;
        const d=Math.hypot(l.fx-hx,l.fy-hy);
        if(l.att&&(d>MAXR*1.08||!(solid(S.m,l.fx,l.fy)||solid(S.m,l.fx-l.nx*2,l.fy-l.ny*2))))l.att=false;
        const ox=hx+b.vx*.15,oy=hy+b.vy*.15;
        const cand=findTarget(S,l,solid(S.m,ox,oy)?hx:ox,solid(S.m,ox,oy)?hy:oy,b.a,legs);
        const ns=legs.filter(s=>s.stepping).length;
        const nb=legs[(i+1)%N].stepping||legs[(i+N-1)%N].stepping;
        const urgent=!l.att||d>MAXR*.93||d<11;
        const want=urgent||(l.cool<=0&&cand&&cand.d+22<d);
        const allowed=urgent?ns<5:(ns<3&&!nb);
        if(want&&allowed&&cand){
          l.ax=l.fx;l.ay=l.fy;l.tx=cand.px;l.ty=cand.py;
          [l.nx,l.ny]=normalAt(S.m,cand.px,cand.py);
          l.stepping=true;l.att=false;l.t=0;l.cool=.3;l.sp=-1;
        }else if(!cand&&!l.att){
          const rx=hx+Math.cos(b.a+l.th)*MAXR*.6,ry=hy+Math.sin(b.a+l.th)*MAXR*.6,q=Math.min(1,dt*10);
          l.fx+=(rx-l.fx)*q;l.fy+=(ry-l.fy)*q;
        }
      });
    };

    const drawLeg=l=>{
      const hx=l.hwx,hy=l.hwy;
      let dx=l.fx-hx,dy=l.fy-hy,D=Math.hypot(dx,dy)||1;
      const Dc=Math.max(Math.abs(L1-L2)+1,Math.min(L1+L2-.5,D));
      dx/=D;dy/=D;
      const hang=Math.acos(Math.max(-1,Math.min(1,(L1*L1+Dc*Dc-L2*L2)/(2*L1*Dc))));
      let best=null;
      for(const sg of[1,-1]){
        const c=Math.cos(hang*sg),s=Math.sin(hang*sg);
        const kx=hx+(dx*c-dy*s)*L1,ky=hy+(dx*s+dy*c)*L1;
        const sc=(kx-hx)*b.ux+(ky-hy)*b.uy+(sg===l.sg?8:0);
        if(!best||sc>best.sc)best={kx,ky,sc,sg};
      }
      l.sg=best.sg;
      const ex=hx+dx*Dc,ey=hy+dy*Dc;
      ctx.lineCap='round';
      for(const [w,ink,k] of[[6,'#000',0]]){
        ctx.strokeStyle=ink;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(best.kx,best.ky);ctx.stroke();
        ctx.lineWidth=w-1;ctx.beginPath();ctx.moveTo(best.kx,best.ky);ctx.lineTo(ex,ey);ctx.stroke();
      }
            ctx.beginPath();
      
    };

    const settle=()=>{for(let i=0;i<40;i++)step(1/30);b.y-=44;b.vy=0;};settle();
    const frame=now=>{
      const dt=Math.min(.033,(now-last)/1000);last=now;
      if(!PAUSE&&!MENU){step(dt);O.update(dt);}
      cam.x+=(Math.max(0,Math.min(W-vw,b.x-vw/2))-cam.x)*Math.min(1,dt*6);
      cam.y+=(Math.max(0,Math.min(H-vh,b.y-vh/2))-cam.y)*Math.min(1,dt*6);
      const s=dpr*Z;buildLayers(S,s);VIS=ctx;VS=s;
      if(LC.on){LC.ox=Math.round(cam.x*s);LC.oy=Math.round(cam.y*s);LC.vw=cv.width;LC.vh=cv.height;
        ctx.setTransform(1,0,0,1,0,0);
        if(LC.ox<0||LC.oy<0||LC.ox+LC.vw>LC.base.width||LC.oy+LC.vh>LC.base.height){ctx.fillStyle=CUR.c;ctx.fillRect(0,0,cv.width,cv.height);} // else the opaque base covers it
        ctx.setTransform(s,0,0,s,-LC.ox,-LC.oy);}
      else{const cx=cam.x|0,cy=cam.y|0;
        ctx.setTransform(s,0,0,s,0,0);
        ctx.fillStyle=CUR.c;
        ctx.fillRect(0,0,vw,vh);
        ctx.translate(-cx,-cy);}
      O.below(ctx);
      if(!INTRO)legs.forEach(drawLeg);
      if(!INTRO){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.scale(.92,.92);drawFace(ctx);ctx.restore();}
      O.above(ctx);
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize);RETRY=null;freeLayers();};
}

/* ---------- Shell: level switching, input, HUD, progress ---------- */
const KEYS={};let RETRY=null,LEVEL=0,OFF=null,LOADING=0,MENU=false;
// Saved progress: cur = level to continue, max = highest unlocked level, won = finished level 21 at least once.
const SAVE_KEY='kahf-spider-ik';
const lv=n=>Math.max(1,Math.min(LEVELS,n|0||1));
const PROG=(()=>{try{const o=JSON.parse(localStorage.getItem(SAVE_KEY))||{};const max=lv(o.max);return{cur:Math.min(lv(o.cur),max),max,won:!!o.won};}catch(e){return{cur:1,max:1,won:false};}})();
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(PROG));}catch(e){}};
// Phones see a wider slice of the level; big screens never see past its edges.
function zoomFor(w,h){const z=Math.min(.95,Math.max(.62,Math.min(w,h)/760));return Math.max(z,w/W,h/H);}
function levelDone(n){if(n<LEVELS){PROG.max=Math.max(PROG.max,n+1);PROG.cur=n+1;}else{PROG.won=true;PROG.cur=1;}persist();try{window.KahfBridge&&window.KahfBridge.complete();}catch(e){}}
let hudKey='';
function hud(n,col,req){const k=n+'|'+col+'|'+req;if(k===hudKey)return;hudKey=k;
  const st=document.getElementById('st');if(st)st.textContent='Level '+n+' / '+LEVELS;
  const ob=document.getElementById('orbs');if(ob){ob.textContent=col+' / '+req;ob.parentNode.hidden=!req;ob.parentNode.classList.toggle('done',col>=req);}
  document.body.classList.toggle('l1',n===1);}
const msg=(t,retry)=>{const m=document.getElementById('msg');if(!m)return;m.hidden=!t;m.querySelector('p').textContent=t||'';m.querySelector('button').hidden=!retry;};
function setLevel(v,force){
  const n=Math.max(1,Math.min(LEVELS,typeof v==='function'?v(LEVEL):v));
  if(n===LEVEL&&OFF&&!force)return;
  if(n>PROG.max)return;
  LEVEL=n;PROG.cur=n;persist();hudKey='';closeMenu();
  if(OFF){OFF();OFF=null;}
  const tok=++LOADING,slow=setTimeout(()=>{if(tok===LOADING)msg('Loading…');},300);
  need(n).then(()=>{clearTimeout(slow);if(tok!==LOADING)return;msg('');OFF=game(n);})
    .catch(()=>{clearTimeout(slow);if(tok!==LOADING)return;msg('Could not load this level. Check your connection.',true);});
}

addEventListener('keydown',e=>{if(e.repeat&&e.key===' ')return e.preventDefault();const k=e.key.toLowerCase();KEYS[k]=1;
  if(k===' '||k.startsWith('arrow')){e.preventDefault();}if(k===' ')KEYS.jump=1;
  if(k==='escape'){MENU?(OFF&&closeMenu()):openMenu();}});
addEventListener('keyup',e=>{KEYS[e.key.toLowerCase()]=0;});
addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=0;CTL.ax=CTL.ay=0;});

// Touch controls: left half = floating joystick, right half = jump.
const isTouch=(navigator.maxTouchPoints>0)||matchMedia('(pointer: coarse)').matches;
function setupTouch(){
  const zl=document.getElementById('zl'),zr=document.getElementById('zr'),joy=document.getElementById('joy'),knob=joy.querySelector('.knob'),jb=document.getElementById('jb');
  let id=null,cx=0,cy=0;const R=()=>joy.offsetWidth/2;
  const place=(x,y)=>{joy.style.left=x+'px';joy.style.top=y+'px';};
  const rest=()=>{joy.style.left='';joy.style.top='';joy.classList.remove('on');knob.style.transform='';CTL.ax=CTL.ay=0;id=null;};
  const mv=e=>{const r=R();let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy);if(l>r){dx*=r/l;dy*=r/l;}
    knob.style.transform='translate('+dx+'px,'+dy+'px)';if(Math.hypot(dx,dy)/r<.15){CTL.ax=CTL.ay=0;}else{CTL.ax=dx/r;CTL.ay=dy/r;}};
  const used=k=>document.body.classList.add(k);
  zl.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();used('moved');id=e.pointerId;try{zl.setPointerCapture(id);}catch(_){}
    cx=e.clientX;cy=e.clientY;place(cx,cy);joy.classList.add('on');mv(e);});
  zl.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e);});
  for(const t of['pointerup','pointercancel','lostpointercapture'])zl.addEventListener(t,e=>{if(e.pointerId===id)rest();});
  zr.addEventListener('pointerdown',e=>{e.preventDefault();used('jumped');CTL.jump=1;jb.classList.add('on');setTimeout(()=>jb.classList.remove('on'),150);});
}

/* Level select / title screen */
const CHAPTERS=[[1,5],[6,10],[11,15],[16,20],[21,21]];
function renderMenu(won){
  const grid=document.getElementById('grid');grid.innerHTML='';
  CHAPTERS.forEach(([a,z],ci)=>{
    const sec=document.createElement('section');sec.className='chap';sec.style.setProperty('--c',themeFx(a)[1]);sec.style.setProperty('--c2',themeFx(a)[0]);
    const h=document.createElement('h2');h.textContent=a===LEVELS?'Finale':'Chapter '+(ci+1);sec.appendChild(h);
    const row=document.createElement('div');row.className='row';
    for(let n=a;n<=z;n++){const b=document.createElement('button'),locked=n>PROG.max,done=n<PROG.max||(n===LEVELS&&PROG.won);
      b.className='lv'+(locked?' locked':'')+(done?' done':'')+(n===PROG.cur?' cur':'');b.disabled=locked;
      b.setAttribute('aria-label','Level '+n+(locked?' (locked)':done?' (finished)':''));
      b.innerHTML=locked?'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>':'<span>'+n+'</span>'+(done?'<i>✓</i>':'');
      if(!locked)b.onclick=()=>setLevel(n,true);row.appendChild(b);}
    sec.appendChild(row);grid.appendChild(sec);});
  const fresh=PROG.max===1&&PROG.cur===1&&!PROG.won;
  const resume=OFF&&!won&&LEVEL===PROG.cur;
  document.getElementById('play').textContent=resume?'Resume · Level '+LEVEL:fresh?'Play':(PROG.won&&PROG.cur===1)?'Play again':'Continue · Level '+PROG.cur;
  document.getElementById('sub').textContent=won?'You finished all 21 levels! Play any level again.':'Crawl through 21 caves. Collect the orbs and reach the portal.';
  document.getElementById('mclose').hidden=!OFF||!!won;
}
function openMenu(won){MENU=true;CTL.ax=CTL.ay=0;for(const k in KEYS)KEYS[k]=0;renderMenu(won);const m=document.getElementById('menu');m.hidden=false;document.body.classList.add('menu-open');}
function closeMenu(){MENU=false;document.getElementById('menu').hidden=true;document.body.classList.remove('menu-open');}

/* Offline: register the shared KidsGames service worker (like the other games do) and have it store
   every file this game needs, so all 21 levels work offline after one online visit, not just the ones played. */
function setupOffline(){
  if(!('serviceWorker' in navigator)||!location.pathname.startsWith('/KidsGames/'))return;
  if(navigator.connection&&navigator.connection.saveData)return;
  navigator.serviceWorker.register('/KidsGames/sw.js').catch(()=>{});
  navigator.serviceWorker.ready.then(reg=>new Promise(r=>setTimeout(()=>r(reg),4000))).then(async reg=>{
    const abs=p=>new URL(p,location.href).pathname;
    const urls=[location.pathname,'index.html','js/game.js','js/assets.js','/KidsGames/js/kahf-bridge.js'];
    for(let n=1;n<=LEVELS;n++)for(const k of['under','main','fore'])urls.push(levelUrl(k,n));
    let todo=[...new Set(urls.map(abs))];
    try{const have=await Promise.all(todo.map(u=>caches.match(u)));todo=todo.filter((u,i)=>!have[i]);}catch(e){}
    const sw=reg.active||navigator.serviceWorker.controller;
    if(todo.length&&sw)sw.postMessage({type:'CACHE_URLS',urls:todo});
  }).catch(()=>{});
}

function boot(){
  document.body.classList.toggle('touch',isTouch);
  const fs=document.getElementById('fs'),d=document;
  // Inside the Kahf Kids app WebView (or an iframe) the app owns the screen, so no fullscreen button there.
  let inApp=!!window.ReactNativeWebView;try{inApp=inApp||window.self!==window.top;}catch(e){inApp=true;}
  if(!inApp&&(d.fullscreenEnabled||d.webkitFullscreenEnabled)){fs.hidden=false;fs.onclick=()=>{try{const el=d.documentElement;if(d.fullscreenElement||d.webkitFullscreenElement){(d.exitFullscreen||d.webkitExitFullscreen).call(d);}else{(el.requestFullscreen||el.webkitRequestFullscreen).call(el);}}catch(e){}};}
  document.getElementById('retry').onclick=()=>{if(RETRY)RETRY();};
  document.getElementById('levels').onclick=()=>openMenu();
  document.getElementById('mclose').onclick=()=>closeMenu();
  document.getElementById('play').onclick=()=>{if(OFF&&LEVEL===PROG.cur&&!document.getElementById('mclose').hidden)closeMenu();else setLevel(PROG.cur,true);};
  document.getElementById('msg').querySelector('button').onclick=()=>setLevel(LEVEL,true);
  if(isTouch)setupTouch();
  for(const t of['contextmenu','gesturestart','dblclick'])d.addEventListener(t,e=>e.preventDefault());
  setTimeout(()=>document.body.classList.add('hint-off'),12000);
  // Start playing straight away (level 1 on first launch, else where the child left off); the grid button opens level select.
  setLevel(PROG.cur,true);
  setupOffline();
}
boot();
