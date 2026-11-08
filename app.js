import {distance,pinchRatio,rectBetween,hit,validRect,isFist,palmCenter,FistDeleteGesture} from './gestures.mjs?v=3';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),video=$('video');
let W=1,H=1,dpr=1,stream=null,handModel=null,faceModel=null,running=false,trackingReady=false,loading=false,windows=[],serial=0,action=null,hands=[],face=null,lastVideo=-1,lastDetect=0,lastFace=0,lastSeen=0,lastTwo=0,frameCount=0,fpsTime=0,color='#7d9bff',opacity=.45,mirrored=true,showSkeleton=true,camGeneration=0,toastTimer;
let demoTouched=false,blockedUntil=0,menuOpen=false,deleteProgress=[];const deleteGesture=new FistDeleteGesture();const handStates=new Map();
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
new ResizeObserver(resize).observe($('viewport'));
function cover(){let scale=Math.max(W/(video.videoWidth||W),H/(video.videoHeight||H));return {scale,x:(W-video.videoWidth*scale)/2,y:(H-video.videoHeight*scale)/2}}
function position(lm){let c=cover();return{x:(c.x+(mirrored?1-lm.x:lm.x)*video.videoWidth*c.scale)/W,y:(c.y+lm.y*video.videoHeight*c.scale)/H}}
function drawVideo(target=ctx){let c=cover();target.save();if(mirrored){target.translate(W,0);target.scale(-1,1)}target.drawImage(video,c.x,c.y,video.videoWidth*c.scale,video.videoHeight*c.scale);target.restore()}
function background(t){let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#0f1a21');g.addColorStop(.48,'#1b2a3a');g.addColorStop(1,'#151e1c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(W*.52,H*.6,0,W*.52,H*.6,W*.7);glow.addColorStop(0,'#355f7d44');glow.addColorStop(1,'#13231a00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.lineWidth=.6;for(let i=0;i<34;i++){ctx.beginPath();ctx.strokeStyle=`rgba(130,165,185,${.04+i/900})`;for(let x=-10;x<W+10;x+=8){const y=H*.59+i*8+Math.sin(x/W*5.8+i*.07+t*.00009)*(H*.15)+Math.cos(x/W*4+i*.12)*H*.06;x===-10?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}ctx.fillStyle='#d1f267';for(let i=0;i<14;i++){let x=((i*.227)%1)*W,y=((i*.417)%1)*H;ctx.globalAlpha=.12+Math.sin(t*.0005+i)*.08;ctx.fillRect(x,y,1.5,1.5)}ctx.globalAlpha=1;ctx.strokeStyle='#ffffff04';for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
function panel(w,active=false){let x=w.x*W,y=w.y*H,ww=w.w*W,hh=w.h*H;ctx.save();ctx.beginPath();ctx.rect(x,y,ww,hh);ctx.clip();if(w.image)ctx.drawImage(w.image,x,y,ww,hh);ctx.fillStyle=w.color;ctx.globalAlpha=opacity;ctx.fillRect(x,y,ww,hh);ctx.globalAlpha=1;const g=ctx.createLinearGradient(x,y,x+ww,y+hh);g.addColorStop(0,'#ffffff24');g.addColorStop(.5,'#ffffff02');g.addColorStop(1,'#00000022');ctx.fillStyle=g;ctx.fillRect(x,y,ww,hh);ctx.fillStyle='#0a172b44';ctx.fillRect(x,y,ww,25);ctx.font='9px monospace';ctx.fillStyle='#ffffffcc';ctx.fillText(`WINDOW / ${String(w.id||serial+1).padStart(2,'0')}`,x+10,y+16);ctx.strokeStyle='#ffffff12';ctx.lineWidth=.5;for(let i=x+24;i<x+ww;i+=24){ctx.beginPath();ctx.moveTo(i,y+25);ctx.lineTo(i,y+hh);ctx.stroke()}ctx.restore();ctx.strokeStyle=w.color;ctx.lineWidth=active?2:1;ctx.strokeRect(x,y,ww,hh);ctx.strokeStyle='#ecf3ff';ctx.lineWidth=2;for(const [cx,cy,sx,sy] of [[x,y,1,1],[x+ww,y,-1,1],[x,y+hh,1,-1],[x+ww,y+hh,-1,-1]]){ctx.beginPath();ctx.moveTo(cx,cy+sy*10);ctx.lineTo(cx,cy);ctx.lineTo(cx+sx*10,cy);ctx.stroke()}ctx.fillStyle='#e0eaff99';ctx.font='8px monospace';ctx.fillText(`${Math.round(ww)} × ${Math.round(hh)}`,x+8,y+hh-8)}
function render(t){ctx.setTransform(dpr,0,0,dpr,0,0);if(running&&video.readyState>=2){drawVideo();ctx.fillStyle='#09132220';ctx.fillRect(0,0,W,H)}else background(t);if(running&&trackingReady&&t-lastDetect>45&&video.readyState>=2&&video.currentTime!==lastVideo){lastVideo=video.currentTime;lastDetect=t;try{const result=handModel.detectForVideo(video,t);updateHands(result,t);if(faceModel&&t-lastFace>260){lastFace=t;const result=faceModel.detectForVideo(video,t);face=result.detections?.[0]?.boundingBox||null;$('subject').textContent=face?'Presente':'In attesa'}}catch(e){trackingReady=false;hands=[];face=null;deleteGesture.reset();deleteProgress=[];finish(false);$('error').textContent='Il video è attivo, ma il tracking si è interrotto. Premi Riprova tracking.';$('status').textContent='Solo videocamera';$('modeTag').innerHTML='<i></i> LIVE · SOLO VIDEO';$('retryTracking').hidden=false;console.error(e)}}
if(face&&running&&showSkeleton){const c=cover();let x=(mirrored?video.videoWidth-face.originX-face.width:face.originX)*c.scale+c.x,y=face.originY*c.scale+c.y;ctx.strokeStyle='#d1f26766';ctx.lineWidth=1;ctx.setLineDash([3,6]);ctx.strokeRect(x,y,face.width*c.scale,face.height*c.scale);ctx.setLineDash([]);ctx.font='8px monospace';ctx.fillStyle='#d1f267';ctx.fillText('SOGGETTO',x,y-8)}
for(const w of windows)panel(w,action?.window===w);for(const d of deleteProgress){const w=windows.find(w=>w.id===d.id);if(!w)continue;ctx.strokeStyle='#ff8979';ctx.lineWidth=2;ctx.strokeRect(w.x*W,w.y*H,w.w*W,w.h*H);ctx.beginPath();ctx.arc(d.p.x*W,d.p.y*H,25,-Math.PI/2,-Math.PI/2+Math.PI*2*d.value);ctx.stroke();ctx.fillStyle='#ffe1db';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText('×',d.p.x*W,d.p.y*H+8);ctx.textAlign='start';}if(action?.kind==='create')panel(action.rect,true);if(running){for(const hand of hands){if(showSkeleton){ctx.strokeStyle=hand.pinched?'#d1f267aa':'#d5ebff66';ctx.lineWidth=1.4;for(const [a,b] of connections){const p=position(hand.lm[a]),q=position(hand.lm[b]);ctx.beginPath();ctx.moveTo(p.x*W,p.y*H);ctx.lineTo(q.x*W,q.y*H);ctx.stroke()}for(const lm of hand.lm){const p=position(lm);ctx.fillStyle='#e4efff';ctx.beginPath();ctx.arc(p.x*W,p.y*H,1.7,0,Math.PI*2);ctx.fill()}}ctx.strokeStyle=hand.pinched?'#d1f267':'#e1ebff';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(hand.p.x*W,hand.p.y*H,hand.pinched?11:6,0,Math.PI*2);ctx.stroke();if(hand.pinched){ctx.fillStyle='#d1f267';ctx.beginPath();ctx.arc(hand.p.x*W,hand.p.y*H,3,0,Math.PI*2);ctx.fill()}}frameCount++;if(t-fpsTime>1000){$('fps').textContent=`${frameCount} FPS`;frameCount=0;fpsTime=t}}requestAnimationFrame(render)}requestAnimationFrame(render);
function newRect(a,b){return {...rectBetween(a,b),color}}
function startSingle(p,owner){for(let i=windows.length-1;i>=0;i--){const h=hit(windows[i],p,.03);if(h){const w=windows.splice(i,1)[0];windows.push(w);action={...h,window:w,owner};return true}}return false}
function updateSingle(p){if(action.kind==='move'){action.window.x=Math.max(-action.window.w+.04,Math.min(.96,p.x-action.dx));action.window.y=Math.max(0,Math.min(.96,p.y-action.dy))}else if(action.kind==='resize'){const r=rectBetween(action.anchor,p);if(validRect(r))Object.assign(action.window,r)}}
function snapshot(w){if(!running||video.readyState<2)return null;const tmp=document.createElement('canvas');tmp.width=Math.max(1,Math.round(w.w*W));tmp.height=Math.max(1,Math.round(w.h*H));const c=tmp.getContext('2d');c.translate(-w.x*W,-w.y*H);const cv=cover();c.save();if(mirrored){c.translate(W,0);c.scale(-1,1)}c.drawImage(video,cv.x,cv.y,video.videoWidth*cv.scale,video.videoHeight*cv.scale);c.restore();return tmp}
function finish(commit=true){if(action?.kind==='create'&&commit&&validRect(action.rect)){if(windows.length>=16){toast('Limite di 16 finestre: eliminane una per continuare.')}else{const w={...action.rect,id:++serial};w.image=snapshot(w);windows.push(w);toast('Finestra creata. Pizzica al suo interno per spostarla.');refreshList()}}action=null}
function updateHands(result,t){hands=result.landmarks.map((lm,i)=>{const key=result.handedness[i]?.[0]?.categoryName||String(i),old=handStates.get(key),ratio=pinchRatio(lm);let threshold=.2+Number($('sensitivity').value)*.0022;const closed=isFist(lm),pinched=!closed&&ratio<(old?.pinched?threshold+.14:threshold);const p=position({x:(lm[4].x+lm[8].x)/2,y:(lm[4].y+lm[8].y)/2});if(old&&t-old.time<180){p.x=old.p.x*.35+p.x*.65;p.y=old.p.y*.35+p.y*.65}const h={lm,p,pinched,closed,palm:position(palmCenter(lm)),key,time:t};handStates.set(key,h);return h});$('handCount').innerHTML=`${hands.length}<span> / 2</span>`;if(menuOpen){deleteGesture.reset();deleteProgress=[];return;}const deletion=deleteGesture.update(hands,windows,t);deleteProgress=deletion.progress;if(deletion.remove.length){if(action?.kind==='create'||deletion.remove.includes(action?.window?.id))finish(false);windows=windows.filter(w=>!deletion.remove.includes(w.id));refreshList();toast(deletion.remove.length>1?'Finestre eliminate.':'Finestra eliminata.');}if(hands.some(h=>h.closed)&&action?.kind==='create')finish(false);if(hands.length)lastSeen=t;else if(t-lastSeen>230&&action){finish(false);blockedUntil=t+250}const pinches=hands.filter(h=>h.pinched);if(t<blockedUntil)return;if(deleteProgress.length){$('gestureHint').textContent='TIENI LA MANO CHIUSA · ELIMINAZIONE…';if(action)finish(false);return;}
if(pinches.length===2){lastTwo=t;if(action?.kind!=='create'){finish();action={kind:'create',rect:newRect(pinches[0].p,pinches[1].p)}}else action.rect=newRect(pinches[0].p,pinches[1].p);$('gestureHint').textContent='ALLONTANA LE MANI · RILASCIA PER FISSARE'}else if(action?.kind==='create'){if(hands.length===2){finish();blockedUntil=t+300}else if(t-lastTwo>300)finish(false)}else if(pinches.length===1){const h=pinches[0];if(!action)startSingle(h.p,h.key);if(action?.owner===h.key)updateSingle(h.p);$('gestureHint').textContent=action?'SPOSTA LA MANO · RILASCIA PER LASCIARE':'PIZZICA CON ENTRAMBE LE MANI PER CREARE'}else{if(action){finish();refreshList()}$('gestureHint').textContent='UNISCI POLLICE E INDICE DI ENTRAMBE LE MANI'}}
function refreshList(){$('windowCount').textContent=String(windows.length).padStart(2,'0');$('windowList').replaceChildren();if(!windows.length){$('windowList').innerHTML='<p>Il prossimo gesto è un inizio.</p>';return}for(const w of [...windows].reverse()){const row=document.createElement('div');row.className='window-item';const title=document.createElement('span');title.textContent=`▱  Finestra ${String(w.id).padStart(2,'0')}`;title.style.color=w.color;const b=document.createElement('button');b.textContent='×';b.setAttribute('aria-label',`Elimina finestra ${w.id}`);b.onclick=()=>{if(action?.window===w)action=null;windows=windows.filter(x=>x!==w);refreshList()};row.append(title,b);$('windowList').append(row)}}
let modelPromise=null;
async function loadModels(forceCPU=false){
 if(modelPromise)return modelPromise;
 if(handModel&&!forceCPU)return;
 modelPromise=(async()=>{
 const {FilesetResolver,HandLandmarker,FaceDetector}=await import('./assets/vision.mjs');
 const files=await FilesetResolver.forVisionTasks('./assets/wasm');
 if(forceCPU){handModel?.close();handModel=null;}
 const options={runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55};
 const base={modelAssetPath:'./assets/hand_landmarker.task',delegate:forceCPU?'CPU':'GPU'};
 try{handModel=await HandLandmarker.createFromOptions(files,{...options,baseOptions:base})}
 catch(e){if(forceCPU)throw e;handModel=await HandLandmarker.createFromOptions(files,{...options,baseOptions:{...base,delegate:'CPU'}})}
 if(!faceModel)try{faceModel=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'./assets/face_detector.tflite'},runningMode:'VIDEO',minDetectionConfidence:.6})}catch{toast('Tracking mani attivo. Rilevamento volto non disponibile.')}
 })();try{await modelPromise}finally{modelPromise=null}
}
function videoStarted(){
 running=true;trackingReady=false;lastVideo=-1;hands=[];handStates.clear();deleteGesture.reset();deleteProgress=[];
 $('welcome').classList.add('hidden');$('modeTag').innerHTML='<i style="background:#d1f267"></i> LIVE · CARICAMENTO TRACKING';
 $('status').textContent='Caricamento tracking…';$('statusDot').style.background='#d1f267';
 $('gestureHint').textContent='VIDEO ATTIVO · PREPARAZIONE DEL RILEVAMENTO MANI…';
 $('retryTracking').hidden=true;
}
function trackingStarted(){trackingReady=true;$('modeTag').innerHTML='<i style="background:#d1f267"></i> LIVE · TRACKING ATTIVO';$('status').textContent='Videocamera attiva';$('gestureHint').textContent='MOSTRA ENTRAMBE LE MANI · PIZZICA E ALLONTANA';$('retryTracking').hidden=true;}
async function retryTracking(){
 if(loading||!running)return;
 const generation=camGeneration;loading=true;trackingReady=false;$('retryTracking').disabled=true;$('status').textContent='Riavvio tracking…';$('error').textContent='';
 try{await loadModels(true);if(generation===camGeneration&&running)trackingStarted()}
 catch(e){if(generation===camGeneration){$('error').textContent='Tracking non disponibile. Puoi usare il video e creare finestre trascinando con il mouse.';$('status').textContent='Solo videocamera';console.error(e)}}
 finally{if(generation===camGeneration)loading=false;$('retryTracking').disabled=false;}
}
function showStartup(message,retry=true){$('startupStatus').textContent=message;$('cameraHero').hidden=!retry;$('welcome').classList.remove('hidden')}
function buttons(label,disabled=false){for(const id of ['camera','cameraHero']){$(id).disabled=disabled;$(id).innerHTML=`${label} <span>↗</span>`}}
async function startCamera(){
 if(loading){loading=false;stopCamera();toast('Avvio annullato.');return;}
 if(running){stopCamera();return;}
 if(!navigator.mediaDevices?.getUserMedia){const message='La videocamera richiede HTTPS o localhost e un browser aggiornato.';$('error').textContent=message;showStartup(message);return;}
 showStartup('Accesso alla videocamera…',false);loading=true;trackingReady=false;const generation=++camGeneration;$('error').textContent='';buttons('Annulla avvio');
 $('status').textContent='Accesso alla videocamera…';
 let localStream;const permissionTimer=setTimeout(()=>{if(loading&&generation===camGeneration){const message='Consenti l’accesso alla videocamera nella richiesta del browser.';$('error').textContent=message;showStartup(message)}},12000);
 try{
 localStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30},...($('devices').value?{deviceId:{exact:$('devices').value}}:{facingMode:'user'})},audio:false});
 clearTimeout(permissionTimer);
 if(generation!==camGeneration){localStream.getTracks().forEach(t=>t.stop());return;}
 stream=localStream;$('error').textContent='';video.srcObject=stream;await video.play();
 if(generation!==camGeneration){localStream.getTracks().forEach(t=>t.stop());return;}
 videoStarted();buttons('Spegni videocamera');
 stream.getVideoTracks()[0].addEventListener('ended',()=>{if(generation===camGeneration&&running){loading=false;stopCamera();$('error').textContent='Videocamera disconnessa. Collegala e riprova.'}});
 enumerate();
 const modelTimer=setTimeout(()=>{if(generation===camGeneration&&loading)$('error').textContent='Il video è attivo. Il primo caricamento del tracking può richiedere qualche secondo…'},8000);
 try{await loadModels();if(generation===camGeneration&&running){$('error').textContent='';trackingStarted()}}
 catch(e){if(generation===camGeneration&&running){$('error').textContent='Video attivo. Il tracking non è riuscito ad avviarsi: premi Riprova tracking, oppure trascina con il mouse.';$('status').textContent='Solo videocamera';$('modeTag').innerHTML='<i></i> LIVE · SOLO VIDEO';$('retryTracking').hidden=false;console.error(e)}}
 finally{clearTimeout(modelTimer)}
 }catch(e){
 if(generation!==camGeneration)return;
 loading=false;localStream?.getTracks().forEach(t=>t.stop());stopCamera();
 const messages={NotAllowedError:'Accesso negato. Consenti la videocamera nelle impostazioni del browser e riprova.',NotFoundError:'Nessuna videocamera trovata. Collegane una e riprova.',NotReadableError:'Videocamera occupata o non disponibile. Chiudi le altre app che la utilizzano.',OverconstrainedError:'Questa videocamera non è disponibile. Seleziona un’altra sorgente.'};
 const message=messages[e.name]||'Impossibile avviare il video. Riprova.';$('error').textContent=message;showStartup(message);console.error(e);
 }finally{clearTimeout(permissionTimer);if(generation===camGeneration){loading=false;buttons(running?'Spegni videocamera':'Attiva videocamera')}}
}
function stopCamera(){deleteGesture.reset();deleteProgress=[];running=false;trackingReady=false;$('retryTracking').hidden=true;camGeneration++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;hands=[];face=null;finish(false);handStates.clear();$('modeTag').innerHTML='<i></i> DEMO INTERATTIVA';$('status').textContent='Modalità demo';$('statusDot').style.background='#9d9f95';$('handCount').innerHTML='0<span> / 2</span>';$('subject').textContent='—';$('fps').textContent='— FPS';$('gestureHint').textContent='TRASCINA SUL CANVAS PER CREARE UNA FINESTRA';buttons('Attiva videocamera');if(!windows.length)showStartup('Videocamera spenta.')}
async function enumerate(){if(!navigator.mediaDevices?.enumerateDevices)return;try{const devices=await navigator.mediaDevices.enumerateDevices(),selected=stream?.getVideoTracks()[0]?.getSettings().deviceId||$('devices').value;const cams=devices.filter(d=>d.kind==='videoinput');$('devices').replaceChildren(new Option('Videocamera predefinita',''),...cams.map((d,i)=>new Option(d.label||`Videocamera ${i+1}`,d.deviceId)));if(selected)$('devices').value=selected}catch{}}
$('retryTracking').onclick=retryTracking;$('camera').onclick=startCamera;$('cameraHero').onclick=startCamera;$('devices').onchange=()=>{if(running){stopCamera();startCamera()}};navigator.mediaDevices?.addEventListener('devicechange',enumerate);enumerate();
const pointer=e=>{const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/W)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/H))}};
canvas.onpointerdown=e=>{if(menuOpen||trackingReady)return;demoTouched=true;$('welcome').classList.add('hidden');canvas.setPointerCapture(e.pointerId);const p=pointer(e);if(!startSingle(p,'pointer'))action={kind:'create',anchor:p,rect:newRect(p,p)}};canvas.onpointermove=e=>{if(!action||trackingReady)return;const p=pointer(e);if(action.kind==='create')action.rect=newRect(action.anchor,p);else updateSingle(p)};canvas.onpointerup=()=>{if(!trackingReady){finish();refreshList()}};canvas.onpointercancel=()=>{if(!trackingReady)finish(false)};
$('clear').onclick=()=>{finish(false);deleteGesture.reset();deleteProgress=[];windows=[];refreshList();toast('Spazio pronto per nuove idee.')};$('opacity').oninput=e=>{opacity=e.target.value/100;$('opacityValue').textContent=e.target.value+'%'};$('sensitivity').oninput=e=>$('sensitivityValue').textContent=e.target.value+'%';$('skeleton').onchange=e=>showSkeleton=e.target.checked;$('mirror').onchange=e=>{finish(false);deleteGesture.reset();deleteProgress=[];mirrored=e.target.checked;handStates.clear()};for(const b of document.querySelectorAll('[data-color]'))b.onclick=()=>{color=b.dataset.color;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen()}catch{toast('Schermo intero non disponibile in questo browser.')}};
$('export').onclick=()=>{canvas.toBlob(blob=>{if(!blob){toast('Esportazione non riuscita. Riprova.');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aether-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Istantanea salvata.')},'image/png')};window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menuOpen)setMenu(false);else finish(false)}});window.addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());handModel?.close();faceModel?.close()});

let idleTimer;
function wakeControls(){document.body.classList.remove('controls-idle');clearTimeout(idleTimer);if(!menuOpen)idleTimer=setTimeout(()=>document.body.classList.add('controls-idle'),3000)}
function setMenu(open){
 menuOpen=open;finish(false);deleteGesture.reset();deleteProgress=[];
 $('studioMenu').hidden=!open;$('menuBackdrop').hidden=!open;
 $('menuToggle').setAttribute('aria-expanded',String(open));$('menuToggle').setAttribute('aria-label',open?'Chiudi menu':'Apri menu');
 document.body.classList.toggle('menu-open',open);wakeControls();
 if(open)$('closeMenu').focus();else $('menuToggle').focus();
}
$('menuToggle').onclick=()=>setMenu(!menuOpen);$('closeMenu').onclick=()=>setMenu(false);$('menuBackdrop').onclick=()=>setMenu(false);
for(const type of ['pointermove','pointerdown','keydown','focusin'])document.addEventListener(type,wakeControls,{passive:true});
document.addEventListener('keydown',e=>{
 if(!menuOpen||e.key!=='Tab')return;
 const items=[...$('studioMenu').querySelectorAll('button:not([disabled]),select,input,summary')].filter(el=>el.getClientRects().length);
 if(!items.length)return;const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
wakeControls();

// Request the camera immediately; OS/browser consent is still required.
requestAnimationFrame(()=>startCamera());

// Browser fullscreen needs user activation unless the browser explicitly permits it.
(()=>{
 const root=document.documentElement;
 if(!root.requestFullscreen||document.fullscreenEnabled===false)return;
 let pending=true,busy=false;
 function finish(){
  if(!document.fullscreenElement)return;
  pending=false;
  document.removeEventListener('pointerdown',activate,true);
  document.removeEventListener('keydown',activate,true);
  document.removeEventListener('fullscreenchange',finish);
 }
 async function enter(initial=false){
  if(!pending||busy)return;
  if(document.fullscreenElement){finish();return;}
  busy=true;
  try{await root.requestFullscreen({navigationUI:'hide'});finish()}
  catch{if(initial)toast('Un clic sull’anteprima attiva lo schermo intero.')}
  finally{busy=false}
 }
 function activate(event){
  if(!event.isTrusted||event.key==='Escape'||event.ctrlKey||event.metaKey||event.altKey)return;
  // The explicit fullscreen control already handles this click itself.
  if(event.target?.closest?.('#fullscreen'))return;
  enter();
 }
 document.addEventListener('pointerdown',activate,true);
 document.addEventListener('keydown',activate,true);
 document.addEventListener('fullscreenchange',finish);
 enter(true);
})();
