/*
 * A small host for one Hairline figure on this site. It does what the Hairline
 * bench does for a figure (makes the svg, hands over a read-out, mounts it),
 * without the bench's slider and buttons.
 *
 * The auto-play here is the site's own: when the figure first scrolls into
 * view it steps to each stop of the figure's tour in turn, jumping straight
 * there (no sweep across the cards in between), holds each for a moment, then
 * lets go. A real pointer on the figure ends it at once.
 */
window.hairline = function (figure) {
  var stage = document.querySelector('[data-hairline-host="' + figure.name + '"]');
  if (!stage) return;
  var label = stage.parentNode.querySelector("[data-hairline-read]");
  HL.inject(document);
  stage.setAttribute("data-hairline", figure.name);
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", figure.means);
  var svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
  var read = {
    set textContent(v) { if (label) label.textContent = v === "rest" ? "hover a card" : v; },
  };
  figure.mount({ stage: stage, svg: svg, read: read }, figure.range[1]);
  read.textContent = "rest";

  var stops = (figure.tour || []).filter(Boolean);
  if (!stops.length || HL.reducedMotion() || !("IntersectionObserver" in window)) return;

  var HOLD_MS = 1500, timer = 0, playing = false;
  function send(type, p) {
    var r = stage.getBoundingClientRect(), init = { pointerType: "mouse", pointerId: 99, bubbles: true };
    if (p) { init.clientX = r.left + (p[0] / 400) * r.width; init.clientY = r.top + (p[1] / 320) * r.height; }
    stage.dispatchEvent(new PointerEvent(type, init));
  }
  function stop() {
    if (!playing) return;
    playing = false;
    clearTimeout(timer);
  }
  function step(i) {
    if (!playing) return;
    if (i >= stops.length) { send("pointerleave"); playing = false; return; }
    send("pointermove", stops[i]);
    timer = setTimeout(function () { step(i + 1); }, HOLD_MS);
  }
  // a real hand takes over immediately
  stage.addEventListener("pointerenter", function (e) { if (e.isTrusted) stop(); });
  stage.addEventListener("pointerdown", function (e) { if (e.isTrusted) stop(); });

  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    playing = true;
    timer = setTimeout(function () { step(0); }, 600);
  }, { threshold: 0.6 });
  io.observe(stage);
};
