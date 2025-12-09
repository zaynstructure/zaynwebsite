precision highp float;
varying vec2 vUV;

uniform sampler2D uField;
uniform bool uShowGrad;

uniform vec2  uBasinCenter;
uniform float uBasinRadius;
uniform vec2  uTexel;
uniform float uDiagActive;

float fastTanh(float v){
    float e2x = exp(2.0*v);
    return (e2x - 1.0)/(e2x + 1.0);
}

void main(){

    float v = texture2D(uField, vUV).r;
    float u = (v - 0.5) * 2.0;

    float g = 0.5 + 0.5 * tanh(0.6*u);

    vec2 uv = vUV*2.0 - 1.0;
    float r2 = dot(uv,uv);
    float vign = 1.0 - 0.25*r2;

    float baseVal = clamp(g*vign, 0.0, 1.0);
    baseVal *= mix(1.0, 0.65, uDiagActive);

    vec3 color = vec3(baseVal);

    // -------------------------
    // Structure Map Overlay
    // -------------------------
    if (uShowGrad) {

        float uL = (texture2D(uField, vUV+vec2(-uTexel.x,0.0)).r - 0.5)*2.0;
        float uR = (texture2D(uField, vUV+vec2( uTexel.x,0.0)).r - 0.5)*2.0;
        float uD = (texture2D(uField, vUV+vec2(0.0,-uTexel.y)).r - 0.5)*2.0;
        float uU = (texture2D(uField, vUV+vec2(0.0, uTexel.y)).r - 0.5)*2.0;

        float gmag = length(vec2(uR-uL, uU-uD));
        float gradSoft = smoothstep(0.00, 0.04, gmag);

        float driftSoft = smoothstep(0.0, 0.04, abs(uR-uL));

        vec2 d = vUV - uBasinCenter;
        float w = exp(-dot(d,d) / (2.0*uBasinRadius*uBasinRadius));
        float attractSoft = pow(w, 0.6);

        vec3 colGrad      = vec3(0.70, 0.75, 1.00);
        vec3 colDrift     = vec3(1.00, 0.85, 0.55);
        vec3 colAttractor = vec3(1.00, 0.60, 0.75);

        float A = 0.22;

        vec3 overlay =
              colGrad*gradSoft +
              colDrift*driftSoft +
              colAttractor*attractSoft;

        color = mix(color, overlay, A*(gradSoft+driftSoft+attractSoft));
    }

    gl_FragColor = vec4(color,1.0);
}
