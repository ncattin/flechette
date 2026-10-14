/* Banc d'essai de la détection (chargé seulement avec ?banc dans l'adresse).
   Une cible réaliste est rendue en perspective (téléphone posé sous la cible, de côté, de face…),
   des fléchettes 3D y sont plantées à des positions connues, avec ombres, bruit du capteur,
   variations de lumière, léger tremblement, main qui retire les fléchettes et rebonds.
   L'image passe dans la vraie détection de l'appli ; chaque résultat est comparé à la vérité.
   Paramètres : ?banc&pose=dessous|face|cote|bas&n=30&seed=1&shake=0..3 */
(function(){
"use strict";
const FL=window.__fl;if(!FL)return;if(/[?&]nosnap/.test(location.search))window.__noSnap=true;
const Q=new URLSearchParams(location.search);
// tel : image comme celle d'un vrai téléphone (floue, jaunie, couleurs ternes, bruit fort, 1280x720, main qui tremble, capture d'écran qui secoue)
const TEL=Q.has("tel");
const POSE=Q.get("pose")||"dessous",NT=+(Q.get("n")||30),SEED=+(Q.get("seed")||1),SHAKE=+(Q.get("shake")||(TEL?3:1));
const UHD=Q.has("uhd"),W=UHD?3840:TEL?1280:1920,H=UHD?2160:TEL?720:1080,F=0.82*W,CX=W/2,CY=H/2;
const R=FL.R,ORDER=FL.ORDER;
let seed=SEED>>>0||1;const rnd=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const gauss=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};

/* ---------- caméra ---------- */
const POSES={ // position du téléphone (mm) : x à droite, y vers le bas, z devant la cible
  dessous:[60,520,560],   // posé sous la cible, incliné vers le haut (cas le plus courant)
  bas:[0,330,820],        // un peu sous la cible, plus loin
  cote:[480,300,700],     // sur le côté
  face:[0,40,900]         // presque de face
};
const C=POSES[POSE]||POSES.dessous;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>{const l=Math.hypot(...a);return[a[0]/l,a[1]/l,a[2]/l]},
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const fw=nrm(sub([0,-10,0],C)),dn0=[0,1,0],dw=nrm(sub(dn0,fw.map(v=>v*dot(dn0,fw)))),rt=cross(fw,dw);
const proj=P=>{const v=sub(P,C),z=dot(v,fw);return z>1?[CX+F*dot(v,rt)/z,CY+F*dot(v,dw)/z,z]:null};

/* ---------- cible à plat (texture 4 px/mm) ---------- */
const PX=4,BR=226,TS=BR*2*PX;
const tex=document.createElement("canvas");tex.width=tex.height=TS;const tx=tex.getContext("2d");
(function(){const c=TS/2,s=PX;tx.translate(c,c);
  tx.fillStyle="#141414";tx.beginPath();tx.arc(0,0,BR*s,0,7);tx.fill();
  const wedge=(r1,r2,i,col)=>{const a0=(i*18-9-90)*Math.PI/180,a1=a0+18*Math.PI/180;tx.beginPath();tx.arc(0,0,r2*s,a0,a1);tx.arc(0,0,r1*s,a1,a0,true);tx.closePath();tx.fillStyle=col;tx.fill()};
  for(let i=0;i<20;i++){const dk=i%2===0,sg=dk?"#1d1c1a":"#e2d3b0",rg=dk?"#b4202d":"#14773d";
    wedge(R.bullOut,R.trIn,i,sg);wedge(R.trIn,R.trOut,i,rg);wedge(R.trOut,R.dbIn,i,sg);wedge(R.dbIn,R.dbOut,i,rg)}
  tx.fillStyle="#14773d";tx.beginPath();tx.arc(0,0,R.bullOut*s,0,7);tx.fill();
  tx.fillStyle="#b4202d";tx.beginPath();tx.arc(0,0,R.bullIn*s,0,7);tx.fill();
  // fils métalliques
  tx.strokeStyle="#b8b8b4";tx.lineWidth=1.1*s;
  for(const r of [R.bullIn,R.bullOut,R.trIn,R.trOut,R.dbIn,R.dbOut]){tx.beginPath();tx.arc(0,0,r*s,0,7);tx.stroke()}
  for(let i=0;i<20;i++){const a=(i*18-9)*Math.PI/180;tx.beginPath();tx.moveTo(R.bullOut*s*Math.sin(a),-R.bullOut*s*Math.cos(a));tx.lineTo(R.dbOut*s*Math.sin(a),-R.dbOut*s*Math.cos(a));tx.stroke()}
  tx.fillStyle="#efefef";tx.font="600 "+(19*s)+"px Arial,sans-serif";tx.textAlign="center";tx.textBaseline="middle";
  for(let i=0;i<20;i++){const a=i*18*Math.PI/180;tx.fillText(ORDER[i],197*s*Math.sin(a),-197*s*Math.cos(a))}
  // fibres du sisal : grain léger
  const id=tx.getImageData(0,0,TS,TS),d=id.data;for(let j=0;j<d.length;j+=4){if(!d[j+3])continue;const n=(rnd()-.5)*18;d[j]+=n;d[j+1]+=n;d[j+2]+=n}
  tx.setTransform(1,0,0,1,0,0);tx.putImageData(id,0,0)})();
const TD=tx.getImageData(0,0,TS,TS).data;

/* ---------- rendu en perspective de la cible (une fois) ---------- */
const bg=document.createElement("canvas");bg.width=W;bg.height=H;
(function(){const bx=bg.getContext("2d"),img=bx.createImageData(W,H),o=img.data,SS=[[.25,.25],[.75,.25],[.25,.75],[.75,.75]];
  const samp=(X,Y,acc)=>{const r=Math.hypot(X,Y);
    if(r<BR-.3){const u=X*PX+TS/2,v=Y*PX+TS/2,ui=u|0,vi=v|0,fu=u-ui,fv=v-vi,i=(vi*TS+ui)*4,j=i+TS*4;
      for(let k=0;k<3;k++)acc[k]+=(TD[i+k]*(1-fu)+TD[i+4+k]*fu)*(1-fv)+(TD[j+k]*(1-fu)+TD[j+4+k]*fu)*fv}
    else{const w=.9+.1*Math.sin(X*.013)*Math.cos(Y*.011);acc[0]+=118*w;acc[1]+=104*w;acc[2]+=88*w}};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const acc=[0,0,0];let X=0,Y=0;
    for(const[sx,sy]of SS){const xn=(x+sx-CX)/F,yn=(y+sy-CY)/F,dir=[rt[0]*xn+dw[0]*yn+fw[0],rt[1]*xn+dw[1]*yn+fw[1],rt[2]*xn+dw[2]*yn+fw[2]];
      const t=-C[2]/dir[2];X=C[0]+t*dir[0];Y=C[1]+t*dir[1];samp(X,Y,acc)}
    const rr=Math.hypot(x-CX,y-CY)/Math.hypot(CX,CY),light=(1-.28*rr*rr)*(1.02-.12*Math.max(-1,Math.min(1,Y/300))),j=(y*W+x)*4;
    o[j]=acc[0]/4*light;o[j+1]=acc[1]/4*light;o[j+2]=acc[2]/4*light;o[j+3]=255}
  bx.putImageData(img,0,0)})();

