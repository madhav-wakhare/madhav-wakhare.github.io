/**
 * Stack: an SRE's toolchain as a stack of plates. Linux is the bedrock slab,
 * Docker a tray of containers, Kubernetes a flat seven-spoke wheel, then two
 * cloud plates side by side (AWS, Azure), and an observability dish
 * (SigNoz / OpenTelemetry) on top, watching everything below. The pointer
 * picks a layer: everything above it lifts away, staggered outwards, so its
 * top shows, and its edge turns bright. The slider is the lift, in world units.
 */
const {
  Cam, circ, clamp, facing, fit, proj, prism, rings, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, solid, put, register, pointer,
} = HL;

const W = 90, CX = 45, CY = 45;
// rest pose: each part's base height; the gaps between levels are uneven on purpose (rule 05)
const Z = { linux: 0, docker: 20, k8s: 44, cloud: 61, otel: 80 };
const TOP = [10, 31, 50, 67, 90];            // each level's rest top, for the hit test
const NAMES = ["linux", "docker", "kubernetes", "aws", "azure", "signoz · otel"];
const LEVEL = [0, 1, 2, 3, 3, 4];            // part -> level
const RAISE = 0.35;                          // the chosen part lifts this share of the lift

/** A circular ring centred on the plate. */
const disc = (r, n = 32) => circ(r, n).map((q) => ({ ...q, u: q.u + CX, v: q.v + CY }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;

  const C = Cam(45, 0.5, 1.6);
  fit(C, [[0, 0, 0], [W, W, 0], [W, 0, 0], [0, W, 0], [0, 0, 90 + 30], [W, W, 90 + 30]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // Each part: a list of solids (ring, inner, z0, z1 relative to the part's base) and extra marks.
  const box = (x0, y0, x1, y1, r, b, z0, z1) => { const [ring, inner] = rings(x0, y0, x1, y1, r, b); return { ring, inner, z0, z1 }; };
  const round = (r, b, z0, z1) => ({ ring: disc(r), inner: disc(r - b), z0, z1 });

  const crates = [];
  for (const y0 of [10, 36, 62]) for (const x0 of [8, 48]) crates.push(box(x0, y0, x0 + 34, y0 + 18, 2.5, 1, 4, 11));
  crates.sort((a, b) => a.ring[0].u + a.ring[0].v - (b.ring[0].u + b.ring[0].v));

  const defs = [
    { base: Z.linux, solids: [box(0, 0, W, W, 8, 2, 0, 10)] },
    { base: Z.docker, solids: [box(2, 2, W - 2, W - 2, 7, 1.6, 0, 4), ...crates], ribs: true },
    { base: Z.k8s, solids: [box(2, 2, W - 2, W - 2, 7, 1.6, 0, 4), round(32, 1.4, 4, 6)], spokes: true, hub: round(8, 1, 6, 8) },
    { base: Z.cloud, solids: [box(0, 0, 42, W, 6, 1.6, 0, 6)], grooves: "aws" },
    { base: Z.cloud, solids: [box(48, 0, W, W, 6, 1.6, 0, 6)], grooves: "azure" },
    { base: Z.otel, solids: [round(5, 0.8, 0, 7), round(20, 1.6, 7, 10)], beacon: true },
  ];

  // Paint bottom to top; within a part, back to front (rule 06).
  const parts = defs.map((d) => {
    const grp = mk("g", {}, g);
    const p = { ...d, grp, el: [], marks: null, dot: null, off: tween(0) };
    d.solids.forEach((s, k) => {
      p.el.push(solid(grp));
      if (k === 1 && d.spokes) p.marks = mk("path", { class: "nf lo" }, grp);
    });
    if (d.ribs || d.grooves) p.marks = mk("path", { class: "nf lo" }, grp);
    if (d.hub) p.hubEl = solid(grp);
    if (d.beacon) p.dot = mk("circle", { r: 1.6, class: "dot" }, grp);
    return p;
  });

  function draw(p, z) {
    p.solids.forEach((s, k) => put(p.el[k], prism(P, front, s.ring, s.inner, z + s.z0, z + s.z1)));
    if (p.ribs) {
      // container ribs on each crate's front long face
      let d = "";
      for (const s of p.solids.slice(1)) {
        const x0 = s.ring.reduce((m, q) => Math.min(m, q.u), 1e9), y1 = s.ring.reduce((m, q) => Math.max(m, q.v), -1e9);
        for (let i = 1; i < 6; i++) d += seg(P(x0 + i * 5.7, y1, z + s.z0 + 1.5), P(x0 + i * 5.7, y1, z + s.z1 - 1.5));
      }
      p.marks.setAttribute("d", d);
    }
    if (p.spokes) {
      let d = "";
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        d += seg(P(CX + Math.cos(a) * 9, CY + Math.sin(a) * 9, z + 6), P(CX + Math.cos(a) * 29, CY + Math.sin(a) * 29, z + 6));
      }
      p.marks.setAttribute("d", d);
      put(p.hubEl, prism(P, front, p.hub.ring, p.hub.inner, z + p.hub.z0, z + p.hub.z1));
    }
    if (p.grooves) {
      let d = "";
      if (p.grooves === "aws") for (const x of [12, 21, 30]) d += seg(P(x, 14, z + 6), P(x, W - 14, z + 6));
      else for (const y of [30, 60]) d += seg(P(60, y, z + 6), P(W - 10, y, z + 6));
      p.marks.setAttribute("d", d);
    }
    if (p.dot) { const q = P(CX, CY, z + 10); p.dot.setAttribute("cx", q[0]); p.dot.setAttribute("cy", q[1]); }
  }

  const last = parts.map(() => NaN);
  const B = register(stage, (_dt, now) => {
    let moving = false;
    parts.forEach((p, i) => {
      const z = p.base + tval(p.off, now);
      if (z !== last[i]) { draw(p, z); last[i] = z; }
      if (!tdone(p.off, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  // Hit test on the REST pose (rule 01): the level whose rest top centre is nearest the pointer's
  // screen height, if the pointer lands on that level's footprint; on the cloud level, x picks the plate.
  const mid = TOP.map((z) => P(CX, CY, z)[1]);
  function hit([sx, sy]) {
    let l = 0;
    mid.forEach((m, k) => { if (Math.abs(sy - m) < Math.abs(sy - mid[l])) l = k; });
    const [x, y] = unproj(C, sx, sy, TOP[l]);
    if (x < -8 || y < -8 || x > W + 8 || y > W + 8) return -1;
    if (l < 3) return l;
    if (l === 4) return 5;
    return x < 45 ? 3 : 4;
  }

  let act = -1;
  function retarget(a, from) {
    const now = performance.now(), la = a < 0 ? -1 : LEVEL[a], lf = from < 0 ? 0 : LEVEL[from];
    parts.forEach((p, i) => {
      const li = LEVEL[i], t = a < 0 ? 0 : i === a ? lift * RAISE : li > la ? lift : 0;
      tset(p.off, clamp(t, 0, 30), now, Math.abs(li - lf) * 45);
    });
    B.wake();
  }
  function setActive(a) {
    if (a === act) return;
    const from = a >= 0 ? a : act;
    act = a;
    parts.forEach((p, i) => {
      p.el.forEach((s) => s.sil.classList.toggle("hi", i === a));
      if (p.hubEl) p.hubEl.sil.classList.toggle("hi", i === a);
    });
    parts[5].dot.setAttribute("class", a < 0 || a === 5 ? "dot" : "dot off");
    read.textContent = a < 0 ? "rest" : NAMES[a];
    retarget(a, from);
  }

  read.textContent = "rest";
  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; if (act >= 0) retarget(act, act); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "stack",
  means: "A toolchain as a stack of plates, Linux up to observability: the layer under the pointer opens up and lights.",
  rules: [1, 2, 5, 10],
  range: [10, 20, 30],
  tour: [[200, 236], [200, 180], [200, 124], null],
  mount,
});
