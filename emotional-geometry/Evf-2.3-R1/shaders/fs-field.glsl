precision highp float;
precision mediump sampler2D;

varying highp vec2 vUV;

uniform sampler2D uField;
uniform sampler2D uDrift;

uniform float uDT;
uniform float uGamma;
uniform float uKappa;
uniform float uLambda;
uniform float uUstar;
uniform float uSigmaTotal;
uniform float uRho;
uniform float uOmega;
uniform float uTime;
uniform float uAlphaG;
uniform float uFrame;
uniform vec2  uBasinCenter;
uniform float uBasinRadius;
uniform vec2  uTexel;

float fastTanh(float x){
  float e2 = exp(2.0 * x);
  return (e2 - 1.0) / (e2 + 1.0);
}

float hash13(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float fetchU(vec2 uv){
  // avoid fract() on varyings (Chrome mobile bug)
  uv = clamp(uv, 0.001, 0.999);
  float v = texture2D(uField, uv).r;
  return (v - 0.5) * 2.0;  // decode [-1,1]
}

float basinWeight(vec2 uv, vec2 c, float R){
  vec2 d = uv - c;
  return exp(-dot(d, d) / (2.0 * R * R));
}

void main(){
  float uC = fetchU(vUV);
  float uL = fetchU(vUV + vec2(-uTexel.x, 0.0));
  float uR = fetchU(vUV + vec2( uTexel.x, 0.0));
  float uD = fetchU(vUV + vec2(0.0, -uTexel.y));
  float uU = fetchU(vUV + vec2(0.0,  uTexel.y));

  float lap = uL + uR + uD + uU - 4.0 * uC;

  float dux = 0.5 * (uR - uL);
  float duy = 0.5 * (uU - uD);

  // decode drift from [0,1] -> [-1,1]
  vec2 G = texture2D(uDrift, vUV).rg;
  G = (G - 0.5) * 2.0;

  float adv = G.x * dux + G.y * duy;

  float w = basinWeight(vUV, uBasinCenter, uBasinRadius);
  float attract = -uLambda * w * fastTanh(uC - uUstar);

  float rhs = -uGamma * uC
            + uKappa * lap
            + uAlphaG * adv
            + attract
            + uRho * sin(uOmega * uTime);

  float dt = max(uDT, 0.0);
  float eta = hash13(vec3(gl_FragCoord.xy, uFrame)) * 2.0 - 1.0;
  float uNext = clamp(uC + dt * rhs + uSigmaTotal * sqrt(dt) * eta,
                      -1.0, 1.0);

  // encode [-1,1] -> [0,1]
  gl_FragColor = vec4(0.5 + 0.5 * uNext, 0.0, 0.0, 1.0);
}