/* ---------- bruit du capteur ---------- */
const noise=[0,1,2].map(()=>{const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d"),id=x.createImageData(256,256);
  for(let j=0;j<id.data.length;j+=4){const v=rnd()*255;id.data[j]=id.data[j+1]=id.data[j+2]=v;id.data[j+3]=TEL?14:16}x.putImageData(id,0,0);return x.createPattern(c,"repeat")});

/* ---------- fléchettes ---------- */
const LIGHT=nrm([-.12,.75,-.65]); // direction de la lumière (du plafond, devant la cible)
const FLC=["#ffcc00","#2a8cff","#ff3d8b","#22c55e","#f97316"];
function mkDart(bx,by,col){
  const d=nrm([gauss()*.1,-.22+gauss()*.12,1]),e1=nrm(cross(d,[0,0,1]).map((v,i)=>v+(i===0?1e-3:0))),e2=nrm(cross(d,e1)),rot=rnd()*Math.PI;
  const f1=e1.map((v,i)=>v*Math.cos(rot)+e2[i]*Math.sin(rot)),f2=cross(d,f1);
  return{bx,by,d,f1,f2,col,P:s=>[bx+d[0]*s,by+d[1]*s,d[2]*s]};
}
const PARTS=[[0,24,1.15,.35,"#c9cacd"],[24,72,3.6,3.6,"#55585e"],[72,108,2.6,2.4,"#1e1e22"]]; // pointe, fût, tige : [début, fin, rayon début, rayon fin, couleur]
function drawSeg(x,A,B,rA,rB,col,shadow){const a=proj(A),b=proj(B);if(!a||!b)return;
  const wa=rA*F/a[2],wb=rB*F/b[2],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
  x.beginPath();x.moveTo(a[0]+nx*wa,a[1]+ny*wa);x.lineTo(b[0]+nx*wb,b[1]+ny*wb);x.lineTo(b[0]-nx*wb,b[1]-ny*wb);x.lineTo(a[0]-nx*wa,a[1]-ny*wa);x.closePath();
  x.fillStyle=col;x.fill();
  if(!shadow){x.strokeStyle="rgba(255,255,255,.28)";x.lineWidth=Math.max(.6,(wa+wb)*.18);x.beginPath();x.moveTo(a[0]+nx*wa*.45,a[1]+ny*wa*.45);x.lineTo(b[0]+nx*wb*.45,b[1]+ny*wb*.45);x.stroke()}}
