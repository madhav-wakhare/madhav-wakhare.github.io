/*
 * ASCII banner: redraws assets/banner-girl.webp as coloured blocks of
 * monospace characters, cropped to the bangs and eyes.
 * Each cell takes the average colour of the pixels under it; the glyph is
 * picked from brightness and edge direction, so hair reads as | strokes and
 * lids and brows as - strokes. Transparent pixels show the banner background.
 */
(function () {
  const canvas = document.querySelector("[data-ascii-banner]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const SRC = canvas.dataset.asciiBanner || "assets/banner-girl.webp";
  const FOCUS = { x: 0.47, y: 0.42 };   // point kept in view (between bangs and eyes), 0..1 of the image
  const SPAN = 0.56;                    // share of the image width shown on a wide banner
  const CW = 5, CH = 7;                 // cell size in CSS pixels
  const RAMP = " .:-=+*#%N@";
  const FONT = '700 7.5px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const BG = "#14181c";

  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  const img = new Image();
  img.src = SRC;
  img.onload = () => { render(); canvas.classList.add("ready"); window.addEventListener("resize", render); };

  function render() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const cols = Math.floor(w / CW), rows = Math.floor(h / CH);

    // Crop the image to the banner's aspect, centred on FOCUS.
    const aspect = (cols * CW) / (rows * CH);
    let sw = img.width * SPAN, sh = sw / aspect;
    if (sh > img.height) { sh = img.height; sw = sh * aspect; }
    const sx = Math.max(0, Math.min(img.width - sw, img.width * FOCUS.x - sw / 2));
    const sy = Math.max(0, Math.min(img.height - sh, img.height * FOCUS.y - sh / 2));

    // Downsample: one pixel per cell, averaged by the browser.
    const small = document.createElement("canvas");
    small.width = cols; small.height = rows;
    const sctx = small.getContext("2d");
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
    const px = sctx.getImageData(0, 0, cols, rows).data;
    const at = (x, y) => {
      x = Math.max(0, Math.min(cols - 1, x)); y = Math.max(0, Math.min(rows - 1, y));
      const i = (y * cols + x) * 4;
      return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.font = FONT;
    ctx.textBaseline = "top";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = px[i + 3] / 255;
        if (a < 0.35) {
          if (hash(x, y) > 0.96) { ctx.fillStyle = "#2a3036"; ctx.fillText(".", x * CW, y * CH); }
          continue;
        }
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const lum = at(x, y);
        // Cell block: the pixel's own colour, a little darker so glyphs stand out.
        const dim = lum > 0.5 ? 1 : 0.8;
        ctx.fillStyle = `rgba(${r * dim | 0},${g * dim | 0},${b * dim | 0},${a})`;
        ctx.fillRect(x * CW, y * CH, CW, CH);

        // Glyph: edges get a stroke along the edge, flat areas a brightness ramp.
        const gx = at(x + 1, y) - at(x - 1, y), gy = at(x, y + 1) - at(x, y - 1);
        let ch;
        if (Math.hypot(gx, gy) > 0.24) ch = Math.abs(gx) > Math.abs(gy) * 1.3 ? "|" : Math.abs(gy) > Math.abs(gx) * 1.3 ? "-" : (gx * gy > 0 ? "\\" : "/");
        else if (lum < 0.22) ch = "|l!:"[Math.floor(hash(x, y + 7) * 4)];        // dark hair: strands
        else ch = RAMP[Math.min(RAMP.length - 1, Math.floor(lum * (RAMP.length - 1) + hash(x, y + 99) * 0.8))];

        // Light areas get a darker glyph, dark areas a lighter one, so the picture stays readable.
        const k = lum > 0.5 ? 0.62 : 1, lift = lum > 0.5 ? 0 : 70;
        ctx.fillStyle = `rgba(${Math.min(255, r * k + lift) | 0},${Math.min(255, g * k + lift) | 0},${Math.min(255, b * k + lift) | 0},${a})`;
        ctx.fillText(ch, x * CW, y * CH);
      }
    }
  }
})();
