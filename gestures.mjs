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
