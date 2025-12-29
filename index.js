const sim = document.getElementById("sim");
const graph = document.getElementById("graph");
const info = document.getElementById("info");

const gInput = document.getElementById("g");
const v0Input = document.getElementById("v0");
const simZoomInput = document.getElementById("simZoom");
const graphZoomInput = document.getElementById("graphZoom");
const followInput = document.getElementById("follow");
const autoGraphInput = document.getElementById("autoGraph");

const gText = document.getElementById("gText");
const v0Text = document.getElementById("v0Text");
const simZoomText = document.getElementById("simZoomText");
const graphZoomText = document.getElementById("graphZoomText");

const ctx = sim.getContext("2d");
const gctx = graph.getContext("2d");

function resize(){
  sim.width = sim.clientWidth;
  sim.height = sim.clientHeight;
  graph.width = graph.clientWidth;
  graph.height = graph.clientHeight;
}
window.addEventListener("resize", resize);
resize();

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function updateLabels(){
  gText.textContent = (+gInput.value).toFixed(1);
  v0Text.textContent = (+v0Input.value).toFixed(1);
  simZoomText.textContent = (+simZoomInput.value).toFixed(1) + "×";
  graphZoomText.textContent = (+graphZoomInput.value).toFixed(1) + "×";
}
[gInput, v0Input, simZoomInput, graphZoomInput].forEach(el => el.addEventListener("input", updateLabels));
updateLabels();

// ===== Simulation state =====
let t = 0;
let y = 0;
let vy = 0;

// store last 10s
let history = []; // {t, y}

// camera (center height)
let camCenterY = 1.2;

document.getElementById("jumpBtn").addEventListener("click", () => {
  if (y <= 1e-6) vy = parseFloat(v0Input.value);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  t = 0; y = 0; vy = 0;
  camCenterY = 1.2;
  history = [];
});

// nice step for axes
function niceStep(raw){
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  let m = 1;
  if(n < 1.5) m = 1;
  else if(n < 3.5) m = 2;
  else if(n < 7.5) m = 5;
  else m = 10;
  return m * p;
}

function stepPhysics(dt){
  const g = parseFloat(gInput.value);

  t += dt;
  vy -= g * dt;
  y += vy * dt;

  if(y < 0){ y = 0; if(vy < 0) vy = 0; }

  history.push({ t, y });
  const tMin = t - 10;
  while(history.length > 2 && history[0].t < tMin) history.shift();

  if(followInput.checked){
    const target = y + 0.8;
    camCenterY += (target - camCenterY) * 0.08;
    camCenterY = Math.max(camCenterY, 1.0);
  }
}

// ===== Draw simulation =====
function drawSim(){
  ctx.clearRect(0,0,sim.width,sim.height);

  // light background
  ctx.fillStyle = "rgba(10,20,40,0.02)";
  ctx.fillRect(0,0,sim.width,sim.height);

  const simZoom = parseFloat(simZoomInput.value);
  const baseScale = 60;   // px/m
  const scale = baseScale * simZoom;

  // put camera center around 45% of height
  const midPx = sim.height * 0.48;
  const worldToPxY = (worldY) => midPx - (worldY - camCenterY) * scale;

  // ground
  const groundY = worldToPxY(0);
  ctx.strokeStyle = "rgba(10,20,40,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(sim.width, groundY);
  ctx.stroke();

  // height grid lines + labels
  const stepM = niceStep(70 / scale);
  ctx.strokeStyle = "rgba(10,20,40,0.07)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(10,20,40,0.45)";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  const topWorld = camCenterY + (midPx/scale);
  const bottomWorld = camCenterY - ((sim.height-midPx)/scale);
  const start = Math.floor(bottomWorld/stepM)*stepM;

  for(let wm=start; wm<=topWorld+1e-9; wm+=stepM){
    const py = worldToPxY(wm);
    if(py<0 || py>sim.height) continue;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(sim.width, py);
    ctx.stroke();
    ctx.fillText(`${wm.toFixed(1)}m`, 12, py - 4);
  }

  // character
  const x = sim.width * 0.28;
  const yPx = worldToPxY(y);

  // shadow
  const shadow = clamp(1 - y/8, 0.25, 1);
  ctx.fillStyle = "rgba(10,20,40,0.12)";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 10, 26*shadow, 10*shadow, 0, 0, Math.PI*2);
  ctx.fill();

  // body
  ctx.fillStyle = "rgba(47,124,255,0.90)";
  ctx.beginPath();
  ctx.arc(x, yPx, 16, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = "rgba(10,20,40,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, yPx, 16, 0, Math.PI*2);
  ctx.stroke();

  // readout near character
  ctx.fillStyle = "rgba(10,20,40,0.65)";
  ctx.fillText(`y=${y.toFixed(2)}m`, x + 26, yPx - 6);
  ctx.fillText(`vy=${vy.toFixed(2)}m/s`, x + 26, yPx + 12);
}

