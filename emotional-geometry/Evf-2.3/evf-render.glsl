precision highp float;

varying vec2 vUV;

uniform sampler2D uField;
uniform float uShowStructure;
uniform vec2  uTexel;

void main(){

    // raw field → [-1,1]
    float v = texture2D(uField, vUV).r;
    float u = (v - 0.5) * 2.0;

    // ----------------------------
    // PURE LINEAR NORMALIZATION
    // ----------------------------
    // maps:
    //   u = -1 → 0.0 (black)
    //   u =  1 → 1.0 (white)
    //
    // This eliminates haze entirely.
    float g = 0.5 + 0.5 * u;

    vec3 color = vec3(g);

    // ----------------------------
    // OPTIONAL STRUCTURE MAP
    // ----------------------------
    if(uShowStructure > 0.5){
        float uL = (texture2D(uField, vUV + vec2(-uTexel.x,0.)).r - 0.5)*2.0;
        float uR = (texture2D(uField, vUV + vec2( uTexel.x,0.)).r - 0.5)*2.0;
        float uD = (texture2D(uField, vUV + vec2(0.,-uTexel.y)).r - 0.5)*2.0;
        float uU = (texture2D(uField, vUV + vec2(0., uTexel.y)).r - 0.5)*2.0;

        float grad = length(vec2(uR - uL, uU - uD));

        // Hard edge structure visualization (scientific)
        float s = smoothstep(0.05, 0.12, grad);

        // multiply (never brightens)
        color = mix(color, vec3(1.0,0.0,0.0), s * 0.5);
    }

    gl_FragColor = vec4(color,1.0);
}