function flight(D,s0,s1,w){return[[s0,0],[s0+12,w],[s1,w],[s1,0],[s1,-w],[s0+12,-w]]}
function drawDart(x,D,shadow){
  const P=shadow?(s=>{const p=D.P(s),t=-p[2]/LIGHT[2];return[p[0]+LIGHT[0]*t,p[1]+LIGHT[1]*t,.2]}):D.P;
  for(const[s0,s1,r0,r1,col]of PARTS)drawSeg(x,P(s0),P(s1),r0,r1,shadow?"#000":col,shadow);
  for(const[k,f]of [[0,D.f1],[1,D.f2]]){const pts=flight(D,104,150,17).map(([s,o])=>{const p=D.P(s);let q=[p[0]+f[0]*o,p[1]+f[1]*o,p[2]+f[2]*o];if(shadow){const t=-q[2]/LIGHT[2];q=[q[0]+LIGHT[0]*t,q[1]+LIGHT[1]*t,.2]}return proj(q)});
    if(pts.some(p=>!p))continue;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();
    x.fillStyle=shadow?"#000":D.col;x.globalAlpha=shadow?1:(k?.82:.95);x.fill();x.globalAlpha=1}
}

/* ---------- scène ---------- */
const out=document.createElement("canvas");out.width=W;out.height=H;const ox=out.getContext("2d");
const scene=document.createElement("canvas");scene.width=W;scene.height=H;const sx=scene.getContext("2d");
const shd=document.createElement("canvas");shd.width=W;shd.height=H;const shx=shd.getContext("2d");
let jolt=null,darts=[],hand=null,jx=0,jy=0,vx=0,vy=0,bump=0,expo=0,t0=performance.now();
function render(){
  const now=performance.now(),t=(now-t0)/1000;
  sx.drawImage(bg,0,0);
  if(darts.length){shx.clearRect(0,0,W,H);for(const D of darts)drawDart(shx,D,true);sx.save();sx.globalAlpha=.32;sx.filter="blur(3px)";sx.drawImage(shd,0,0);sx.restore()}
  const ds=darts.slice().sort((a,b)=>{const pa=proj(a.P(75)),pb=proj(b.P(75));return(pb?pb[2]:0)-(pa?pa[2]:0)});
  for(const D of ds)drawDart(sx,D,false);
  if(hand){const p=hand.p;sx.save();sx.translate(p[0],p[1]);sx.rotate(-.35);
    sx.fillStyle="rgba(0,0,0,.25)";sx.filter="blur(14px)";sx.beginPath();sx.ellipse(60,90,170,130,0,0,7);sx.fill();sx.filter="none";
    sx.fillStyle="#c98d6c";sx.beginPath();sx.ellipse(0,0,130,105,0,0,7);sx.fill();
    for(let f=0;f<4;f++){sx.beginPath();sx.ellipse(-90+f*55,-120,26,80,.05*f,0,7);sx.fill()}
    sx.fillRect(-40,60,170,900);sx.restore()}
  // tremblement du support + petit choc de temps en temps
  if(SHAKE){vx+=gauss()*.05*SHAKE;vy+=gauss()*.05*SHAKE;vx*=.85;vy*=.85;jx=(jx+vx)*.96;jy=(jy+vy)*.96}
  if(bump){bump--;jx+=bump>8?1.4*SHAKE:0}
  ox.setTransform(1,0,0,1,0,0);ox.fillStyle="#000";ox.fillRect(0,0,W,H);
  let kx=0,ky=0;if(jolt){const e=now-jolt.t;if(e>1200){jolt.res&&(jx+=jolt.dx*.3,jy+=jolt.dy*.3);jolt=null}else{const k=e<250?e/250:1-.7*Math.min(1,(e-250)/650);kx=jolt.dx*k;ky=jolt.dy*k}}
  if(TEL)ox.filter="blur(1.4px) saturate(.7) sepia(.3) brightness(1.05)";
  ox.setTransform(1,0,0,1,jx+kx,jy+ky);ox.drawImage(scene,0,0);ox.setTransform(1,0,0,1,0,0);ox.filter="none";
  // exposition automatique : légère respiration + réaction quand la main arrive
  const ex=.012*Math.sin(t*2*Math.PI*.4)+expo;expo*=.97;
  if(ex>0){ox.fillStyle="rgba(255,255,255,"+ex+")";ox.fillRect(0,0,W,H)}else if(ex<0){ox.fillStyle="rgba(0,0,0,"+(-ex)+")";ox.fillRect(0,0,W,H)}
  ox.save();ox.translate(-rnd()*256,-rnd()*256);ox.fillStyle=noise[(rnd()*3)|0];ox.fillRect(0,0,W+256,H+256);ox.restore();
  requestAnimationFrame(render);
}