// ===== Draw graph with axes =====
function drawGraph(){
  gctx.clearRect(0,0,graph.width,graph.height);

  // bg
  gctx.fillStyle = "rgba(10,20,40,0.02)";
  gctx.fillRect(0,0,graph.width,graph.height);

  if(history.length < 2) return;

  const padL = 56, padR = 18, padT = 18, padB = 40;
  const left = padL, right = graph.width - padR;
  const top = padT, bottom = graph.height - padB;

  // frame
  gctx.strokeStyle = "rgba(10,20,40,0.10)";
  gctx.lineWidth = 1;
  gctx.strokeRect(left, top, right-left, bottom-top);

  const t0 = history[0].t;
  const t1 = history[history.length-1].t;
  const tSpan = Math.max(0.0001, t1 - t0);

  let yMax = 1;
  for(const p of history) yMax = Math.max(yMax, p.y);

  const graphZoom = parseFloat(graphZoomInput.value);
  const baseMax = yMax * 1.15;
  const useMax = (autoGraphInput.checked ? baseMax : Math.max(2, baseMax)) / graphZoom;

  const xOfT = (tt)=> left + ((tt - t0)/tSpan) * (right-left);
  const yOfY = (yy)=> bottom - (yy / useMax) * (bottom-top);

  // grid + labels
  gctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  gctx.fillStyle = "rgba(10,20,40,0.55)";
  gctx.strokeStyle = "rgba(10,20,40,0.06)";
  gctx.lineWidth = 1;

  // t ticks
  const tStep = niceStep(tSpan / 5);
  const tStart = Math.ceil(t0 / tStep) * tStep;
  for(let tt=tStart; tt<=t1+1e-9; tt+=tStep){
    const x = xOfT(tt);
    gctx.beginPath(); gctx.moveTo(x, top); gctx.lineTo(x, bottom); gctx.stroke();
    gctx.fillText(tt.toFixed(1), x-10, bottom+18);
  }

  // y ticks
  const yStep = niceStep(useMax / 5);
  for(let yy=0; yy<=useMax+1e-9; yy+=yStep){
    const yp = yOfY(yy);
    gctx.beginPath(); gctx.moveTo(left, yp); gctx.lineTo(right, yp); gctx.stroke();
    gctx.fillText(yy.toFixed(1), 12, yp+4);
  }

  // axis labels
  gctx.fillStyle = "rgba(10,20,40,0.70)";
  gctx.fillText("y (m)", 12, 14);
  gctx.fillText("t (s)", right-36, graph.height-10);

  // line y(t)
  gctx.strokeStyle = "rgba(34,197,94,0.95)";
  gctx.lineWidth = 2.5;
  gctx.beginPath();
  for(let i=0;i<history.length;i++){
    const p = history[i];
    const x = xOfT(p.t);
    const yv = yOfY(p.y);
    if(i===0) gctx.moveTo(x,yv);
    else gctx.lineTo(x,yv);
  }
  gctx.stroke();

  // current dot
  const last = history[history.length-1];
  const cx = xOfT(last.t);
  const cy = yOfY(last.y);
  gctx.fillStyle = "rgba(47,124,255,0.95)";
  gctx.beginPath();
  gctx.arc(cx, cy, 4.5, 0, Math.PI*2);
  gctx.fill();
}

const startOverlay = document.getElementById("startOverlay");

startOverlay.addEventListener("click", () => {
  startOverlay.style.display = "none";
});

// ===== loop =====
function loop(){
  // physics fixed-step
  stepPhysics(0.016);

  drawSim();
  drawGraph();

  info.textContent = `t=${t.toFixed(2)}  y=${y.toFixed(2)}  vy=${vy.toFixed(2)}`;
  requestAnimationFrame(loop);
}

loop();
