export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function pinchRatio(lm){return distance(lm[4],lm[8])/Math.max(distance(lm[0],lm[9]),.01)}
export function rectBetween(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)}}
export function hit(w,p,margin=.025){const corners=[{x:w.x,y:w.y},{x:w.x+w.w,y:w.y},{x:w.x,y:w.y+w.h},{x:w.x+w.w,y:w.y+w.h}];const corner=corners.findIndex(c=>distance(c,p)<margin);if(corner>=0)return {kind:'resize',anchor:corners[3-corner]};if(p.x>=w.x&&p.x<=w.x+w.w&&p.y>=w.y&&p.y<=w.y+w.h)return {kind:'move',dx:p.x-w.x,dy:p.y-w.y};return null}
export function validRect(r){return r.w>.065&&r.h>.065}

// Four folded fingers distinguish a fist from a thumb/index pinch.
export function isFist(lm){
 const palm=Math.max(distance(lm[0],lm[9]),.01);
 return [[5,6,8],[9,10,12],[13,14,16],[17,18,20]].every(([mcp,pip,tip])=>distance(lm[tip],lm[0])<distance(lm[pip],lm[0])*1.12&&distance(lm[tip],lm[mcp])<palm*.9);
}
export function palmCenter(lm){return [0,5,9,13,17].reduce((p,i)=>({x:p.x+lm[i].x/5,y:p.y+lm[i].y/5}),{x:0,y:0})}
export function contains(w,p){return p.x>=w.x&&p.x<=w.x+w.w&&p.y>=w.y&&p.y<=w.y+w.h}
export class FistDeleteGesture{
 constructor(holdMs=450){this.holdMs=holdMs;this.states=new Map()}
 reset(){this.states.clear()}
 update(hands,windows,t){
  const result={remove:[],progress:[]},visible=new Set(hands.map(h=>h.key));
  for(const key of this.states.keys())if(!visible.has(key))this.states.delete(key);
  for(const h of hands){
   let s=this.states.get(h.key);if(!s){s={armed:null,target:null,since:0,spent:false};this.states.set(h.key,s)}
   const target=[...windows].reverse().find(w=>contains(w,h.palm));
   if(!h.closed){s.armed=target?.id??null;s.target=null;s.spent=false;continue}
   if(s.spent||!target||target.id!==s.armed){s.target=null;s.armed=null;continue}
   if(s.target!==target.id){s.target=target.id;s.since=t}
   const progress=Math.min(1,(t-s.since)/this.holdMs);
   if(progress>=1){if(!result.remove.includes(target.id))result.remove.push(target.id);s.spent=true;s.armed=null}
   else result.progress.push({id:target.id,p:h.palm,value:progress});
  }
  return result;
 }
}

const visiblePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>.3;
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export function describePerson(lm,index=0){
 if(!visiblePoint(lm[11])||!visiblePoint(lm[12]))return null;
 const shoulders=midpoint(lm[11],lm[12]),span=Math.max(.04,distance(lm[11],lm[12]));
 const hips=visiblePoint(lm[23])&&visiblePoint(lm[24])?midpoint(lm[23],lm[24]):{x:shoulders.x,y:shoulders.y+span*1.4};
 const center=midpoint(shoulders,hips),points=lm.filter(visiblePoint);
 const x=Math.max(0,Math.min(...points.map(p=>p.x))-span*.35-.035),y=Math.max(0,Math.min(...points.map(p=>p.y))-span*.35-.035);
 const right=Math.min(1,Math.max(...points.map(p=>p.x))+span*.35+.035),bottom=Math.min(1,Math.max(...points.map(p=>p.y))+span*.35+.035);
 return {lm,index,shoulders,center,span,roi:{x,y,w:Math.max(.1,right-x),h:Math.max(.1,bottom-y)}};
}
export class SubjectSelector{
 constructor(){this.reset()}
 reset(){this.active=null;this.lastSeen=-Infinity;this.people=[];this.serial=0}
 update(landmarks,t){
  this.people=landmarks.map(describePerson).filter(Boolean);
  if(this.active){
   const old=this.active;const scored=this.people.map(p=>({p,c:distance(p.shoulders,old.shoulders)/Math.max(old.span,.1)+Math.abs(Math.log(p.span/old.span))*.8})).sort((a,b)=>a.c-b.c);
   if(scored[0]?.c<1.25){this.active={...scored[0].p,id:old.id};this.lastSeen=t;return this.active}
   if(t-this.lastSeen<180)return {...this.active,index:-1,predicted:true};
   if(t-this.lastSeen<320)return null;
   this.active=null;
  }
  if(!this.people.length)return null;
  const p=[...this.people].sort((a,b)=>(b.span/(1+Math.abs(b.center.x-.5)*2))-(a.span/(1+Math.abs(a.center.x-.5)*2)))[0];
  this.active={...p,id:++this.serial};this.lastSeen=t;return this.active;
 }
 selectAt(p,t){
  const choices=this.people.filter(person=>contains(person.roi,p)).sort((a,b)=>distance(a.center,p)-distance(b.center,p));
  if(!choices.length)return null;
  this.active={...choices[0],id:++this.serial};this.lastSeen=t;return this.active;
 }
}
export function remapHands(result,roi){
 return {landmarks:(result.landmarks||[]).map(lm=>lm.map(p=>({...p,x:roi.x+p.x*roi.w,y:roi.y+p.y*roi.h,z:(p.z||0)*roi.w}))),handedness:result.handedness||[]};
}
export function mergeHands(...results){
 const landmarks=[],handedness=[];
 for(const result of results)for(let i=0;i<result.landmarks.length;i++){
  const lm=result.landmarks[i];if(landmarks.some(existing=>distance(existing[0],lm[0])<.025&&distance(existing[9],lm[9])<.025))continue;
  landmarks.push(lm);handedness.push(result.handedness?.[i]||[]);
 }
 return {landmarks,handedness};
}
export function handRegion(person){
 const points=person.lm.slice(0,23).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>.12);
 const pad=Math.max(.06,person.span*.6),x=Math.max(0,Math.min(...points.map(p=>p.x))-pad),y=Math.max(0,Math.min(...points.map(p=>p.y))-pad*.7);
 const right=Math.min(1,Math.max(...points.map(p=>p.x))+pad),bottom=Math.min(1,Math.max(...points.map(p=>p.y))+pad);
 return {x,y,w:Math.max(.15,right-x),h:Math.max(.15,bottom-y)};
}
export function handSearchRegion(person,key,width,height,previous=[]){
 const left=key==='Left',indices=left?[15,17,19,21]:[16,18,20,22];
 const old=previous.find(h=>h.key===key),points=indices.map(i=>person.lm[i]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>.08);
 if(!old&&!points.length)return null;
 const center=old?midpoint(old.lm[0],old.lm[9]):points.reduce((a,p)=>({x:a.x+p.x/points.length,y:a.y+p.y/points.length}),{x:0,y:0});
 const size=Math.max(150,person.span*width*1.15),w=Math.min(1,size/width),h=Math.min(1,size/height);
 return {x:Math.max(0,Math.min(1-w,center.x-w/2)),y:Math.max(0,Math.min(1-h,center.y-h/2)),w,h};
}
export function associateHands(result,roi,person,people=[],previous=[]){
 if(!person)return {landmarks:[],handedness:[]};
 const mapped=remapHands(result,roi).landmarks,slots=[{index:15,elbow:13,key:'Left'},{index:16,elbow:14,key:'Right'}];
 const choices=slots.map(slot=>{
  const old=previous.find(h=>h.key===slot.key),wrist=person.lm[slot.index],elbow=person.lm[slot.elbow];
  const reliable=wrist&&Number.isFinite(wrist.x)&&Number.isFinite(wrist.y)&&(wrist.visibility??1)>.08;
  if(!reliable&&!old)return [];
  const target=reliable?wrist:old.lm[0],limit=Math.max(.085,person.span*.9,visiblePoint(elbow)?distance(target,elbow)*.9:0),list=[];
  for(let i=0;i<mapped.length;i++){
   const d=distance(mapped[i][0],target),continuity=old?distance(mapped[i][0],old.lm[0]):Infinity;
   if(d>limit&&continuity>person.span*.65)continue;
   let rival=Infinity;
   for(const other of people){if(other.index===person.index)continue;for(const n of [15,16])if(visiblePoint(other.lm[n]))rival=Math.min(rival,distance(mapped[i][0],other.lm[n]));}
   if(rival<d*.55&&d>person.span*.2&&continuity>person.span*.3)continue;
   const score=d/limit*.75+(old?Math.min(1.5,continuity/limit)*.25:0);
   if(score<1.25)list.push({i,slot,score});
  }
  return list;
 });
 let best=[],bestScore=3;
 for(const a of [null,...choices[0]])for(const b of [null,...choices[1]]){
  if(a&&b&&a.i===b.i)continue;
  const score=(a?a.score:1.5)+(b?b.score:1.5);if(score<bestScore){bestScore=score;best=[a,b].filter(Boolean);}
 }
 return {landmarks:best.map(c=>mapped[c.i]),handedness:best.map(c=>[{categoryName:c.slot.key}])};
}