/* ---------- lancers ---------- */
function calErr(){ // écart (px) entre la cible repérée par l'appli et la vraie, sur 8 points du double
  const Hi=FL.Hi;if(!Hi)return null;let m=0;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,bx=170*Math.sin(a),by=-170*Math.cos(a),q=FL.applyH(Hi,bx,by),t=proj([bx,by,0]);if(!t)continue;
    m=Math.max(m,Math.hypot(q[0]+FL.det.off[0]-t[0]-jx,q[1]+FL.det.off[1]-t[1]-jy))}return +m.toFixed(1)}
function boundaryDist(bx,by){const r=Math.hypot(bx,by);let a=Math.atan2(bx,-by)*180/Math.PI;if(a<0)a+=360;
  let m=Math.min(...[R.bullIn,R.bullOut,R.trIn,R.trOut,R.dbIn,R.dbOut].map(q=>Math.abs(r-q)));
  if(r>R.bullOut&&r<R.dbOut+2){const da=Math.abs(((a+9)%18)-9);m=Math.min(m,Math.abs(9-da)*Math.PI/180*r)}return m}
function throwPos(){const k=rnd();let bx,by;
  if(k<.45){bx=gauss()*38;by=-103+gauss()*38}                        // vers le T20
  else if(k<.6){const a=rnd()*2*Math.PI,r=R.dbIn+rnd()*(R.dbOut-R.dbIn);bx=r*Math.sin(a);by=-r*Math.cos(a)} // doubles
  else if(k<.7){const a=rnd()*2*Math.PI,r=rnd()*22;bx=r*Math.sin(a);by=-r*Math.cos(a)}  // bull
  else if(k<.76){const a=rnd()*2*Math.PI,r=R.dbOut+3+rnd()*40;bx=r*Math.sin(a);by=-r*Math.cos(a)} // hors des points
  else{const a=rnd()*2*Math.PI,r=rnd()*R.dbOut;bx=r*Math.sin(a);by=-r*Math.cos(a)}
  return[bx,by]}

