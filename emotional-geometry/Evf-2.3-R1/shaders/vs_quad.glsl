precision highp float;

attribute vec2 aPos;
varying highp vec2 vUV;

void main(){
  vUV = (aPos + 1.0) * 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
