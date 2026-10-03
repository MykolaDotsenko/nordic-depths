import { clamp } from "./motion-model.js";

// The 2023 forest's fireflies drift up into the new story: a small WebGL particle
// field behind the intro. Every spark sits at a depth between the far and the near
// forest plane and lags the page scroll by that plane's 2023 divisor (/1.6 far,
// /5.7 near), so the field moves with the same parallax as the forest above it.
// Sparks rise and cool from ember to aurora teal, near ones blur into bokeh, a fine
// pointer tilts the depth planes and scatters the sparks around it, and nothing is
// drawn while the intro is off screen. One draw call per frame; no library.

const VERTEX_SHADER = `
attribute vec4 aSeed;    // x, y: start position (0..1), z: phase, w: depth (0 far .. 1 near)
attribute float aWarmth; // 1 = ember firefly, 0 = cool spark

uniform float uTime;
uniform float uScroll;   // page scroll past the intro, in canvas heights
uniform float uDepth;    // Motion Lab intensity
uniform vec2 uLook;      // eased pointer offset, about -1..1 at the screen edges
uniform vec2 uPointer;   // pointer position on the canvas, 0..1
uniform float uPointerPower;
uniform float uAspect;
uniform float uPixelRatio;
uniform float uSize;

varying float vAlpha;
varying float vWarmth;
varying float vSoftness;

void main() {
  float depth = aSeed.w;
  float phase = aSeed.z * 6.28318;
  float drift = uTime * (0.18 + depth * 0.3);

  // The forest's divisors: far sparks lag the page by 1/1.6 of the scroll, near
  // ones by 1/5.7. They also rise on their own, near ones faster.
  float lag = mix(1.0 / 1.6, 1.0 / 5.7, depth) * uDepth;
  float y = fract(aSeed.y - uTime * mix(0.006, 0.026, depth) + uScroll * lag);
  float x = aSeed.x + sin(drift + phase) * 0.028 + sin(drift * 2.3 + phase * 1.7) * 0.01;
  vec2 pos = vec2(x, y) + uLook * vec2(0.014, 0.01) * (depth * 2.0 - 0.6) * uDepth;

  // Scatter around the pointer, measured in an aspect-correct space.
  vec2 off = (pos - uPointer) * vec2(uAspect, 1.0);
  float dist = length(off);
  float push = uPointerPower * exp(-dist * dist * 24.0);
  pos += (off / max(dist, 0.0001)) / vec2(uAspect, 1.0) * push * 0.06 * (0.4 + depth);

  gl_Position = vec4(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0, 0.0, 1.0);

  // Fireflies blink: long dim spells, short bright pulses. Far sparks twinkle
  // faster, near bokeh breathe slowly and stay dim so the copy keeps its contrast.
  float rate = mix(2.0, 0.7, depth) * (0.6 + fract(aSeed.z * 7.13));
  float pulse = 0.5 + 0.5 * sin(uTime * rate + phase * 5.0);
  float edgeFade = smoothstep(0.0, 0.14, y) * (1.0 - smoothstep(0.8, 1.0, y));
  float intensity = 1.0 - 0.5 * smoothstep(0.62, 1.0, depth);
  vAlpha = (0.16 + 0.84 * pulse * pulse * pulse) * edgeFade * intensity * (1.0 + push * 1.4);
  vWarmth = aWarmth * mix(0.35, 1.0, smoothstep(0.05, 0.75, y));
  vSoftness = smoothstep(0.62, 0.95, depth);
  gl_PointSize = uSize * mix(0.42, 2.3, depth * depth) * (1.0 + push * 0.6) * uPixelRatio;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying float vAlpha;
varying float vWarmth;
varying float vSoftness;

void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float spark = exp(-r * r * 7.0) * 0.55 + exp(-r * r * 48.0);
  float bokeh = (1.0 - smoothstep(0.6, 1.0, r)) * (0.55 + 0.45 * r * r) * 0.75;
  float alpha = mix(spark, bokeh, vSoftness) * vAlpha;
  vec3 ember = vec3(0.98, 0.8, 0.45);
  vec3 aurora = vec3(0.49, 0.89, 0.74);
  gl_FragColor = vec4(mix(aurora, ember, vWarmth) * alpha, alpha);
}
`;

const PARTICLES = { full: 240, compact: 110 };
const STRIDE = 5;
// Soft glows do not need retina resolution: cap the drawing buffer instead of
// clearing and compositing millions of pixels per frame.
const PIXEL_BUDGET = 1_600_000;
// The pointer-depth signal (js/pointer-depth.js) peaks at these px offsets.
const LOOK_RANGE = { x: 90, y: 60 };
const POINTER_EASE_MS = 140;

// A small seeded generator: the field looks the same on every visit and does not
// jump when a Motion Lab change restarts it. Seeded with the forest's year.
export function seededRandom(seed = 2023) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// x, y, phase, depth, warmth per particle; all in 0..1. Most sparks are far away.
export function createSeeds(count, random = seededRandom()) {
  const seeds = new Float32Array(count * STRIDE);
  for (let index = 0; index < count; index += 1) {
    const offset = index * STRIDE;
    seeds[offset] = random();
    seeds[offset + 1] = random();
    seeds[offset + 2] = random();
    seeds[offset + 3] = random() ** 2;
    seeds[offset + 4] = random() < 0.78 ? 1 : 0;
  }
  return seeds;
}