/* ---------- comparaison avec la détection de l'appli ---------- */
const res=[],snaps=[],seen=new WeakSet();let turnTruth=[],turnN=0,ghosts=0,done=false;
function poll(){
  const g=FL.game;if(!g)return;
  for(const d of g.turn){if(seen.has(d)||!d.auto||d.pad)continue;seen.add(d);
    if(d.fell){const b=turnTruth.find(q=>q.matched&&q.bounce&&!q.fellSeen)||turnTruth.find(q=>q.matched&&!q.fellSeen);if(b){b.fellSeen=true;L("tombée "+b.label);if(!b.bounce)res.push({kind:"chute_fausse",want:b.label})}else ghosts++;continue}
    const cands=turnTruth.filter(q=>!q.matched&&q.landed);
    const tr=d.b&&cands.length?cands.reduce((a,q)=>Math.hypot(q.bx-d.b[0],q.by-d.b[1])<Math.hypot(a.bx-d.b[0],a.by-d.b[1])?q:a):cands[0];
    if(!tr){ghosts++;res.push({kind:"fantome",got:FL.lab(d)});continue}
    tr.matched=true;L("détecté "+FL.lab(d)+" (vrai "+tr.label+")");const err=d.b?Math.hypot(d.b[0]-tr.bx,d.b[1]-tr.by):null;
    res.push({kind:"vue",want:tr.label,got:FL.lab(d),ok:tr.label===FL.lab(d),err,lat:performance.now()-tr.at,bd:boundaryDist(tr.bx,tr.by),bx:tr.bx,by:tr.by,bounce:tr.bounce,
      cal:calErr(),gb:d.b,fb:!!(d.dbg&&d.dbg.fb),geo:d.dbg&&d.dbg.geo,turn:turnN,idx:turnTruth.indexOf(tr),pose:C,dir:tr.dir});
    if(err>4&&FL.det.curF)try{const De=FL.det,F=De.curF,c=document.createElement("canvas");c.width=F.w;c.height=F.h;const x=c.getContext("2d");x.drawImage(F.c,0,0);
      const k=F.w/De.bw,tv=proj([tr.bx,tr.by,0]),T=[(tv[0]-De.bx-De.off[0])*k,(tv[1]-De.by-De.off[1])*k],sP=F.w/De.PW;
      x.lineWidth=2;x.strokeStyle="#0f0";x.beginPath();x.arc(T[0],T[1],7,0,7);x.stroke();
      if(d.pp){x.strokeStyle="#f00";x.beginPath();x.arc((d.pp[0]+.5)*sP,(d.pp[1]+.5)*sP,7,0,7);x.stroke()}
      if(d.tl&&d.pp){x.strokeStyle="#0ff";x.beginPath();x.moveTo((d.tl[0]+.5)*sP,(d.tl[1]+.5)*sP);x.lineTo((d.pp[0]+.5)*sP,(d.pp[1]+.5)*sP);x.stroke()}
      const g=d.dbg;if(g){const P=p=>[(p[0]+.5)*sP,(p[1]+.5)*sP];
        x.strokeStyle="#ff0";x.lineWidth=1;const a=P([g.bb[0],g.bb[1]]),b=P([g.bb[2],g.bb[3]]);x.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
        const t0=P(g.t0);x.fillStyle="#f80";x.fillRect(t0[0]-4,t0[1]-4,8,8);
        if(g.u){x.strokeStyle="#f80";x.lineWidth=3;x.beginPath();x.moveTo(t0[0],t0[1]);x.lineTo(t0[0]+g.u[0]*40,t0[1]+g.u[1]*40);x.stroke()}
        if(g.ext){const e=P(g.ext);x.strokeStyle="#f0f";x.lineWidth=2;x.beginPath();x.arc(e[0],e[1],5,0,7);x.stroke()}
        x.fillStyle="#fff";x.font="14px sans-serif";x.fillText("blob "+g.nc+"/"+g.nb+" px, taches "+g.na+", gardées "+g.nk+(g.rf?"":"  (pas d'affinage)"),8,44)}
      x.fillStyle="#fff";x.font="bold 18px sans-serif";x.fillText("vrai "+tr.label+"  vu "+FL.lab(d)+"  "+err.toFixed(1)+" mm",8,22);
      snaps.push({i:res.length-1,url:c.toDataURL("image/jpeg",.85)})}catch(e){}}
}
setInterval(poll,100);
// temps de calcul de la détection (une étape toutes les 100 ms, analyse complète quand une fléchette arrive)
const perf={step:[],an:[],auto:[]};
{const D=FL.det,s0=D.step.bind(D),a0=D.analyze.bind(D);
  D.step=function(){const t=performance.now();s0();perf.step.push(performance.now()-t)};
  D.analyze=function(...a){const t=performance.now();const r=a0(...a);perf.an.push(performance.now()-t);return r}}
