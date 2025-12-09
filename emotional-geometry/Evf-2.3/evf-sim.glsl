precision highp float;

varying vec2 vUV;

uniform sampler2D uField;
uniform float uShowStructure;

uniform vec2  uBasinCenter;
uniform float uBasinRadius;
uniform vec2  uTexel;

float fastTanh(float x){
    float e2 = exp(2.0*x);
    return (e2-1.0)/(e2+1.0);
}

void main(){
    // Read normalized field value
    float v = texture2D(uField, vUV).r;
    float u = (v - 0.5) * 2.0;

    // EVF 2.1 dreamy tone mapping (use fastTanh, not tanh)
    float g = 0.5 + 0.5 * fastTanh(0.6 * u);

    // Soft vignette
    vec2 uv = vUV * 2.0 - 1.0;
    float vign = 1.0 - 0.25 * dot(uv, uv);

    vec3 color = vec3(clamp(g * vign, 0.0, 1.0));

    // -------------------------------
    // Structure Map (toggle)
    // -------------------------------
    if (uShowStructure > 0.5) {
        float uL = (texture2D(uField, vUV + vec2(-uTexel.x, 0.0)).r - 0.5) * 2.0;
        float uR = (texture2D(uField, vUV + vec2( uTexel.x, 0.0)).r - 0.5) * 2.0;
        float uD = (texture2D(uField, vUV + vec2(0.0, -uTexel.y)).r - 0.5) * 2.0;
        float uU = (texture2D(uField, vUV + vec2(0.0,  uTexel.y)).r - 0.5) * 2.0;

        float grad = length(vec2(uR - uL, uU - uD));
        float gradSoft = smoothstep(0.00, 0.04, grad);

        vec3 structureColor = mix(
            vec3(0.7, 0.75, 1.0),   // gentle blue
            vec3(1.0, 0.85, 0.55),  // amber
            gradSoft
        );

        color = mix(color, structureColor, 0.18 * gradSoft);
    }

    // Attractor glow (subtle)
    vec2 d = vUV - uBasinCenter;
    float mask = exp(-dot(d, d) / (2.0 * uBasinRadius * uBasinRadius));
    color = mix(color, vec3(1.0, 0.3, 0.3), 0.35 * mask);

    gl_FragColor = vec4(color, 1.0);
}
