(function(){

// ======================================================
//  CONSTANTS
// ======================================================
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl", {alpha:false});
if (!gl) { alert("WebGL not supported."); return; }

const W = 128, H = 128;
const texel = [1/W, 1/H];

// UI elements
const statusEl = document.getElementById("status");
const csEl     = document.getElementById("cs-label");

const btnReset = document.getElementById("btn-reset");
const btnPause = document.getElementById("btn-pause");

// Sliders
const pKappa  = document.getElementById("p-kappa");
const pGamma  = document.getElementById("p-gamma");
const pLambda = document.getElementById("p-lambda");
const pUstar  = document.getElementById("p-ustar");
const pBasinR = document.getElementById("p-basinR");
const pRho    = document.getElementById("p-rho");
const pOmega  = document.getElementById("p-omega");

const pBeta   = document.getElementById("p-beta");
const pEta    = document.getElementById("p-eta");
const pChi    = document.getElementById("p-chi");
const pDelta  = document.getElementById("p-delta");
const pBx     = document.getElementById("p-bx");
const pBy     = document.getElementById("p-by");
const pCx     = document.getElementById("p-cx");
const pCy     = document.getElementById("p-cy");

const pSigma0 = document.getElementById("p-sigma0");
const pSigmaE = document.getElementById("p-sigmaE");

let paused = false;
btnPause.onclick = ()=>{
  paused = !paused;
  btnPause.textContent = paused ? "Resume" : "Pause";
};

// ======================================================
//  MOBILE TOUCH HANDLING — prevent unwanted zoom/pan
// ======================================================
document.addEventListener('touchmove', function(e){
  if (!e.target.closest('#sidebar')) e.preventDefault();
}, {passive:false});

document.addEventListener('touchstart', function(e){
  if (e.touches.length > 1) e.preventDefault();
}, {passive:false});

// ======================================================
//  GLSL HELPERS
// ======================================================
function compileShader(type, id){
  const src = document.getElementById(id).textContent;
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(s));
    console.log(src);
    return null;
  }
  return s;
}

function makeProgram(vsId, fsId){
  const vs = compileShader(gl.VERTEX_SHADER, vsId);
  const fs = compileShader(gl.FRAGMENT_SHADER, fsId);
  if(!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

const progField  = makeProgram("vs-quad","fs-field");
const progDrift  = makeProgram("vs-quad","fs-drift");
const progRender = makeProgram("vs-quad","fs-render");

if(!progField || !progDrift || !progRender){
  alert("Shader compile/link error.");
  return;
}

// ======================================================
//  GEOMETRY
// ======================================================
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1,-1, 1,-1, -1,1,
   1,-1, 1, 1, -1,1
]), gl.STATIC_DRAW);

// ======================================================
//  TEXTURE INITIALIZATION (Chrome-safe)
// ======================================================
function initFieldData(){
  const a = new Uint8Array(W*H*4);
  for(let i=0;i<W*H;i++){
    const u = Math.random()*0.2 - 0.1;   // small random around 0
    a[i*4] = (0.5 + 0.5*u) * 255;
    a[i*4+1] = 0;
    a[i*4+2] = 0;
    a[i*4+3] = 255;
  }
  return a;
}

function initDriftData(){
  const a = new Uint8Array(W*H*4);
  for(let i=0;i<W*H;i++){
    a[i*4]   = 128; // Gx
    a[i*4+1] = 128; // Gy
    a[i*4+2] = 0;
    a[i*4+3] = 255;
  }
  return a;
}

// Chrome-safe makeTex
function makeTex(data){
  const arr = data || new Uint8Array(W*H*4).fill(128);
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    W, H,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    arr
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return t;
}

// Initialize ALL textures with real data (Chrome requires this)
let texFieldA = makeTex(initFieldData());
let texFieldB = makeTex(initFieldData());
let texDriftA = makeTex(initDriftData());
let texDriftB = makeTex(initDriftData());

const fbo = gl.createFramebuffer();

// Reset
btnReset.onclick = () => {
  texFieldA = makeTex(initFieldData());
  texFieldB = makeTex(initFieldData());
  texDriftA = makeTex(initDriftData());
  texDriftB = makeTex(initDriftData());

  sigma0 = 0;
  sigma0Target = +pSigma0.value;
  sigmaEventTarget = +pSigmaE.value;
  eventOn = eventOff = -1;
};

