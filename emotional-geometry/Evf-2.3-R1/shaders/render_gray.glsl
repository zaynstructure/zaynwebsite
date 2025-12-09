precision highp float;

varying vec2 vUV;
uniform sampler2D uField;

void main(){
  float v = texture2D(uField, vUV).r;
  gl_FragColor = vec4(vec3(clamp(v,0.0,1.0)), 1.0);
}
