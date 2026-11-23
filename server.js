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
 const mechanic=['plates','gate','timer','sequence','keys','hybrid','reverse','reverse','handoff','echo','echo','sweep','sweep'][Math.min(12,Math.floor(i/4))];
 const requirements=i<4?[]:i<8?['levers']:i<12?['levers','timer']:i<16?['levers','sequence']:i<20?['levers','sequence','tokens']:i<24?['levers','sequence','tokens']:i<28?['levers','sequence','tokens','reverse']:i<32?['levers','sequence','tokens','reverse']:i<36?['levers','sequence','tokens','reverse','handoff']:i<42?['levers','sequence','tokens','reverse','handoff','echo']:['levers','sequence','tokens','reverse','handoff','echo','sweep'];
 if(i>=25)requirements.push('beacon');if(i>=33)requirements.push('sync');if(i>=41)requirements.push('chain');
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
 const target=i===0?0:blind?Math.floor(area*.38):Math.min(33,4+Math.floor(i*1.25));
 for(let attempt=0;attempt<(blind?4000:600)&&walls.size<target;attempt++){
  const [x,y]=all[Math.floor(rand()*all.length)],key=x+','+y;
  if(walls.has(key))continue;
  walls.add(key);
  if(reachable().size!==area-walls.size)walls.delete(key);
 }
 const distances=new Map([['2,4',0]]),q=[[2,4]];
 for(let n=0;n<q.length;n++){const [x,y]=q[n],d=distances.get(x+','+y);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if(xx<2||xx>maxX||yy<1||yy>maxY||walls.has(k)||distances.has(k))continue;distances.set(k,d+1);q.push([xx,yy])}}
 const choices=[...distances].filter(([k,d])=>d>=5&&Number(k.split(',')[0])>=5).sort((a,b)=>b[1]-a[1]);
 const pick=(offset,excluded=[])=>{const filtered=choices.filter(([k])=>!excluded.includes(k));const key=filtered[Math.min(filtered.length-1,Math.floor(rand()*Math.min(filtered.length,Math.max(3,offset))))]?.[0]||'10,4';return key.split(',').map(Number)};
 const plateA=pick(3);const far=choices.filter(([key])=>{const [x,y]=key.split(',').map(Number);return Math.hypot(x-plateA[0],y-plateA[1])>= (blind?10:5)});const plateB=(far[Math.floor(rand()*Math.min(far.length,12))]?.[0]||choices.find(([key])=>{const [x,y]=key.split(',').map(Number);return Math.hypot(x-plateA[0],y-plateA[1])>=4})?.[0]||'11,2').split(',').map(Number);
 const used=[plateA.join(','),plateB.join(',')];
 const choose=(minDistance=3)=>{const pool=choices.filter(([key])=>{const [x,y]=key.split(',').map(Number);return !used.includes(key)&&used.every(k=>{const [a,b]=k.split(',').map(Number);return Math.hypot(x-a,y-b)>=minDistance})});const key=(pool[Math.floor(rand()*Math.min(18,pool.length))]||choices.find(([k])=>!used.includes(k))||['10,4'])[0];used.push(key);return key.split(',').map(Number)};
 const levers=Array.from({length:requirements.includes('levers')?Math.min(6,2+Math.floor(i/8)):0},()=>choose(3));
 const tokens=Array.from({length:requirements.includes('tokens')?Math.min(5,2+Math.floor(i/9)):0},()=>choose(2));
 const beacon=requirements.includes('beacon')?choose(2):null,syncPads=requirements.includes('sync')?[choose(2),choose(2)]:[],chainPads=requirements.includes('chain')?[choose(2),choose(2)]:[];
 const lever=levers[0]||choose(),token=tokens[0]||choose();
 const order=levers.map((_,k)=>k);for(let k=order.length-1;k>0;k--){const n=Math.floor(rand()*(k+1));[order[k],order[n]]=[order[n],order[k]]}
 const tokenOrder=tokens.map((_,k)=>k);for(let k=tokenOrder.length-1;k>0;k--){const n=Math.floor(rand()*(k+1));[tokenOrder[k],tokenOrder[n]]=[tokenOrder[n],tokenOrder[k]]}
 return {name:names[i]||'CHAMBER '+String(i+1).padStart(2,'0'),hint:i>=41?'CHAIN STATIONS: charge each square station in order by standing on it for 1.2 seconds. Also complete earlier objectives.':i>=33?'SYNC PADS: two different players hold both hexagon pads for 1.6 seconds together. Solo mode allows one pad.':i>=25?'CHARGE BEACON: stand on the diamond for 2.2 seconds to power it, then complete the other objectives.':i>=42?'TOKEN SWEEP: finish tokens in numbered order, then repeat them backwards. Complete the lever reversal, alternating-player handoff, and plate echo too.':i>=36?'PLATE ECHO: activate the plates 1 to '+(2)+' in order, then activate them in reverse order. Finish all previous objectives.':i>=32?'HANDOFF: different players must take turns activating successive levers. Finish the forward and reverse lever sequences.':i>=24?'REVERSE LEVERS: complete the numbered levers, then activate them again in reverse order.':i>=16?'TOKEN CIRCUIT: collect the numbered tokens in order, then complete the previous objectives.':i>=12?'PLATE SEQUENCE: activate the plates in order before everyone holds their assigned plate.':i>=8&&!blind?'TIMED RELAY: complete the levers before the timer expires.':i>=4?'Activate the numbered levers in order.':'Hold every pressure plate simultaneously.',plates:[plateA,plateB],walls:[...walls].map(k=>k.split(',').map(Number)),mechanic,requirements,levers,tokens,beacon,syncPads,chainPads,order,tokenOrder,lever,token,blind,maxX,maxY,duration:Math.max(3000,9000-(i-8)*220),difficulty:Number(Math.pow(1.5,i/4).toFixed(2))};
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
 const walls=new Set(map.walls.map(p=>p.join(',')));
 const reachable=new Set(['2,4']),q=[[2,4]];
 for(let n=0;n<q.length;n++){const [x,y]=q[n];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a<2||a>map.maxX||b<1||b>map.maxY||walls.has(k)||reachable.has(k))continue;reachable.add(k);q.push([a,b])}}
 const occupied=new Set([...map.plates,...map.levers,...map.tokens].map(p=>p.join(',')));
 const candidates=[...reachable].map(k=>k.split(',').map(Number)).filter(([x,y])=>Math.hypot(x-2,y-4)>3);
 const choose=(existing,minDist)=>{
  let best=null,score=-1;
  for(const p of candidates){if(occupied.has(p.join(',')))continue;const d=Math.min(...existing.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));if(d>score){score=d;best=p}}
  if(!best||score<minDist)return null;
  occupied.add(best.join(','));return best
 };
 while(map.plates.length<count){const p=choose(map.plates,1.5);if(!p)break;map.plates.push(p)}
 if(map.requirements.includes('levers'))for(let n=0;n<count-2;n++){const p=choose([...map.plates,...map.levers],1.5);if(p){map.levers.push(p);map.order.push(map.levers.length-1)}}
 if(map.requirements.includes('tokens'))for(let n=0;n<count-2;n++){const p=choose([...map.plates,...map.levers,...map.tokens],1.5);if(p){map.tokens.push(p);map.tokenOrder.push(map.tokens.length-1)}}
 // Time is adjusted to the longer routes instead of becoming impossible with more players.
 map.duration=Math.round(map.duration*(count===4?1.5:1.25));
 return map;
}
function resetPuzzle(r){r.visited=[];r.solved=false;r.gate=false;r.key=false;r.progress=0;r.armed=true;r.until=0;r.leverStep=0;r.tokenStep=0;r.sequenceStep=0;r.lastLever=-1;r.lastToken=-1;r.lastPlate=-1;r.memoryStep=0;r.lastMemory=-1;r.leverHeld=[];r.tokenHeld=[];r.plateHeld=[];r.reverseStep=0;r.echoStep=0;r.sweepStep=0;r.lastLeverPlayer=null;r.handoffStep=0;r.beaconCharge=0;r.beaconDone=false;r.syncCharge=0;r.syncDone=false;r.chainStep=0;r.chainCharge=0;r.lastUpdate=Date.now()}
function update(r){
 const map=layoutFor(r),ps=[...r.players.values()],req=map.requirements||[];
 const now=Date.now(),dt=Math.min(150,Math.max(0,now-(r.lastUpdate||now)));r.lastUpdate=now;
 const occupants=point=>ps.filter(p=>Math.hypot(p.x-point[0]-.5,p.y-point[1]-.5)<.52).map(p=>p.id);
 r.active=map.plates.map(point=>occupants(point).length>0);
 if(!Array.isArray(r.visited)||r.visited.length!==map.plates.length)r.visited=map.plates.map(()=>false);
 if(r.solo)r.visited=map.plates.map((_,i)=>r.visited[i]||r.active[i]);
 if(r.started&&!r.solved){
  const leverNow=map.levers.map(occupants),tokenNow=map.tokens.map(occupants),plateNow=map.plates.map(occupants);
  const newHits=(now,old)=>now.flatMap((ids,i)=>ids.filter(id=>!(old[i]||[]).includes(id)).map(id=>({i,id})));
  const leverHits=newHits(leverNow,r.leverHeld),tokenHits=newHits(tokenNow,r.tokenHeld),plateHits=newHits(plateNow,r.plateHeld);
  for(const {i,id} of leverHits){
   if(r.leverStep<map.levers.length){
    const expected=map.order[r.leverStep];
    if(i===expected){
     if(req.includes('handoff')&&!r.solo&&r.lastLeverPlayer!==null&&r.lastLeverPlayer===id){r.leverStep=0;r.handoffStep=0;r.lastLeverPlayer=null}
     else{r.leverStep++;r.handoffStep=r.leverStep;r.lastLeverPlayer=id}
    }else{r.leverStep=i===map.order[0]?1:0;r.handoffStep=r.leverStep;r.lastLeverPlayer=id}
   }else if(req.includes('reverse')&&r.reverseStep<map.levers.length){
    const reversed=[...map.order].reverse();
    r.reverseStep=i===reversed[r.reverseStep]?r.reverseStep+1:i===reversed[0]?1:0;
   }
  }
  for(const {i} of tokenHits){
   if(r.tokenStep<map.tokens.length)r.tokenStep=i===map.tokenOrder[r.tokenStep]?r.tokenStep+1:i===map.tokenOrder[0]?1:0;
   else if(req.includes('sweep')&&r.sweepStep<map.tokens.length){
    const reversed=[...map.tokenOrder].reverse();
    r.sweepStep=i===reversed[r.sweepStep]?r.sweepStep+1:i===reversed[0]?1:0;
   }
  }
  for(const {i} of plateHits){
   if(req.includes('sequence')&&r.sequenceStep<map.plates.length)r.sequenceStep=i===r.sequenceStep?r.sequenceStep+1:i===0?1:0;
   else if(req.includes('echo')&&r.echoStep<map.plates.length){
    const expected=map.plates.length-1-r.echoStep;
    r.echoStep=i===expected?r.echoStep+1:i===map.plates.length-1?1:0;
   }
  }
  r.leverHeld=leverNow;r.tokenHeld=tokenNow;r.plateHeld=plateNow;
  if(req.includes('beacon')&&!r.beaconDone){r.beaconCharge=occupants(map.beacon).length?r.beaconCharge+dt:Math.max(0,r.beaconCharge-dt*2);if(r.beaconCharge>=2200)r.beaconDone=true}
  if(req.includes('sync')&&!r.syncDone){const a=occupants(map.syncPads[0]),b=occupants(map.syncPads[1]);const active=r.solo?(a.length||b.length):(a.length&&b.length&&a.some(id=>!b.includes(id)));r.syncCharge=active?r.syncCharge+dt:0;if(r.syncCharge>=1600)r.syncDone=true}
  if(req.includes('chain')&&r.chainStep<map.chainPads.length){r.chainCharge=occupants(map.chainPads[r.chainStep]).length?r.chainCharge+dt:0;if(r.chainCharge>=1200){r.chainStep++;r.chainCharge=0}}
  if(req.includes('timer')&&r.leverStep===map.levers.length&&Date.now()>r.until)r.until=Date.now()+map.duration;
  const ready=(!req.includes('levers')||r.leverStep>=map.levers.length)&&(!req.includes('tokens')||r.tokenStep>=map.tokens.length)&&(!req.includes('sequence')||r.sequenceStep>=map.plates.length)&&(!req.includes('reverse')||r.reverseStep>=map.levers.length)&&(!req.includes('handoff')||r.handoffStep>=map.levers.length)&&(!req.includes('echo')||r.echoStep>=map.plates.length)&&(!req.includes('sweep')||r.sweepStep>=map.tokens.length)&&(!req.includes('timer')||Date.now()<r.until)&&(!req.includes('beacon')||r.beaconDone)&&(!req.includes('sync')||r.syncDone)&&(!req.includes('chain')||r.chainStep>=map.chainPads.length);
  if((ps.length>=2&&r.active.every(Boolean)||r.solo&&r.visited.every(Boolean))&&ready)r.solved=true;
 }
 broadcast(r,{type:'state',code:r.code,started:r.started,level:r.level,layout:map,players:ps.map(({id,name,x,y,avatar})=>({id,name,x,y,avatar})),host:r.host,active:r.active,solved:r.solved,gate:r.leverStep>=map.levers.length,key:r.tokenStep>=map.tokens.length,progress:r.sequenceStep||0,leverStep:r.leverStep||0,tokenStep:r.tokenStep||0,reverseStep:r.reverseStep||0,echoStep:r.echoStep||0,sweepStep:r.sweepStep||0,handoffStep:r.handoffStep||0,beaconCharge:r.beaconCharge||0,beaconDone:!!r.beaconDone,syncCharge:r.syncCharge||0,syncDone:!!r.syncDone,chainStep:r.chainStep||0,chainCharge:r.chainCharge||0,remaining:Math.max(0,(r.until||0)-Date.now()),solo:!!r.solo,visited:r.visited||[],canSkip:ps.some(p=>p.id===r.host&&p.name.toLowerCase()==='quay')});
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