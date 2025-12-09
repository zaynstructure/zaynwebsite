precision highp float;

varying vec2 vUV;

uniform sampler2D uField;

uniform float uDT;
uniform float uGamma;
uniform float uKappa;
uniform float uSigma;      // chronic + event, already combined in JS
uniform vec2  uG;           // drift field
uniform float uAlphaG;

uniform float uLambda;
uniform float uUstar;
uniform vec2  uBasinCenter;
uniform float uBasinRadius;

uniform float uRho;
uniform float uOmega;
uniform float uTime;

uniform float uFrame;
uniform vec2  uTexel;

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------

float fastTanh(float x){
    float e2 = exp(2.0*x);
    return (e2 - 1.0) / (e2 + 1.0);
}

// Stable hash noise: frame-dependent random
float hash13(vec3 p){
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
void main(){

    // Normalize to [-1,1]
    float vC = texture2D(uField, vUV).r;
    float uC = (vC - 0.5) * 2.0;

    // Neighbors
    float uL = (texture2D(uField, vUV + vec2(-uTexel.x,0)).r - 0.5) * 2.0;
    float uR = (texture2D(uField, vUV + vec2( uTexel.x,0)).r - 0.5) * 2.0;
    float uD = (texture2D(uField, vUV + vec2(0,-uTexel.y)).r - 0.5) * 2.0;
    float uU = (texture2D(uField, vUV + vec2(0, uTexel.y)).r - 0.5) * 2.0;

    // --------------------------------------------------------
    // PDE Terms
    // --------------------------------------------------------

    // Laplacian diffusion
    float lap = (uL + uR + uD + uU - 4.0 * uC);

    // Drift (advection)
    float du_dx = 0.5 * (uR - uL);
    float du_dy = 0.5 * (uU - uD);
    float adv = uG.x * du_dx + uG.y * du_dy;

    // Attractor potential
    vec2 d = vUV - uBasinCenter;
    float w = exp(-dot(d, d) / (2.0 * uBasinRadius * uBasinRadius));
    float attract = -uLambda * w * fastTanh(uC - uUstar);

    // Damping
    float damp = -uGamma * uC;

    // Rhythm (attenuated near extremes)
    float rhythm = uRho * sin(uOmega * uTime) * exp(-2.0 * abs(uC));

    // PDE right hand side
    float rhs = damp + uKappa * lap + uAlphaG * adv + attract + rhythm;

    // --------------------------------------------------------
    // Noise term (stable)
    // --------------------------------------------------------
    float eta = hash13(vec3(gl_FragCoord.xy, uFrame)) * 2.0 - 1.0;

    // sqrt(dt) scaling for stochastic stability
    float noiseTerm = uSigma * sqrt(max(uDT, 0.0)) * eta;

    // --------------------------------------------------------
    // Integrate
    // --------------------------------------------------------
    float uNext = uC + uDT * rhs + noiseTerm;

    // Clamp to [-1,1]
    uNext = clamp(uNext, -1.0, 1.0);

    // Back to [0,1]
    gl_FragColor = vec4(0.5 + 0.5 * uNext, 0, 0, 1);
}
