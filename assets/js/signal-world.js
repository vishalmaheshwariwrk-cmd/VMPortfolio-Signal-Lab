(() => {
  "use strict";
  const canvas = document.querySelector("#signal-canvas");
  const hero = document.querySelector(".signal-visual");
  const destination = document.querySelector(".journey-destination");
  if (!canvas || !hero || !destination) return;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return;
  const body = document.body,
    reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    label = document.querySelector("[data-journey-label]");
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t,
    blend = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const add = (a, b) => a.map((v, i) => v + b[i]),
    sub = (a, b) => a.map((v, i) => v - b[i]),
    mul = (a, s) => a.map((v) => v * s);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const norm = (a) => mul(a, 1 / Math.max(0.0001, Math.hypot(...a)));
  const ease = (n) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  };
  let seed = 741;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // One continuous world. Surfaces are particles; the perspective camera travels
  // through the fiber, then orbits the computer before arriving at the screen.
  const control = [
    [-350, 30, 1600],
    [-480, 70, 1150],
    [180, 130, 650],
    [460, 230, 120],
    [-340, 300, -460],
    [-500, 130, -980],
    [330, 200, -1450],
    [460, 270, -1930],
    [-270, 200, -2400],
    [-410, 235, -2710],
    [-330, 235, -2810],
  ];
  function cable(t) {
    const n = clamp(t) * (control.length - 1),
      i = Math.min(control.length - 2, Math.floor(n)),
      f = n - i;
    const a = control[Math.max(0, i - 1)],
      b = control[i],
      c = control[i + 1],
      d = control[Math.min(control.length - 1, i + 2)];
    return b.map(
      (v, j) =>
        0.5 *
        (2 * v +
          (-a[j] + c[j]) * f +
          (2 * a[j] - 5 * v + 4 * c[j] - d[j]) * f * f +
          (-a[j] + 3 * v - 3 * c[j] + d[j]) * f * f * f),
    );
  }
  const vertices = [],
    cyan = [0.28, 0.67, 1],
    pink = [1, 0.22, 0.58],
    lime = [0.65, 0.98, 0.28];
  function point(position, color, size = 2, kind = 0, t = 0, end = position) {
    vertices.push(...position, ...end, ...color, size, kind, t, random());
  }
  const slices = 1050,
    rings = innerWidth < 761 ? 38 : 64;
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1),
      center = cable(t),
      tangent = norm(
        sub(cable(Math.min(1, t + 0.001)), cable(Math.max(0, t - 0.001))),
      );
    const side = norm(cross(tangent, [0, 1, 0])),
      up = norm(cross(side, tangent)),
      radius = mix(126, 24, ease((t - 0.82) / 0.18));
    for (let j = 0; j < rings; j++) {
      const theta = ((j + random() * 0.75) / rings) * Math.PI * 2 + t * 18,
        r = radius * (0.98 + random() * 0.04);
      const pos = add(
        center,
        add(mul(side, Math.cos(theta) * r), mul(up, Math.sin(theta) * r)),
      );
      point(pos, mul(cyan, 0.65 + random() * 1.2), 1.7 + random() * 1.3, 1, t);
    }
    for (let strand = 0; strand < 9; strand++) {
      const theta = (strand / 9) * Math.PI * 2 + t * 27,
        r = radius * 0.44;
      point(
        add(
          center,
          add(mul(side, Math.cos(theta) * r), mul(up, Math.sin(theta) * r)),
        ),
        strand % 3 === 0 ? pink : strand % 3 === 1 ? cyan : lime,
        2.8,
        2,
        t,
      );
    }
    if (i % 48 < 3)
      for (let j = 0; j < rings; j++) {
        const theta = (j / rings) * Math.PI * 2;
        point(
          add(
            center,
            add(
              mul(side, Math.cos(theta) * (radius + 4)),
              mul(up, Math.sin(theta) * (radius + 4)),
            ),
          ),
          mul(cyan, 0.9),
          2,
          1,
          t,
        );
      }
  }
  // Circuit-board landscape with perspective, foreground and a distant horizon.
  for (let i = 0; i < (innerWidth < 761 ? 18000 : 34000); i++) {
    const x = (random() - 0.5) * 4200,
      z = mix(-3600, 2100, random());
    const y =
        -175 + Math.sin(x * 0.002 + z * 0.003) * 26 + Math.cos(z * 0.005) * 14,
      line = Math.abs(Math.sin(x * 0.014) * Math.sin(z * 0.012));
    point(
      [x, y, z],
      mul(line < 0.08 ? lime : cyan, line < 0.08 ? 0.6 : 0.2 + random() * 0.24),
      1 + random() * 1.9,
      0,
    );
  }
  for (let i = 0; i < 1700; i++)
    point(
      [(random() - 0.5) * 4400, random() * 2100 - 250, random() * 6000 - 3700],
      mul(cyan, 0.25 + random() * 0.35),
      1 + random() * 2,
      0,
    );
  function box(center, dimensions, color, density = 3, frontHole = false) {
    for (let face = 0; face < 6; face++) {
      const axis = Math.floor(face / 2),
        sign = face % 2 ? 1 : -1,
        u = (axis + 1) % 3,
        v = (axis + 2) % 3;
      const nu = Math.ceil(dimensions[u] / density),
        nv = Math.ceil(dimensions[v] / density);
      for (let a = 0; a <= nu; a++)
        for (let b = 0; b <= nv; b++) {
          const p = [...center];
          p[axis] += (sign * dimensions[axis]) / 2;
          p[u] += (a / nu - 0.5) * dimensions[u] + (random() - 0.5) * density;
          p[v] += (b / nv - 0.5) * dimensions[v] + (random() - 0.5) * density;
          if (
            frontHole &&
            axis === 2 &&
            sign === 1 &&
            Math.abs(p[0]) < 302 &&
            p[1] > 211 &&
            p[1] < 579
          )
            continue;
          const edge = a < 2 || b < 2 || a > nu - 2 || b > nv - 2;
          point(
            p,
            mul(color, edge ? 1.2 : 0.4 + random() * 0.5),
            edge ? 2.1 : 1.6,
            3,
          );
        }
    }
  }
  box([0, 395, -2860], [670, 420, 88], cyan, 4, true);
  box([0, 94, -2890], [82, 190, 72], cyan, 4);
  box([0, -6, -2850], [340, 22, 225], cyan, 4);
  box([0, -80, -2620], [470, 18, 165], cyan, 5);
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 15; col++)
      box(
        [-215 + col * 30, -68, -2680 + row * 29],
        [23, 5, 20],
        mul(cyan, 0.7),
        8,
      );
  box([505, 142, -2920], [205, 435, 300], cyan, 5);
  for (let fan = 0; fan < 2; fan++)
    for (let i = 0; i < 2600; i++) {
      const angle = random() * Math.PI * 2,
        r = 58 + random() * 9;
      point(
        [
          505 + Math.cos(angle) * r,
          75 + fan * 153 + Math.sin(angle) * r,
          -2767,
        ],
        fan ? pink : cyan,
        1.8,
        3,
      );
    }
  box([-344, 235, -2815], [58, 56, 75], lime, 3);
  const glyphs = [
    ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  ];
  glyphs.forEach((rows, l) =>
    rows.forEach((row, y) =>
      [...row].forEach((on, x) => {
        if (on !== "1") return;
        const end = [-262 + (l * 6 + x) * 18, 460 - y * 22, -2808],
          start = [mix(-280, 280, random()), mix(245, 555, random()), -2808];
        point(start, random() > 0.9 ? lime : [0.55, 0.9, 1], 13, 4, 0, end);
      }),
    ),
  );
  for (let row = 0; row < 18; row++)
    for (let col = 0; col < 41; col++)
      point([-283 + col * 14, 556 - row * 18, -2810], mul(cyan, 0.55), 9, 5);
  const data = new Float32Array(vertices),
    count = data.length / 13;
  vertices.length = 0;
  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition; attribute vec3 aEnd; attribute vec3 aColor; attribute vec4 aMeta;
    uniform vec3 uEye; uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uForward;
    uniform vec2 uOffset; uniform vec2 uViewport; uniform float uFocal; uniform float uTime;
    uniform float uProgress; uniform float uDpr;
    varying vec3 vColor; varying float vAlpha; varying float vKind; varying float vDigit;
    void main(){
      float kind=aMeta.y; float hello=smoothstep(.84,.985,uProgress); vec3 pos=aPosition;
      if(kind>3.5&&kind<4.5){float converge=smoothstep(aMeta.w*.08,.93,hello);pos=mix(pos,aEnd,converge);pos.y+=sin(uTime*.7+aMeta.w*14.)*8.*(1.-converge);}
      vec3 rel=pos-uEye;float z=dot(rel,uForward);vec2 xy=vec2(dot(rel,uRight),dot(rel,uUp));
      gl_Position=vec4(xy*vec2(uFocal*uViewport.y/uViewport.x,uFocal)+uOffset*z,1.0002*z-2.0002,z);
      if(z<2.)gl_Position=vec4(4.,4.,4.,1.);
      float size=aMeta.x*uViewport.y*uFocal*.5/max(z,5.);
      gl_PointSize=kind>3.5?clamp(size,3.,40.):clamp(size,1.1*uDpr,8.*uDpr);
      float pulse=pow(max(0.,1.-abs(fract(aMeta.z*12.-uTime*.24)-.5)*2.),18.);
      vec3 color=aColor;
      if(kind>.5&&kind<2.5)color*=kind>1.5?(1.1+pulse*7.):(.75+pulse*2.);
      vAlpha=exp(-max(z-400.,0.)*.00029);
      if(kind>2.5)vAlpha*=smoothstep(.48,.72,uProgress);
      // The final shot isolates the receiving end so nearer coils do not hide HELLO.
      float arrival=smoothstep(.84,.98,uProgress);
      if(kind>.5&&kind<2.5)vAlpha*=mix(1.,smoothstep(.76,.88,aMeta.z),arrival);
      if(kind<.5)vAlpha*=mix(1.,.4,arrival);
      if(kind>2.5&&kind<3.5&&pos.z< -2812.&&abs(pos.x)<300.&&pos.y>211.&&pos.y<579.)vAlpha*=1.-arrival;
      if(kind>4.5)vAlpha*=mix(.5,.075,hello);
      if(kind>3.5&&kind<4.5)color*=1.3;
      vColor=color;vKind=kind;vDigit=step(.45,aMeta.w);
    }`;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vColor; varying float vAlpha; varying float vKind; varying float vDigit;
    void main(){vec2 p=gl_PointCoord-.5;float alpha;
      if(vKind>3.5){vec2 q=abs(p);
        float zero=step(q.x,.26)*step(q.y,.4)*(1.-step(q.x,.12)*step(q.y,.24));
        float one=step(q.x,.075)*step(q.y,.4);
        one=max(one,step(abs(p.y-.34),.06)*step(q.x,.25));
        one=max(one,step(abs(p.x+p.y+.28),.075)*step(p.y,-.18)*step(-.36,p.y)*step(p.x,0.));
        alpha=mix(zero,one,vDigit);
      }else{float r=length(p)*2.;if(r>1.)discard;alpha=exp(-r*r*3.)*.85;}
      gl_FragColor=vec4(vColor*alpha*vAlpha,1.);
    }`;
  const quadVertex = `attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=(aPosition+1.)*.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const blurFragment = `precision mediump float;varying vec2 vUV;uniform sampler2D uImage;uniform vec2 uStep;
    void main(){vec3 c=texture2D(uImage,vUV).rgb*.227027;
      c+=(texture2D(uImage,vUV+uStep*1.384615).rgb+texture2D(uImage,vUV-uStep*1.384615).rgb)*.316216;
      c+=(texture2D(uImage,vUV+uStep*3.230769).rgb+texture2D(uImage,vUV-uStep*3.230769).rgb)*.070270;
      gl_FragColor=vec4(c,1.);}`;
  const compositeFragment = `precision mediump float;varying vec2 vUV;uniform sampler2D uImage;uniform sampler2D uGlow;
    void main(){vec3 c=texture2D(uImage,vUV).rgb+texture2D(uGlow,vUV).rgb*2.4;
      float haze=exp(-length((vUV-vec2(.66,.46))*vec2(1.,1.1))*4.);c+=vec3(.012,.03,.055)*haze;c=1.-exp(-c*1.25);
      float vignette=1.-smoothstep(.3,.82,length(vUV-.5))*.65;
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      gl_FragColor=vec4(c*vignette+vec3(.012,.016,.022)+(grain-.5)*.012,1.);}`;
  let renderer,
    width = 1,
    height = 1,
    dpr = 1,
    heroBox,
    endBox,
    stops = [],
    target = 0,
    progress = 0,
    time = 0;
  let paused = body.classList.contains("motion-paused"),
    raf = 0,
    previous = 0,
    lastDraw = 0,
    dirty = true,
    lost = false;
  function program(v, f) {
    const p = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, v],
      [gl.FRAGMENT_SHADER, f],
    ]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        throw new Error("Shader compilation failed");
      }
      gl.attachShader(p, s);
      gl.deleteShader(s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error("Shader linking failed");
    return p;
  }
  function locations(p, names, attributes = false) {
    return Object.fromEntries(
      names.map((n) => [
        n,
        attributes ? gl.getAttribLocation(p, n) : gl.getUniformLocation(p, n),
      ]),
    );
  }
  function textureTarget(w, h) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Incomplete render target");
    return { texture, framebuffer, w, h };
  }
  function initialize() {
    const particles = program(vertexSource, fragmentSource),
      blur = program(quadVertex, blurFragment),
      composite = program(quadVertex, compositeFragment);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    renderer = {
      particles,
      blur,
      composite,
      buffer,
      quad,
      targets: [],
      attr: locations(
        particles,
        ["aPosition", "aEnd", "aColor", "aMeta"],
        true,
      ),
      uniforms: locations(particles, [
        "uEye",
        "uRight",
        "uUp",
        "uForward",
        "uOffset",
        "uViewport",
        "uFocal",
        "uTime",
        "uProgress",
        "uDpr",
      ]),
      blurAttr: locations(blur, ["aPosition"], true),
      blurU: locations(blur, ["uImage", "uStep"]),
      compAttr: locations(composite, ["aPosition"], true),
      compU: locations(composite, ["uImage", "uGlow"]),
    };
    canvas.dataset.renderer = "webgl";
    canvas.dataset.particles = String(count);
    body.classList.add("journey-ready", "journey-webgl");
    measure();
    progress = target;
  }
  function fallback() {
    cancelAnimationFrame(raf);
    raf = 0;
    lost = true;
    body.classList.remove("journey-ready", "journey-webgl");
    canvas.dataset.renderer = "fallback";
  }
  function documentRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height };
  }
  function measure() {
    if (lost || !renderer) return;
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, width < 761 ? 1.25 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    renderer.targets.forEach((t) => {
      gl.deleteFramebuffer(t.framebuffer);
      gl.deleteTexture(t.texture);
    });
    try {
      renderer.targets = [
        textureTarget(canvas.width, canvas.height),
        textureTarget(
          Math.max(1, canvas.width >> 2),
          Math.max(1, canvas.height >> 2),
        ),
        textureTarget(
          Math.max(1, canvas.width >> 2),
          Math.max(1, canvas.height >> 2),
        ),
      ];
    } catch {
      fallback();
      return;
    }
    heroBox = documentRect(hero);
    endBox = documentRect(destination);
    const finish = Math.max(
      1,
      Math.min(
        document.documentElement.scrollHeight - height,
        endBox.y + endBox.height * 0.5 - height * 0.53,
      ),
    );
    stops = [
      [0, 0],
      ...[
        ["work", 0.2],
        ["process", 0.38],
        ["capabilities", 0.54],
        ["about", 0.7],
        ["evidence", 0.84],
      ].map(([id, p]) => [
        Math.min(
          finish - 1,
          Math.max(
            1,
            document.getElementById(id).getBoundingClientRect().top +
              scrollY -
              height * 0.35,
          ),
        ),
        p,
      ]),
      [finish, 1],
    ];
    readScroll();
    dirty = true;
    wake();
  }
  function readScroll() {
    let next = 1;
    for (let i = 1; i < stops.length; i++)
      if (scrollY <= stops[i][0]) {
        const [a, ap] = stops[i - 1],
          [b, bp] = stops[i];
        next = mix(ap, bp, clamp((scrollY - a) / Math.max(1, b - a)));
        break;
      }
    target = next;
    if (paused || reduced.matches) progress = target;
    dirty = true;
    wake();
  }
  function camera(p) {
    const shots = [
      { p: 0, eye: [610, 630, 2050], look: [40, 110, 700] },
      { p: 0.2, eye: [-70, 560, 1120], look: [-90, 170, 30] },
      { p: 0.38, eye: [620, 465, 100], look: [-270, 220, -600] },
      { p: 0.54, eye: [-1020, 550, -710], look: [-40, 200, -1610] },
      { p: 0.7, eye: [850, 560, -1770], look: [20, 235, -2810] },
      { p: 0.84, eye: [460, 490, -1850], look: [80, 290, -2820] },
      { p: 1, eye: [32, 365, -1820], look: [32, 300, -2820] },
    ];
    let a = shots[0],
      b = shots[1];
    for (let i = 1; i < shots.length; i++)
      if (p <= shots[i].p) {
        a = shots[i - 1];
        b = shots[i];
        break;
      }
    const t = ease((p - a.p) / (b.p - a.p));
    let eye = blend(a.eye, b.eye, t),
      look = blend(a.look, b.look, t);
    const arrival = ease((p - 0.84) / 0.16),
      intro = 1 - ease(p / 0.15),
      focal = 1.7;
    const fitDistance = Math.max(
      1000,
      (800 * height * focal * 0.5) / Math.max(200, endBox.width),
    );
    eye = blend(eye, [32, 365, -2820 + fitDistance], arrival);
    if (width < 761 && p < 0.84) eye = add(eye, mul(sub(eye, look), 0.15));
    const forward = norm(sub(look, eye)),
      right = norm(cross(forward, [0, 1, 0])),
      up = norm(cross(right, forward));
    let x = mix(width * 0.65, heroBox.x + heroBox.width * 0.48, intro),
      y = mix(
        height * 0.56,
        heroBox.y - scrollY + heroBox.height * 0.56,
        intro,
      );
    x = mix(x, endBox.x + endBox.width * 0.48, arrival);
    y = mix(y, endBox.y - scrollY + endBox.height * 0.47, arrival);
    if (width < 761 && p < 0.84) x = mix(width * 0.5, x, intro);
    return {
      eye,
      right,
      up,
      forward,
      focal,
      offset: [(x / width) * 2 - 1, 1 - (y / height) * 2],
    };
  }
  function drawQuad(p, attr) {
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.quad);
    gl.enableVertexAttribArray(attr.aPosition);
    gl.vertexAttribPointer(attr.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(attr.aPosition);
  }
  function draw() {
    const r = renderer,
      [scene, horizontal, vertical] = r.targets,
      c = camera(progress),
      u = r.uniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer);
    gl.viewport(0, 0, scene.w, scene.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(r.particles);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    gl.bindBuffer(gl.ARRAY_BUFFER, r.buffer);
    let offset = 0;
    for (const [name, size] of [
      ["aPosition", 3],
      ["aEnd", 3],
      ["aColor", 3],
      ["aMeta", 4],
    ]) {
      gl.enableVertexAttribArray(r.attr[name]);
      gl.vertexAttribPointer(r.attr[name], size, gl.FLOAT, false, 52, offset);
      offset += size * 4;
    }
    gl.uniform3fv(u.uEye, c.eye);
    gl.uniform3fv(u.uRight, c.right);
    gl.uniform3fv(u.uUp, c.up);
    gl.uniform3fv(u.uForward, c.forward);
    gl.uniform2fv(u.uOffset, c.offset);
    gl.uniform2f(u.uViewport, scene.w, scene.h);
    gl.uniform1f(u.uFocal, c.focal);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uProgress, progress);
    gl.uniform1f(u.uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, count);
    Object.values(r.attr).forEach((a) => gl.disableVertexAttribArray(a));
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(r.blur);
    gl.uniform1i(r.blurU.uImage, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, horizontal.framebuffer);
    gl.viewport(0, 0, horizontal.w, horizontal.h);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.uniform2f(r.blurU.uStep, 4 / horizontal.w, 0);
    drawQuad(r.blur, r.blurAttr);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vertical.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, horizontal.texture);
    gl.uniform2f(r.blurU.uStep, 0, 4 / horizontal.h);
    drawQuad(r.blur, r.blurAttr);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, scene.w, scene.h);
    gl.useProgram(r.composite);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.uniform1i(r.compU.uImage, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, vertical.texture);
    gl.uniform1i(r.compU.uGlow, 1);
    drawQuad(r.composite, r.compAttr);
    gl.activeTexture(gl.TEXTURE0);
    const stage =
      progress < 0.3
        ? "01 / TRANSMIT"
        : progress < 0.67
          ? "02 / IN TRANSIT"
          : progress < 0.95
            ? "03 / DECODE"
            : "04 / HELLO";
    if (label.textContent !== stage) label.textContent = stage;
    canvas.dataset.stage = stage
      .split(" / ")[1]
      .toLowerCase()
      .replace(" ", "-");
    canvas.dataset.progress = progress.toFixed(3);
    body.style.setProperty("--journey-progress", progress.toFixed(3));
  }
  function frame(now) {
    raf = 0;
    if (lost || document.hidden || reduced.matches) {
      previous = 0;
      return;
    }
    if (now - lastDraw >= 32 || (paused && dirty) || !lastDraw) {
      const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
      previous = now;
      lastDraw = now;
      if (!paused) {
        time += dt;
        progress = mix(progress, target, 1 - Math.exp(-dt * 9));
      }
      if (Math.abs(progress - target) < 0.001) progress = target;
      draw();
      dirty = false;
    }
    if (!paused) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf && !lost && !document.hidden && !reduced.matches)
      raf = requestAnimationFrame(frame);
  }
  document.addEventListener("signal-motion", ({ detail }) => {
    paused = detail.paused;
    previous = 0;
    canvas.dataset.paused = String(paused);
    if (paused) {
      progress = target;
      cancelAnimationFrame(raf);
      raf = 0;
    }
    dirty = true;
    wake();
  });
  reduced.addEventListener("change", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
    dirty = true;
    wake();
  });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
    wake();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fallback();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    try {
      initialize();
    } catch {
      fallback();
    }
  });
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", measure);
  addEventListener("pageshow", measure);
  canvas.dataset.paused = String(paused);
  try {
    initialize();
    document.fonts.ready.then(measure);
  } catch {
    fallback();
  }
})();
