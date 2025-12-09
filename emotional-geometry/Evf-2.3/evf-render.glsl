precision highp float;

varying vec2 vUV;

uniform sampler2D uField;
uniform float uShowStructure;   // structure overlay toggle
uniform float uAesthetic;       // NEW aesthetic mode toggle

uniform vec2  uBasinCenter;
uniform float uBasinRadius;
uniform vec2  uTexel;

float fastTanh(float x){
    float e2 = exp(2.0*x);
    return (e2 - 1.0) / (e2 + 1.0);
}

void main(){
    // Read field
    float v = texture2D(uField, vUV).r;
    float u = (v - 0.5) * 2.0;

    // --- EVF 2.1 DREAMY BASE TONE MAP (FOUNDATION) ---
    float g = 0.5 + 0.5 * tanh(0.6 * u);

    // Soft vignette
    vec2 uv = vUV * 2.0 - 1.0;
    float vign = 1.0 - 0.25 * dot(uv, uv);

    vec3 color = vec3(clamp(g * vign, 0.0, 1.0));

    // ------------------------------------------------------
    // STRUCTURE MAP (GRADIENT MAGNITUDE)
    // ------------------------------------------------------
    if(uShowStructure > 0.5){
        float uL = (texture2D(uField, vUV + vec2(-uTexel.x,0)).r - 0.5) * 2.0;
        float uR = (texture2D(uField, vUV + vec2( uTexel.x,0)).r - 0.5) * 2.0;
        float uD = (texture2D(uField, vUV + vec2(0,-uTexel.y)).r - 0.5) * 2.0;
        float uU = (texture2D(uField, vUV + vec2(0, uTexel.y)).r - 0.5) * 2.0;

        float grad = length(vec2(uR - uL, uU - uD));
        float gradSoft = smoothstep(0.00, 0.04, grad);

        vec3 structureColor = mix(
            vec3(0.7, 0.75, 1.0),   // gentle blue
            vec3(1.0, 0.85, 0.55),  // amber
            gradSoft
        );

        color = mix(color, structureColor, 0.18 * gradSoft);
    }

    // ------------------------------------------------------
    // AESTHETIC MODE — EVF-2.1 DREAMY COLOR SPACE
    // ------------------------------------------------------
    if(uAesthetic > 0.5){

        // Nonlinear dreamy mapping
        float dreamy = 0.5 + 0.5 * tanh(0.8 * u);

        // Pastel triad blend
        vec3 c1 = vec3(0.70, 0.78, 1.0);   // soft blue
        vec3 c2 = vec3(1.00, 0.85, 0.65);  // peach/amber
        vec3 c3 = vec3(0.85, 0.65, 1.0);   // lavender

        float a = smoothstep(-0.2, 0.2, u);
        vec3 dreamyColor = mix(c1, c2, a);
        dreamyColor = mix(dreamyColor, c3, 0.2 * a * (1.0 - a));

        // Vignette for dreamy softness
        vec2 uv2 = vUV * 2.0 - 1.0;
        float vign2 = 1.0 - 0.25 * dot(uv2, uv2);

        // Replace the tone map with dreamy mode
        color = mix(color, dreamyColor, 0.75);
        color *= vign2;

        // NOTE: Aesthetic mode *ignores structure map*
    }

    // ------------------------------------------------------
    // ATTRACTOR GLOW
    // ------------------------------------------------------
    vec2 d = vUV - uBasinCenter;
    float mask = exp(-dot(d, d) / (2.0 * uBasinRadius * uBasinRadius));

    // Gentle red/pink attractor highlight
    color = mix(color, vec3(1.0, 0.3, 0.3), 0.35 * mask);

    gl_FragColor = vec4(color, 1.0);
}
