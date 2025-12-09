(function(){

// ======================================================
//  SETUP
// ======================================================

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl", {alpha:false});
if(!gl){
  alert("WebGL not supported");
  return;
}

// Sidebar elements
const statusEl = document.getElementById("status");
const csEl     = document.getElementById("cs-label");

const btnReset = document.getElementById("btn-reset");
const btnPause = document.getElementById("btn-pause");

// Field parameters
const pKappa  = document.getElementById("p-kappa");
const pGamma  = document.getElementById("p-gamma");
const pLambda = document.getElementById("p-lambda");
const pUstar  = document.getElementById("p-ustar");
const pBasinR = document.getElementById("p-basinR");
const pRho    = document.getElementById("p-rho");
const pOmega  = document.getElementById("p-omega");

// Drift parameters
const pBeta   = document.getElementById("p-beta");
const pEta    = document.getElementById("p-eta");
const pChi    = document.getElementById("p-chi");
const pDelta  = document.getElementById("p-delta");
const pBx     = document.getElementById("p-bx");
const pBy     = document.getElementById("p-by");
const pCx     = document.getElementById("p-cx");
const pCy     = document.getElementById("p-cy");

// Noise parameters
const pSigma0 = document.getElementById("p-sigma0");
const pSigmaE = document.getElementById("p-sigmaE");

// Pause state
let paused = false;
btnPause.onclick = ()=>{
  paused = !paused;
  btnPause.textContent = paused ? "Resume" : "Pause";
};

// Resize
function resize(){
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth  || canvas.parentElement.clientWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  gl.viewport(0,0,canvas.width, canvas.height);
}
window.addEventListener("resize", resize);

// Compile shaders
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

// Load all programs
const progField  = makeProgram("vs-quad", "fs-field");
const progDrift  = makeProgram("vs-quad", "fs-drift");
const progRender = makeProgram("vs-quad", "fs-render");
if(!progField || !progDrift || !progRender){
  alert("Shader error"); return;
}

// Fullscreen quad
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1,-1,  1,-1, -1,1,
   1,-1,  1,1,  -1,1
]), gl.STATIC_DRAW);

// ======================================================
//  SIMULATION GRID
// ======================================================

const W = 128, H = 128;
const texel = [1/W, 1/H];

function makeTex(initial){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W,H, 0,
                gl.RGBA, gl.UNSIGNED_BYTE,
                initial || null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function initFieldData(){
  const a = new Uint8Array(W*H*4);
  for(let i=0;i<W*H;i++){
    const u = (Math.random()*0.2 - 0.1);
    a[i*4+0] = (0.5 + 0.5*u) * 255;
    a[i*4+1] = 0;
    a[i*4+2] = 0;
    a[i*4+3] = 255;
  }
  return a;
}

function initDriftData(){
  const a = new Uint8Array(W*H*4);
  for(let i=0;i<W*H;i++){
    a[i*4+0] = 128;  // Gx approx 0
    a[i*4+1] = 128;  // Gy approx 0
    a[i*4+2] = 0;
    a[i*4+3] = 255;
  }
  return a;
}

let texFieldA = makeTex(initFieldData());
let texFieldB = makeTex(null);

let texDriftA = makeTex(initDriftData());
let texDriftB = makeTex(null);

const fbo = gl.createFramebuffer();

// Reset
btnReset.onclick = ()=>{
  gl.bindTexture(gl.TEXTURE_2D, texFieldA);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,
                gl.RGBA,gl.UNSIGNED_BYTE, initFieldData());
  gl.bindTexture(gl.TEXTURE_2D, texDriftA);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,
                gl.RGBA,gl.UNSIGNED_BYTE, initDriftData());
  sigma0 = 0;
  sigma0Target = +pSigma0.value;
  sigmaEventTarget = +pSigmaE.value;
  eventOn = -1;
  eventOff = -1;
};

// ======================================================
//  NOISE MODEL  σ(t) = σ0 + σe(t)
// ======================================================

let sigma0 = 0.0;
let sigma0Target = +pSigma0.value;

let sigmaEventTarget = +pSigmaE.value;
let eventOn = -1, eventOff = -1;

const ADSR_A = 0.05;
const ADSR_D = 0.15;
const ADSR_S = 0.0;
const ADSR_R = 0.25;

const TAU_SIGMA0 = 1.5; // seconds

function adsr(t, on, off, A,D,S,R){
  if(on < 0) return 0;
  const tau = t - on;
  if(tau < 0) return 0;

  if(tau < A) return tau / A;
  if(tau < A+D) return 1 - (1-S)*((tau-A)/D);
  if(off < 0 || t < off) return S;

  return S * Math.exp(-(t-off)/R);
}

function updateSigma(time, dtPhys){
  sigma0Target = +pSigma0.value;

  const alpha = dtPhys / TAU_SIGMA0;
  sigma0 += alpha * (sigma0Target - sigma0);

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

  const env = adsr(time, eventOn, eventOff,
                   ADSR_A,ADSR_D,ADSR_S,ADSR_R);
  const sigmaE = env * sigmaEventTarget;

  return sigma0 + sigmaE;
}