const subT={};
for(const k of ["track","fine","capF","pushRing","grabTo","blobs","norm","recal","setRef","avgF","noiseF","tip","refineF","blobFull","boardOK","fresh"]){const D=FL.det;if(typeof D[k]!=="function")continue;const f=D[k].bind(D);
  D[k]=function(...a){const t=performance.now();const r=f(...a);(subT[k]=subT[k]||[0,0]);subT[k][0]+=performance.now()-t;subT[k][1]++;
    if(k==="refineF"&&D._rfT){const m=D._rfT;for(let i=1;i<m.length;i++){const n="rf_"+m[i][0];(subT[n]=subT[n]||[0,0]);subT[n][0]+=m[i][1]-m[i-1][1];subT[n][1]++}D._rfT=null}
    return r}}
const pstat=v=>{const s=v.slice().sort((a,b)=>a-b);return s.length?{n:s.length,med:+s[s.length>>1].toFixed(1),p90:+s[Math.floor(s.length*.9)].toFixed(1),max:+s[s.length-1].toFixed(1)}:null};
const log=[];let lastSt="";const T0=performance.now();
setInterval(()=>{const s=document.getElementById("status").textContent;if(s!==lastSt){lastSt=s;log.push(((performance.now()-T0)/1000).toFixed(1)+" "+s)}},50);
let traceUntil=0,lastTr="";
setInterval(()=>{if(performance.now()>traceUntil)return;const D=FL.det,s="   [phase "+D.phase+" tache "+D.lastCR+" main "+(D.handSeen?"oui":"non")+" stable "+D.stable+" retrait "+(D.removing?1:0)+" attente "+(D.pendingRemoval?1:0)+"]";
  if(s!==lastTr){lastTr=s;log.push(((performance.now()-T0)/1000).toFixed(1)+s)}},100);
