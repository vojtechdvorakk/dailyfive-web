// Oživení webu: odpočet do 18:00, upozornění v telefonu, scéna „hluk → klid“, animace sběru zpráv,
// živá čísla z databáze a postupné odhalování při scrollu. Kdo má v systému vypnuté animace, dostane vše hned v klidu.
(function () {
  "use strict";
  var API = "https://dixctjxgghviroidbkyk.supabase.co/rest/v1/rpc/";
  var KEY = "sb_publishable_ONPXvmLGPlbW-f3pDUjgsw_vFBbsn2-";
  var EDITION_HOUR = 18;
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("js-anim");

  var edition = null;
  var nf = new Intl.NumberFormat("cs-CZ");
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  // ---------- Odhalení při scrollu a počítadla ----------
  function countUp(el) {
    var target = Number(el.getAttribute("data-countup"));
    if (reduce || !target) { el.textContent = nf.format(target); return; }
    var start = null;
    function tick(now) {
      if (start === null) start = now;
      var t = clamp01((now - start) / 1600);
      el.textContent = nf.format(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    }
    el.textContent = "0";
    requestAnimationFrame(tick);
  }

  var watched = document.querySelectorAll(".reveal, .bez li, .pipeline, .clock, [data-countup], .journey li");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        if (e.target.hasAttribute("data-countup")) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.2 });
    Array.prototype.forEach.call(watched, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(watched, function (el) { el.classList.add("is-in"); });
  }

  // ---------- Odpočet do další pětky (pražský čas) ----------
  function pragueNow() {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, secs: Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second) };
  }
  var countdown = document.querySelector("[data-countdown]");
  function updateCountdown() {
    if (!countdown) return;
    var now = pragueNow();
    var left = EDITION_HOUR * 3600 - now.secs;
    if (left > 0) {
      var h = Math.floor(left / 3600);
      var m = Math.ceil((left % 3600) / 60);
      if (m === 60) { h += 1; m = 0; }
      countdown.textContent = "Další pětka dnes v 18:00 · za " + (h ? h + " h " : "") + m + " min";
    } else if (edition && edition.date === now.date) {
      countdown.textContent = "Dnešní pětka je venku · vyšla v 18:00";
    } else {
      countdown.textContent = "Dnešní pětka se právě připravuje";
    }
  }
  updateCountdown();
  setInterval(updateCountdown, 20000);

  // ---------- Upozornění v telefonu ----------
  var notif = document.querySelector("[data-notif]");
  if (notif) {
    if (reduce) {
      notif.classList.add("is-shown");
    } else {
      var heroVisible = true;
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; }).observe(notif);
      }
      var cycle = function () {
        if (heroVisible && !document.hidden) {
          notif.classList.add("is-shown");
          setTimeout(function () { notif.classList.remove("is-shown"); }, 6500);
        }
      };
      setTimeout(cycle, 1400);
      setInterval(cycle, 17000);
    }
  }

  // ---------- Hluk → klid ----------
  var noise = document.querySelector("[data-noise]");
  if (noise && !reduce) {
    noise.classList.add("is-live");
    var queued = false;
    var updateNoise = function () {
      queued = false;
      var r = noise.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? clamp01(-r.top / total) : 1;
      noise.style.setProperty("--out", clamp01((p - 0.1) / 0.38).toFixed(3));
      noise.style.setProperty("--swap", clamp01((p - 0.36) / 0.16).toFixed(3));
      noise.style.setProperty("--in", clamp01((p - 0.42) / 0.34).toFixed(3));
    };
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(updateNoise); } }, { passive: true });
    window.addEventListener("resize", updateNoise);
    updateNoise();
  }

  // ---------- Animace: z tisíce článků pět zpráv ----------
  var canvas = document.querySelector("[data-funnel]");
  if (canvas && canvas.getContext) funnel(canvas);

  function funnel(canvas) {
    var ctx = canvas.getContext("2d");
    var CLUSTERS = 12;
    var CHOSEN = [1, 3, 6, 8, 10];
    var ZONES = [0, 0.22, 0.58, 0.72, 0.86, 1];
    var LABELS = ["Sběr", "Výběr", "Psaní", "Kontrola", "18:00"];
    var W = 0, H = 0, vertical = false, colors = {}, parts = [], acc = 0, last = 0, running = false, glow = 0;

    function readColors() {
      var cs = getComputedStyle(canvas.parentNode);
      ["dot", "hot", "line", "text", "phone"].forEach(function (k) { colors[k] = cs.getPropertyValue("--f-" + k).trim() || "#888"; });
    }
    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      vertical = W < 640;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColors();
    }
    // u = postup procesem (0 → 1), v = příčná poloha (0 → 1)
    function pos(u, v) {
      if (vertical) return [80 + v * (W - 96), 18 + u * (H - 36)];
      return [10 + u * (W - 20), 38 + v * (H - 52)];
    }
    var clusterV = function (c) { return (c + 0.5) / CLUSTERS; };
    var outV = function (i) { return 0.14 + i * 0.18; };

    function spawn() {
      var lane = Math.floor(Math.random() * 29);
      var cluster = Math.floor(Math.random() * CLUSTERS);
      parts.push({ u: 0, v: (lane + 0.5) / 29, v0: (lane + 0.5) / 29, sp: 0.075 + Math.random() * 0.035, cl: cluster, ch: CHOSEN.indexOf(cluster), drop: Math.random() < 0.5, a: 1, ph: Math.random() * 6.28 });
    }

    function step(dt) {
      acc += dt * (vertical ? 26 : 38);
      while (acc > 1 && parts.length < 340) { spawn(); acc -= 1; }
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.u += p.sp * dt;
        p.ph += dt * 2;
        var target = p.v0 + Math.sin(p.ph) * 0.004;
        if (p.u > ZONES[1]) {
          if (p.drop) p.a -= dt * 2.4;
          else target = clusterV(p.cl) + Math.sin(p.ph) * 0.012;
        }
        if (p.u > ZONES[2]) {
          if (p.ch < 0) p.a -= dt * 2.8;
          else target = outV(p.ch);
        }
        if (p.u > 0.9 && p.ch >= 0) target = 0.5;
        p.v += (target - p.v) * Math.min(1, dt * (p.u > ZONES[2] ? 3.2 : 1.6));
        if (p.u > 0.965 && p.ch >= 0) glow = 1;
        if (p.a <= 0 || p.u >= 0.97) parts.splice(i, 1);
      }
      glow = Math.max(0, glow - dt * 1.5);
    }

    function label(text, u) {
      var mid = pos(u, 0);
      ctx.fillStyle = colors.text;
      ctx.font = "600 11px Jost, 'Segoe UI', sans-serif";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "1.5px";
      if (vertical) {
        ctx.textAlign = "left";
        ctx.fillText(text.toUpperCase(), 0, pos(u, 0)[1] + 4);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(text.toUpperCase(), mid[0], 14);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // hranice kroků a popisky
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      for (var z = 1; z < ZONES.length - 1; z++) {
        var a = pos(ZONES[z], 0), b = pos(ZONES[z], 1);
        if (vertical) { a = [80, a[1]]; b = [W - 16, b[1]]; }
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (var l = 0; l < LABELS.length; l++) label(LABELS[l], vertical ? ZONES[l] + 0.03 : (ZONES[l] + ZONES[l + 1]) / 2);

      // psaní: řádky textu, kontrola: kroužky s fajfkou
      for (var i = 0; i < 5; i++) {
        var w = pos((ZONES[2] + ZONES[3]) / 2, outV(i));
        ctx.strokeStyle = colors.dot;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (var r = 0; r < 3; r++) {
          var len = r === 2 ? 9 : 16;
          ctx.beginPath();
          if (vertical) { ctx.moveTo(w[0] - 8 + r * 7, w[1] - 8); ctx.lineTo(w[0] - 8 + r * 7, w[1] - 8 + len); }
          else { ctx.moveTo(w[0] - 8, w[1] - 6 + r * 6); ctx.lineTo(w[0] - 8 + len, w[1] - 6 + r * 6); }
          ctx.stroke();
        }
        var k = pos((ZONES[3] + ZONES[4]) / 2, outV(i));
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = colors.hot;
        ctx.beginPath(); ctx.arc(k[0], k[1], 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(k[0] - 4, k[1]); ctx.lineTo(k[0] - 1, k[1] + 3); ctx.lineTo(k[0] + 4, k[1] - 3); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // telefon na konci
      var ph = pos(0.955, 0.5);
      var pw = 30, phh = 54;
      var halo = ctx.createRadialGradient(ph[0], ph[1], 0, ph[0], ph[1], 46 + glow * 10);
      halo.addColorStop(0, colors.hot);
      halo.addColorStop(1, "rgba(226, 162, 74, 0)");
      ctx.fillStyle = halo;
      ctx.globalAlpha = 0.18 + glow * 0.22;
      ctx.beginPath(); ctx.arc(ph[0], ph[1], 46 + glow * 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.phone;
      ctx.lineWidth = 2.5;
      roundRect(ph[0] - pw / 2, ph[1] - phh / 2, pw, phh, 8);
      ctx.stroke();

      // články
      for (var j = 0; j < parts.length; j++) {
        var p = parts[j];
        var xy = pos(p.u, p.v);
        var hot = p.ch >= 0 && p.u > ZONES[2];
        ctx.globalAlpha = Math.max(0, p.a) * (hot ? 1 : 0.75);
        ctx.fillStyle = hot ? colors.hot : colors.dot;
        ctx.beginPath(); ctx.arc(xy[0], xy[1], hot ? 3.4 : 1.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt);
      draw();
      requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }

    resize();
    for (var s = 0; s < 900; s++) step(1 / 60); // ať je proces vidět hned, ne až se načte
    draw();
    window.addEventListener("resize", function () { resize(); draw(); });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onScheme = function () { readColors(); draw(); };
      if (mq.addEventListener) mq.addEventListener("change", onScheme); else if (mq.addListener) mq.addListener(onScheme);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { if (e[0].isIntersecting) start(); else stop(); }).observe(canvas);
    }
  }

  // ---------- Živá čísla ----------
  var stats = document.querySelector("[data-stats]");
  if (stats && window.fetch) {
    fetch(API + "get_site_stats", { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (s) {
        if (!s || !s.articles_24h) return;
        stats.querySelector("[data-stat-articles]").textContent = nf.format(s.articles_24h);
        stats.querySelector("[data-stat-sources]").textContent = nf.format(s.sources);
        stats.hidden = false;
      })
      .catch(function () { /* bez čísel je stránka v pořádku */ });
  }

  // ---------- Dnešní vydání (posílá edition.js) ----------
  document.addEventListener("dailyfive:edition", function (ev) {
    edition = ev.detail;
    updateCountdown();
    var stories = (edition && edition.stories) || [];
    if (!stories.length) return;
    var first = String(stories[0].headline || "").replace(/[.!?…]+$/, "");
    var text = document.querySelector("[data-notif-text]");
    if (text && first) text.textContent = first + ". A další čtyři zprávy dne.";
    var calm = document.querySelectorAll("[data-calm] li span");
    Array.prototype.forEach.call(calm, function (el, i) {
      if (stories[i] && stories[i].headline) el.textContent = stories[i].headline;
    });
  });
})();
