const http=require('http'),fs=require('fs'),path=require('path'),WebSocket=require('ws');
const PORT=process.env.PORT||3000,root=path.join(__dirname,'public');
const baseMaps=[
{name:'THE LONG WAY',hint:'Two switches. Find a route to each.',plates:[[5,2],[12,6]],walls:[[6,1],[6,2],[6,3],[6,4],[6,5],[9,3],[9,4],[9,5],[9,6],[11,3],[12,3]]},
{name:'THE DIVIDE',hint:'The shortest route is blocked.',plates:[[4,6],[12,2]],walls:[[5,1],[5,2],[5,3],[5,4],[7,3],[7,4],[7,5],[7,6],[9,1],[9,2],[9,3],[9,4],[11,5],[12,5]]},
{name:'CIRCUIT',hint:'Look for a path through the interior.',plates:[[4,2],[11,6]],walls:[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[10,4],[10,5],[7,5],[8,5],[9,5],[4,5],[5,5],[6,5]]},
{name:'CROSS CURRENT',hint:'The walls split the room into narrow passages.',plates:[[5,2],[11,6]],walls:[[4,2],[4,3],[4,4],[4,5],[6,1],[6,2],[6,3],[6,4],[8,3],[8,4],[8,5],[8,6],[10,1],[10,2],[10,3],[10,4],[12,4],[12,5]]},
{name:'THE FINAL PAIR',hint:'Both switches must be held at once.',plates:[[4,6],[12,2]],walls:[[3,2],[3,3],[3,4],[5,1],[5,2],[5,3],[5,4],[7,3],[7,4],[7,5],[7,6],[9,1],[9,2],[9,3],[9,4],[11,3],[11,4],[11,5],[11,6]]}
];
const names=['THE LONG WAY','THE DIVIDE','CIRCUIT','CROSS CURRENT','THE FINAL PAIR','SECOND LOCK','FALSE ROUTE','THE SPLIT','AFTER THE SIGNAL','HOLD THE LINE','DEAD END','THE CROSSING','FIRST SECOND THIRD','THE WRONG ORDER','FOUR CORNERS','MEMORY TEST','MISSING PIECE','LOCKED AWAY','THE SEARCH','THE EXCHANGE','DEEPER STILL','NARROW MARGIN','CHAIN REACTION','THE LAST TURN','THE TWENTY-FIFTH'];
const blindLevel=i=>(i+1)%10===0;
const maps=Array.from({length:50},(_,i)=>{
 const mechanic=['plates','gate','timer','sequence','keys','hybrid','memory','dual','reverse','gauntlet','master'][Math.min(10,Math.floor(i/4))];
 const requirements=i<4?[]:i<8?['levers']:i<12?['levers','timer']:i<16?['levers','sequence']:i<20?['levers','sequence','tokens']:i<24?['levers','sequence','tokens']:i<28?['levers','sequence','tokens','memory']:i<32?['levers','sequence','tokens','memory']:i<36?['levers','sequence','tokens','memory','reverse']:['levers','sequence','tokens','memory','reverse'];
 if(blindLevel(i)){const t=requirements.indexOf('timer');if(t>=0)requirements.splice(t,1)}
 const special=i===29;
 let seed=(7919+i*104729)>>>0;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const blind=(i+1)%10===0, maxX=blind?26:12,maxY=blind?15:7,area=(maxX-1)*maxY;
 const walls=new Set(),spawn=new Set(['2,3','2,4','2,5','3,3','3,4','3,5']);
 const all=[];for(let y=1;y<=maxY;y++)for(let x=2;x<=maxX;x++)if(!spawn.has(x+','+y))all.push([x,y]);
 const reachable=()=>{const seen=new Set(['2,4']),q=[[2,4]];for(let n=0;n<q.length;n++){const [x,y]=q[n];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if(xx<2||xx>maxX||yy<1||yy>maxY||seen.has(k)||walls.has(k))continue;seen.add(k);q.push([xx,yy])}}return seen};
 // Room one is completely open. Later rooms add more randomized walls,
 // accepting a wall only when every remaining floor tile stays accessible.
 const target=i===0?0:blind?Math.floor(area*.49):Math.min(53,4+Math.floor(i*2.05));
 for(let attempt=0;attempt<(blind?4000:600)&&walls.size<target;attempt++){
  const [x,y]=all[Math.floor(rand()*all.length)],key=x+','+y;
  if(walls.has(key))continue;
  walls.add(key);
  if(reachable().size!==area-walls.size)walls.delete(key);
 }
 const distances=new Map([['2,4',0]]),q=[[2,4]];
 for(let n=0;n<q.length;n++){const [x,y]=q[n],d=distances.get(x+','+y);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if(xx<2||xx>12||yy<1||yy>7||walls.has(k)||distances.has(k))continue;distances.set(k,d+1);q.push([xx,yy])}}
 const choices=[...distances].filter(([k,d])=>d>=5&&Number(k.split(',')[0])>=5).sort((a,b)=>b[1]-a[1]);
 const pick=(offset,excluded=[])=>{const filtered=choices.filter(([k])=>!excluded.includes(k));const key=filtered[Math.min(filtered.length-1,Math.floor(rand()*Math.min(filtered.length,Math.max(3,offset))))]?.[0]||'10,4';return key.split(',').map(Number)};
 const plateA=pick(3);const far=choices.filter(([key])=>{const [x,y]=key.split(',').map(Number);return Math.hypot(x-plateA[0],y-plateA[1])>= (blind?12:5)});const plateB=(far[Math.floor(rand()*Math.min(far.length,12))]?.[0]||choices.find(([key])=>{const [x,y]=key.split(',').map(Number);return Math.hypot(x-plateA[0],y-plateA[1])>=4})?.[0]||'11,2').split(',').map(Number);
 const used=[plateA.join(','),plateB.join(',')];
 const choose=(minDistance=3)=>{const pool=choices.filter(([key])=>{const [x,y]=key.split(',').map(Number);return !used.includes(key)&&used.every(k=>{const [a,b]=k.split(',').map(Number);return Math.hypot(x-a,y-b)>=minDistance})});const key=(pool[Math.floor(rand()*Math.min(18,pool.length))]||choices.find(([k])=>!used.includes(k))||['10,4'])[0];used.push(key);return key.split(',').map(Number)};
 const levers=Array.from({length:requirements.includes('levers')?Math.min(6,2+Math.floor(i/8)):0},()=>choose(3));
 const tokens=Array.from({length:requirements.includes('tokens')?Math.min(5,2+Math.floor(i/9)):0},()=>choose(2));
 const lever=levers[0]||choose(),token=tokens[0]||choose();
 const order=levers.map((_,k)=>k).sort(()=>rand()-.5);
 const tokenOrder=tokens.map((_,k)=>k).sort(()=>rand()-.5);
 return {name:names[i]||'CHAMBER '+String(i+1).padStart(2,'0'),hint:({plates:'Find both switches.',gate:'Activate the relay before finishing.',timer:'The relay has a time limit.',sequence:'Touch the marked switches in order.',keys:'Collect the token before finishing.',hybrid:'Combine the previous mechanics.'})[mechanic],plates:[plateA,plateB],walls:[...walls].map(k=>k.split(',').map(Number)),mechanic,requirements,levers,tokens,order,tokenOrder,lever,token,blind,maxX,maxY,duration:Math.max(3000,9000-(i-8)*220),difficulty:Number(Math.pow(1.5,i/4).toFixed(2))};
});
const server=http.createServer((req,res)=>{let u;try{u=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}const p=path.resolve(root,'.'+(u==='/'?'/index.html':u));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(p)]||'application/octet-stream'});res.end(d)})});
const wss=new WebSocket.Server({server}),rooms=new Map();let seq=0;
const send=(ws,v)=>{if(ws.readyState===1)ws.send(JSON.stringify(v))};
const broadcast=(r,v)=>r.players.forEach(p=>send(p.ws,v));
const safeAvatar=v=>typeof v==='string'&&/^[0-4]{1024}$/.test(v)?v:null;
function layoutFor(r){
 const base=maps[Math.min(49,r.level-1)],count=r.solo?1:r.players.size;
 if(count<3)return base;
 const map={...base,plates:base.plates.map(p=>[...p]),levers:base.levers.map(p=>[...p]),tokens:base.tokens.map(p=>[...p]),order:[...base.order],tokenOrder:[...base.tokenOrder],requirements:[...base.requirements]};
 const occupied=new Set([...map.walls,...map.plates,...map.levers,...map.tokens].map(p=>p.join(',')));
 const candidates=[];
 for(let y=1;y<=map.maxY;y++)for(let x=2;x<=map.maxX;x++)if(!occupied.has(x+','+y)&&Math.hypot(x-2,y-4)>3)candidates.push([x,y]);
 const choose=(existing,minDist)=>{let best=null,score=-Infinity;for(const p of candidates){if(occupied.has(p.join(',')))continue;const d=Math.min(...existing.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));if(d>score){score=d;best=p}}if(best&&score>=minDist){occupied.add(best.join(','));return best}return null};
 while(map.plates.length<count){const p=choose(map.plates,2);if(!p)break;map.plates.push(p)}
 if(map.requirements.includes('levers')){for(let n=0;n<count-2;n++){const p=choose([...map.plates,...map.levers],2);if(p){map.levers.push(p);map.order.push(map.levers.length-1)}}}
 if(map.requirements.includes('tokens')){for(let n=0;n<count-2;n++){const p=choose([...map.plates,...map.levers,...map.tokens],2);if(p){map.tokens.push(p);map.tokenOrder.push(map.tokens.length-1)}}}
 map.duration=Math.max(2500,Math.round(map.duration*(count===4?.7:.85)));
 return map;
}
function resetPuzzle(r){r.visited=[];r.solved=false;r.gate=false;r.key=false;r.progress=0;r.armed=true;r.until=0;r.leverStep=0;r.tokenStep=0;r.sequenceStep=0;r.lastLever=-1;r.lastToken=-1;r.lastPlate=-1;r.memoryStep=0;r.lastMemory=-1}
function update(r){
 const map=layoutFor(r),ps=[...r.players.values()];
 const on=point=>ps.some(p=>Math.hypot(p.x-point[0]-.5,p.y-point[1]-.5)<.53);
 r.active=map.plates.map(on);if(!Array.isArray(r.visited)||r.visited.length!==map.plates.length)r.visited=map.plates.map(()=>false);
 if(r.solo)r.visited=map.plates.map((_,i)=>r.visited[i]||r.active[i]);
 if(r.started&&!r.solved){
  const req=map.requirements||[];
  const leverHit=map.levers.findIndex(on);
  if(leverHit!==r.lastLever&&leverHit>=0){
   if(r.leverStep<map.levers.length)r.leverStep=leverHit===map.order[r.leverStep]?r.leverStep+1:leverHit===map.order[0]?1:0;
  }
  r.lastLever=leverHit;
  const tokenHit=map.tokens.findIndex(on);
  if(tokenHit!==r.lastToken&&tokenHit>=0){
   if(r.tokenStep<map.tokens.length)r.tokenStep=tokenHit===map.tokenOrder[r.tokenStep]?r.tokenStep+1:tokenHit===map.tokenOrder[0]?1:0;
  }
  r.lastToken=tokenHit;
  const plateHit=map.plates.findIndex(on);
  if(plateHit!==r.lastPlate&&plateHit>=0&&req.includes('sequence'))r.sequenceStep=plateHit===r.sequenceStep?r.sequenceStep+1:plateHit===0?1:0;
  r.lastPlate=plateHit;
  if(req.includes('memory')&&leverHit!==r.lastMemory&&leverHit>=0)if(r.memoryStep<map.levers.length)r.memoryStep=leverHit===map.order[r.memoryStep]?r.memoryStep+1:leverHit===map.order[0]?1:0;
  r.lastMemory=leverHit;
  if(req.includes('timer')&&r.leverStep===map.levers.length&&Date.now()>r.until)r.until=Date.now()+map.duration;
  const ready=(!req.includes('levers')||r.leverStep>=map.levers.length)&&(!req.includes('tokens')||r.tokenStep>=map.tokens.length)&&(!req.includes('sequence')||r.sequenceStep>=map.plates.length)&&(!req.includes('memory')||r.memoryStep>=map.levers.length)&&(!req.includes('timer')||Date.now()<r.until);
  if((ps.length>=2&&r.active.every(Boolean)||r.solo&&r.visited.every(Boolean))&&ready)r.solved=true;
 }
 broadcast(r,{type:'state',code:r.code,started:r.started,level:r.level,layout:map,players:ps.map(({id,name,x,y,avatar})=>({id,name,x,y,avatar})),host:r.host,active:r.active,solved:r.solved,gate:r.leverStep>=map.levers.length,key:r.tokenStep>=map.tokens.length,progress:r.sequenceStep||0,leverStep:r.leverStep||0,tokenStep:r.tokenStep||0,memoryStep:r.memoryStep||0,remaining:Math.max(0,(r.until||0)-Date.now()),solo:!!r.solo,visited:r.visited||[false,false],canSkip:ps.some(p=>p.id===r.host&&p.name.toLowerCase()==='quay')});
}
function valid(r,x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=1.16&&x<=layoutFor(r).maxX+1-.16&&y>=1.16&&y<=layoutFor(r).maxY+1-.16&&(!r.started||!layoutFor(r).walls.some(([a,b])=>Math.pow(x-Math.max(a,Math.min(x,a+1)),2)+Math.pow(y-Math.max(b,Math.min(y,b+1)),2)<.16*.16))}
function spawn(r){[...r.players.values()].forEach((p,i)=>{p.x=2.5+i*.55;p.y=4.5})}
wss.on('connection',ws=>{let room=null,id=null;ws.on('message',raw=>{if(raw.length>12000)return;let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
if(m.type==='create'||m.type==='join'){if(room)return;let r=m.type==='join'?rooms.get(String(m.code||'').trim().toUpperCase()):null;if(m.type==='join'&&!r)return send(ws,{type:'error',message:'Room not found'});if(r&&r.players.size>=4)return send(ws,{type:'error',message:'Room is full'});if(r&&r.started)return send(ws,{type:'error',message:'Game already started'});if(!r){let code;do{code=Math.random().toString(36).slice(2,7).toUpperCase()}while(rooms.has(code));r={code,players:new Map(),started:false,level:1,solved:false,host:null,active:[false,false],gate:false,key:false,progress:0,armed:true,until:0,solo:false,visited:[false,false]};rooms.set(code,r)}id=++seq;room=r;const name=String(m.name||'PLAYER').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,16)||'PLAYER';r.players.set(id,{id,name,x:2.5+r.players.size*.55,y:4.5,avatar:safeAvatar(m.avatar),ws});if(!r.host)r.host=id;send(ws,{type:'welcome',id});update(r);return}
if(!room)return;
if(m.type==='avatar'){const a=safeAvatar(m.avatar);if(a){room.players.get(id).avatar=a;update(room)}}
if(m.type==='start'&&room.host===id&&!room.started&&(room.players.size>=2||room.players.get(id)?.name.toLowerCase()==='quay')){room.started=true;room.solo=room.players.size===1;resetPuzzle(room);spawn(room);update(room)}
if(m.type==='move'){const p=room.players.get(id),x=Number(m.x),y=Number(m.y);if(p&&valid(room,x,y)&&Math.hypot(x-p.x,y-p.y)<1.2){p.x=x;p.y=y;update(room)}}
if(m.type==='next'&&room.started&&room.host===id&&room.solved){room.level=Math.min(50,room.level+1);resetPuzzle(room);spawn(room);update(room)}
if(m.type==='skip'&&room.host===id&&room.players.get(id)?.name.toLowerCase()==='quay'&&room.started){room.level=Math.min(50,Math.max(1,Math.floor(Number(m.level)||room.level+1)));room.solved=false;resetPuzzle(room);spawn(room);update(room)}
if(m.type==='reset'&&room.started&&room.host===id){resetPuzzle(room);spawn(room);update(room)}
});ws.on('close',()=>{if(!room)return;room.players.delete(id);if(!room.players.size)rooms.delete(room.code);else{if(room.host===id)room.host=room.players.keys().next().value;room.solved=false;update(room)}})});
server.listen(PORT,()=>console.log('B100 running on '+PORT));