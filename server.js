const http=require('http'),fs=require('fs'),path=require('path'),WebSocket=require('ws');
const PORT=process.env.PORT||3000,root=path.join(__dirname,'public');
const maps=[
{name:'THE LONG WAY',hint:'Find the plates at opposite ends of the room.',plates:[[4,2],[11,6]],walls:[[6,1],[6,2],[6,3],[6,4],[6,5],[9,3],[9,4],[9,5],[9,6],[11,3],[12,3]]},
{name:'THE DIVIDE',hint:'Two routes. One door. Stay on your switch.',plates:[[3,6],[11,2]],walls:[[5,1],[5,2],[5,3],[5,4],[7,3],[7,4],[7,5],[7,6],[9,1],[9,2],[9,3],[9,4],[11,5],[12,5]]},
{name:'CIRCUIT',hint:'Follow the winding corridors and hold your position.',plates:[[4,2],[11,6]],walls:[[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[10,4],[10,5],[7,5],[8,5],[9,5],[4,5],[5,5],[6,5]]},
{name:'CROSS CURRENT',hint:'Work your way around the barriers to the far switches.',plates:[[3,2],[11,6]],walls:[[4,2],[4,3],[4,4],[4,5],[6,1],[6,2],[6,3],[6,4],[8,3],[8,4],[8,5],[8,6],[10,1],[10,2],[10,3],[10,4],[12,4],[12,5]]},
{name:'THE FINAL PAIR',hint:'Take the near plate. Your partner must reach the other side.',plates:[[3,6],[12,2]],walls:[[3,2],[3,3],[3,4],[5,1],[5,2],[5,3],[5,4],[7,3],[7,4],[7,5],[7,6],[9,1],[9,2],[9,3],[9,4],[11,3],[11,4],[11,5],[11,6]]}
];
const server=http.createServer((req,res)=>{let u;try{u=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}const p=path.resolve(root,'.'+(u==='/'?'/index.html':u));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(p)]||'application/octet-stream'});res.end(d)})});
const wss=new WebSocket.Server({server}),rooms=new Map();let seq=0;
const send=(ws,v)=>{if(ws.readyState===1)ws.send(JSON.stringify(v))};
const broadcast=(r,v)=>r.players.forEach(p=>send(p.ws,v));
const safeAvatar=v=>typeof v==='string'&&/^[0-4]{1024}$/.test(v)?v:null;
function update(r){const map=maps[(r.level-1)%maps.length],ps=[...r.players.values()];r.active=map.plates.map(([x,y])=>ps.some(p=>Math.hypot(p.x-x-.5,p.y-y-.5)<.58));if(r.started&&ps.length>=2&&r.active.every(Boolean))r.solved=true;broadcast(r,{type:'state',code:r.code,started:r.started,level:r.level,layout:map,players:ps.map(({id,name,x,y,avatar})=>({id,name,x,y,avatar})),host:r.host,active:r.active,solved:r.solved})}
function valid(r,x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=1.2&&x<=12.8&&y>=1.2&&y<=6.8&&(!r.started||!maps[(r.level-1)%maps.length].walls.some(([a,b])=>Math.abs(x-a-.5)<.72&&Math.abs(y-b-.5)<.72))}
function spawn(r){[...r.players.values()].forEach((p,i)=>{p.x=2.5+i*.55;p.y=4.5})}
wss.on('connection',ws=>{let room=null,id=null;ws.on('message',raw=>{if(raw.length>12000)return;let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
if(m.type==='create'||m.type==='join'){if(room)return;let r=m.type==='join'?rooms.get(String(m.code||'').trim().toUpperCase()):null;if(m.type==='join'&&!r)return send(ws,{type:'error',message:'Room not found'});if(r&&r.players.size>=4)return send(ws,{type:'error',message:'Room is full'});if(r&&r.started)return send(ws,{type:'error',message:'Game already started'});if(!r){let code;do{code=Math.random().toString(36).slice(2,7).toUpperCase()}while(rooms.has(code));r={code,players:new Map(),started:false,level:1,solved:false,host:null,active:[false,false]};rooms.set(code,r)}id=++seq;room=r;const name=String(m.name||'PLAYER').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,16)||'PLAYER';r.players.set(id,{id,name,x:2.5+r.players.size*.55,y:4.5,avatar:safeAvatar(m.avatar),ws});if(!r.host)r.host=id;send(ws,{type:'welcome',id});update(r);return}
if(!room)return;
if(m.type==='avatar'){const a=safeAvatar(m.avatar);if(a){room.players.get(id).avatar=a;update(room)}}
if(m.type==='start'&&room.host===id&&!room.started){room.started=true;spawn(room);update(room)}
if(m.type==='move'){const p=room.players.get(id),x=Number(m.x),y=Number(m.y);if(p&&valid(room,x,y)&&Math.hypot(x-p.x,y-p.y)<1.2){p.x=x;p.y=y;update(room)}}
if(m.type==='next'&&room.started&&room.host===id&&room.solved){room.level=Math.min(100,room.level+1);room.solved=false;spawn(room);update(room)}
if(m.type==='reset'&&room.started&&room.host===id){room.solved=false;spawn(room);update(room)}
});ws.on('close',()=>{if(!room)return;room.players.delete(id);if(!room.players.size)rooms.delete(room.code);else{if(room.host===id)room.host=room.players.keys().next().value;room.solved=false;update(room)}})});
server.listen(PORT,()=>console.log('B100 running on '+PORT));