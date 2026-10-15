/* Rejeu d'une vidéo REC dans l'appli (adresse : ?rejeu=videos/partie1.webm).
   La vidéo remplace la caméra ; on note chaque statut et chaque fléchette comptée,
   et on garde une image de l'écran caméra (cercles de repérage + fléchettes) à chaque détection. */
(function(){
"use strict";
const FL=window.__fl;if(!FL)return;
const src=new URLSearchParams(location.search).get("rejeu");
const log=[],shots=[];let done=false,lastSt="",seen=new WeakSet();
const T0=performance.now(),t=()=>((performance.now()-T0)/1000).toFixed(1);
const v=document.createElement("video");v.src=src;v.muted=true;v.playsInline=true;v.crossOrigin="anonymous";
v.style.cssText="position:fixed;left:0;top:0;width:2px;height:2px;opacity:0";document.body.append(v);
const shot=tag=>{try{const c=document.getElementById("view"),o=document.createElement("canvas");o.width=c.width;o.height=c.height;
  o.getContext("2d").drawImage(c,0,0);shots.push({tag,t:v.currentTime.toFixed(1),url:o.toDataURL("image/jpeg",.85)})}catch(e){}};
setInterval(()=>{const s=document.getElementById("status").textContent;if(s!==lastSt){lastSt=s;log.push(t()+" (vidéo "+v.currentTime.toFixed(1)+" s) "+s)}
  const g=FL.game;if(!g)return;for(const d of g.turn){if(seen.has(d)||!d.auto)continue;seen.add(d);
    log.push(t()+" (vidéo "+v.currentTime.toFixed(1)+" s) >> compté "+FL.lab(d)+(d.b?" en ("+d.b[0].toFixed(0)+","+d.b[1].toFixed(0)+") mm":""));setTimeout(()=>shot(FL.lab(d)),150)}},100);
v.addEventListener("ended",()=>{log.push(t()+" fin de la vidéo");shot("fin");done=true});
(async()=>{
  FL.settings.mode="501";FL.newGame();
  await new Promise(r=>v.addEventListener("loadeddata",r,{once:true}));
  await v.play();
  await FL.startStream(v.captureStream());
  // une image du repérage dès que la cible est trouvée
  const w=setInterval(()=>{if(FL.ready()){clearInterval(w);setTimeout(()=>shot("cible trouvée"),500)}},200);
})().catch(e=>{log.push("ERREUR "+e);done=true});
window.__rejeu={log,shots,get done(){return done}};
})();
