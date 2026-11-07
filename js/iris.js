/* Liquid iris: the pupil and iris follow the cursor on the welcome screen.
   Idle: the eye wanders by itself. Elsewhere: it stays still. */
(function () {
  var wrap = document.getElementById('iris-bg'),
      svg = document.getElementById('eye'),
      pupil = document.getElementById('pupil'),
      tex = document.getElementById('tex'),
      ret = document.getElementById('ret');
  if (!wrap || !svg || !pupil || !tex) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { if (svg.pauseAnimations) svg.pauseAnimations(); return; }

  var tx = 0, ty = 0, cx = 0, cy = 0, sc = 1, ts = 1, pulse = 0;
  var last = -1e9, px = 0, py = 0, rx = 0, ry = 0, wasHome = null;

  function isHome() { return !!document.querySelector('.hero'); }

  function aim(x, y) {
    var r = svg.getBoundingClientRect();
    if (!r.width) return;
    var dx = (x - (r.left + r.width / 2)) / (r.width / 2),
        dy = (y - (r.top + r.height / 2)) / (r.height / 2),
        d = Math.hypot(dx, dy);
    ts = 0.82 + 0.3 * Math.min(1, d);
    if (d > 1) { dx /= d; dy /= d; }
    tx = dx; ty = dy;
  }

  window.addEventListener('pointermove', function (e) {
    px = e.clientX; py = e.clientY; last = performance.now();
    if (isHome()) { aim(px, py); ret.style.opacity = 1; }
  });
  window.addEventListener('pointerdown', function () { pulse = 1; });
  document.documentElement.addEventListener('pointerleave', function () { ret.style.opacity = 0; });

  function frame(t) {
    var home = isHome();
    if (home !== wasHome) {
      wasHome = home;
      if (svg.pauseAnimations) { home ? svg.unpauseAnimations() : svg.pauseAnimations(); }
    }
    if (!home || !wrap.getClientRects().length) {
      ret.style.opacity = 0;
      requestAnimationFrame(frame);
      return;
    }
    if (t - last > 3500) {
      tx = 0.55 * Math.sin(t / 2300);
      ty = 0.4 * Math.sin(t / 1700 + 1);
      ts = 1 + 0.04 * Math.sin(t / 900);
      ret.style.opacity = 0;
    }
    pulse *= 0.93;
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    sc += ((ts - 0.25 * pulse) - sc) * 0.1;
    pupil.style.transform = 'translate(' + (cx * 80) + 'px,' + (cy * 80) + 'px) scale(' + sc + ')';
    tex.style.transform = 'translate(' + (cx * 28) + 'px,' + (cy * 28) + 'px)';
    rx += (px - rx) * 0.18;
    ry += (py - ry) * 0.18;
    ret.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
