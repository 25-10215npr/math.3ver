const sim = document.getElementById("sim");
const graph = document.getElementById("graph");
const ctx = sim.getContext("2d");
const gctx = graph.getContext("2d");

const gInput = document.getElementById("g");
const v0Input = document.getElementById("v0");
const simZoomInput = document.getElementById("simZoom");
const graphZoomInput = document.getElementById("graphZoom");

const gText = document.getElementById("gText");
const v0Text = document.getElementById("v0Text");
const simZoomText = document.getElementById("simZoomText");
const graphZoomText = document.getElementById("graphZoomText");

const followInput = document.getElementById("follow");
const autoGraphInput = document.getElementById("autoGraph");

const info = document.getElementById("info");

function resize(){
  sim.width = sim.clientWidth;
  sim.height = sim.clientHeight;
  graph.width = graph.clientWidth;
  graph.height = graph.clientHeight;
}
window.addEventListener("resize", resize);
resize();

function updateLabels(){
  gText.textContent = (+gInput.value).toFixed(1);
  v0Text.textContent = (+v0Input.value).toFixed(1);
  simZoomText.textContent = simZoomInput.value + "×";
  graphZoomText.textContent = graphZoomInput.value + "×";
}
[gInput,v0Input,simZoomInput,graphZoomInput].forEach(e=>e.addEventListener("input",updateLabels));
updateLabels();

let t=0,y=0,vy=0;
let history=[];
let camY=1;

document.getElementById("jumpBtn").onclick=()=>{
  if(y<=0) vy=parseFloat(v0Input.value);
};

document.getElementById("resetBtn").onclick=()=>{
  t=0;y=0;vy=0;history=[];
};

function step(dt){
  vy -= parseFloat(gInput.value)*dt;
  y += vy*dt;
  if(y<0){y=0;vy=0;}
  t+=dt;
  history.push({t,y});
  if(history.length>600) history.shift();
}

function drawSim(){
  ctx.clearRect(0,0,sim.width,sim.height);
  const scale=60*simZoomInput.value;
  const base=sim.height*0.8;
  ctx.fillStyle="#2f7cff";
  ctx.beginPath();
  ctx.arc(sim.width*0.3, base-y*scale, 16, 0, Math.PI*2);
  ctx.fill();
}

function drawGraph(){
  gctx.clearRect(0,0,graph.width,graph.height);
  if(history.length<2) return;
  gctx.strokeStyle="#22c55e";
  gctx.beginPath();
  history.forEach((p,i)=>{
    const x=i/history.length*graph.width;
    const yv=graph.height-(p.y*30);
    if(i===0) gctx.moveTo(x,yv);
    else gctx.lineTo(x,yv);
  });
  gctx.stroke();
}

const overlay=document.getElementById("startOverlay");
overlay.onclick=()=>overlay.style.display="none";

function loop(){
  step(0.016);
  drawSim();
  drawGraph();
  info.textContent=`t=${t.toFixed(2)} y=${y.toFixed(2)} vy=${vy.toFixed(2)}`;
  requestAnimationFrame(loop);
}
loop();
