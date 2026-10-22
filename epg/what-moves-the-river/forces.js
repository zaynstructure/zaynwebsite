/* force visuals for "what moves the river". unchanged from the handoff,
   reads --paper, --ink and --ink2 from the page */
/* ---------- force visual engine ---------- */
(function(){
const N=160,X1=10,dx=X1/(N-1),dt=0.004,CYCLE=6.5;
const xs=Array.from({length:N},(_,i)=>i*dx);
function gb(c,w,a){return Float64Array.from(xs,x=>a*Math.exp(-Math.pow((x-c)/w,2)));}
const KR=12,ker=[];{let ks=0;for(let j=-KR;j<=KR;j++){const e=Math.exp(-Math.pow(j*dx/0.3,2));ker.push(e);ks+=e*e;}for(let j=0;j<ker.length;j++)ker[j]/=Math.sqrt(ks);}
function gauss(){let a=0,b=0;while(a===0)a=Math.random();while(b===0)b=Math.random();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b);}
const raw=new Float64Array(N+2*KR),xi=new Float64Array(N);
function smoothNoise(){for(let j=0;j<raw.length;j++)raw[j]=gauss();for(let i=0;i<N;i++){let s=0;for(let j=0;j<ker.length;j++)s+=ker[j]*raw[i+j];xi[i]=s;}}
const BX=6.5,BW=0.8,US=1.0,basin=gb(BX,BW,1);
const SETTLED=new Float64Array(N);for(let t=0;t<2000;t++)for(let i=0;i<N;i++)SETTLED[i]+=dt*(-1.0*basin[i]*Math.tanh(SETTLED[i]-US));

/* one entry per force: init() sets the starting line, step() applies only that force */
const FORCES={
 settling:{aria:'A single bump on a flat line, shrinking back down to the baseline, then reappearing',
  init(){return gb(5,0.6,1.4);},
  step(s){for(let i=0;i<N;i++)s.u[i]-=dt*0.6*s.u[i];}},
 spreading:{aria:'A narrow spike flattening and widening outward into a low hump, then reappearing',
  init(){return gb(5,0.2,1.5);},
  step(s){const u=s.u,n=new Float64Array(N);for(let i=0;i<N;i++){const a=u[i>0?i-1:1],b=u[i<N-1?i+1:N-2];n[i]=u[i]+dt*0.15*(a-2*u[i]+b)/(dx*dx);}s.u=n;}},
 direction:{aria:'A hump sliding steadily from left to right across the line, then starting over',
  init(s){s.p=1.5;return gb(1.5,0.5,1.1);},
  step(s){s.p+=dt*1.2;s.u=gb(s.p,0.5,1.1);}},
 attractor:{aria:'A hump sitting at a dashed target level inside one region. Each loop it is knocked above or below that level and drawn back to it, fastest at the centre. A shaded band under the line shows the pull is strongest in the middle and fades toward the edges',
  init(s){s.cyc=(s.cyc||0)+1;const up=s.cyc%2===1,b=gb(BX,0.45,up?0.9:-0.8);return Float64Array.from(SETTLED,(v,i)=>v+b[i]);},
  step(s){for(let i=0;i<N;i++)s.u[i]+=dt*(-1.0*basin[i]*Math.tanh(s.u[i]-US));},mark:true},
 volatility:{aria:'A line jostling up and down at random along its length, with no overall shape, starting flat each cycle',
  init(){return new Float64Array(N);},
  step(s){smoothNoise();for(let i=0;i<N;i++)s.u[i]+=0.18*Math.sqrt(dt)*xi[i];},signed:true}
};

let seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
const dots=[];for(let j=0;j<2000;j++)dots.push([rnd(),rnd(),rnd()]);
const ROWS=140,ROWEVERY=3,GN=3,GEVERY=22;
const FONT='10px "Helvetica Neue", Helvetica, Arial, sans-serif';

const sims=[];
document.querySelectorAll('.force-viz[data-force]').forEach(el=>{
 const id=el.dataset.force,f=FORCES[id];if(!f)return;
 const lv=document.createElement('canvas');lv.className='live';lv.setAttribute('role','img');lv.setAttribute('aria-label',f.aria);
 const hv=document.createElement('canvas');hv.className='hist';hv.setAttribute('role','img');hv.setAttribute('aria-label','The '+id+' line over time, drawn as terrain: position runs across, newest time at the top, shading shows activation');
 const lg=document.createElement('div');lg.className='legend';lg.innerHTML='<span>history, newest at top</span><span>reference line · 0.45</span>';
 el.append(lv,hv,lg);
 const s={f,el,lv,lc:lv.getContext('2d'),hv,hc:hv.getContext('2d'),T:0,t:0,ghosts:[],hist:[],himg:null,hw:0,hh:0,visible:false};
 s.u=f.init(s);sims.push(s);});

function v(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function hexrgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function uAt(arr,fx){const p=fx*(N-1),i=Math.min(N-2,Math.floor(p)),a=p-i;return arr[i]*(1-a)+arr[i+1]*a;}

function tick(s){for(let k=0;k<4;k++){s.f.step(s);s.T+=dt;if(s.T>=CYCLE){s.T=0;s.u=s.f.init(s);s.ghosts=[];}}
 s.t++;if(s.t%GEVERY===0){s.ghosts.push(s.u.slice());if(s.ghosts.length>GN)s.ghosts.shift();}
 if(s.t%ROWEVERY===0){s.hist.push(s.u.slice());if(s.hist.length>ROWS)s.hist.shift();return true;}return false;}

function drawLive(s,C){const cv=s.lv,ctx=s.lc,d=window.devicePixelRatio||1,r=cv.getBoundingClientRect();
 const pw=Math.round(r.width*d),ph=Math.round(r.height*d);if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph;}
 ctx.setTransform(d,0,0,d,0,0);
 const W=r.width,H=r.height,base=H*(s.f.signed?0.55:0.8),sc=H*0.42;ctx.clearRect(0,0,W,H);
 ctx.strokeStyle='rgba('+C.ink2+',0.45)';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(0,base);ctx.lineTo(W,base);ctx.stroke();ctx.setLineDash([]);
 if(s.f.mark){const x0=(BX-BW*0.83)/X1*W,x1=(BX+BW*0.83)/X1*W,y=base-US*sc;ctx.strokeStyle='rgba('+C.ink2+',0.8)';ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();ctx.setLineDash([]);
  ctx.font=FONT;ctx.fillStyle='rgba('+C.ink2+',0.85)';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('basin level',(x0+x1)/2,y-3);}
 if(s.f.mark){const bh=H-base-1;for(let i=0;i<N-1;i++){const a=basin[i];if(a<0.02)continue;ctx.fillStyle='rgba('+C.ink2+','+(0.35*a).toFixed(3)+')';const x=i/(N-1)*W;ctx.fillRect(x,base+1,W/(N-1)+0.6,bh);}
  ctx.font=FONT;ctx.fillStyle='rgba('+C.ink2+',0.85)';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('pull strength',8,base+(H-base)/2);}
 ctx.fillStyle=C.ink;
 for(const dd of dots){const x=dd[0]*W,uu=uAt(s.u,dd[0]),top=base-uu*sc;const lo=Math.min(base,top),hi=Math.max(base,top);
  if(hi-lo>1.5){const y=lo+dd[1]*(hi-lo);const al=Math.max(0,Math.min(1,(Math.min(1,Math.abs(uu)*0.9+0.15)-dd[2])*6));if(al>0){ctx.globalAlpha=al;ctx.fillRect(x,y,1.1,1.1);}}}
 ctx.globalAlpha=1;
 function path(arr){ctx.beginPath();for(let i=0;i<N;i++){const y=base-arr[i]*sc,x=i/(N-1)*W;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}}
 for(let j=0;j<s.ghosts.length;j++){ctx.strokeStyle='rgba('+C.ink2+','+(0.12+0.18*(j+1)/(GN+1)).toFixed(3)+')';ctx.lineWidth=1;path(s.ghosts[j]);ctx.stroke();}
 ctx.strokeStyle=C.ink;ctx.lineWidth=1.3;ctx.lineJoin='round';path(s.u);ctx.stroke();
 ctx.font=FONT;ctx.fillStyle='rgba('+C.ink2+',0.85)';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText('live',W-8,7);}

const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(b=>(b+0.5)/16);
function hsh(x,y){let h=(x*374761393+y*668265263)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296;}
function renderHist(s,C){const hv=s.hv,b=hv.getBoundingClientRect();const W=Math.max(1,Math.round(b.width)),H=Math.max(1,Math.round(b.height));
 if(W!==s.hw||H!==s.hh){s.hw=W;s.hh=H;hv.width=W;hv.height=H;s.himg=s.hc.createImageData(W,H);}
 const P=C.P,I=C.I,d=s.himg.data,hist=s.hist,R=hist.length,sg=s.f.signed;
 const U=new Float32Array(W*H),B=new Int8Array(W*H);
 for(let y=0;y<H;y++){const fk=y/(H-1)*(ROWS-1),k0=Math.floor(fk),k1=Math.min(ROWS-1,k0+1),ak=fk-k0;const r0=hist[R-1-k0],r1=hist[R-1-k1];
  for(let x=0;x<W;x++){const fi=x/(W-1)*(N-1),i0=Math.floor(fi),i1=Math.min(N-1,i0+1),ai=fi-i0;let u=NaN;
   if(r0&&r1){const a0=r0[i0]*(1-ai)+r0[i1]*ai,a1=r1[i0]*(1-ai)+r1[i1]*ai;u=a0*(1-ak)+a1*ak;if(sg)u=Math.abs(u);}
   U[y*W+x]=u;B[y*W+x]=isNaN(u)?-1:(u>=0.45?1:0);}}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x,o=p*4,u=U[p];let a=0;
  if(!isNaN(u)){const sv=Math.max(0,Math.min(1,u/1.2));a=Math.pow(sv,0.85)*0.25;if(hsh(x,y)<sv*0.3)a=0.85;
   const sd=Math.max(0,Math.min(1,(u-0.3)/0.7));if(sd>BAY[((y>>1)%4)*4+((x>>1)%4)])a=0.92;
   const bb=B[p];if((x<W-1&&B[p+1]>=0&&B[p+1]!==bb)||(y<H-1&&B[p+W]>=0&&B[p+W]!==bb))a=1;}
  d[o]=P[0]+(I[0]-P[0])*a;d[o+1]=P[1]+(I[1]-P[1])*a;d[o+2]=P[2]+(I[2]-P[2])*a;d[o+3]=255;}
 s.hc.putImageData(s.himg,0,0);}

function colors(){return {ink:v('--ink'),ink2:v('--ink2'),P:hexrgb(v('--paper')),I:hexrgb(v('--ink'))};}
for(const s of sims)for(let f=0;f<ROWS*ROWEVERY;f++)tick(s);
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawAll(advance){const C=colors();for(const s of sims){if(advance&&!s.visible)continue;const row=advance?tick(s):true;drawLive(s,C);if(row)renderHist(s,C);}}
if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{for(const e of es){const s=sims.find(q=>q.el===e.target);if(s)s.visible=e.isIntersecting;}},{rootMargin:'100px'});sims.forEach(s=>io.observe(s.el));}
else sims.forEach(s=>s.visible=true);
drawAll(false);
if(reduce){window.addEventListener('resize',()=>drawAll(false));}
else{(function loop(){drawAll(true);requestAnimationFrame(loop);})();}
})();
