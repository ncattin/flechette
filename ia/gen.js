/* Générateur d'images d'entraînement pour le réseau « pointe de fléchette ».
   Chaque exemple = une paire d'images 192x192 (avant / après l'arrivée d'une fléchette), centrée à peu près
   sur la nouvelle fléchette, + la position exacte de sa pointe. Tout est tiré au hasard (caméra, cible,
   fléchettes, lumière, ombres, flou, bruit) pour que le réseau apprenne la fléchette et pas un décor. */
(function(){
"use strict";
const R={bullIn:6.35,bullOut:15.9,trIn:99,trOut:107,dbIn:162,dbOut:170};
const ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
let seed=1;const rnd=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const gauss=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const U=(a,b)=>a+(b-a)*rnd(),pick=a=>a[(rnd()*a.length)|0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>{const l=Math.hypot(...a);return[a[0]/l,a[1]/l,a[2]/l]},
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const hex=(r,g,b)=>"rgb("+Math.round(r)+","+Math.round(g)+","+Math.round(b)+")";

/* ---------- cible : quelques variantes de couleurs, texture à 3 px/mm ---------- */
const PX=3,BR=226,TS=BR*2*PX;
function makeBoard(){
  const c=document.createElement("canvas");c.width=c.height=TS;const x=c.getContext("2d"),s=PX;x.translate(TS/2,TS/2);
  const cr=U(200,235),cg=cr*U(.9,.97),cb=cr*U(.72,.85),dk=U(18,40),rr=[U(150,200),U(20,45),U(30,55)],gg=[U(10,35),U(100,150),U(50,85)];
  x.fillStyle=hex(dk*.8,dk*.8,dk*.8);x.beginPath();x.arc(0,0,BR*s,0,7);x.fill();
  const wedge=(r1,r2,i,col)=>{const a0=(i*18-9-90)*Math.PI/180,a1=a0+18*Math.PI/180;x.beginPath();x.arc(0,0,r2*s,a0,a1);x.arc(0,0,r1*s,a1,a0,true);x.closePath();x.fillStyle=col;x.fill()};
  for(let i=0;i<20;i++){const d=i%2===0,sg=d?hex(dk,dk,dk):hex(cr,cg,cb),rg=d?hex(...rr):hex(...gg);
    wedge(R.bullOut,R.trIn,i,sg);wedge(R.trIn,R.trOut,i,rg);wedge(R.trOut,R.dbIn,i,sg);wedge(R.dbIn,R.dbOut,i,rg)}
  x.fillStyle=hex(...gg);x.beginPath();x.arc(0,0,R.bullOut*s,0,7);x.fill();x.fillStyle=hex(...rr);x.beginPath();x.arc(0,0,R.bullIn*s,0,7);x.fill();
  const wb=U(130,215);x.strokeStyle=hex(wb,wb,wb*.97);x.lineWidth=U(.7,1.4)*s;
  for(const r of [R.bullIn,R.bullOut,R.trIn,R.trOut,R.dbIn,R.dbOut]){x.beginPath();x.arc(0,0,r*s,0,7);x.stroke()}
  for(let i=0;i<20;i++){const a=(i*18-9)*Math.PI/180;x.beginPath();x.moveTo(R.bullOut*s*Math.sin(a),-R.bullOut*s*Math.cos(a));x.lineTo(R.dbOut*s*Math.sin(a),-R.dbOut*s*Math.cos(a));x.stroke()}
  x.fillStyle="#eee";x.font="600 "+(19*s)+"px Arial,sans-serif";x.textAlign="center";x.textBaseline="middle";
  for(let i=0;i<20;i++){const a=i*18*Math.PI/180;x.fillText(ORDER[i],197*s*Math.sin(a),-197*s*Math.cos(a))}
  x.setTransform(1,0,0,1,0,0);const id=x.getImageData(0,0,TS,TS),d=id.data,fib=U(6,22);
  for(let j=0;j<d.length;j+=4){if(!d[j+3])continue;const n=(rnd()-.5)*fib;d[j]+=n;d[j+1]+=n;d[j+2]+=n}
  return{data:d,wall:[U(60,200),U(55,180),U(45,160)]};
}

/* ---------- fléchettes ---------- */
const BAR=["#55585e","#8a8d93","#2a2b2e","#b9a46a","#c9cbd0","#3d4048"],SHF=["#1e1e22","#d23","#26c","#eee","#2a2","#555"],FLC=["#ffcc00","#2a8cff","#ff3d8b","#22c55e","#f97316","#e11","#111","#fff","#7c3aed","#0aa"];
function mkDart(bx,by){
  const yaw=gauss()*.16,pit=-.22+gauss()*.15,d=nrm([yaw,pit,1]),e1=nrm(cross(d,[1e-3,0,1])),e2=nrm(cross(d,e1)),rot=rnd()*Math.PI;
  const f1=e1.map((v,i)=>v*Math.cos(rot)+e2[i]*Math.sin(rot)),f2=cross(d,f1),L=U(.88,1.12);
  const pt=U(18,32),bl=U(36,55),sh=U(28,45),fl=U(30,52),fw=U(10,19);
  return{bx,by,d,f1,f2,P:s=>[bx+d[0]*s,by+d[1]*s,d[2]*s],
    parts:[[0,pt,U(.9,1.3),.3,pick(["#c9cacd","#9a9ca0","#d8d8d8"])],[pt,pt+bl,U(2.9,4.2),U(2.6,4),pick(BAR)],[pt+bl,pt+bl+sh,U(1.8,2.7),U(1.8,2.6),pick(SHF)]],
    fl:[pt+bl+sh-6,pt+bl+sh-6+fl,fw],fc:pick(FLC),len:pt+bl+sh-6+fl};
}

/* ---------- un exemple ---------- */
const OUT=192;
function sample(){
  const B=makeBoard();
  // caméra : sous la cible (cas courant), sur le côté ou presque de face
  const C=[U(-550,550),U(-150,700),U(420,1150)],Wf=1920,F=U(.7,1)*Wf;
  const fw=nrm(sub([gauss()*25,gauss()*25,0],C)),up0=[0,1,0],dw0=nrm(sub(up0,fw.map(v=>v*dot(up0,fw)))),rt0=cross(fw,dw0),roll=gauss()*.06;
  const rt=rt0.map((v,i)=>v*Math.cos(roll)+dw0[i]*Math.sin(roll)),dw=dw0.map((v,i)=>v*Math.cos(roll)-rt0[i]*Math.sin(roll));
  const proj=P=>{const v=sub(P,C),z=dot(v,fw);return z>1?[F*dot(v,rt)/z,F*dot(v,dw)/z,z]:null}; // centre de l'image = (0,0)
  proj.F=F;
  // fléchette à apprendre + 0 à 3 anciennes (souvent tout près : elles se cachent l'une l'autre)
  const tipPos=()=>{const k=rnd();if(k<.35)return[gauss()*30,-103+gauss()*30];const a=rnd()*2*Math.PI,r=k<.5?U(0,22):k<.65?U(R.dbIn-3,R.dbOut+3):U(0,200);return[r*Math.sin(a),-r*Math.cos(a)]};
  const nb=tipPos(),Dn=mkDart(nb[0],nb[1]),old=[];
  const no=(rnd()*4)|0;for(let k=0;k<no;k++){const near=rnd()<.55,p=near?[nb[0]+gauss()*18,nb[1]+gauss()*18]:tipPos();old.push(mkDart(p[0],p[1]))}
  const tip=proj([nb[0],nb[1],0]),tail=proj(Dn.P(Dn.len));if(!tip||!tail)return null;
  const dl=Math.hypot(tail[0]-tip[0],tail[1]-tip[1]);if(dl<25)return null; // fléchette vue dans l'axe : trop peu visible pour ce modèle
  // zone découpée : autour de la fléchette, la pointe pas forcément au centre (l'estimation grossière se trompe)
  const S=dl*U(1.25,1.9),ccx=(tip[0]*U(.55,.8)+tail[0]*U(.2,.45))+gauss()*S*.08,ccy=(tip[1]*.65+tail[1]*.35)+gauss()*S*.08;
  const k=OUT/S,ox=ccx-S/2,oy=ccy-S/2;
  const tx=(tip[0]-ox)*k,ty=(tip[1]-oy)*k;if(tx<6||ty<6||tx>OUT-6||ty>OUT-6)return null;
  // lumière (ombres), effets d'image
  const L=nrm([gauss()*.4,U(.3,1),-U(.4,1)]),shA=U(0,.45),blur=U(0,1.6),ex={br:U(.75,1.25),ct:U(.75,1.2),sat:U(.6,1.15),sep:U(0,.35),noise:U(2,12)};
  const bg=renderBoard(B,C,F,rt,dw,fw,ox,oy,k);
  const draw=(withNew,ns)=>{const c=document.createElement("canvas");c.width=c.height=OUT;const x=c.getContext("2d");x.putImageData(bg,0,0);
    const ds=old.concat(withNew?[Dn]:[]);x.setTransform(k,0,0,k,-ox*k,-oy*k);
    // ombres
    if(shA>.02){const sc=document.createElement("canvas");sc.width=sc.height=OUT;const sx=sc.getContext("2d");sx.setTransform(k,0,0,k,-ox*k,-oy*k);
      for(const D of ds)drawDart(sx,D,proj,L);x.setTransform(1,0,0,1,0,0);x.globalAlpha=shA;x.filter="blur("+Math.max(.5,3*k)+"px)";x.drawImage(sc,0,0);x.globalAlpha=1;x.filter="none";x.setTransform(k,0,0,k,-ox*k,-oy*k)}
    ds.slice().sort((a,b)=>(proj(b.P(70))||[0,0,0])[2]-(proj(a.P(70))||[0,0,0])[2]).forEach(D=>drawDart(x,D,proj,null));
    x.setTransform(1,0,0,1,0,0);
    // effets de caméra : flou, couleurs, bruit (bruit différent avant/après, comme une vraie caméra)
    const o=document.createElement("canvas");o.width=o.height=OUT;const y=o.getContext("2d");
    y.filter="blur("+blur.toFixed(2)+"px) brightness("+ex.br.toFixed(2)+") contrast("+ex.ct.toFixed(2)+") saturate("+ex.sat.toFixed(2)+") sepia("+ex.sep.toFixed(2)+")";y.drawImage(c,0,0);y.filter="none";
    const id=y.getImageData(0,0,OUT,OUT),d=id.data;seed=(seed^ns)>>>0;for(let j=0;j<d.length;j+=4){const n=gauss()*ex.noise;d[j]+=n;d[j+1]+=n;d[j+2]+=n}
    y.putImageData(id,0,0);return o};
  const before=draw(false,0x9e3779b9),after=draw(true,0x85ebca6b);
  return{before,after,tip:[+tx.toFixed(2),+ty.toFixed(2)],tail:[+((tail[0]-ox)*k).toFixed(1),+((tail[1]-oy)*k).toFixed(1)],nold:no,blur:+blur.toFixed(2)};
}
function renderBoard(B,C,F,rt,dw,fw,ox,oy,k){
  const img=new ImageData(OUT,OUT),o=img.data,d=B.data,SS=[[.25,.25],[.75,.75]];
  for(let y=0;y<OUT;y++)for(let x=0;x<OUT;x++){let r=0,g=0,b=0;
    for(const[sx,sy]of SS){const u=(ox+(x+sx)/k)/F,v=(oy+(y+sy)/k)/F,dir=[rt[0]*u+dw[0]*v+fw[0],rt[1]*u+dw[1]*v+fw[1],rt[2]*u+dw[2]*v+fw[2]];
      const t=-C[2]/dir[2],X=C[0]+t*dir[0],Y=C[1]+t*dir[1];
      if(t>0&&Math.hypot(X,Y)<BR-.5){const uu=X*PX+TS/2,vv=Y*PX+TS/2,ui=uu|0,vi=vv|0,j=(vi*TS+ui)*4;r+=d[j];g+=d[j+1];b+=d[j+2]}
      else{const w=.9+.1*Math.sin(X*.013)*Math.cos(Y*.011);r+=B.wall[0]*w;g+=B.wall[1]*w;b+=B.wall[2]*w}}
    const j=(y*OUT+x)*4;o[j]=r/2;o[j+1]=g/2;o[j+2]=b/2;o[j+3]=255}
  return img}
function drawDart(x,D,proj,L){
  const P=L?(s=>{const p=D.P(s),t=-p[2]/L[2];return[p[0]+L[0]*t,p[1]+L[1]*t,.2]}):D.P;
  const seg=(A,Bp,rA,rB,col)=>{const a=proj(A),b=proj(Bp);if(!a||!b)return;
    const wa=rA/a[2]*proj.F,wb=rB/b[2]*proj.F,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
    x.beginPath();x.moveTo(a[0]+nx*wa,a[1]+ny*wa);x.lineTo(b[0]+nx*wb,b[1]+ny*wb);x.lineTo(b[0]-nx*wb,b[1]-ny*wb);x.lineTo(a[0]-nx*wa,a[1]-ny*wa);x.closePath();x.fillStyle=L?"#000":col;x.fill();
    if(!L){x.strokeStyle="rgba(255,255,255,.25)";x.lineWidth=Math.max(.3,(wa+wb)*.18);x.beginPath();x.moveTo(a[0]+nx*wa*.45,a[1]+ny*wa*.45);x.lineTo(b[0]+nx*wb*.45,b[1]+ny*wb*.45);x.stroke()}};
  for(const[s0,s1,r0,r1,col]of D.parts)seg(P(s0),P(s1),r0,r1,col);
  const[f0,f1,w]=D.fl;
  for(const[kk,f]of [[0,D.f1],[1,D.f2]]){const pts=[[f0,0],[f0+10,w],[f1,w],[f1,0],[f1,-w],[f0+10,-w]].map(([s,o])=>{const p=D.P(s);let q=[p[0]+f[0]*o,p[1]+f[1]*o,p[2]+f[2]*o];if(L){const t=-q[2]/L[2];q=[q[0]+L[0]*t,q[1]+L[1]*t,.2]}return proj(q)});
    if(pts.some(p=>!p))continue;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fillStyle=L?"#000":D.fc;x.globalAlpha=L?1:(kk?.82:.95);x.fill();x.globalAlpha=1}
}
window.genBatch=function(n,s0){seed=s0>>>0||1;const out=[];let tries=0;
  while(out.length<n&&tries<n*20){tries++;const sm=sample();if(!sm)continue;
    out.push({before:sm.before.toDataURL("image/jpeg",.92),after:sm.after.toDataURL("image/jpeg",.92),tip:sm.tip,tail:sm.tail,nold:sm.nold,blur:sm.blur})}
  return out};
})();
