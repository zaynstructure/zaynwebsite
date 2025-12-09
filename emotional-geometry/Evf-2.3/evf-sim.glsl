precision highp float;

varying vec2 vUV;

uniform sampler2D uField;

uniform float uDT;
uniform float uGamma;
uniform float uKappa;
uniform float uSigma;      
uniform vec2  uG;          // drift vector
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

// ------------------------------------
// fastTanh — WebGL-safe tanh
// ------------------------------------
float fastTanh(float x){
    float e2 = exp(2.0*x);
    return (e2 - 1.0) / (e2 + 1.0);
}

// ------------------------------------
// hash13 — deterministic noise
// ------------------------------------
float hash13(vec3 p){
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

// ------------------------------------
// main simulation update
// ------------------------------------
void main(){
    // --- Read center value ---
    float vC = texture2D(uField, vUV).r;
    float uC = (vC - 0.5) * 2.0;

    // --- Neighbor samples ---
    float uL = (texture2D(uField, vUV + vec2(-uTexel.x, 0.0)).r - 0.5) * 2.0;
    float uR = (texture2D(uField, vUV + vec2( uTexel.x, 0.0)).r - 0.5) * 2.0;
    float uD = (texture2D(uField, vUV + vec2(0.0, -uTexel.y)).r - 0.5) * 2.0;
    float uU = (texture2D(uField, vUV + vec2(0.0,  uTexel.y)).r - 0.5) * 2.0;

    // --- Laplacian (diffusion) ---
    float lap = (uL + uR + uD + uU - 4.0 * uC);

    // --- Advection (drift) ---
    float du_dx = 0.5 * (uR - uL);
    float du_dy = 0.5 * (uU - uD);
    float adv = uG.x * du_dx + uG.y * du_dy;

    // --- Attractor ---
    vec2 d = vUV - uBasinCenter;
    float w = exp(-dot(d,d) / (2.0 * uBasinRadius * uBasinRadius));
    float attract = -uLambda * w * fastTanh(uC - uUstar);

    // --- Damping (containment) ---
    float damp = -uGamma * uC;

    // --- Rhythm (periodic forcing) ---
    float rhythm = uRho * sin(uOmega * uTime) * exp(-2.0 * abs(uC));

    // --- PDE RHS ---
    float rhs = damp + uKappa * lap + uAlphaG * adv + attract + rhythm;

    // --- Noise (chronic + event) ---
    float eta = hash13(vec3(gl_FragCoord.xy, uFrame)) * 2.0 - 1.0;
    float noiseTerm = uSigma * sqrt(max(uDT, 0.0)) * eta;

    // --- Euler step ---
    float uNext = clamp(uC + uDT * rhs + noiseTerm, -1.0, 1.0);

    // --- Write back to texture ---
    gl_FragColor = vec4(0.5 + 0.5 * uNext, 0.0, 0.0, 1.0);
}
