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

  /* body[data-route] lets the CSS style each screen (home, new, learn...) */
  function setRoute() {
    var h = location.hash.replace(/^#\/?/, '').split(/[\/?]/)[0];
    document.body.dataset.route = h || 'home';
  }
  setRoute();
  window.addEventListener('hashchange', setRoute);

  /* the eye is alive on the welcome screen and on the name screen */
  function isHome() { return !!document.querySelector('.hero') || /^(new|setup)$/.test(document.body.dataset.route); }

  /* setup screen: picking an option makes the eye blink */
  document.addEventListener('click', function (e) {
    if (document.body.dataset.route === 'setup' && e.target.closest('.choice')) pulse = 0.9;
  });

  /* name screen: every keystroke makes the pupil contract a little */
  document.addEventListener('input', function (e) {
    if (e.target.tagName === 'INPUT' && document.body.dataset.route === 'new') pulse = 0.8;
  });

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
    /* name screen: while the field is focused, the eye looks at it */
    var f = document.activeElement;
    if (document.body.dataset.route === 'new' && f && f.tagName === 'INPUT' && f.type === 'text') {
      var b = f.getBoundingClientRect();
      aim(b.left + b.width / 2, b.top + b.height / 2);
      last = t;
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

/* Welcome-screen top nav: scroll to sections and reuse the page's own Get started button */
(function () {
  var nav = document.getElementById('site-nav');
  if (!nav) return;
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var sel = a.getAttribute('data-scroll');
    if (sel) {
      e.preventDefault();
      var el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    /* data-go="start": the href already points to the sign-up route, so nothing else is needed */
  });
})();