// ======================================================
//  NOISE MODEL σ(t) = σ0 + σe(t)
// ======================================================
let sigma0 = 0.0;
let sigma0Target = +pSigma0.value;
let sigmaEventTarget = +pSigmaE.value;
let eventOn = -1, eventOff = -1;

const ADSR_A = 0.05;
const ADSR_D = 0.15;
const ADSR_S = 0.0;
const ADSR_R = 0.25;

const TAU_SIGMA0 = 1.5;

function adsr(t, on, off){
  if(on < 0) return 0;
  const tau = t - on;
  if(tau < 0) return 0;
  if(tau < ADSR_A) return tau / ADSR_A;
  if(tau < ADSR_A+ADSR_D)
    return 1 - (1-ADSR_S)*((tau-ADSR_A)/ADSR_D);
  if(off < 0 || t < off) return ADSR_S;
  return ADSR_S * Math.exp(-(t-off)/ADSR_R);
}

function updateSigma(time, dtPhys){
  sigma0Target = +pSigma0.value;
  sigma0 += (dtPhys/TAU_SIGMA0)*(sigma0Target - sigma0);

  const rawEvent = +pSigmaE.value;
  if(rawEvent !== sigmaEventTarget){
    if(rawEvent > sigmaEventTarget){
      eventOn = time;
      eventOff = -1;
    } else if(eventOn >= 0 && eventOff < 0){
      eventOff = time;
    }
    sigmaEventTarget = rawEvent;
  }

  const env = adsr(time, eventOn, eventOff);
  return sigma0 + env*sigmaEventTarget;
}

// ======================================================
//  COHERENCE (Cs only)
// ======================================================
const readBuf = new Uint8Array(W*H*4);

function computeCs(){
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, texFieldA,0);
  gl.readPixels(0,0,W,H, gl.RGBA, gl.UNSIGNED_BYTE, readBuf);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);

  let sum=0, count=0;

  const idx=(x,y)=>(y*W+x)*4;

  for(let y=0;y<H;y++){
    const yU=(y+1)%H, yD=(y-1+H)%H;
    for(let x=0;x<W;x++){
      const xR=(x+1)%W, xL=(x-1+W)%W;

      const iC=idx(x,y), iL=idx(xL,y), iR=idx(xR,y), iD=idx(x,yD), iU=idx(x,yU);

      const uC=(readBuf[iC]/255-0.5)*2;
      const uL=(readBuf[iL]/255-0.5)*2;
      const uR=(readBuf[iR]/255-0.5)*2;
      const uD=(readBuf[iD]/255-0.5)*2;
      const uU=(readBuf[iU]/255-0.5)*2;

      const dux=0.5*(uR-uL);
      const duy=0.5*(uU-uD);
      sum += dux*dux + duy*duy;
      count++;
    }
  }

  const avg = sum/count;
  return Math.exp(-avg);
}

// ======================================================
//  RESIZE (Chrome mobile safe)
// ======================================================
function resize(){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  let w = Math.max(1, Math.floor(rect.width));
  let h = Math.max(1, Math.floor(rect.height));

  // Chrome collapses flex sometimes → force fallback
  if (h < 10) {
    h = Math.floor(window.innerHeight * 0.6);
  }

  canvas.width  = w * dpr;
  canvas.height = h * dpr;

  gl.viewport(0,0,canvas.width,canvas.height);
}

window.addEventListener("resize", resize);

// ======================================================
//  MAIN LOOP
// ======================================================
let lastTime = 0;
let frame = 0;

// run resize AFTER layout settles
setTimeout(resize, 50);
requestAnimationFrame(() => resize());

