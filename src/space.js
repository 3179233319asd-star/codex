import FRAGMENT from './blackhole.frag?raw';

// An entirely procedural sky: no photographs, textures, or remote assets.
// The disc uses integrated light rays bent around a Schwarzschild
// black hole, with orbiting, multi-scale turbulence rather than a static image.

const VERTEX = `#version 300 es
layout(location=0) in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const BLOOM = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D source;
uniform vec2 outputSize;
uniform vec2 direction;
uniform int extractLight;
void main() {
  vec2 uv=gl_FragCoord.xy/outputSize;
  vec3 col=texture(source,uv).rgb*.227027;
  col+=(texture(source,uv+direction*1.384615).rgb+texture(source,uv-direction*1.384615).rgb)*.316216;
  col+=(texture(source,uv+direction*3.230769).rgb+texture(source,uv-direction*3.230769).rgb)*.070270;
  if(extractLight==1) col=max(col-vec3(.57),vec3(0));
  outColor=vec4(col,1);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D scene;
uniform sampler2D bloom;
uniform vec2 resolution;
void main() {
  vec2 uv=gl_FragCoord.xy/resolution;
  vec3 col=texture(scene,uv).rgb;
  vec2 pixel=.75/resolution;
  vec3 soft=(texture(scene,uv+vec2(pixel.x,0)).rgb+texture(scene,uv-vec2(pixel.x,0)).rgb
            +texture(scene,uv+vec2(0,pixel.y)).rgb+texture(scene,uv-vec2(0,pixel.y)).rgb)*.25;
  col=mix(col,soft,.08);
  vec3 glow=texture(bloom,uv).rgb;
  // Optical scattering warms the highlights while preserving the black core.
  col+=glow*vec3(1.0,.985,.95)*(.30+.16*(1.0-col));
  outColor=vec4(min(col,vec3(1)),1);
}`;

const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value)));

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`星空着色器未能初始化：${detail}`);
  }
  return shader;
}

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