document.addEventListener("visibilitychange",()=>log.push(((performance.now()-T0)/1000).toFixed(1)+" visibilité "+document.visibilityState));
const L=t=>log.push(((performance.now()-T0)/1000).toFixed(1)+" >> "+t);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
  render();
  FL.settings.mode="free";FL.newGame();
  await FL.startStream(out.captureStream(30));
  FL.applyZoom(1,true);
  const tStart=performance.now();while(!FL.ready()&&performance.now()-tStart<30000)await wait(200);
  if(!FL.ready()){status("Cible jamais trouvée");done=true;return}
  await wait(2500);
  while(turnN*3<NT){
    turnTruth=[];turnN++;
    for(let k=0;k<3&&(turnN-1)*3+k<NT;k++){
      const[bx,by]=throwPos(),D=mkDart(bx,by,FLC[(turnN+k)%FLC.length]),tr={bx,by,dir:D.d,label:FL.lab(FL.scoreAt(bx,by)),at:performance.now(),landed:true,bounce:rnd()<.06};
      darts.push(D);turnTruth.push(tr);bump=rnd()<.15?12:0;L("lancer "+tr.label+(tr.bounce?" (rebond)":""));
      if(tr.bounce){await wait(1600);darts.splice(darts.indexOf(D),1);tr.bounceGone=true;await wait(1800)}else await wait(3400);
    }
    if(TEL){jolt={t:performance.now(),dx:(rnd()-.5)*24,dy:(rnd()-.5)*24,res:true};L("secousse (capture d'écran)")}
    await wait(500);
    // retrait à la main
    const ps=darts.map(D=>proj(D.P(60))).filter(Boolean),mx=ps.length?ps.reduce((a,p)=>a+p[0],0)/ps.length:CX,my=ps.length?ps.reduce((a,p)=>a+p[1],0)/ps.length:CY;
    hand={p:[mx+700,my+500]};expo=-.05;L("main");if(turnN<=3)traceUntil=performance.now()+9000;
    for(let i=0;i<10;i++){hand.p=[mx+700-i*65,my+500-i*45];await wait(50)}
    await wait(600);darts=[];await wait(500);
    for(let i=0;i<10;i++){hand.p=[mx+50+i*90,my+50+i*70];await wait(50)}
    hand=null;L("main partie");await wait(2600);
    for(const tr of turnTruth)if(!tr.matched&&!tr.bounce)res.push({kind:"manquee",want:tr.label,bx:tr.bx,by:tr.by,bd:boundaryDist(tr.bx,tr.by)});
    for(const tr of turnTruth)if(tr.bounce)res.push({kind:"rebond",want:tr.label,matched:!!tr.matched,fell:!!tr.fellSeen});
    status(summary().line);
  }
  done=true;status(summary().line+" — fini");
}
function summary(){
  const v=res.filter(r=>r.kind==="vue"&&!r.bounce),ok=v.filter(r=>r.ok).length,miss=res.filter(r=>r.kind==="manquee").length,
    errs=v.map(r=>r.err).filter(e=>e!=null).sort((a,b)=>a-b),q=p=>errs.length?errs[Math.min(errs.length-1,Math.floor(errs.length*p))]:NaN,
    bad=v.filter(r=>!r.ok),badB=bad.filter(r=>r.bd<1.5).length,reb=res.filter(r=>r.kind==="rebond"),total=v.length+miss;
  const line=POSE+" : "+ok+"/"+total+" justes ("+(total?Math.round(100*ok/total):0)+" %), "+miss+" manquées, "+ghosts+" fantômes, erreur médiane "+q(.5).toFixed(1)+" mm, p90 "+q(.9).toFixed(1)+" mm";
  let vq=null;try{vq=FL.det.quality()}catch(e){}
  return{vq,perf:{step:pstat(perf.step),analyse:pstat(perf.an),sub:Object.fromEntries(Object.entries(subT).map(([k,v])=>[k,{tot:Math.round(v[0]),n:v[1],moy:+(v[0]/v[1]).toFixed(1)}]))},pose:POSE,seed:SEED,total,ok,miss,ghosts,bad:bad.length,badBorder:badB,med:q(.5),p90:q(.9),max:errs[errs.length-1],
    rebonds:reb.length,rebondsOk:reb.filter(r=>r.fell||!r.matched).length,lat:v.length?Math.round(v.reduce((a,r)=>a+r.lat,0)/v.length):0,line,
    wrong:bad.map(r=>r.want+"→"+r.got+" ("+r.err.toFixed(1)+" mm, bord "+r.bd.toFixed(1)+(r.fb?", repli géométrique":"")+", repérage "+r.cal+" px)"),
    repli:v.filter(r=>r.fb).map(r=>(r.ok?"ok ":"FAUX ")+r.err.toFixed(1)+"mm "+JSON.stringify(r.geo))}
}
const box=document.createElement("div");box.style.cssText="position:fixed;left:6px;bottom:6px;right:6px;z-index:99;background:rgba(0,0,0,.8);color:#7CFC9A;font:12px monospace;padding:6px;border-radius:6px;pointer-events:none";document.body.append(box);
function status(t){box.textContent="BANC "+t}
window.__bench={tel:TEL,res,summary,log,snaps,proj,get done(){return done}};
status("préparation…");run();
})();
