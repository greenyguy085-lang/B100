const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d'),paint=$('paint'),pc=paint.getContext('2d'),T=72,OX=56,OY=32,colors=['#000000','#555657','#999b99','#e7e5df'],keys=new Set(),cache=new Map();let ws,id,room,px=null,py=null,lastSend=0,last=performance.now(),ink='#999b99',tool='brush',drag=false,deviceMode=null,joyX=0,joyY=0,joyPointer=null;
function chooseDevice(mode){
 deviceMode=mode;
 $('deviceChoice').hidden=true;
 $('landing').hidden=!!room;
 if(room)$('game').hidden=false;
 $('mobileJoystick').hidden=mode!=='mobile';
 $('controlInstructions').textContent=mode==='mobile'?'Drag the left joystick to move. Release to stop.':'WASD / ARROW KEYS — Move';
 joyX=joyY=0;joyPointer=null;
}
$('chooseComputer').onclick=()=>chooseDevice('computer');
$('chooseMobile').onclick=()=>chooseDevice('mobile');
$('switchDevice').onclick=()=>{joyX=joyY=0;joyPointer=null;$('deviceChoice').hidden=false;$('landing').hidden=true;$('game').hidden=true};
const joy=$('mobileJoystick'),knob=$('joystickKnob');
function moveJoystick(e){
 const rect=joy.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const dx=e.clientX-cx,dy=e.clientY-cy,dist=Math.hypot(dx,dy),radius=rect.width*.32;
 const scale=dist>radius?radius/dist:1;
 joyX=dx*scale/radius;joyY=dy*scale/radius;
 if(Math.hypot(joyX,joyY)<.12)joyX=joyY=0;
 knob.style.transform='translate('+joyX*radius+'px,'+joyY*radius+'px)';
}
joy.addEventListener('pointerdown',e=>{if(deviceMode!=='mobile'||joyPointer!==null)return;joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoystick(e);e.preventDefault()});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer){moveJoystick(e);e.preventDefault()}});
function releaseJoystick(e){if(e.pointerId!==joyPointer)return;joyPointer=null;joyX=joyY=0;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',releaseJoystick);joy.addEventListener('pointercancel',releaseJoystick);addEventListener('blur',()=>{joyX=joyY=0;joyPointer=null;knob.style.transform='translate(0,0)'});
const legacyColors=['','#232425','#646666','#abadab','#f0eee7'];
function defaultSprite(){return '0000000'.repeat(1024)}
function normalizeAvatar(data){
 if(typeof data!=='string')return defaultSprite();
 if(/^[0-4]{1024}$/.test(data))return [...data].map(n=>n==='0'?'0000000':'1'+legacyColors[Number(n)].slice(1)).join('');
 return /^(?:0[0-9a-f]{6}|1[0-9a-f]{6}){1024}$/i.test(data)?data.toLowerCase():defaultSprite()
}
let avatar;try{avatar=localStorage.getItem('b100-avatar')}catch{}avatar=normalizeAvatar(avatar);
function sprite(data){
 data=normalizeAvatar(data);if(cache.has(data))return cache.get(data);
 const c=document.createElement('canvas');c.width=c.height=32;
 const x=c.getContext('2d'),im=x.createImageData(32,32);
 for(let i=0;i<1024;i++){const p=data.slice(i*7,i*7+7);if(p[0]==='0')continue;const n=parseInt(p.slice(1),16);im.data.set([(n>>16)&255,(n>>8)&255,n&255,255],i*4)}
 x.putImageData(im,0,0);if(cache.size>32)cache.clear();cache.set(data,c);return c
}
function connect(type){$('error').textContent='';const code=$('code').value.trim().toUpperCase();if(type==='join'&&code.length!==5){$('error').textContent='Enter a five-character code.';return}ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);ws.onopen=()=>{ws.send(JSON.stringify({type,name:$('name').value.trim()||'PLAYER',code,avatar}));$('status').textContent='● CONNECTED'};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='error'){$('error').textContent=m.message;ws.close()}if(m.type==='welcome'){id=m.id;$('landing').hidden=true;$('game').hidden=false}if(m.type==='state'){if(!room||room.level!==m.level||room.started!==m.started){px=null;py=null;$('hintText').hidden=true}room=m;const self=room.players.find(p=>p.id===id);if(self&&self.avatar!==avatar){self.avatar=avatar}ui()}};ws.onclose=()=>{$('status').textContent='● OFFLINE';if(room){$('completed').hidden=false;$('completed').querySelector('h2').textContent='DISCONNECTED';$('next').hidden=true;$('waiting').hidden=false;$('waiting').textContent='Refresh to reconnect.'}};ws.onerror=()=>{$('error').textContent='Server unavailable. Open the hosted Node.js game URL.'}}
$('create').onclick=()=>connect('create');$('join').onclick=()=>connect('join');$('code').oninput=e=>e.target.value=e.target.value.toUpperCase();$('copy').onclick=()=>{if(room)navigator.clipboard?.writeText(room.code)};$('start').onclick=()=>ws?.send(JSON.stringify({type:'start'}));$('hardcoreMode').onchange=e=>ws?.send(JSON.stringify({type:'mode',hardcore:e.target.checked}));$('next').onclick=()=>ws?.send(JSON.stringify({type:'next'}));$('reset').onclick=()=>ws?.send(JSON.stringify({type:'reset'}));$('skip')?.addEventListener('click',()=>ws?.send(JSON.stringify({type:'skip'})));$('hint').onclick=()=>{$('hintText').hidden=!$('hintText').hidden};
function ui(){$('sectionTag').textContent=room.started?(room.hardcore?'HARDCORE / ':'')+'CHAMBER '+String(room.level).padStart(3,'0')+' / 050':'LOBBY / PREPARATION';$('title').textContent=room.started?room.layout.name:'THE LOCKER ROOM';$('copy').textContent='LOBBY '+room.code+' ⧉';$('count').textContent=room.players.length+'/4';$('players').replaceChildren();room.players.forEach(p=>{const el=document.createElement('div');el.className='player';const icon=document.createElement('canvas');icon.width=icon.height=32;icon.className='swatch';icon.getContext('2d').drawImage(sprite(p.avatar),0,0);const name=document.createElement('span');name.textContent=p.name;const tag=document.createElement('small');tag.textContent=p.id===room.host?'HOST':p.id===id?'YOU':'';el.append(icon,name,tag);$('players').append(el)});$('hardcoreMode').checked=!!room.hardcore;$('hardcoreMode').disabled=room.host!==id;$('lobbyControls').hidden=room.started;$('puzzleControls').hidden=!room.started;$('start').hidden=room.host!==id;$('start').disabled=room.players.length<2&&!room.canSkip;$('startNote').textContent=room.host===id?(room.canSkip?'Quay mode: solo play and room skipping enabled.':'At least two players must join before starting.'):'Waiting for host to start the experiment.';$('plates').textContent=room.active.map((a,i)=>(a?'●':'○')+' PLATE 0'+(i+1)).join('  /  ');$('hintText').textContent=(room.layout.hint||'Complete the chamber objectives.')+'  /  LEVERS '+room.leverStep+'/'+(room.layout.levers?.length||0)+'  /  TOKENS '+room.tokenStep+'/'+(room.layout.tokens?.length||0)+'  /  ORDER '+room.progress+'/'+room.layout.plates.length;$('completed').hidden=!room.solved;$('next').hidden=room.host!==id;$('waiting').hidden=room.host===id;$('reset').disabled=room.host!==id;const skip=$('skip');if(skip)skip.hidden=!room.canSkip||!room.started}
const palette=$('palette');
for(const hex of legacyColors.slice(1)){const b=document.createElement('button');b.className='ink';b.style.background=hex;b.title=hex;b.onclick=()=>setInk(hex);palette.append(b)}
function setInk(hex){ink=hex.toLowerCase();$('colorPicker').value=ink;$('currentColor').style.background=ink;[...palette.children].forEach(b=>b.classList.toggle('selected',b.title.toLowerCase()===ink));if(tool==='eraser')setTool('brush')}
function setTool(next){tool=next;for(const [name,id] of [['brush','brushTool'],['fill','fillTool'],['replace','replaceTool'],['eraser','eraser']])$(id).classList.toggle('selected',name===tool)}
$('colorPicker').oninput=e=>setInk(e.target.value);
$('brushTool').onclick=()=>setTool('brush');$('fillTool').onclick=()=>setTool('fill');$('replaceTool').onclick=()=>setTool('replace');$('eraser').onclick=()=>setTool('eraser');
setInk(ink);setTool('brush');
function drawEditor(){pc.clearRect(0,0,320,320);pc.fillStyle='#3c3d3e';pc.fillRect(0,0,320,320);pc.imageSmoothingEnabled=false;pc.drawImage(sprite(avatar),0,0,320,320);pc.strokeStyle='#ffffff12';pc.lineWidth=1;for(let i=0;i<=32;i++){pc.beginPath();pc.moveTo(i*10,0);pc.lineTo(i*10,320);pc.moveTo(0,i*10);pc.lineTo(320,i*10);pc.stroke()}}
$('preDraw').onclick=()=>{$('editor').hidden=false;drawEditor()};$('editAvatar').onclick=()=>{$('editor').hidden=false;drawEditor()};$('closeEditor').onclick=()=>{$('editor').hidden=true};
$('clear').onclick=()=>{avatar=defaultSprite();drawEditor()};
$('saveAvatar').onclick=()=>{try{localStorage.setItem('b100-avatar',avatar)}catch{}if(ws?.readyState===1)ws.send(JSON.stringify({type:'avatar',avatar}));if(room){const me=room.players.find(p=>p.id===id);if(me)me.avatar=avatar;ui()}$('editor').hidden=true};
function paintAt(e){
 const r=paint.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*32),y=Math.floor((e.clientY-r.top)/r.height*32);
 if(x<0||x>31||y<0||y>31)return;
 const idx=y*32+x,next=tool==='eraser'?'0000000':'1'+ink.slice(1);
 const cells=avatar.match(/.{7}/g),old=cells[idx];
 if(tool==='fill'){
  if(old===next)return;
  const stack=[idx],seen=new Uint8Array(1024);
  while(stack.length){const k=stack.pop();if(k<0||k>=1024||seen[k]||cells[k]!==old)continue;seen[k]=1;cells[k]=next;const cx=k%32;if(cx>0)stack.push(k-1);if(cx<31)stack.push(k+1);if(k>=32)stack.push(k-32);if(k<992)stack.push(k+32)}
 }else if(tool==='replace'){if(old===next)return;for(let i=0;i<1024;i++)if(cells[i]===old)cells[i]=next}
 else cells[idx]=next;
 avatar=cells.join('');drawEditor()
}
paint.addEventListener('pointerdown',e=>{drag=true;paint.setPointerCapture(e.pointerId);paintAt(e)});paint.addEventListener('pointermove',e=>{if(drag&&(tool==='brush'||tool==='eraser'))paintAt(e)});paint.addEventListener('pointerup',()=>drag=false);paint.addEventListener('pointercancel',()=>drag=false);
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)||!$('editor').hidden)return;const k=e.key.toLowerCase();if(k.startsWith('arrow'))e.preventDefault();keys.add(k)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
function blocked(x,y){return x<1.16||x>(room.started?room.layout.maxX+1-.16:13.84)||y<1.16||y>(room.started?room.layout.maxY+1-.16:7.84)||(room.started&&room.layout.walls.some(([a,b])=>Math.pow(x-Math.max(a,Math.min(x,a+1)),2)+Math.pow(y-Math.max(b,Math.min(y,b+1)),2)<.16*.16))}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!room)return;const me=room.players.find(p=>p.id===id);if(!me)return;if(px===null){px=me.x;py=me.y}let dx=deviceMode==='mobile'?joyX:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=deviceMode==='mobile'?joyY:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));if((dx||dy)&&$('editor').hidden&&$('deviceChoice').hidden){const l=Math.hypot(dx,dy);dx/=l;dy/=l;const step=3.75*dt*(deviceMode==='mobile'?Math.min(1,Math.hypot(joyX,joyY)):1);if(!blocked(px+dx*step,py))px+=dx*step;if(!blocked(px,py+dy*step))py+=dy*step;if(now-lastSend>32&&ws?.readyState===1){ws.send(JSON.stringify({type:'move',x:px,y:py}));lastSend=now}}draw()}requestAnimationFrame(frame);
function draw(){ctx.fillStyle='#18191a';ctx.fillRect(0,0,1120,640);const g=ctx.createRadialGradient(560,310,30,560,310,660);g.addColorStop(0,'#414243');g.addColorStop(1,'#171819');ctx.fillStyle=g;ctx.fillRect(0,0,1120,640);ctx.save();const blind=room.started&&room.layout.blind,expanded=room.started&&room.level>16;
const mapW=room.started?room.layout.maxX+1:13,mapH=room.started?room.layout.maxY+1:8;
const fullFit=Math.min(1,(canvas.width-36)/(mapW*T),(canvas.height-36)/(mapH*T));
const zoom=room.started?Math.min(1,Math.max(fullFit,room.hardcore?.70:expanded?.78:1)):1;
const viewW=canvas.width/zoom,viewH=canvas.height/zoom;
const worldW=mapW*T,worldH=mapH*T;
const focusX=(px??2.5)*T,focusY=(py??4.5)*T;
const camX=worldW<=viewW?(viewW-worldW)/2:-Math.max(0,Math.min(worldW-viewW,focusX-viewW/2));
const camY=worldH<=viewH?(viewH-worldH)/2:-Math.max(0,Math.min(worldH-viewH,focusY-viewH/2));ctx.scale(zoom,zoom);ctx.translate(camX,camY);for(let y=1;y<=(room.started?room.layout.maxY:7);y++)for(let x=1;x<=(room.started?room.layout.maxX+1:13);x++){ctx.fillStyle=(x+y)%2?'#292a2b':'#303132';ctx.fillRect(x*T,y*T,T-2,T-2);}ctx.fillStyle='#171819';ctx.fillRect(T-9,T-9,(room.started?room.layout.maxX:12)*T+18,9);ctx.fillRect(T-9,(room.started?room.layout.maxY+1:8)*T,(room.started?room.layout.maxX:12)*T+18,9);
if(!room.started){for(let x=2;x<=12;x+=2){ctx.fillStyle='#555655';ctx.fillRect(x*T+6,T+7,T-12,17);ctx.fillStyle='#343536';ctx.fillRect(x*T+10,T+25,T-20,34);ctx.strokeStyle='#797a76';ctx.lineWidth=2;ctx.strokeRect(x*T+10,T+25,T-20,34);ctx.fillStyle='#b2b1ac';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('L'+String(x/2).padStart(2,'0'),(x+.5)*T,T+18)}ctx.fillStyle='#dedbd2';ctx.fillRect(6*T,6.8*T,2*T,8);ctx.fillStyle='#b5b5af';ctx.font='13px monospace';ctx.textAlign='center';ctx.fillText('WAITING AREA  /  CHARACTER LOCKERS',7.5*T,3*T)}
else{ctx.fillStyle=room.solved?'#e5e3dd':'#686966';ctx.fillRect((room.layout.maxX+1)*T+1,3.25*T,12,1.5*T);room.layout.walls.forEach(([x,y])=>{ctx.fillStyle='#686868';ctx.fillRect(x*T,y*T,T,T)});if(room.layout.requirements?.includes('reverse')&&room.reverseStep<room.layout.levers.length&&room.leverStep===room.layout.levers.length){const next=room.layout.order[room.layout.order.length-1-room.reverseStep];const p=room.layout.levers[next];if(p){ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.strokeRect(p[0]*T+7,p[1]*T+7,T-14,T-14)}}
if(room.layout.beacon){const [x,y]=room.layout.beacon;ctx.strokeStyle=room.beaconDone?'#fff':'#aaa';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo((x+.5)*T,(y+.12)*T);ctx.lineTo((x+.88)*T,(y+.5)*T);ctx.lineTo((x+.5)*T,(y+.88)*T);ctx.lineTo((x+.12)*T,(y+.5)*T);ctx.closePath();ctx.stroke();ctx.fillStyle='#ddd';ctx.fillRect(x*T+13,(y+.83)*T,46*Math.min(1,(room.beaconCharge||0)/2200),5)}
if(room.layout.syncPads?.length)room.layout.syncPads.forEach(([x,y],k)=>{ctx.strokeStyle=room.syncDone?'#fff':'#bbb';ctx.lineWidth=4;ctx.beginPath();for(let n=0;n<6;n++){const a=Math.PI*n/3,xx=(x+.5)*T+25*Math.cos(a),yy=(y+.5)*T+25*Math.sin(a);if(n===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.closePath();ctx.stroke();ctx.fillStyle='#eee';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText('S'+(k+1),(x+.5)*T,(y+.58)*T)});
if(room.layout.chainPads?.length)room.layout.chainPads.forEach(([x,y],k)=>{ctx.strokeStyle=k===room.chainStep?'#fff':'#777';ctx.lineWidth=4;ctx.strokeRect(x*T+15,y*T+15,42,42);ctx.fillStyle='#eee';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText('C'+(k+1),(x+.5)*T,(y+.58)*T)});
if(room.layout.levers?.length){room.layout.levers.forEach(([a,b],k)=>{ctx.fillStyle=k===(room.leverStep<room.layout.levers.length?room.layout.order[room.leverStep]:room.layout.requirements.includes('reverse')?room.layout.order[room.layout.order.length-1-room.reverseStep]:-1)?'#eee':'#777';ctx.fillRect(a*T+19,b*T+19,T-38,T-38);ctx.fillStyle='#171819';ctx.font='bold 18px monospace';ctx.fillText(String(room.layout.order.indexOf(k)+1),(a+.5)*T,(b+.59)*T)})}if(room.layout.tokens?.length){room.layout.tokens.forEach(([a,b],k)=>{ctx.fillStyle=k===room.layout.tokenOrder[room.tokenStep]?'#eee':'#888';ctx.fillRect(a*T+20,b*T+20,32,32);ctx.fillStyle='#222';ctx.font='bold 16px monospace';ctx.fillText(String(room.layout.tokenOrder.indexOf(k)+1),(a+.5)*T,(b+.57)*T)})}if(room.layout.requirements?.includes('sequence')&&room.progress<room.layout.plates.length){const [a,b]=room.layout.plates[room.progress];ctx.strokeStyle='#d7d7d7';ctx.lineWidth=3;ctx.strokeRect(a*T+9,b*T+9,T-18,T-18)}room.layout.plates.forEach(([x,y],i)=>{ctx.fillStyle=room.active[i]?'#e4e2dc':'#555657';ctx.fillRect(x*T+11,y*T+11,T-22,T-22);ctx.fillStyle=room.active[i]?'#c7c6bf':'#343535';ctx.fillRect(x*T+19,y*T+19,T-38,T-38);ctx.fillStyle='#eee';ctx.font='bold 14px monospace';ctx.textAlign='center';ctx.fillText(String(i+1),(x+.5)*T,(y+.59)*T);})}
room.players.forEach(p=>{const x=(p.id===id?px:p.x)*T,y=(p.id===id?py:p.y)*T;ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(x,y+20,23,9,0,0,Math.PI*2);ctx.fill();ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite(p.avatar),x-27,y-34,54,54);if(p.id===id){ctx.fillStyle='#d8d6d0';ctx.fillRect(x-15,y+23,30,2)}ctx.fillStyle='#f0eee9';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(p.name.toUpperCase(),x,y-44)});ctx.restore();if(blind){const light=ctx.createRadialGradient(560,320,55,560,320,235);light.addColorStop(0,'rgba(0,0,0,0)');light.addColorStop(.55,'rgba(0,0,0,.18)');light.addColorStop(1,'rgba(0,0,0,.985)');ctx.fillStyle=light;ctx.fillRect(0,0,1120,640)}ctx.fillStyle='#b1b2ad';ctx.font='12px monospace';ctx.textAlign='right';ctx.fillText(!room.started?'WAITING FOR HOST TO BEGIN':room.players.length<2&&!room.solo?'WAITING FOR ANOTHER PLAYER':room.layout.mechanic==='timer'?'RELAY '+(room.remaining/1000).toFixed(1)+'s':room.layout.mechanic==='sequence'?'ORDER '+room.progress+'/2':room.layout.mechanic==='keys'&&!room.key?'TOKEN MISSING':'COOPERATE TO UNLOCK',1090,610)}