// ======================================================
//  COHERENCE (SPATIAL ONLY Cs)
// ======================================================

const readBuf = new Uint8Array(W*H*4);

function computeCs(){
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, texFieldA,0);
  gl.readPixels(0,0,W,H, gl.RGBA, gl.UNSIGNED_BYTE, readBuf);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);

  let sumSq = 0;
  let count = 0;

  const idx=(x,y)=> (y*W + x)*4;

  for(let y=0;y<H;y++){
    const yU = (y+1)%H;
    const yD = (y-1+H)%H;
    for(let x=0;x<W;x++){
      const xR = (x+1)%W;
      const xL = (x-1+W)%W;

      const iC = idx(x,y);
      const iL = idx(xL,y);
      const iR = idx(xR,y);
      const iD = idx(x,yD);
      const iU = idx(x,yU);

      const uC = (readBuf[iC]/255 - 0.5)*2;
      const uL = (readBuf[iL]/255 - 0.5)*2;
      const uR = (readBuf[iR]/255 - 0.5)*2;
      const uD = (readBuf[iD]/255 - 0.5)*2;
      const uU = (readBuf[iU]/255 - 0.5)*2;

      const dux = 0.5*(uR - uL);
      const duy = 0.5*(uU - uD);

      sumSq += dux*dux + duy*duy;
      count++;
    }
  }

  const avg = sumSq / count;
  const Cs = Math.exp(-avg); // α_s = 1
  return Cs;
}

// ======================================================
//  MAIN SIMULATION LOOP
// ======================================================

let lastTime = 0;
let frame = 0;

resize();

function loop(tMs){
  requestAnimationFrame(loop);

  if(paused) return;

  const t = tMs * 0.001;
  const dtPhys = lastTime === 0 ? 0.016 :
                   Math.min(t - lastTime, 0.05);
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

  // CFL stability
  const h = 1.0 / W;
  const LA = 1.0;
  const denom = gamma + 8*kappa/(h*h) + lambda*LA;
  const dtCFL = 2.0 / Math.max(denom, 1e-4);

  const dt = Math.min(dtCFL, dtPhys, 0.02);

  // noise
  const sigmaTotal = updateSigma(t, dtPhys);

  // ----------------------
  // DRIFT PASS
  // ----------------------
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
  gl.uniform1i(gl.getUniformLocation(progDrift,"uField"), 0);

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

  // swap
  let tmp = texDriftA; texDriftA = texDriftB; texDriftB = tmp;

  // ----------------------
  // FIELD PASS
  // ----------------------
  gl.useProgram(progField);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, texFieldB,0);
  gl.viewport(0,0,W,H);

  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  loc = gl.getAttribLocation(progField,"aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texFieldA);
  gl.uniform1i(gl.getUniformLocation(progField,"uField"), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texDriftA);
  gl.uniform1i(gl.getUniformLocation(progField,"uDrift"), 1);

  gl.uniform1f(gl.getUniformLocation(progField,"uDT"), dt);
  gl.uniform1f(gl.getUniformLocation(progField,"uGamma"), gamma);
  gl.uniform1f(gl.getUniformLocation(progField,"uKappa"), kappa);
  gl.uniform1f(gl.getUniformLocation(progField,"uLambda"), lambda);
  gl.uniform1f(gl.getUniformLocation(progField,"uUstar"), ustar);
  gl.uniform1f(gl.getUniformLocation(progField,"uSigmaTotal"), sigmaTotal);

  gl.uniform1f(gl.getUniformLocation(progField,"uRho"), rho);
  gl.uniform1f(gl.getUniformLocation(progField,"uOmega"), omega);
  gl.uniform1f(gl.getUniformLocation(progField,"uTime"), t);

  gl.uniform1f(gl.getUniformLocation(progField,"uAlphaG"), 1.0);
  gl.uniform1f(gl.getUniformLocation(progField,"uFrame"), frame);

  gl.uniform2f(gl.getUniformLocation(progField,"uBasinCenter"), 0.5,0.5);
  gl.uniform1f(gl.getUniformLocation(progField,"uBasinRadius"), R);
  gl.uniform2f(gl.getUniformLocation(progField,"uTexel"), texel[0],texel[1]);

  gl.drawArrays(gl.TRIANGLES,0,6);

  // swap
  tmp = texFieldA; texFieldA = texFieldB; texFieldB = tmp;

  // ----------------------
  // COHERENCE
  // ----------------------
  if(frame % 16 === 0){
    const Cs = computeCs();
    csEl.textContent = "Cₛ ≈ " + Cs.toFixed(3);
  }

  // ----------------------
  // RENDER
  // ----------------------
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

  gl.drawArrays(gl.TRIANGLES, 0,6);

  statusEl.textContent =
    "dt ≈ " + dt.toFixed(4) +
    ", γ=" + gamma.toFixed(2) +
    ", κ=" + kappa.toFixed(2) +
    ", λ=" + lambda.toFixed(2);

  frame++;
}

requestAnimationFrame(loop);

})();
