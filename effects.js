(async () => {
const THREE = await import("https://esm.sh/three@0.180.0");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function createRipple() {
  const canvas = document.querySelector("#ripple-background");
  const gl = canvas?.getContext("webgl2", { alpha: false, antialias: false });
  if (!canvas || !gl) return;

  const vertex = `#version 300 es
    layout(location=0) in vec2 p; out vec2 uv;
    void main(){ uv=p*.5+.5; gl_Position=vec4(p,0.,1.); }`;
  const fragment = `#version 300 es
    precision highp float; in vec2 uv; out vec4 color;
    uniform vec2 resolution; uniform vec4 ripples[12]; uniform int count; uniform float now;
    void main(){
      vec2 q=vec2(uv.x,1.-uv.y), px=q*resolution;
      vec2 grad=vec2(0.); float shine=0.;
      for(int i=0;i<12;i++){
        if(i>=count) break;
        vec4 wave=ripples[i]; float age=now-wave.z;
        if(age<0.) continue;
        vec2 d=px-wave.xy; float radius=length(d); float front=age*230.;
        float s=radius-front; float env=exp(-s*s/5200.)*exp(-age*.52)*wave.w;
        float h=sin(s*.085)*env; grad+=normalize(d+vec2(.001))*h;
      }
      vec2 warped=q+grad*0.010;
      float vignette=1.-smoothstep(.15,.85,length(warped-.5));
      vec3 base=mix(vec3(.002),vec3(.018),max(0.,1.-length(warped-vec2(.5,.43))*1.7));
      base+=vec3(.035)*vignette*.18;
      shine=max(0.,dot(grad,normalize(vec2(-.6,-.8))));
      base+=vec3(1.)*pow(shine,2.)*.72;
      base-=vec3(.08)*max(0.,dot(grad,normalize(vec2(.6,.8))));
      color=vec4(base,1.);
    }`;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program); gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const resolution = gl.getUniformLocation(program, "resolution");
  const count = gl.getUniformLocation(program, "count");
  const now = gl.getUniformLocation(program, "now");
  const wavesUniform = gl.getUniformLocation(program, "ripples");
  const waves = [];
  const started = performance.now() / 1000;

  function splash(x, y, strength = 1) {
    if (reduceMotion) return;
    if (waves.length === 12) waves.shift();
    waves.push([x, y, performance.now() / 1000 - started, strength]);
  }
  addEventListener("click", event => splash(event.clientX, event.clientY, 1));

  function draw(ms) {
    const dpr = Math.min(devicePixelRatio, 2);
    const width = Math.round(innerWidth*dpr), height = Math.round(innerHeight*dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width=width; canvas.height=height; }
    gl.viewport(0,0,width,height); gl.useProgram(program);
    gl.uniform2f(resolution,width,height); gl.uniform1i(count,waves.length); gl.uniform1f(now,ms/1000-started);
    const data = new Float32Array(48);
    waves.forEach((w,i)=>{ data.set([w[0]*dpr,w[1]*dpr,w[2],w[3]],i*4); });
    gl.uniform4fv(wavesUniform,data); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

createRipple();
})().catch(error => console.error("Could not initialize canvas effects:", error));