// Useful on older phones and devices on which WebGL is unavailable. This is
// still animated procedural drawing, and never substitutes a background image.
function createCanvasFallback(canvas) {
  let surface = canvas;
  let context = null;
  try { context = canvas.getContext('2d'); } catch { /* WebGL already owns it. */ }
  if (!context) {
    surface = document.createElement('canvas');
    surface.className = canvas.className;
    surface.style.cssText = canvas.style.cssText;
    surface.style.position = 'absolute';
    surface.style.inset = '0';
    surface.style.width = '100%';
    surface.style.height = '100%';
    surface.style.pointerEvents = 'none';
    surface.setAttribute('aria-hidden', 'true');
    canvas.parentNode?.insertBefore(surface, canvas);
    canvas.style.visibility = 'hidden';
    context = surface.getContext('2d');
  }
  const random = seededRandom(92618);
  const stars = Array.from({ length: 1600 }, () => ({
    x: random(), y: random(), radius: .25+random()*.8,
    alpha: .08+Math.pow(random(),4)*.7,
    phase: random()*Math.PI*2, rate: .2+random()*.6,
    warm: random()>.78,
  }));
  const strands = Array.from({ length: 56 }, (_, index) => ({
    radius: .210 + index*.00216,
    alpha: .012+random()*.034,
    width: .55+random()*.8,
    phase: random()*6.283,
  }));
  return {
    resize(width, height) { surface.width = width; surface.height = height; },
    draw(time, intensity, pointer) {
      if (!context) return;
      const ctx = context, width = surface.width, height = surface.height;
      ctx.fillStyle = '#020304';
      ctx.fillRect(0,0,width,height);
      const scale = height;
      const cx = width*.5-pointer.x*scale*.009;
      const cy = height*.5+pointer.y*scale*.006;
      for (const star of stars) {
        const alpha = star.alpha*(.78+.22*Math.sin(time*star.rate+star.phase))*intensity;
        ctx.fillStyle = `rgba(${star.warm?'255,216,180':'193,215,242'},${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x*width,star.y*height,star.radius*width/1280,0,Math.PI*2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(cx,cy);
      const extent = Math.max(width*.74,scale*1.22);
      // A continuous, translucent body supplies the gas volume. The sparse
      // filaments below add motion without building up hard brush-like rings.
      const glow = ctx.createRadialGradient(0,0,scale*.181,0,0,scale*.39);
      glow.addColorStop(0,'rgba(222,219,213,0)');
      glow.addColorStop(.15,`rgba(248,238,222,${.06*intensity})`);
      glow.addColorStop(.29,`rgba(238,234,228,${.19*intensity})`);
      glow.addColorStop(.49,`rgba(167,185,207,${.10*intensity})`);
      glow.addColorStop(.75,`rgba(90,111,139,${.035*intensity})`);
      glow.addColorStop(1,'rgba(90,111,139,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-scale*.45,-scale*.45,scale*.9,scale*.9);

      function heightAt(x, radius) {
        const distance = Math.abs(x), join = radius*.65, end = radius*1.60;
        if (distance<=join) return Math.sqrt(radius*radius-distance*distance);
        const tail = radius*.025;
        if (distance>=end) return tail*Math.exp(-Math.pow((distance-end)/(extent*.72),2));
        // Match the circle's tangent, then turn inward into a flat disc.
        // The Hermite tail has no corner where the two structures meet.
        const t = (distance-join)/(end-join);
        const start = Math.sqrt(radius*radius-join*join);
        const tangent = -join/start*(end-join);
        return (2*t*t*t-3*t*t+1)*start+(t*t*t-2*t*t+t)*tangent+(-2*t*t*t+3*t*t)*tail;
      }
      function appendFlow(radius, side, reverse = false, begin = false) {
        for (let j=0;j<=180;j++) {
          const x = ((reverse?180-j:j)/180*2-1)*extent;
          const y = side*heightAt(x,radius);
          if (j===0 && begin) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
      }
      const atmosphere = ctx.createLinearGradient(0,-scale*.35,0,scale*.35);
      atmosphere.addColorStop(0,'rgba(132,157,185,0)');
      atmosphere.addColorStop(.27,`rgba(171,191,215,${.08*intensity})`);
      atmosphere.addColorStop(.46,`rgba(234,227,214,${.17*intensity})`);
      atmosphere.addColorStop(.5,`rgba(251,239,221,${.20*intensity})`);
      atmosphere.addColorStop(.54,`rgba(234,227,214,${.17*intensity})`);
      atmosphere.addColorStop(.73,`rgba(171,191,215,${.08*intensity})`);
      atmosphere.addColorStop(1,'rgba(132,157,185,0)');
      ctx.fillStyle = atmosphere;
      for (const side of [-1,1]) {
        ctx.beginPath();
        appendFlow(scale*.337,side,false,true);
        appendFlow(scale*.209,side,true);
        ctx.closePath(); ctx.fill();
      }
      const filamentLight = ctx.createLinearGradient(-extent,0,extent,0);
      filamentLight.addColorStop(0,'rgba(158,181,207,0)');
      filamentLight.addColorStop(.22,'rgba(170,191,214,.34)');
      filamentLight.addColorStop(.40,'rgba(235,228,217,.82)');
      filamentLight.addColorStop(.5,'rgba(253,239,218,1)');
      filamentLight.addColorStop(.60,'rgba(235,228,217,.82)');
      filamentLight.addColorStop(.78,'rgba(170,191,214,.34)');
      filamentLight.addColorStop(1,'rgba(158,181,207,0)');
      ctx.strokeStyle = filamentLight;
      ctx.lineCap = 'round';
      for (const strand of strands) {
        const breathing = Math.sin(strand.phase+time*.11)*.00055;
        const radius = (strand.radius+breathing)*scale;
        ctx.globalAlpha = strand.alpha*intensity;
        ctx.lineWidth = strand.width*scale/720;
        for (const side of [-1,1]) {
          ctx.beginPath();
          appendFlow(radius,side,false,true);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#010202';
      ctx.beginPath(); ctx.arc(0,0,scale*.191,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(0,0,scale*.194,0,Math.PI*2);
      ctx.strokeStyle = `rgba(255,238,215,${Math.min(intensity*.9,1)})`;
      ctx.lineWidth = scale*.0013; ctx.stroke();

      // Both disc faces share the ring's horizontal axis. A broad, faint
      // elliptical glow underlies the thin orbital streaks and fades outward.
      ctx.save();
      ctx.scale(extent,scale*.035);
      const discGlow = ctx.createRadialGradient(0,0,0,0,0,1);
      discGlow.addColorStop(0,`rgba(255,244,224,${.40*intensity})`);
      discGlow.addColorStop(.25,`rgba(246,239,226,${.29*intensity})`);
      discGlow.addColorStop(.53,`rgba(185,205,224,${.13*intensity})`);
      discGlow.addColorStop(1,'rgba(115,140,167,0)');
      ctx.fillStyle = discGlow;
      ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2); ctx.fill();
      ctx.restore();
      for (let i=0;i<90;i++) {
        const radius = (scale*.225+i*extent*.0095);
        const flow = .78+.22*Math.sin(time*.09+i*.59);
        const alpha = (.037+.025*Math.sin(i*.79)**2)*Math.exp(-i*.019)*flow*intensity;
        ctx.beginPath();
        ctx.ellipse(0,0,radius,scale*(.0035+i*.00036),0,0,Math.PI*2);
        ctx.strokeStyle = `rgba(${i<24?'255,239,218':'168,191,215'},${alpha})`;
        ctx.lineWidth = (.68+.20*Math.sin(i*.47))*scale/720;
        ctx.stroke();
      }
      ctx.restore();
    },
    destroy() { if (surface!==canvas) { surface.remove(); canvas.style.visibility=''; } },
  };
}

export function createSpace(canvas) {
  let gl = null, program = null, buffer = null, fallback = null;
  let bloomProgram = null, compositeProgram = null;
  let bloomUniforms, compositeUniforms;
  const targets = [];
  let targetWidth = 0, targetHeight = 0, glowWidth = 0, glowHeight = 0;
  let frameHandle = 0, destroyed = false, frames = 0, paused = false;
  let speed = 1, intensity = 1, simulationTime = 0, lastTime = performance.now();
  let pointer = { x:0, y:0 }, targetPointer = { x:0, y:0 };
  let renderedTime = 0, renderedPointer = { x:0, y:0 };
  let renderer = 'WebGL 2';
  let uniforms;
  let cssWidth = 0, cssHeight = 0;
  let quality = 1, frameSamples = 0, frameDuration = 0;
  let gpuFence = null, gpuSubmittedAt = 0;
  const maxPixelRatio = 1.25;

  function makeProgram(fragmentSource) {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const linked = gl.createProgram();
    gl.attachShader(linked, vertex); gl.attachShader(linked, fragment);
    gl.linkProgram(linked);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linked));
    return linked;
  }

  function allocateTargets(width, height) {
    if (targetWidth === width && targetHeight === height) return;
    targetWidth = width; targetHeight = height;
    glowWidth = Math.max(1, Math.ceil(width / 4));
    glowHeight = Math.max(1, Math.ceil(height / 4));
    for (let i = 0; i < 3; i++) {
      const target = targets[i];
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,i === 0 ? width : glowWidth,i === 0 ? height : glowHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target.texture,0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('辉光缓冲区初始化失败。');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }

  function activateFallback(reason) {
    if (fallback) return;
    renderer = 'Canvas 2D';
    canvas.dataset.renderer = renderer;
    if (reason) console.warn('星空已切换至兼容绘制模式。', reason.message || reason);
    fallback = createCanvasFallback(canvas);
    resize();
  }

  try {
    gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('此设备未提供 WebGL 2。');
    program = makeProgram(FRAGMENT);
    bloomProgram = makeProgram(BLOOM);
    compositeProgram = makeProgram(COMPOSITE);
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    uniforms = Object.fromEntries(['resolution','pointer','time','intensity'].map(name=>[name,gl.getUniformLocation(program,name)]));
    bloomUniforms = Object.fromEntries(['source','outputSize','direction','extractLight'].map(name=>[name,gl.getUniformLocation(bloomProgram,name)]));
    compositeUniforms = Object.fromEntries(['scene','bloom','resolution'].map(name=>[name,gl.getUniformLocation(compositeProgram,name)]));
    for (let i = 0; i < 3; i++) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      targets.push({texture,framebuffer:gl.createFramebuffer()});
    }
    canvas.dataset.renderer = renderer;
  } catch (error) { activateFallback(error); }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    cssWidth = bounds.width || window.innerWidth;
    cssHeight = bounds.height || window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1,maxPixelRatio)*quality;
    // High-density and ultrawide screens use a bounded drawing buffer. The
    // procedural image stays sharp while avoiding unnecessary battery use.
    const budgetScale = Math.min(1,Math.sqrt(2100000/(cssWidth*cssHeight*pixelRatio*pixelRatio)));
    const width = Math.max(1,Math.round(cssWidth*pixelRatio*budgetScale));
    const height = Math.max(1,Math.round(cssHeight*pixelRatio*budgetScale));
    // ResizeObserver often repeats the initial bounds. Reuse the completed
    // frame instead of submitting an identical expensive scene a second time.
    if (!fallback && frames>0 && canvas.width===width && canvas.height===height
        && targetWidth===width && targetHeight===height) return;
    if (canvas.width!==width || canvas.height!==height) {
      canvas.width=width; canvas.height=height;
    }
    if (fallback) fallback.resize(width,height);
    else if (gl && targets.length === 3) {
      allocateTargets(width,height);
      gl.viewport(0,0,width,height);
    }
    render();
  }

  function render() {
    if (destroyed) return;
    if (fallback) fallback.draw(simulationTime,intensity,pointer);
    else if (gl && program && !gl.isContextLost()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER,targets[0].framebuffer);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
      gl.uniform2f(uniforms.pointer,pointer.x,pointer.y);
      gl.uniform1f(uniforms.time,simulationTime);
      gl.uniform1f(uniforms.intensity,intensity);
      gl.drawArrays(gl.TRIANGLES,0,3);

      gl.useProgram(bloomProgram);
      gl.viewport(0,0,glowWidth,glowHeight);
      gl.uniform2f(bloomUniforms.outputSize,glowWidth,glowHeight);
      gl.uniform1i(bloomUniforms.source,0);
      gl.activeTexture(gl.TEXTURE0);
      const passes = [
        { from:0, to:1, x:1/canvas.width, y:0, extract:1 },
        { from:1, to:2, x:1.6/glowWidth, y:0, extract:0 },
        { from:2, to:1, x:0, y:1.6/glowHeight, extract:0 },
      ];
      for (const pass of passes) {
        gl.bindFramebuffer(gl.FRAMEBUFFER,targets[pass.to].framebuffer);
        gl.bindTexture(gl.TEXTURE_2D,targets[pass.from].texture);
        gl.uniform2f(bloomUniforms.direction,pass.x,pass.y);
        gl.uniform1i(bloomUniforms.extractLight,pass.extract);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.useProgram(compositeProgram);
      gl.uniform2f(compositeUniforms.resolution,canvas.width,canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,targets[0].texture);
      gl.uniform1i(compositeUniforms.scene,0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D,targets[1].texture);
      gl.uniform1i(compositeUniforms.bloom,1);
      gl.drawArrays(gl.TRIANGLES,0,3);
      // Keep at most one animation frame in flight. Slow software renderers
      // must not queue hundreds of expensive frames ahead of UI input.
      if (gpuFence) gl.deleteSync(gpuFence);
      gpuFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
      gpuSubmittedAt = performance.now();
      gl.flush();
    }
    renderedTime = simulationTime;
    renderedPointer = { ...pointer };
    frames++;
  }

  function animate(now) {
    if (destroyed) return;
    const elapsed = (now-lastTime)/1000;
    const delta = Math.min(elapsed,.10);
    lastTime = now;
    if (!paused && !document.hidden) {
      simulationTime += delta*speed;
      const smooth = 1-Math.exp(-delta*3);
      pointer.x += (targetPointer.x-pointer.x)*smooth;
      pointer.y += (targetPointer.y-pointer.y)*smooth;
      let ready = true;
      if (gpuFence && gl && !gl.isContextLost()) {
        const status = gl.clientWaitSync(gpuFence,0,0);
        ready = status !== gl.TIMEOUT_EXPIRED;
        if (ready) {
          gl.deleteSync(gpuFence); gpuFence = null;
          frameDuration += now-gpuSubmittedAt;
          frameSamples++;
        }
      }
      if (ready) {
        let resized = false;
        // Quality follows completed GPU work rather than queued draw calls.
        if (frameSamples>=4) {
          if (frameDuration/frameSamples>65 && quality>.58) {
            quality=Math.max(.58,quality*.8); resize(); resized = true;
          }
          frameSamples=0; frameDuration=0;
        }
        if (!resized) render();
      }
    }
    frameHandle = requestAnimationFrame(animate);
  }

  function contextLost(event) { event.preventDefault(); gpuFence=null; activateFallback('图形上下文已中断。'); }
  canvas.addEventListener('webglcontextlost',contextLost);
  const observer = typeof ResizeObserver==='function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize',resize,{passive:true});
  resize();
  frameHandle = requestAnimationFrame(animate);

  return {
    setPaused(value) {
      const next = Boolean(value);
      // GPU work may lag behind the simulation clock. Freeze the submitted
      // frame so light/resize redraws retain the same gas and camera position.
      if (next && !paused) {
        simulationTime = renderedTime;
        pointer = { ...renderedPointer };
      }
      paused=next; lastTime=performance.now(); gpuSubmittedAt=lastTime;
    },
    setSpeed(value) { if (Number.isFinite(Number(value))) speed=clamp(value,0,4); },
    setIntensity(value) { if (Number.isFinite(Number(value))) { intensity=clamp(value,.15,2); render(); } },
    setPointer(x,y) { if (Number.isFinite(Number(x)) && Number.isFinite(Number(y))) targetPointer={x:clamp(x,-1,1),y:clamp(y,-1,1)}; },
    getStats() { return { renderer,frames,paused,speed,intensity,time:simulationTime,quality,bloom:renderer==='WebGL 2',width:canvas.width,height:canvas.height }; },
    destroy() {
      destroyed=true; cancelAnimationFrame(frameHandle); observer?.disconnect();
      window.removeEventListener('resize',resize);
      canvas.removeEventListener('webglcontextlost',contextLost);
      fallback?.destroy();
      if (gl) {
        if (gpuFence) gl.deleteSync(gpuFence);
        if (buffer) gl.deleteBuffer(buffer);
        for (const linked of [program,bloomProgram,compositeProgram]) if (linked) gl.deleteProgram(linked);
        for (const target of targets) { gl.deleteTexture(target.texture); gl.deleteFramebuffer(target.framebuffer); }
      }
    },
  };
}
