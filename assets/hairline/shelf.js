/**
 * Shelf: a rounded tray of six index cards, one per tool in an SRE's kit,
 * filed front to back from Linux up to observability. The card under the
 * pointer stands up and lifts; the ones in front lean forward and the ones
 * behind lean back, staggered outwards from it. Each card's place is punched
 * on its tab in a 3 x 2 grid; its tool's name goes to the read-out.
 * The slider is the stagger, in ms. Built on the Riffle pattern.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register,
} = HL;

const N = 6, W = 84, H = 54, G = 15, TW = 22, TH = 7, TABS = [6, 31, 56], TK = 1.4;
const REST = -12, BACK = -24, FWD = 20, LIFT = 18;
const TOOLS = ["linux", "docker", "kubernetes", "aws", "azure", "signoz · otel"];
const X0 = -5, X1 = W + 5, Y0 = -9, Y1 = (N - 1) * G + 9, WH = 20, WR = 6, WT = 2.4;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The tray, which never moves: `far` is painted before the cards, `near` after them; each entry is [d, class]. */
function tray(P, front, outer, inner) {
  // far half: body, the rim's inner edge, and the floor seam along the far walls
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), "nf lo"],
  ];
  // near half: one opaque piece from the rim's inner edge down to the floor
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  // a finger pull, set into the front
  const hx = (X0 + X1) / 2, onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    [poly(onFront(rrect(hx - 11, 6.5, hx + 11, 12.5, 3, 5))), "nf"],
    [poly(onFront(rrect(hx - 9.4, 8, hx + 9.4, 11, 1.5, 5))), "nf lo"],
  ];
  return { far, near };
}

