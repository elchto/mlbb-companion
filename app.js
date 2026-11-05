/* MLBB Companion PWA. Static: all data in data/game.json. No API keys, no AI. */
(function () {
  "use strict";
  var G = null;
  var LANES = ["Semua", "Gold", "EXP", "Mid", "Jungle", "Roam"];
  var ROLES = ["Semua", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"];
  var CMDS = ["ROTATE TOP", "CONTEST TURTLE", "DO NOT ENGAGE", "INVADE ENEMY JUNGLE", "PROTECT MID", "WAIT FOR ULTIMATE", "TAKE LORD", "RESET AND REPOSITION"];
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("mlbb_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("mlbb_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  var st = {
    tab: "heroes", q: "", lane: "Semua", role: "Semua",
    enemies: store.get("enemies", []), allies: store.get("allies", []),
    draftQ: "", draftSide: "enemy",
    timers: store.get("timers", {}), lordAlt: store.get("lordAlt", 0),
    cmd: store.get("cmd", ""), card: store.get("card", {}), checks: store.get("checks", {})
  };
  var main = document.getElementById("main");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function chips(list, cur, attr) {
    return '<div class="chips">' + list.map(function (v) { return '<button class="chip' + (v === cur ? " on" : "") + '" data-' + attr + '="' + esc(v) + '">' + esc(v) + "</button>"; }).join("") + "</div>";
  }
  function dmgTag(d) {
    var c = d === "Physical" ? "phys" : d === "Magic" ? "mag" : d === "Campuran" ? "mix" : "";
    return '<span class="tag ' + c + '">' + esc(d) + "</span>";
  }
  function hero(name) { for (var i = 0; i < G.heroes.length; i++) if (G.heroes[i].name === name) return G.heroes[i]; return null; }
  function ctrList(arr) { return arr.map(function (c) { return esc(c.hero) + " <span class=\"sub\">+" + c.edge.toFixed(1) + "</span>"; }).join(", "); }

  /* ---------- Hero database ---------- */
  function viewHeroes() {
    var q = st.q.trim().toLowerCase();
    var list = G.heroes.filter(function (h) {
      return (st.lane === "Semua" || h.lanes.indexOf(st.lane) >= 0) && (st.role === "Semua" || h.roles.indexOf(st.role) >= 0) &&
        (!q || (h.name + " " + h.title + " " + h.roles.join(" ") + " " + h.specialties.join(" ") + " " + h.lanes.join(" ") + " " + h.region).toLowerCase().indexOf(q) >= 0);
    });
    return "<h2>Hero Database</h2><p class=\"cap\">" + G.heroes.length + " hero. Role, lane dan specialty dari Fandom Wiki (dicek silang dengan lane Liquipedia). Tipe damage diperkirakan dari teks skill Liquipedia.</p>" +
      '<input type="search" id="hq" placeholder="Cari hero, role, specialty…" value="' + esc(st.q) + '" autocomplete="off">' +
      chips(LANES, st.lane, "lane") + chips(ROLES, st.role, "role") +
      '<p class="cap">' + list.length + " hasil</p>" +
      (list.length ? list.map(function (h) {
        return '<div class="card"><div class="hero-row"><div><div class="nm">' + esc(h.name) + '</div><div class="sub">' + esc(h.title) + "</div></div>" + dmgTag(h.dmg) + "</div>" +
          '<div class="meta" style="margin-top:6px">' + h.lanes.map(function (l) { return '<span class="tag lane">' + esc(l) + "</span>"; }).join("") +
          h.roles.map(function (r) { return '<span class="tag">' + esc(r) + "</span>"; }).join("") + "<span>" + esc(h.specialties.join(" / ")) + "</span></div>" +
          "<details><summary>Counter & detail</summary>" +
          (h.counteredBy && h.counteredBy.length ? '<p class="ctr">Kuat melawan ' + esc(h.name) + ": <b>" + ctrList(h.counteredBy) + "</b></p>" : '<p class="ctr sub">Tidak ada data counter yang terukur untuk hero ini.</p>') +
          (h.counters && h.counters.length ? '<p class="ctr bad">' + esc(h.name) + " kuat melawan: <b>" + ctrList(h.counters) + "</b></p>" : "") +
          '<p class="sub">Angka = edge win rate (poin persen) dari data ranked resmi Moonton via MLBBHub. Region: ' + esc(h.region) + " · Rilis: " + esc(h.release) + "</p>" +
          '<div class="meta"><a href="' + esc(h.src) + '" target="_blank" rel="noopener">Sumber counter ↗</a><a href="' + esc(h.wiki) + '" target="_blank" rel="noopener">Liquipedia ↗</a></div></details></div>';
      }).join("") : '<p class="empty">Tidak ada hero yang cocok.</p>');
  }

  /* ---------- Draft helper ---------- */
  function analyze(names) {
    var hs = names.map(hero).filter(Boolean);
    var d = { Physical: 0, Magic: 0, Campuran: 0 }, roles = {}, lanes = {}, spec = {};
    hs.forEach(function (h) {
      if (d[h.dmg] != null) d[h.dmg]++;
      h.roles.forEach(function (r) { roles[r] = (roles[r] || 0) + 1; });
      h.lanes.forEach(function (l) { lanes[l] = (lanes[l] || 0) + 1; });
      h.specialties.forEach(function (s) { spec[s] = (spec[s] || 0) + 1; });
    });
    return { hs: hs, d: d, roles: roles, lanes: lanes, spec: spec };
  }
  function dmgBar(a) {
    var t = a.d.Physical + a.d.Magic + a.d.Campuran || 1;
    return '<div class="bar"><div class="p" style="width:' + 100 * a.d.Physical / t + '%"></div><div class="m" style="width:' + 100 * a.d.Magic / t +
      '%"></div><div class="x" style="width:' + 100 * a.d.Campuran / t + '%"></div></div><div class="meta"><span class="tag phys">Physical ' + a.d.Physical +
      '</span><span class="tag mag">Magic ' + a.d.Magic + '</span><span class="tag mix">Campuran ' + a.d.Campuran + "</span></div>";
  }
  function itemAdvice(e) {
    var out = [];
    var magic = e.d.Magic + e.d.Campuran * 0.5, phys = e.d.Physical + e.d.Campuran * 0.5;
    var regen = e.hs.filter(function (h) { return h.specialties.indexOf("Regen") >= 0 || h.specialties.indexOf("Support") >= 0; });
    if (regen.length) out.push(["antiheal", "Musuh punya heal/regen: " + regen.map(function (h) { return h.name; }).join(", ")]);
    if (magic >= 3) out.push(["magicdef", "Damage musuh dominan Magic (" + e.d.Magic + " Magic)"]);
    else if (magic >= 2 && magic > phys) out.push(["magicdef", "Damage musuh condong Magic"]);
    if (phys >= 3) out.push(["physdef", "Damage musuh dominan Physical (" + e.d.Physical + " Physical)"]);
    else if (phys >= 2 && phys > magic) out.push(["physdef", "Damage musuh condong Physical"]);
    if ((e.roles.Marksman || 0) >= 2) out.push(["anticrit", (e.roles.Marksman) + " Marksman musuh"]);
    if ((e.roles.Assassin || 0) >= 2 || (e.spec.Burst || 0) >= 3) out.push(["antiburst", "Banyak burst/Assassin (" + (e.roles.Assassin || 0) + " Assassin, " + (e.spec.Burst || 0) + " Burst)"]);
    if ((e.roles.Tank || 0) >= 2 || ((e.roles.Tank || 0) + (e.spec.Guard || 0)) >= 3) out.push(["pen", "Frontline tebal (" + (e.roles.Tank || 0) + " Tank)"]);
    if (((e.spec["Crowd Control"] || 0) + (e.spec.Control || 0)) >= 3) out.push(["anticc", "Banyak CC (" + ((e.spec["Crowd Control"] || 0) + (e.spec.Control || 0)) + " hero)"]);
    return out;
  }
  function itemGroup(id) { for (var i = 0; i < G.items.length; i++) if (G.items[i].id === id) return G.items[i]; return null; }
  function renderAdvice(adv) {
    if (!adv.length) return '<p class="sub">Belum ada ancaman khusus. Pakai build standar hero kamu.</p>';
    return adv.map(function (a) {
      var g = itemGroup(a[0]);
      return '<div class="card"><h4>' + esc(g.label) + '</h4><p class="sub">' + esc(a[1]) + "</p><ul class=\"clean\">" +
        g.items.map(function (it) { return "<li><b>" + esc(it.name) + '</b> <span class="sub">(' + esc(it.for) + ", " + it.cost + " gold)</span><br><span class=\"sub\">" + esc(it.note) + "</span></li>"; }).join("") + "</ul></div>";
    }).join("");
  }
  function viewDraft() {
    var picked = st.enemies.concat(st.allies);
    var q = st.draftQ.trim().toLowerCase();
    var cand = q.length >= 1 ? G.heroes.filter(function (h) { return picked.indexOf(h.name) < 0 && h.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 12) : [];
    var e = analyze(st.enemies), a = analyze(st.allies);
    var html = "<h2>Draft Helper</h2><p class=\"cap\">Pilih sampai 5 musuh dan 4 teman (kamu yang ke-5).</p>" +
      chips(["Musuh", "Teman"], st.draftSide === "enemy" ? "Musuh" : "Teman", "side") +
      '<input type="search" id="dq" placeholder="Ketik nama hero untuk ' + (st.draftSide === "enemy" ? "musuh" : "teman") + '…" value="' + esc(st.draftQ) + '" autocomplete="off">' +
      (cand.length ? '<div class="sugg">' + cand.map(function (h) { return '<button data-add="' + esc(h.name) + '">+ ' + esc(h.name) + "</button>"; }).join("") + "</div>" : "") +
      "<h3>Musuh (" + st.enemies.length + "/5)</h3><div class=\"picks\">" + st.enemies.map(function (n) { return '<span class="pick">' + esc(n) + '<button data-rm-e="' + esc(n) + '" aria-label="Hapus">✕</button></span>'; }).join("") + "</div>" +
      "<h3>Teman (" + st.allies.length + "/4)</h3><div class=\"picks\">" + st.allies.map(function (n) { return '<span class="pick">' + esc(n) + '<button data-rm-a="' + esc(n) + '" aria-label="Hapus">✕</button></span>'; }).join("") + "</div>" +
      (picked.length ? '<button class="btn sm" id="clear">Reset draft</button>' : "");
    if (st.enemies.length) {
      html += "<h3>Damage musuh</h3>" + dmgBar(e);
      // sourced counters
      var tally = {};
      st.enemies.forEach(function (n) {
        var h = hero(n);
        (h && h.counteredBy || []).forEach(function (c) {
          if (picked.indexOf(c.hero) >= 0) return;
          var t = tally[c.hero] || (tally[c.hero] = { n: 0, edge: 0, vs: [] });
          t.n++; t.edge += c.edge; t.vs.push(n);
        });
      });
      var ranked = Object.keys(tally).sort(function (x, y) { return tally[y].n - tally[x].n || tally[y].edge - tally[x].edge; }).slice(0, 10);
      var noData = st.enemies.filter(function (n) { var h = hero(n); return !(h && h.counteredBy && h.counteredBy.length); });
      html += "<h3>Saran counter (bersumber)</h3>" +
        (ranked.length ? ranked.map(function (k) {
          var h = hero(k);
          return '<div class="card"><div class="hero-row"><div><span class="nm">' + esc(k) + '</span> <span class="sub">' + esc(h ? h.lanes.join("/") + " · " + h.roles.join("/") : "") + "</span></div><b class=\"ok\">+" + tally[k].edge.toFixed(1) +
            '</b></div><p class="sub">Counter untuk: ' + esc(tally[k].vs.join(", ")) + "</p></div>";
        }).join("") : "") +
        (noData.length ? '<p class="sub">Tidak ada data counter bersumber untuk: ' + esc(noData.join(", ")) + ".</p>" : "") +
        '<p class="sub">Dari daftar "Best picks against" MLBBHub (edge win rate ranked, poin persen, patch ' + esc(G.patch) + "). Diurutkan berdasarkan jumlah musuh yang di-counter lalu total edge.</p>";
      html += "<h3>Item yang disarankan</h3><p class=\"notice\">Panduan umum berbasis aturan, bukan data statistik.</p>" + renderAdvice(itemAdvice(e));
    }
    if (st.allies.length) {
      var need = ["Gold", "EXP", "Mid", "Jungle", "Roam"].filter(function (l) { return !a.lanes[l]; });
      var gaps = [];
      if (!a.roles.Tank && !a.roles.Support) gaps.push("Belum ada Tank/Support: tim rawan diinisiasi dan kurang vision.");
      if (a.d.Physical >= 3 && !a.d.Magic) gaps.push("Damage tim hampir semua Physical: musuh mudah stack Physical Defense. Pertimbangkan Mage.");
      if (a.d.Magic >= 3 && !a.d.Physical) gaps.push("Damage tim hampir semua Magic: musuh mudah stack Magic Defense. Pertimbangkan Marksman/Fighter physical.");
      if (!((a.spec["Crowd Control"] || 0) + (a.spec.Control || 0) + (a.spec.Initiator || 0))) gaps.push("Belum ada CC/Initiator untuk membuka teamfight.");
      html += "<h3>Tim kita</h3>" + dmgBar(a) +
        '<div class="card"><p><b>Lane yang belum terisi:</b> ' + (need.length ? '<span class="warn">' + esc(need.join(", ")) + "</span>" : '<span class="ok">Semua lane terisi</span>') + "</p>" +
        (gaps.length ? '<ul class="clean">' + gaps.map(function (g) { return '<li class="warn">' + esc(g) + "</li>"; }).join("") + "</ul>" : '<p class="ok">Komposisi role seimbang.</p>') +
        '<p class="sub">Lane berdasarkan rekomendasi lane Fandom; satu hero bisa punya lebih dari satu lane.</p></div>';
      if (need.length && st.enemies.length) {
        var fit = Object.keys(tally || {}).filter(function (k) { var h = hero(k); return h && h.lanes.some(function (l) { return need.indexOf(l) >= 0; }); }).slice(0, 6);
        if (fit.length) html += '<p class="sub">Counter bersumber yang cocok dengan lane kosong: <b class="ok">' + esc(fit.join(", ")) + "</b></p>";
      }
    }
    return html;
  }

  /* ---------- Items ---------- */
  function viewItems() {
    return "<h2>Item Adaptif</h2><p class=\"notice\">Panduan umum berbasis aturan. Nama, harga dan efek item dari katalog MLBBHub (dibaca dari file game, patch " + esc(G.patch) +
      "). Untuk saran otomatis sesuai musuh, isi tab Draft.</p>" +
      G.items.map(function (g) {
        return '<div class="card"><h4>' + esc(g.label) + '</h4><p class="sub">Kapan: ' + esc(g.when) + '</p><ul class="clean">' +
          g.items.map(function (it) { return "<li><b>" + esc(it.name) + '</b> <span class="sub">(' + esc(it.for) + ", " + it.cost + ' gold)</span><br><span class="sub">' + esc(it.note) + "</span></li>"; }).join("") + "</ul></div>";
      }).join("");
  }

  /* ---------- Timers ---------- */
  var tick = null, alerted = {}, audio = null;
  function beep(f) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f || 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.15, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
      o.start(); o.stop(audio.currentTime + 0.4);
    } catch (e) {}
  }
  function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
  function respawnOf(t) { if (t.id === "lord" && st.lordAlt && t.alt) return t.alt[st.lordAlt - 1].respawn; return t.respawn; }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function viewTimers() {
    return "<h2>Timer Objektif</h2><p class=\"cap\">Tekan <b>Mati</b> tepat saat objektif dibunuh. Peringatan di 30s dan 10s, layar berkedip saat respawn. Getar hanya di perangkat yang mendukung (iPhone Safari tidak mendukung getar; pakai suara).</p>" +
      G.timers.map(function (t) {
        var end = st.timers[t.id];
        return '<div class="card timer" id="tm-' + t.id + '"><div class="em">' + t.emoji + '</div><div><div class="nm"><b>' + esc(t.label) + '</b></div><div class="sub">Spawn awal ' + esc(t.first) + " · respawn " + respawnOf(t) + "s</div></div>" +
          '<div class="t" data-t="' + t.id + '">' + (end ? fmt((end - Date.now()) / 1000) : fmt(respawnOf(t))) + "</div>" +
          '<div class="row" style="grid-column:1/-1"><button class="btn gold" data-start="' + t.id + '">Mati ▶</button><button class="btn" data-plus="' + t.id + '">+5s</button><button class="btn" data-minus="' + t.id + '">−5s</button><button class="btn" data-stop="' + t.id + '">Reset</button></div>' +
          (t.alt ? '<div class="row" style="grid-column:1/-1">' + ["Sebelum 18:00 (180s)"].concat(t.alt.map(function (a) { return a.label; })).map(function (l, i) { return '<button class="chip' + (st.lordAlt === i ? " on" : "") + '" data-lordalt="' + i + '">' + esc(l) + "</button>"; }).join("") + "</div>" : "") +
          '<p class="sub" style="grid-column:1/-1;margin:6px 0 0">' + esc(t.notes) + "</p></div>";
      }).join("") + '<p class="notice">' + esc(G.timerNote) + "</p>";
  }
  function updateTimers() {
    var now = Date.now(), any = false;
    G.timers.forEach(function (t) {
      var end = st.timers[t.id], el = document.getElementById("tm-" + t.id);
      if (!end) { if (el) el.className = "card timer"; return; }
      var left = (end - now) / 1000; any = true;
      if (el) {
        el.querySelector(".t").textContent = left > 0 ? fmt(left) : "SPAWN!";
        el.className = "card timer " + (left <= 0 ? "up" : left <= 30 ? "soon" : "run");
      }
      var k = t.id + end;
      if (left <= 30 && left > 10 && !alerted[k + 30]) { alerted[k + 30] = 1; beep(660); buzz(200); }
      if (left <= 10 && left > 0 && !alerted[k + 10]) { alerted[k + 10] = 1; beep(880); buzz([200, 100, 200]); }
      if (left <= 0 && !alerted[k + 0]) { alerted[k + 0] = 1; beep(1046); setTimeout(function () { beep(1318); }, 250); buzz([400, 150, 400]); }
      if (left < -20) { delete st.timers[t.id]; store.set("timers", st.timers); }
    });
    return any;
  }
  function ensureTick() { if (!tick) tick = setInterval(function () { updateTimers(); }, 250); }

  /* ---------- Jungle ---------- */
  function checklist(id, items) {
    return '<ul class="check">' + items.map(function (t, i) {
      var k = id + i;
      return '<li><label><input type="checkbox" data-chk="' + k + '"' + (st.checks[k] ? " checked" : "") + "><span>" + t + "</span></label></li>";
    }).join("") + '</ul><button class="btn sm" data-chkreset="' + id + '">Reset checklist</button>';
  }
  function viewJungle() {
    return "<h2>Panduan Jungle</h2><p class=\"notice\">Panduan umum (bukan data statistik), dirangkum dari METAMMO dan MLBBDex untuk Season 42 / patch " + esc(G.patch) + ".</p>" +
      '<div class="card"><h4>Prioritas clear</h4><ul class="clean"><li>Full clear jungle sendiri: dua buff + tiga camp kecil, targetkan level 4 sebelum 2:00.</li><li>Clear camp kecil sambil berjalan; jangan berdiri diam.</li><li>Biarkan minion lane untuk laner di awal game.</li><li>Ambil minimal satu dari tiga: buff, kill, atau Turtle.</li></ul></div>' +
      '<div class="card"><h4>Prioritas buff</h4><ul class="clean"><li>Mulai dari buff yang dekat Gold lane agar Marksman dan Roamer bantu hit pertama.</li><li><b>Purple start</b> (Purple → camp kecil → Red): hero mana/energy, mis. Lancelot, Fanny, Hayabusa.</li><li><b>Red start</b> (Red → camp kecil → Purple): hero basic-attack/burst, mis. Yi Sun-shin, Helcurt, Karina.</li><li>Buff respawn ±90s setelah mati dan efeknya ±75s: catat di tab Timer, termasuk buff musuh untuk invade.</li></ul></div>' +
      '<div class="card"><h4>Rotasi pertama</h4><ul class="clean"><li>Setelah buff kedua (level 3-4), cek lane yang terdorong dan musuh tanpa Flicker.</li><li>Bergerak ke river sebelum 2:00 bersama Roamer; ambil Lithowanderer kalau searah.</li><li>Ada di pit Turtle saat 2:00 dengan Retribution siap.</li><li>Sesudah Turtle: kembali farm, atau gank memanfaatkan momentum kalau ada lane yang terbuka.</li></ul></div>' +
      '<div class="card"><h4>Checklist Turtle / Lord</h4>' + checklist("obj", [
        "Retribution siap dan HP cukup untuk tank damage objektif.",
        "Posisi jungler musuh diketahui (atau dia baru terlihat di sisi lain map).",
        "Minimal 2-3 teman bisa datang dalam beberapa detik; Mid dan EXP minimal level 4 untuk Turtle awal.",
        "Lord: hanya setelah menang fight / 2+ musuh mati, atau musuh jelas jauh.",
        "Wave lane aman (tidak sedang ditekan turret kita).",
        "Kalau tim kalah level/gold dan ultimate belum siap: jangan paksa, tukar dengan buff atau turret di sisi lain."
      ]) + "</div>" +
      '<div class="card"><h4>6 pertanyaan rotasi</h4>' + checklist("rot", [
        "Lane mana yang paling bagus untuk di-gank?",
        "Ada musuh dengan HP rendah atau posisi buruk?",
        "Di mana jungler musuh?",
        "Turtle/Lord sedang hidup (atau segera spawn)?",
        "Berapa farm yang hilang kalau saya rotasi sekarang?",
        "Objektif apa yang bisa diambil setelahnya?"
      ]) + "</div>";
  }

  /* ---------- Decision card ---------- */
  var FIELDS = [["best", "BEST DECISION"], ["why", "WHY"], ["risk", "RISK"], ["alt", "ALTERNATIVE"], ["next", "NEXT MOVE"]];
  function viewDecide() {
    return "<h2>Kartu Keputusan</h2><p class=\"cap\">Tekan perintah cepat untuk ditampilkan besar, lalu isi kartu singkat.</p>" +
      (st.cmd ? '<div class="big">' + esc(st.cmd) + "</div>" : "") +
      '<div class="cmds">' + CMDS.map(function (c) { return '<button class="cmd' + (st.cmd === c ? " on" : "") + '" data-cmd="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>" +
      '<div class="card dc" style="margin-top:12px">' + FIELDS.map(function (f) {
        return '<label for="f-' + f[0] + '">' + f[1] + '</label><textarea id="f-' + f[0] + '" data-field="' + f[0] + '">' + esc(st.card[f[0]] || "") + "</textarea>";
      }).join("") + '<div class="row"><button class="btn gold" id="copycard">Salin kartu</button><button class="btn" id="clearcard">Kosongkan</button></div></div>' +
      '<h3>Golden rule</h3><div class="golden">' + esc(G.goldenRule) + "</div>";
  }

  /* ---------- render & events ---------- */
  var VIEWS = { heroes: viewHeroes, draft: viewDraft, items: viewItems, timers: viewTimers, jungle: viewJungle, decide: viewDecide };
  function render(keepFocus) {
    if (!G) return;
    var fid = keepFocus && document.activeElement && document.activeElement.id, pos = fid && document.activeElement.selectionStart;
    main.innerHTML = VIEWS[st.tab]();
    Array.prototype.forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === st.tab); });
    if (fid) { var el = document.getElementById(fid); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
    if (st.tab === "timers") updateTimers();
  }
  document.getElementById("tabs").addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-tab]"); if (!b) return;
    st.tab = b.getAttribute("data-tab"); history.replaceState(null, "", "#" + st.tab); render(); window.scrollTo(0, 0);
  });
  main.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.id === "hq") { st.q = t.value; render(true); }
    else if (t.id === "dq") { st.draftQ = t.value; render(true); }
    else if (t.dataset.field) { st.card[t.dataset.field] = t.value; store.set("card", st.card); }
  });
  main.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.dataset.chk) { st.checks[t.dataset.chk] = t.checked; store.set("checks", st.checks); }
  });
  main.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    var d = b.dataset;
    if (d.lane) { st.lane = d.lane; render(); }
    else if (d.role) { st.role = d.role; render(); }
    else if (d.side) { st.draftSide = d.side === "Musuh" ? "enemy" : "ally"; render(); }
    else if (d.add) {
      if (st.draftSide === "enemy" && st.enemies.length < 5) st.enemies.push(d.add);
      else if (st.draftSide === "ally" && st.allies.length < 4) st.allies.push(d.add);
      else alert(st.draftSide === "enemy" ? "Maksimal 5 musuh." : "Maksimal 4 teman.");
      st.draftQ = ""; store.set("enemies", st.enemies); store.set("allies", st.allies); render();
      var dq = document.getElementById("dq"); if (dq) dq.focus();
    }
    else if (d.rmE) { st.enemies = st.enemies.filter(function (n) { return n !== d.rmE; }); store.set("enemies", st.enemies); render(); }
    else if (d.rmA) { st.allies = st.allies.filter(function (n) { return n !== d.rmA; }); store.set("allies", st.allies); render(); }
    else if (b.id === "clear") { st.enemies = []; st.allies = []; store.set("enemies", []); store.set("allies", []); render(); }
    else if (d.start) { var t = G.timers.filter(function (x) { return x.id === d.start; })[0]; st.timers[d.start] = Date.now() + respawnOf(t) * 1000; store.set("timers", st.timers); beep(520); ensureTick(); updateTimers(); }
    else if (d.plus || d.minus) { var id = d.plus || d.minus; if (st.timers[id]) { st.timers[id] += (d.plus ? 5000 : -5000); store.set("timers", st.timers); updateTimers(); } }
    else if (d.stop) { delete st.timers[d.stop]; store.set("timers", st.timers); render(); }
    else if (d.lordalt != null) { st.lordAlt = +d.lordalt; store.set("lordAlt", st.lordAlt); render(); }
    else if (d.cmd) { st.cmd = st.cmd === d.cmd ? "" : d.cmd; store.set("cmd", st.cmd); render(); }
    else if (d.chkreset) { Object.keys(st.checks).forEach(function (k) { if (k.indexOf(d.chkreset) === 0) delete st.checks[k]; }); store.set("checks", st.checks); render(); }
    else if (b.id === "copycard") {
      var txt = (st.cmd ? st.cmd + "\n" : "") + FIELDS.map(function (f) { return f[1] + ": " + (st.card[f[0]] || "-"); }).join("\n");
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { b.textContent = "Tersalin ✓"; }, function () { b.textContent = "Gagal menyalin"; });
    }
    else if (b.id === "clearcard") { st.card = {}; st.cmd = ""; store.set("card", {}); store.set("cmd", ""); render(); }
  });

  fetch("data/game.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(function (j) {
    G = j;
    document.getElementById("asof").textContent = "Data per " + j.asOf + ", patch " + j.patch + " (" + j.season + ") · " + j.heroes.length + " hero";
    document.getElementById("foot").innerHTML = "Untuk analisis screenshot, tanya MLBB Ultimate Pro Coach di Grok Bot.<br>Data per " + esc(j.asOf) + ", patch " + esc(j.patch) +
      '. Sumber: <a href="https://liquipedia.net/mobilelegends/Portal:Heroes" target="_blank" rel="noopener">Liquipedia</a>, <a href="https://mobile-legends.fandom.com/wiki/List_of_heroes" target="_blank" rel="noopener">Fandom</a>, <a href="https://mlbbhub.com" target="_blank" rel="noopener">MLBBHub</a>. Aplikasi fan, tidak berafiliasi dengan Moonton.';
    var h = (location.hash || "").slice(1); if (VIEWS[h]) st.tab = h;
    render();
    if (Object.keys(st.timers).length) ensureTick();
  }).catch(function (e) {
    main.innerHTML = '<p class="empty">Data tidak bisa dimuat (' + esc(e.message) + ").</p>";
  });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && G) updateTimers(); });
  if ("serviceWorker" in navigator) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
})();
