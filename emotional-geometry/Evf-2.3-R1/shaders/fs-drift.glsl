precision highp float;
precision mediump sampler2D;

varying highp vec2 vUV;

uniform sampler2D uField;
uniform sampler2D uDrift;

uniform float uDT;
uniform float uBeta;
uniform float uEta;
uniform float uChi;
uniform float uDelta;

uniform vec2 uBehavior;
uniform vec2 uContext;
uniform vec2 uTexel;

float fetchU(vec2 uv){
  uv = clamp(uv, 0.001, 0.999);
  float v = texture2D(uField, uv).r;
  return (v - 0.5) * 2.0;
}

void main(){
  // decode drift from [0,1] -> [-1,1]
  vec2 G = (texture2D(uDrift, vUV).rg - 0.5) * 2.0;

  float uC = fetchU(vUV);
  float uL = fetchU(vUV + vec2(-uTexel.x, 0.0));
  float uR = fetchU(vUV + vec2( uTexel.x, 0.0));
  float uD = fetchU(vUV + vec2(0.0, -uTexel.y));
  float uU = fetchU(vUV + vec2(0.0,  uTexel.y));

  vec2 gradU = 0.5 * vec2(uR - uL, uU - uD);
  vec2 fieldBias = uC * gradU;

  vec2 dG = -uBeta * G
          + uEta * fieldBias
          + uChi * uBehavior
          + uDelta * uContext;

  vec2 Gnext = G + uDT * dG;

  float L = length(Gnext);
  if (L > 1.0) {
    Gnext = normalize(Gnext);
  }

  // re-encode to [0,1]
  vec2 outG = 0.5 + 0.5 * Gnext;
  gl_FragColor = vec4(outG, 0.0, 1.0);
}
