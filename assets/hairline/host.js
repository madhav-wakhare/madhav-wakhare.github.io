/*
 * A small host for one Hairline figure on this site. It does what the Hairline
 * bench does for a figure (makes the svg, hands over a read-out, mounts it),
 * without the bench's slider and buttons. The figure plays its tour once when
 * it scrolls into view, then waits for the pointer.
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
    set textContent(v) { if (label) label.textContent = v === "rest" ? "hover a layer" : v; },
  };
  figure.mount({ stage: stage, svg: svg, read: read }, figure.range[1]);
  read.textContent = "rest";

  if (figure.tour && "IntersectionObserver" in window && !HL.reducedMotion()) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t = HL.tour(stage, figure.tour, function (i) {
        if (i === figure.tour.length - 1) setTimeout(function () { t.stop(); }, 0);
      });
    }, { threshold: 0.6 });
    io.observe(stage);
  }
};
