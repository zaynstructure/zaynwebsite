precision highp float;
precision mediump sampler2D;   // Chrome Mobile requires this

varying highp vec2 vUV;        // must match vertex shader precision
uniform sampler2D uField;

void main(){
  float v = texture2D(uField, vUV).r;

  // avoid NaN → clamp in a safe manner
  v = max(0.0, min(1.0, v));

  gl_FragColor = vec4(v, v, v, 1.0);
}
