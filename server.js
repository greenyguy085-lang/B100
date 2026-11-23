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
const maps=Array.from({length:25},(_,i)=>{
 const b=baseMaps[i%5],mechanic=['plates','gate','timer','sequence','keys','hybrid'][Math.min(5,Math.floor(i/4))];
 const walls=b.walls.map(w=>[...w]);const taken=new Set(walls.map(w=>w.join(',')));
 if(i>=5){const col=6+i%5,gap=1+i%7;for(let y=1;y<=7;y++)if(y!==gap&&y!==Math.max(1,gap-1)&&!taken.has(col+','+y))walls.push([col,y])}
 const blocked=new Set(walls.map(w=>w.join(',')));
 const choose=(spots,fallback)=>spots.find(p=>!blocked.has(p.join(',')))||fallback;
 const a=choose([[4,6],[3,6],[4,2],[3,2],[2,6]],[2,2]);
 const b2=choose([[12,6],[11,6],[12,2],[11,2],[10,6]],[12,6]);
 return {name:names[i],hint:({plates:'Find both switches.',gate:'Activate the relay before finishing.',timer:'The relay has a time limit.',sequence:'Touch the marked switches in order.',keys:'Collect the token before finishing.',hybrid:'Combine the previous mechanics.'})[mechanic],plates:[a,b2],walls,mechanic,lever:choose([[3,2],[4,2],[3,6]],[2,2]),token:choose([[9,6],[10,2],[8,6]],[8,2]),duration:Math.max(2400,8000-(i-8)*320),difficulty:Number(Math.pow(1.5,i/4).toFixed(2))};
});
const server=http.createServer((req,res)=>{let u;try{u=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}const p=path.resolve(root,'.'+(u==='/'?'/index.html':u));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(p)]||'application/octet-stream'});res.end(d)})});
const wss=new WebSocket.Server({server}),rooms=new Map();let seq=0;
const send=(ws,v)=>{if(ws.readyState===1)ws.send(JSON.stringify(v))};
const broadcast=(r,v)=>r.players.forEach(p=>send(p.ws,v));
const safeAvatar=v=>typeof v==='string'&&/^[0-4]{1024}$/.test(v)?v:null;
function update(r){const map=maps[Math.min(24,r.level-1)],ps=[...r.players.values()];r.active=map.plates.map(([x,y])=>ps.some(p=>Math.hypot(p.x-x-.5,p.y-y-.5)<.58));if(r.started&&!r.solved){const on=point=>ps.some(p=>Math.hypot(p.x-point[0]-.5,p.y-point[1]-.5)<.58);if((map.mechanic==='gate'||map.mechanic==='hybrid')&&on(map.lever))r.gate=true;if(map.mechanic==='timer'&&on(map.lever)&&Date.now()>r.until)r.until=Date.now()+map.duration;if(map.mechanic==='keys'||map.mechanic==='hybrid')if(on(map.token))r.key=true;if(map.mechanic==='sequence'){const hit=map.plates.findIndex(on);if(hit<0)r.armed=true;else if(r.armed){r.progress=hit===r.progress?r.progress+1:hit===0?1:0;r.armed=false}}const ready=map.mechanic==='plates'||map.mechanic==='gate'&&r.gate||map.mechanic==='timer'&&Date.now()<r.until||map.mechanic==='sequence'&&r.progress>=2||map.mechanic==='keys'&&r.key||map.mechanic==='hybrid'&&r.key&&r.gate;if(ps.length>=2&&ready&&r.active.every(Boolean))r.solved=true}broadcast(r,{type:'state',code:r.code,started:r.started,level:r.level,layout:map,players:ps.map(({id,name,x,y,avatar})=>({id,name,x,y,avatar})),host:r.host,active:r.active,solved:r.solved,gate:!!r.gate,key:!!r.key,progress:r.progress||0,remaining:Math.max(0,(r.until||0)-Date.now())})}
function valid(r,x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=1.2&&x<=12.8&&y>=1.2&&y<=6.8&&(!r.started||!maps[Math.min(24,r.level-1)].walls.some(([a,b])=>Math.abs(x-a-.5)<.72&&Math.abs(y-b-.5)<.72))}
function spawn(r){[...r.players.values()].forEach((p,i)=>{p.x=2.5+i*.55;p.y=4.5})}
wss.on('connection',ws=>{let room=null,id=null;ws.on('message',raw=>{if(raw.length>12000)return;let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
if(m.type==='create'||m.type==='join'){if(room)return;let r=m.type==='join'?rooms.get(String(m.code||'').trim().toUpperCase()):null;if(m.type==='join'&&!r)return send(ws,{type:'error',message:'Room not found'});if(r&&r.players.size>=4)return send(ws,{type:'error',message:'Room is full'});if(r&&r.started)return send(ws,{type:'error',message:'Game already started'});if(!r){let code;do{code=Math.random().toString(36).slice(2,7).toUpperCase()}while(rooms.has(code));r={code,players:new Map(),started:false,level:1,solved:false,host:null,active:[false,false],gate:false,key:false,progress:0,armed:true,until:0};rooms.set(code,r)}id=++seq;room=r;const name=String(m.name||'PLAYER').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,16)||'PLAYER';r.players.set(id,{id,name,x:2.5+r.players.size*.55,y:4.5,avatar:safeAvatar(m.avatar),ws});if(!r.host)r.host=id;send(ws,{type:'welcome',id});update(r);return}
if(!room)return;
if(m.type==='avatar'){const a=safeAvatar(m.avatar);if(a){room.players.get(id).avatar=a;update(room)}}
if(m.type==='start'&&room.host===id&&!room.started){room.started=true;room.gate=false;room.key=false;room.progress=0;room.armed=true;room.until=0;spawn(room);update(room)}
if(m.type==='move'){const p=room.players.get(id),x=Number(m.x),y=Number(m.y);if(p&&valid(room,x,y)&&Math.hypot(x-p.x,y-p.y)<1.2){p.x=x;p.y=y;update(room)}}
if(m.type==='next'&&room.started&&room.host===id&&room.solved){room.level=Math.min(25,room.level+1);room.solved=false;room.gate=false;room.key=false;room.progress=0;room.armed=true;room.until=0;spawn(room);update(room)}
if(m.type==='reset'&&room.started&&room.host===id){room.solved=false;room.gate=false;room.key=false;room.progress=0;room.armed=true;room.until=0;spawn(room);update(room)}
});ws.on('close',()=>{if(!room)return;room.players.delete(id);if(!room.players.size)rooms.delete(room.code);else{if(room.host===id)room.host=room.players.keys().next().value;room.solved=false;update(room)}})});
server.listen(PORT,()=>console.log('B100 running on '+PORT));