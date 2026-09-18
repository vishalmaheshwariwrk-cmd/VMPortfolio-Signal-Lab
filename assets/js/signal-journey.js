(() => {
  "use strict";
  const canvas = document.querySelector("#signal-canvas");
  const ctx = canvas?.getContext("2d", { alpha: false });
  const hero = document.querySelector(".signal-visual");
  const destination = document.querySelector(".journey-destination");
  if (!ctx || !hero || !destination) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const label = document.querySelector("[data-journey-label]");
  const body = document.body;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (n) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  };
  const blend = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const controls = [
    [-2400, 340, -180],
    [-2060, 250, -90],
    [-1830, 70, 170],
    [-1860, -150, 190],
    [-1570, -170, -80],
    [-1430, 60, -150],
    [-1540, 230, 60],
    [-1240, 260, 200],
    [-1010, 60, 60],
    [-950, -100, -150],
    [-710, -30, -100],
    [-650, 200, 90],
    [-400, 220, 100],
    [-290, 100, 20],
    [-224, 80, 20],
  ];
  // A continuous cable in world space; the scroll moves the camera along it.
  function cable(t) {
    const at = clamp(t) * (controls.length - 1);
    const i = Math.min(controls.length - 2, Math.floor(at));
    const f = at - i;
    const a = controls[Math.max(0, i - 1)];
    const b = controls[i];
    const c = controls[i + 1];
    const d = controls[Math.min(controls.length - 1, i + 2)];
    return b.map(
      (v, j) =>
        0.5 *
        (2 * v +
          (-a[j] + c[j]) * f +
          (2 * a[j] - 5 * v + 4 * c[j] - d[j]) * f * f +
          (-a[j] + 3 * v - 3 * c[j] + d[j]) * f * f * f),
    );
  }
  const samples = Array.from({ length: 321 }, (_, i) => cable(i / 320));
  const glyphs = [
    ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  ];
  // All particles have fixed identities, so scrubbing never creates new objects.
  const bits = [];
  glyphs.forEach((rows, letter) =>
    rows.forEach((row, y) =>
      [...row].forEach((on, x) => {
        if (on === "1") bits.push({ x: letter * 6 + x, y, seed: bits.length });
      }),
    ),
  );
  const stars = Array.from({ length: 100 }, (_, i) => ({
    x: ((i * 731) % 997) / 997,
    y: ((i * 383) % 991) / 991,
    depth: 0.15 + ((i * 97) % 100) / 100,
  }));

  let width = 1,
    height = 1,
    dpr = 1,
    mobile = false;
  let heroBox,
    endBox,
    stops = [],
    target = 0,
    progress = 0,
    time = 0;
  let raf = 0,
    previous = 0,
    lastDraw = 0,
    dirty = true;
  let paused = body.classList.contains("motion-paused");
  let camera = {
    focus: [0, 0, 0],
    x: 0,
    y: 0,
    scale: 1,
    yaw: 0,
    pitch: 0,
    roll: 0,
  };

  function rectInDocument(element) {
    const r = element.getBoundingClientRect();
    return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height };
  }
  function measure() {
    width = innerWidth;
    height = innerHeight;
    mobile = width <= 760;
    // Limit backing resolution and draw at 30fps, including high-DPI phones.
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    heroBox = rectInDocument(hero);
    endBox = rectInDocument(destination);
    const maxScroll = document.documentElement.scrollHeight - height;
    const finish = Math.max(
      1,
      Math.min(maxScroll, endBox.y + endBox.height * 0.5 - height * 0.53),
    );
    stops = [
      [0, 0],
      ...[
        ["work", 0.23],
        ["process", 0.4],
        ["capabilities", 0.55],
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
    const y = scrollY;
    let next = 1;
    for (let i = 1; i < stops.length; i++) {
      if (y <= stops[i][0]) {
        const [startY, startP] = stops[i - 1],
          [endY, endP] = stops[i];
        next = mix(
          startP,
          endP,
          clamp((y - startY) / Math.max(1, endY - startY)),
        );
        break;
      }
    }
    target = next;
    // Paused/reduced views have no camera travel. Contact remains a static greeting.
    if (paused || reduced.matches) progress = target;
    dirty = true;
    wake();
  }
  function project(point) {
    let [x, y, z] = point.map((v, i) => v - camera.focus[i]);
    const cy = Math.cos(camera.yaw),
      sy = Math.sin(camera.yaw);
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const cp = Math.cos(camera.pitch),
      sp = Math.sin(camera.pitch);
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    const cr = Math.cos(camera.roll),
      sr = Math.sin(camera.roll);
    [x, y] = [x * cr - y * sr, x * sr + y * cr];
    const size = (camera.scale * 1500) / Math.max(650, 1500 + z);
    return { x: camera.x + x * size, y: camera.y + y * size, size };
  }
  function line(points, color, weight) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  }
  function polygon(points, fill, stroke = "#647b85") {
    const p = points.map(project);
    ctx.beginPath();
    p.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function setCamera(p) {
    const arrival = ease((p - 0.72) / 0.28);
    const focus = blend(
      cable(mix(0.31, 0.96, ease(p / 0.85))),
      [55, 15, 0],
      arrival,
    );
    const heroWeight = 1 - ease(p / 0.15);
    const endWeight = ease((p - 0.82) / 0.18);
    const introX = heroBox.x + heroBox.width * 0.52;
    const introY = heroBox.y - scrollY + heroBox.height * 0.55;
    const endX = endBox.x + endBox.width * 0.5;
    const endY = endBox.y - scrollY + endBox.height * 0.46;
    const middleX = width * (mobile ? 0.7 : 0.77);
    const middleY = height * 0.57;
    const scale = mobile
      ? Math.min(0.66, width / 760)
      : Math.min(1.25, width / 1280);
    camera = {
      focus,
      x: mix(mix(middleX, introX, heroWeight), endX, endWeight),
      y: mix(mix(middleY, introY, heroWeight), endY, endWeight),
      scale: mix(
        scale,
        Math.min(endBox.width / 660, endBox.height / 500),
        endWeight,
      ),
      yaw: mix(-0.38 + Math.sin(p * 5.2) * 0.45, -0.08, arrival),
      pitch: mix(0.18 + Math.sin(p * 4) * 0.17, -0.04, arrival),
      roll: mix(-0.2 + Math.sin(p * 5) * 0.32, -0.025, arrival),
    };
  }
  function drawCable(p) {
    const path = samples.map(project);
    const weight = camera.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    line(path, "#73e7ff05", 68 * weight);
    line(path, "#73e7ff09", 40 * weight);
    line(path, "#243039", 24 * weight);
    line(path, "#09141c", 20 * weight);
    line(path, "#4c6274", 13 * weight);
    line(path, "#122330", 11 * weight);
    const colors = ["#73e7ff", "#ff5edb", "#c7ff4a"];
    for (let lane = 0; lane < 3; lane++) {
      const offset = (lane - 1) * 5;
      const fiber = samples.map(([x, y, z]) => project([x, y + offset, z + 3]));
      line(fiber, colors[lane] + "35", 1.3 * weight);
      for (let packet = 0; packet < 7; packet++) {
        const t = (packet / 7 + time * 0.027 + lane * 0.022 + p * 0.17) % 1;
        const trail = Array.from({ length: 10 }, (_, i) => {
          const point = cable(clamp(t - 0.018 + i * 0.002));
          point[1] += offset;
          point[2] += 3;
          return project(point);
        });
        line(trail, colors[lane] + "16", 14 * weight);
        line(trail, colors[lane] + "65", 5 * weight);
        line(trail, colors[lane], 1.8 * weight);
        const head = trail[9];
        ctx.fillStyle = "#e5ffff";
        ctx.beginPath();
        ctx.arc(head.x, head.y, Math.max(1, 2 * head.size), 0, Math.PI * 2);
        ctx.fill();
        if (lane === 0) {
          ctx.font = `${Math.max(9, 11 * head.size)}px Consolas, monospace`;
          ctx.fillStyle = "#8cdae4";
          ctx.fillText(packet % 2 ? "01" : "10", head.x + 8, head.y - 12);
        }
      }
    }
    // Sleeve bands provide depth without a texture download.
    for (let i = 8; i < path.length - 3; i += 9) {
      const a = path[i - 1],
        b = path[i + 1],
        at = path[i];
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      const dx = Math.cos(angle) * 12 * at.size,
        dy = Math.sin(angle) * 12 * at.size;
      line(
        [
          { x: at.x - dx, y: at.y - dy },
          { x: at.x + dx, y: at.y + dy },
        ],
        "#a8e6ec38",
        Math.max(0.6, at.size),
      );
    }
  }
  function drawMonitor(p) {
    const visibility = ease((p - 0.59) / 0.15);
    if (!visibility) return;
    ctx.save();
    ctx.globalAlpha = visibility;
    // Monitor chassis, stand and base share the cable's 3D coordinate system.
    polygon(
      [
        [-15, 100, -18],
        [100, 100, -18],
        [118, 226, 0],
        [-36, 226, 0],
      ],
      "#18232b",
    );
    polygon(
      [
        [-108, 226, 65],
        [185, 226, 65],
        [148, 215, -55],
        [-73, 215, -55],
      ],
      "#263640",
    );
    polygon(
      [
        [-108, 226, 65],
        [185, 226, 65],
        [185, 234, 65],
        [-108, 234, 65],
      ],
      "#101a22",
      "#3e535f",
    );
    polygon(
      [
        [-232, -224, -28],
        [332, -224, -28],
        [332, 121, -28],
        [-232, 121, -28],
      ],
      "#202e38",
    );
    polygon(
      [
        [332, -224, -28],
        [345, -211, 30],
        [345, 134, 30],
        [332, 121, -28],
      ],
      "#0c171e",
    );
    polygon(
      [
        [-232, -224, -28],
        [-219, -211, 30],
        [345, -211, 30],
        [332, -224, -28],
      ],
      "#364951",
      "#799298",
    );

    // A planar transform keeps every binary glyph attached to the screen.
    const origin = project([-219, -211, 30]);
    const right = project([345, -211, 30]);
    const bottom = project([-219, 134, 30]);
    ctx.transform(
      (right.x - origin.x) / 564,
      (right.y - origin.y) / 564,
      (bottom.x - origin.x) / 345,
      (bottom.y - origin.y) / 345,
      origin.x,
      origin.y,
    );
    const bezel = ctx.createLinearGradient(0, 0, 564, 345);
    bezel.addColorStop(0, "#31434e");
    bezel.addColorStop(0.4, "#17242e");
    bezel.addColorStop(1, "#101a22");
    ctx.fillStyle = bezel;
    ctx.beginPath();
    ctx.roundRect(0, 0, 564, 345, 13);
    ctx.fill();
    ctx.strokeStyle = "#6a8895";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#020a0e";
    ctx.beginPath();
    ctx.roundRect(15, 15, 534, 300, 6);
    ctx.fill();
    ctx.save();
    ctx.clip();
    const glow = ctx.createRadialGradient(280, 160, 10, 280, 160, 300);
    glow.addColorStop(0, "#0b2d36");
    glow.addColorStop(1, "#020a0e");
    ctx.fillStyle = glow;
    ctx.fillRect(15, 15, 534, 300);
    const greeting = ease((p - 0.86) / 0.12);
    const tick = Math.floor(time * 3);
    ctx.font = "10px Consolas, monospace";
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 45; col++) {
        ctx.fillStyle = `rgba(115,231,255,${(1 - greeting * 0.9) * (0.12 + ((row * 7 + col * 13) % 9) / 28)})`;
        ctx.fillText(
          (col * 3 + row * 7 + tick + (col % 3)) % 2 ? "1" : "0",
          30 + col * 11.4,
          49 + row * 16,
        );
      }
    }
    // Scattered bits converge into five 5×7 letterforms as Contact enters view.
    ctx.font = "bold 14px Consolas, monospace";
    bits.forEach(({ x, y, seed }) => {
      const finalX = 54 + x * 16,
        finalY = 116 + y * 18;
      const startX = 36 + ((seed * 127) % 480);
      const startY = 75 + ((seed * 71 + time * 13) % 210);
      const converge = ease((greeting - (seed % 5) * 0.035) / 0.86);
      ctx.fillStyle = seed % 7 === 0 ? "#c7ff4a" : "#99f3ff";
      ctx.globalAlpha = visibility * mix(0.45, 1, converge);
      ctx.fillText(
        seed % 3 === 0 ? "0" : "1",
        mix(startX, finalX, converge),
        mix(startY, finalY, converge),
      );
    });
    ctx.globalAlpha = visibility;
    ctx.fillStyle = "#8cadb7";
    ctx.font = "10px Consolas, monospace";
    ctx.fillText(
      greeting > 0.96
        ? "SIGNAL RECEIVED  /  LET'S TALK"
        : "DECODING INCOMING SIGNAL...",
      34,
      42,
    );
    if (greeting > 0.8) {
      ctx.fillStyle = "#7eadb8";
      ctx.font = "9px Consolas, monospace";
      ctx.fillText("01001000  01000101  01001100  01001100  01001111", 65, 274);
    }
    ctx.fillStyle = "#9af0ff05";
    for (let y = 20; y < 315; y += 4) ctx.fillRect(15, y, 534, 1);
    ctx.restore();
    ctx.fillStyle = "#8095a3";
    ctx.font = "8px Consolas, monospace";
    ctx.fillText("VM / SIGNAL TERMINAL", 222, 333);
    ctx.fillStyle = "#c7ff4a";
    ctx.beginPath();
    ctx.arc(531, 331, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Connector at the monitor's left edge. The glowing core feeds the screen.
    polygon(
      [
        [-258, 68, 20],
        [-213, 68, 20],
        [-213, 93, 20],
        [-258, 93, 20],
      ],
      "#314955",
      "#85c4d3",
    );
    const port = project([-217, 80, 25]);
    ctx.fillStyle = "#73e7ff";
    ctx.beginPath();
    ctx.arc(port.x, port.y, 3 * port.size, 0, Math.PI * 2);
    ctx.fill();
  }
  function draw() {
    setCamera(progress);
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, width, height);
    const halo = ctx.createRadialGradient(
      camera.x,
      camera.y,
      0,
      camera.x,
      camera.y,
      width * 0.7,
    );
    halo.addColorStop(0, "#0d263440");
    halo.addColorStop(0.5, "#10132924");
    halo.addColorStop(1, "#07090d00");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
    stars.forEach((s) => {
      ctx.fillStyle = `rgba(125,182,204,${0.09 + s.depth * 0.1})`;
      ctx.fillRect(
        (s.x * width + progress * 90 * s.depth) % width,
        (s.y * height - progress * 130 * s.depth + height) % height,
        1,
        1,
      );
    });
    drawCable(progress);
    drawMonitor(progress);
    const stage =
      progress < 0.3
        ? "01 / TRANSMIT"
        : progress < 0.67
          ? "02 / IN TRANSIT"
          : progress < 0.95
            ? "03 / DECODE"
            : "04 / HELLO";
    if (label.textContent !== stage) label.textContent = stage;
    body.style.setProperty("--journey-progress", progress.toFixed(3));
    canvas.dataset.stage = stage
      .split(" / ")[1]
      .toLowerCase()
      .replace(" ", "-");
    canvas.dataset.progress = progress.toFixed(3);
  }
  function frame(now) {
    raf = 0;
    if (document.hidden || reduced.matches) {
      previous = 0;
      return;
    }
    if (now - lastDraw >= 32 || (paused && dirty) || !lastDraw) {
      const dt = previous ? Math.min((now - previous) / 1000, 0.08) : 0;
      previous = now;
      lastDraw = now;
      if (!paused) {
        time += dt;
        progress = mix(progress, target, 1 - Math.exp(-dt * 10));
      }
      // A paused scene switches to the appropriate static composition on scroll.
      if (Math.abs(progress - target) < 0.001) progress = target;
      draw();
      dirty = false;
    }
    if (!paused) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf && !document.hidden && !reduced.matches)
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
    if (reduced.matches) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      previous = 0;
      dirty = true;
      wake();
    }
  });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
    wake();
  });
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", measure);
  addEventListener("pageshow", measure);
  body.classList.add("journey-ready");
  canvas.dataset.paused = String(paused);
  measure();
  progress = target;
  document.fonts.ready.then(measure);
})();