function loop(tMs){
  requestAnimationFrame(loop);
  if(paused) return;

  const t = tMs * 0.001;
  const dtPhys = lastTime===0 ? 0.016 : Math.min(t-lastTime,0.05);
  lastTime = t;

  // Parameters
  const gamma  = +pGamma.value;
  const kappa  = +pKappa.value;
  const lambda = +pLambda.value;
  const ustar  = +pUstar.value;
  const R      = +pBasinR.value;
  const rho    = +pRho.value;
  const omega  = +pOmega.value;

  const beta   = +pBeta.value;
  const eta    = +pEta.value;
  const chi    = +pChi.value;
  const delta  = +pDelta.value;
  const bx     = +pBx.value;
  const by     = +pBy.value;
  const cx     = +pCx.value;
  const cy     = +pCy.value;

  // dt stability
  const denom = gamma + 8*kappa + lambda;
  const dtCFL = 2 / Math.max(denom,1e-4);
  const dt = Math.min(dtCFL, dtPhys, 0.02);

  const sigmaTotal = updateSigma(t, dtPhys);

  // -----------------------------
  // DRIFT PASS
  // -----------------------------
  gl.useProgram(progDrift);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, texDriftB,0);
  gl.viewport(0,0,W,H);

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  let loc = gl.getAttribLocation(progDrift,"aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texFieldA);
  gl.uniform1i(gl.getUniformLocation(progDrift,"uField"),0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texDriftA);
  gl.uniform1i(gl.getUniformLocation(progDrift,"uDrift"),1);

  gl.uniform1f(gl.getUniformLocation(progDrift,"uDT"), dt);
  gl.uniform1f(gl.getUniformLocation(progDrift,"uBeta"),  beta);
  gl.uniform1f(gl.getUniformLocation(progDrift,"uEta"),   eta);
  gl.uniform1f(gl.getUniformLocation(progDrift,"uChi"),   chi);
  gl.uniform1f(gl.getUniformLocation(progDrift,"uDelta"), delta);

  gl.uniform2f(gl.getUniformLocation(progDrift,"uBehavior"), bx,by);
  gl.uniform2f(gl.getUniformLocation(progDrift,"uContext"),  cx,cy);
  gl.uniform2f(gl.getUniformLocation(progDrift,"uTexel"), texel[0],texel[1]);

  gl.drawArrays(gl.TRIANGLES,0,6);

  let tmp = texDriftA; texDriftA = texDriftB; texDriftB = tmp;

  // -----------------------------
  // FIELD PASS
  // -----------------------------
  gl.useProgram(progField);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, texFieldB,0);

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  loc = gl.getAttribLocation(progField,"aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texFieldA);
  gl.uniform1i(gl.getUniformLocation(progField,"uField"),0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texDriftA);
  gl.uniform1i(gl.getUniformLocation(progField,"uDrift"),1);

  gl.uniform1f(gl.getUniformLocation(progField,"uDT"), dt);
  gl.uniform1f(gl.getUniformLocation(progField,"uGamma"), gamma);
  gl.uniform1f(gl.getUniformLocation(progField,"uKappa"), kappa);
  gl.uniform1f(gl.getUniformLocation(progField,"uLambda"), lambda);
  gl.uniform1f(gl.getUniformLocation(progField,"uUstar"), ustar);
  gl.uniform1f(gl.getUniformLocation(progField,"uSigmaTotal"), sigmaTotal);

  gl.uniform1f(gl.getUniformLocation(progField,"uRho"), rho);
  gl.uniform1f(gl.getUniformLocation(progField,"uOmega"), omega);
  gl.uniform1f(gl.getUniformLocation(progField,"uTime"), t);

  gl.uniform1f(gl.getUniformLocation(progField,"uAlphaG"),1.0);
  gl.uniform1f(gl.getUniformLocation(progField,"uFrame"), frame);

  gl.uniform2f(gl.getUniformLocation(progField,"uBasinCenter"), 0.5,0.5);
  gl.uniform1f(gl.getUniformLocation(progField,"uBasinRadius"), R);
  gl.uniform2f(gl.getUniformLocation(progField,"uTexel"), texel[0],texel[1]);

  gl.drawArrays(gl.TRIANGLES,0,6);

  tmp = texFieldA; texFieldA = texFieldB; texFieldB = tmp;

  // -----------------------------
  // COHERENCE
  // -----------------------------
  if(frame % 16 === 0){
    const Cs = computeCs();
    csEl.textContent = "Cₛ ≈ " + Cs.toFixed(3);
  }

  // -----------------------------
  // RENDER PASS
  // -----------------------------
  resize();  
  gl.useProgram(progRender);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,canvas.width, canvas.height);

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  loc = gl.getAttribLocation(progRender,"aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texFieldA);
  gl.uniform1i(gl.getUniformLocation(progRender,"uField"),0);

  gl.drawArrays(gl.TRIANGLES,0,6);

  statusEl.textContent =
    "dt ≈ " + dt.toFixed(4) +
    ", γ=" + gamma.toFixed(2) +
    ", κ=" + kappa.toFixed(2) +
    ", λ=" + lambda.toFixed(2);

  frame++;
}

requestAnimationFrame(loop);

})();
