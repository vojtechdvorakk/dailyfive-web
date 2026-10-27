// Dnešní pětka na webu: načte poslední vydání ze stejné veřejné funkce jako aplikace.
// Publishable klíč je veřejný (je v každé aplikaci), databáze přes něj dovolí jen číst zveřejněná vydání.
(function () {
  "use strict";
  var API = "https://dixctjxgghviroidbkyk.supabase.co/rest/v1/rpc/get_latest_edition";
  var KEY = "sb_publishable_ONPXvmLGPlbW-f3pDUjgsw_vFBbsn2-";
  var EDITION_HOUR = 18;

  var list = document.querySelector("[data-stories]");
  if (!list) return;
  var kicker = document.querySelector("[data-edition-kicker]");
  var title = document.querySelector("[data-edition-title]");
  var dateEl = document.querySelector("[data-edition-date]");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function pragueParts(d) {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, hour: Number(p.hour) };
  }

  function czechDate(iso) {
    return new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
  }

  function safeUrl(url) {
    try {
      var u = new URL(url);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  function renderStory(s, i) {
    var li = el("li");
    var details = el("details", "story");
    if (i === 0) details.open = true;
    var summary = el("summary");
    var num = el("span", "story-num", String(s.position || i + 1));
    num.appendChild(el("span", null, "."));
    num.setAttribute("aria-hidden", "true");
    summary.appendChild(num);
    summary.appendChild(el("span", "story-cat", s.category));
    summary.appendChild(el("span", "story-head", s.headline));
    var toggle = el("span", "story-toggle");
    toggle.setAttribute("aria-hidden", "true");
    summary.appendChild(toggle);
    details.appendChild(summary);

    var body = el("div", "story-body");
    String(s.summary || "")
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean)
      .forEach(function (p) { body.appendChild(el("p", null, p)); });

    var sources = (s.sources || []).filter(function (src) { return safeUrl(src.url); });
    if (sources.length) {
      var line = el("p", "story-sources", "Zdroje: ");
      sources.forEach(function (src, j) {
        var a = el("a", null, src.name);
        a.href = safeUrl(src.url);
        a.rel = "noopener";
        a.title = src.title || src.name;
        line.appendChild(a);
        if (j < sources.length - 1) line.appendChild(document.createTextNode(", "));
      });
      body.appendChild(line);
    }
    details.appendChild(body);
    li.appendChild(details);
    return li;
  }

  function showMessage(text) {
    list.textContent = "";
    var li = el("li", "story");
    li.appendChild(el("p", "story-body", text)).style.padding = "20px 22px";
    list.appendChild(li);
  }

  fetch(API, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (edition) {
      if (!edition || !edition.stories || !edition.stories.length) {
        showMessage("První vydání zatím nevyšlo. Pětka vychází každý den v 18:00.");
        return;
      }
      var now = pragueParts(new Date());
      var isToday = edition.date === now.date;
      kicker.textContent = isToday ? "Dnešní vydání" : "Poslední vydání";
      title.textContent = isToday ? "Dnešní pětka" : "Poslední pětka";
      var meta = czechDate(edition.date);
      if (!isToday) meta += now.hour >= EDITION_HOUR ? " · dnešní pětka se právě připravuje" : " · nová pětka vyjde dnes v 18:00";
      dateEl.textContent = meta.charAt(0).toUpperCase() + meta.slice(1);

      list.textContent = "";
      edition.stories.forEach(function (s, i) { list.appendChild(renderStory(s, i)); });
    })
    .catch(function () {
      showMessage("Pětku se teď nepodařilo načíst. Zkus stránku obnovit za chvíli.");
    });
})();