// Outline icons per tool, unit coords (y up), as [points, closed]; drawn on the card face. Departs from rule 10 at the owner's request.
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, k) => { const a = rad(a0 + ((a1 - a0) * k) / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const ring = (cx, cy, rx, ry) => [arc(cx, cy, rx, ry, 0, 360, 24), true];
const box = (x, y, w, h) => [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true];
const ICONS = [
  // linux: a penguin
  [ring(0, 0.6, 0.32, 0.32), ring(0, -0.22, 0.62, 0.72), ring(0, -0.32, 0.36, 0.5),
   [[[-0.12, 0.5], [0, 0.4], [0.12, 0.5]], false],
   [[[-0.5, -0.96], [-0.14, -0.96]], false], [[[0.14, -0.96], [0.5, -0.96]], false]],
  // docker: a whale carrying containers
  [box(-0.66, -0.1, 0.26, 0.26), box(-0.38, -0.1, 0.26, 0.26), box(-0.1, -0.1, 0.26, 0.26), box(0.18, -0.1, 0.26, 0.26),
   box(-0.38, 0.18, 0.26, 0.26), box(-0.1, 0.18, 0.26, 0.26), box(-0.1, 0.46, 0.26, 0.26),
   [[[-0.95, -0.12], [-0.85, -0.45], [-0.55, -0.7], [0, -0.76], [0.45, -0.6], [0.75, -0.12], [0.86, 0.06], [0.97, -0.04]], false],
   [[[-0.95, -0.12], [0.75, -0.12]], false]],
  // kubernetes: a seven-spoke helm
  (() => {
    const hept = [];
    for (let k = 0; k < 7; k++) { const a = rad(90 + (360 * k) / 7); hept.push([Math.cos(a) * 0.95, Math.sin(a) * 0.95]); }
    const spokes = hept.map(([x, y]) => [[[x * 0.27, y * 0.27], [x * 0.72, y * 0.72]], false]);
    return [[hept, true], ring(0, 0, 0.27, 0.27), ring(0, 0, 0.72, 0.72), ...spokes];
  })(),
  // aws: a cloud with a smile-arrow under it
  [[[[-0.85, -0.05], ...arc(-0.45, 0.14, 0.3, 0.3, 190, 75), ...arc(0.05, 0.32, 0.4, 0.4, 160, 20), ...arc(0.5, 0.12, 0.3, 0.3, 95, -20), [0.85, -0.05]], true],
   [arc(0, 0.12, 0.72, 0.6, 222, 318), false],
   [[[0.36, -0.22], [0.54, -0.28], [0.5, -0.1]], false]],
  // azure: two blades leaning into an A
  [[[[-0.8, -0.8], [-0.12, 0.85], [0.18, 0.85], [-0.36, -0.8]], true],
   [[[0.06, 0.3], [0.82, -0.8], [-0.12, -0.8], [0.3, -0.5]], true]],
  // signoz / opentelemetry: a telescope on a tripod
  [[[[-0.85, 0.08], [0.6, 0.66], [0.76, 0.28], [-0.7, -0.3]], true],
   [[[0.42, 0.59], [0.58, 0.21]], false],
   [[[-0.02, 0.12], [-0.48, -0.92]], false], [[[-0.02, 0.12], [0.44, -0.92]], false], [[[-0.02, 0.12], [-0.02, -0.92]], false]],
];
const IC = { u: W / 2, v: 32, s: 10 };

/** Card i, back to front: its number (6 at the back), which of three tab positions it takes, and its filleted outline, upright in its own plane. */
function card(i) {
  const n = N - i, t0 = TABS[(N - 1 - i) % 3];
  const shape = fillet(
    [[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]],
    [1, 1, 3.2, 1.8, 2.4, 2.4, 1.8, 3.2],
  );
  return { n, t0, shape };
}

/** Card i leaning th degrees (negative leans back) and lifted by `lift`: its paths, and where its eight punches sit. */
function pose(P, i, n, t0, shape, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  const punch = [];
  for (let k = 0; k < 6; k++) punch.push(w(t0 + TW / 2 + ((k % 3) - 1) * 4.4, H + TH / 2 + (0.5 - Math.floor(k / 3)) * 2.8));
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    head: seg(w(6, H - 6), w(W - 6, H - 6)),
    rules: ICONS[n - 1].map(([pts, closed]) => (closed ? poly : open)(pts.map(([x, y]) => w(IC.u + x * IC.s, IC.v + y * IC.s)))).join(""),
    punch,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // The camera is fitted to the tray with a card lifted, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[X0, Y0, 0], [X1, Y1, -8], [X1, Y0, 0], [X0, Y1, 0], [X0, Y0, H + TH], [X1, Y0, H + TH + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 14);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const cards = [];
  for (let i = 0; i < N; i++) {
    const { n, t0, shape } = card(i);
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const head = mk("path", { class: "nf" }, grp), rules = mk("path", { class: "nf" }, grp);
    // the card's number, punched in a 3 × 2 grid on its tab
    const punch = [];
    for (let k = 0; k < 6; k++) punch.push(mk("circle", { r: 1.05, class: "dot " + (k === n - 1 ? "m" : "off") }, grp));
    cards.push({ n, t0, shape, back, face, head, rules, punch, a: tween(REST), z: tween(0) });
  }

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // hit bands: oblique strips along the RESTING top edges. They never move, and nothing draws them.
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];

  /** The card whose band holds the point, in the band's own (s, r) coordinates; -1 outside. */
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const cd = cards[i], q = pose(P, i, cd.n, cd.t0, cd.shape, th, lift);
    cd.back.setAttribute("d", q.back);
    cd.face.setAttribute("d", q.face);
    cd.head.setAttribute("d", q.head);
    cd.rules.setAttribute("d", q.rules);
    cd.punch.forEach((el, k) => place(el, q.punch[k]));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    cards.forEach((cd, i) => { draw(i, tval(cd.a, now), tval(cd.z, now)); if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  const caption = (a) => (a < 0 ? "rest" : TOOLS[N - 1 - a]);
  /** Pulls card a (-1 puts them all back). The stagger spreads out from the card pulled, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    cards.forEach((cd, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      tset(cd.a, th, now, delay); tset(cd.z, a === i ? LIFT : 0, now, delay);
      cd.face.classList.toggle("hi", i === a); cd.head.classList.toggle("hi", i === a); cd.rules.classList.toggle("hi", i === a); cd.punch[cd.n - 1].classList.toggle("m", i !== a);
    });
    read.textContent = caption(a);
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "shelf",
  means: "Six tools filed in a tray, Linux to observability: the card under the pointer stands up, its neighbours lean away.",
  rules: [1, 2, 8],
  range: [0, 40, 90],
  tour: [[160, 160], [200, 120], [280, 120], null],
  mount,
});