export function particleCount(profile) {
  if (profile.mode === "reduced") return 0;
  return profile.mode === "compact" ? PARTICLES.compact : PARTICLES.full;
}

export function drawingRatio(devicePixelRatio, cssWidth, cssHeight) {
  const area = Math.max(1, cssWidth * cssHeight);
  return Math.min(devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / area));
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Firefly shader failed to compile: ${log}`);
  }
  return shader;
}

export function initFireflies(profile) {
  const canvas = document.querySelector("[data-fireflies]");
  const section = canvas?.closest("[data-extension-start]");
  if (!canvas || !section) return () => {};

  const count = particleCount(profile);
  if (!count) {
    canvas.dataset.state = "off";
    return () => {};
  }

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) {
    canvas.dataset.state = "unsupported";
    return () => {};
  }

  const seeds = createSeeds(count);
  const pointer = { x: 0.5, y: 0.5, power: 0, target: 0 };
  let program = null;
  let buffer = null;
  let uniforms = {};
  let frame = 0;
  let frames = 0;
  let last = 0;
  let running = false;
  let visible = false;
  let ratio = 1;
  let aspect = 1;

  const setup = () => {
    program = gl.createProgram();
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Firefly program failed to link: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const seedLocation = gl.getAttribLocation(program, "aSeed");
    const warmthLocation = gl.getAttribLocation(program, "aWarmth");
    gl.enableVertexAttribArray(seedLocation);
    gl.vertexAttribPointer(seedLocation, 4, gl.FLOAT, false, STRIDE * 4, 0);
    gl.enableVertexAttribArray(warmthLocation);
    gl.vertexAttribPointer(warmthLocation, 1, gl.FLOAT, false, STRIDE * 4, 16);

    uniforms = Object.fromEntries(
      ["uTime", "uScroll", "uDepth", "uLook", "uPointer", "uPointerPower", "uAspect", "uPixelRatio", "uSize"].map(
        (name) => [name, gl.getUniformLocation(program, name)],
      ),
    );

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
  };

  const resize = () => {
    ratio = drawingRatio(window.devicePixelRatio, canvas.clientWidth, canvas.clientHeight);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    aspect = width / height;
    gl.viewport(0, 0, width, height);
  };

  // Reads the eased pointer-depth signal that already drives the intro glow.
  const look = (property, range) => (Number.parseFloat(section.style.getPropertyValue(property)) || 0) / range;

  const render = (now) => {
    frame = 0;
    if (!running) return;

    const elapsed = last ? Math.min(now - last, 100) : 16;
    last = now;
    pointer.power += (pointer.target - pointer.power) * (1 - Math.exp(-elapsed / POINTER_EASE_MS));

    const rect = canvas.getBoundingClientRect();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.uTime, now / 1000);
    gl.uniform1f(uniforms.uScroll, (window.innerHeight - rect.top) / Math.max(rect.height, 1));
    gl.uniform1f(uniforms.uDepth, clamp(profile.depthScale ?? 1, 0.5, 1.25));
    gl.uniform2f(uniforms.uLook, look("--pointer-x", LOOK_RANGE.x), look("--pointer-y", LOOK_RANGE.y));
    gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
    gl.uniform1f(uniforms.uPointerPower, pointer.power);
    gl.uniform1f(uniforms.uAspect, aspect);
    gl.uniform1f(uniforms.uPixelRatio, ratio);
    gl.uniform1f(uniforms.uSize, profile.mode === "compact" ? 19 : 22);
    gl.drawArrays(gl.POINTS, 0, count);

    frames += 1;
    if (frames % 15 === 0) canvas.dataset.frames = String(frames);
    frame = window.requestAnimationFrame(render);
  };

  const setRunning = (next) => {
    if (next === running) return;
    running = next;
    last = 0;
    canvas.dataset.state = running ? "running" : "paused";
    if (running && !frame) frame = window.requestAnimationFrame(render);
    if (!running && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const update = () => setRunning(visible && document.visibilityState === "visible" && !gl.isContextLost());

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width;
    pointer.y = (event.clientY - rect.top) / rect.height;
    pointer.target = pointer.x >= 0 && pointer.x <= 1 && pointer.y >= 0 && pointer.y <= 1 ? 1 : 0;
  };

  const onPointerLeave = () => {
    pointer.target = 0;
  };

  const onContextLost = (event) => {
    event.preventDefault();
    setRunning(false);
    canvas.dataset.state = "lost";
  };

  const onContextRestored = () => {
    try {
      setup();
    } catch (error) {
      console.error(error);
      canvas.dataset.state = "unsupported";
      return;
    }
    resize();
    canvas.dataset.state = "paused";
    update();
  };

  try {
    setup();
  } catch (error) {
    console.error(error);
    canvas.dataset.state = "unsupported";
    return () => {};
  }

  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      update();
    },
    { rootMargin: "120px 0px" },
  );
  const size = new ResizeObserver(resize);

  resize();
  canvas.dataset.state = "paused";
  visibility.observe(section);
  size.observe(canvas);
  document.addEventListener("visibilitychange", update);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  if (profile.pointerEnabled) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
  }

  return () => {
    setRunning(false);
    visibility.disconnect();
    size.disconnect();
    document.removeEventListener("visibilitychange", update);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    if (!gl.isContextLost()) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    canvas.dataset.state = "off";
  };
}
