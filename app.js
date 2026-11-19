/* Kharcha 2 — app logic. No dependencies. Data lives in localStorage. */
(function () {
  'use strict';

  /* =========================================================
     Icons + colours
     ========================================================= */
  var ICONS = window.KH_ICONS || {};
  var CAT_ICONS = window.KH_CAT_ICONS || [];
  function icon(name) {
    return '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS['circle-ellipsis'] || '') + '</svg>';
  }
  var PALETTE = {
    orange: ['#EA580C', '#FB923C'], green: ['#16A34A', '#4ADE80'], blue: ['#2563EB', '#60A5FA'],
    pink: ['#DB2777', '#F472B6'], violet: ['#7C3AED', '#A78BFA'], amber: ['#D97706', '#FBBF24'],
    teal: ['#0D9488', '#2DD4BF'], slate: ['#475569', '#94A3B8'], rose: ['#E11D48', '#FB7185'],
    cyan: ['#0891B2', '#22D3EE'], indigo: ['#4F46E5', '#818CF8'], lime: ['#65A30D', '#A3E635'],
    red: ['#DC2626', '#F87171'], brown: ['#A16207', '#D6A35C']
  };
  var COLOR_KEYS = Object.keys(PALETTE);
  function cvars(color) { var p = PALETTE[color] || PALETTE.slate; return '--cl:' + p[0] + ';--cd:' + p[1]; }

  /* =========================================================
     Defaults
     ========================================================= */
  var DEFAULT_CATS = [
    { id: 'food', name: 'Food', icon: 'utensils', color: 'orange',
      windows: [{ label: 'Breakfast', s: '08:30', e: '10:30' }, { label: 'Lunch', s: '12:00', e: '14:00' }, { label: 'Dinner', s: '19:00', e: '22:00' }],
      keywords: ['swiggy', 'zomato', 'breakfast', 'lunch', 'dinner', 'chai', 'tea', 'coffee', 'snacks', 'restaurant', 'cafe', 'canteen', 'tiffin', 'biryani', 'pizza', 'dosa', 'burger', 'eatsure', 'mess'] },
    { id: 'groceries', name: 'Groceries', icon: 'shopping-cart', color: 'green', windows: [],
      keywords: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'jiomart', 'grocery', 'groceries', 'vegetables', 'sabzi', 'fruits', 'milk', 'kirana', 'ration'] },
    { id: 'transport', name: 'Transport', icon: 'car-taxi-front', color: 'blue', windows: [],
      keywords: ['uber', 'ola', 'rapido', 'auto', 'metro', 'bus', 'cab', 'taxi', 'train', 'irctc', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'fastag'] },
    { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: 'pink', windows: [],
      keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'clothes', 'shoes', 'decathlon'] },
    { id: 'bills', name: 'Bills', icon: 'receipt-indian-rupee', color: 'violet', windows: [],
      keywords: ['electricity', 'recharge', 'wifi', 'broadband', 'rent', 'emi', 'gas', 'water', 'dth', 'maintenance', 'bill', 'insurance'] },
    { id: 'fun', name: 'Fun', icon: 'clapperboard', color: 'amber', windows: [],
      keywords: ['movie', 'netflix', 'prime', 'hotstar', 'spotify', 'pvr', 'inox', 'bookmyshow', 'concert', 'party', 'trip'] },
    { id: 'health', name: 'Health', icon: 'heart-pulse', color: 'teal', windows: [],
      keywords: ['medicine', 'medicines', 'pharmacy', 'doctor', 'apollo', '1mg', 'pharmeasy', 'hospital', 'clinic', 'gym', 'checkup', 'dentist'] },
    { id: 'other', name: 'Other', icon: 'circle-ellipsis', color: 'slate', windows: [], keywords: [] }
  ];

  /* =========================================================
     Store
     ========================================================= */
  var KEY = 'kharcha.v2', OLD_KEY = 'kharcha.v1';
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function defaults() { return { v: 2, currency: '₹', learn: true, theme: 'system', cats: clone(DEFAULT_CATS), entries: [] }; }
  var HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

  function cleanCat(c) {
    if (!c || typeof c !== 'object' || !String(c.name || '').trim()) return null;
    return {
      id: String(c.id || uid()),
      name: String(c.name).trim().slice(0, 24),
      icon: ICONS[c.icon] ? c.icon : 'tag',
      color: PALETTE[c.color] ? c.color : 'slate',
      windows: (Array.isArray(c.windows) ? c.windows : []).filter(function (w) {
        return w && HHMM.test(w.s) && HHMM.test(w.e) && w.s !== w.e;
      }).slice(0, 6).map(function (w) { return { label: String(w.label || '').trim().slice(0, 20), s: w.s, e: w.e }; }),
      keywords: uniq((Array.isArray(c.keywords) ? c.keywords : []).map(function (k) { return String(k).trim().toLowerCase(); }).filter(Boolean)).slice(0, 60)
    };
  }
  function cleanEntry(e) {
    if (!e || typeof e !== 'object') return null;
    var amt = Math.round(Number(e.amt)), ts = Number(e.ts);
    if (!(amt > 0) || !isFinite(ts) || !e.catId) return null;
    return { id: String(e.id || uid()), amt: amt, catId: String(e.catId), note: String(e.note || '').slice(0, 80), ts: ts };
  }
  function uniq(a) { var s = {}; return a.filter(function (x) { return s[x] ? false : (s[x] = 1); }); }

  function sanitize(d) {
    var s = defaults();
    if (!d || typeof d !== 'object') return s;
    if (typeof d.currency === 'string' && d.currency.trim()) s.currency = d.currency.trim().slice(0, 4);
    s.learn = d.learn !== false;
    if (['system', 'light', 'dark'].indexOf(d.theme) >= 0) s.theme = d.theme;
    if (Array.isArray(d.cats)) {
      var seen = {};
      var cats = d.cats.map(cleanCat).filter(function (c) { return c && !seen[c.id] && (seen[c.id] = 1); });
      if (cats.length) s.cats = cats;
    }
    var ids = {}; s.cats.forEach(function (c) { ids[c.id] = 1; });
    var fallback = ids.other ? 'other' : s.cats[s.cats.length - 1].id;
    s.entries = (Array.isArray(d.entries) ? d.entries : []).map(cleanEntry).filter(Boolean).map(function (e) {
      if (!ids[e.catId]) e.catId = fallback;
      return e;
    });
    return s;
  }
  // v1 stored category names on entries and emoji icons on categories.
  function fromV1(old) {
    var s = defaults();
    if (old && typeof old.currency === 'string' && old.currency.trim()) s.currency = old.currency.trim().slice(0, 4);
    var byName = {}, cats = [];
    function catFor(name, i) {
      var k = String(name).trim().toLowerCase();
      if (byName[k]) return byName[k];
      var def = DEFAULT_CATS.filter(function (d) { return d.id === k; })[0];
      var c = def ? clone(def) : { id: uid(), name: String(name).trim().slice(0, 24), icon: 'tag', color: COLOR_KEYS[(i || cats.length) % COLOR_KEYS.length], windows: [], keywords: [] };
      byName[k] = c; cats.push(c);
      return c;
    }
    (old && Array.isArray(old.cats) ? old.cats : []).forEach(function (c, i) { if (c && c.name) catFor(c.name, i); });
    (old && Array.isArray(old.entries) ? old.entries : []).forEach(function (e) {
      if (!e || !(e.amt > 0) || !e.cat) return;
      s.entries.push({ id: String(e.id || uid()), amt: Math.round(e.amt), catId: catFor(e.cat).id, note: String(e.note || ''), ts: Number(e.ts) || Date.now() });
    });
    if (cats.length) s.cats = cats;
    return sanitize(s);
  }

  var storageOK = true, state, rev = 0;
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) state = sanitize(JSON.parse(raw));
    else {
      var old = localStorage.getItem(OLD_KEY);
      state = old ? fromV1(JSON.parse(old)) : defaults();
    }
    localStorage.setItem(KEY + '.probe', '1');
    localStorage.removeItem(KEY + '.probe');
    if (!raw) localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    storageOK = false;
    state = state || defaults();
  }
  function save() {
    rev++;
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch (err) { storageOK = false; }
  }
  var persistAsked = false;
  function requestPersist() {
    if (persistAsked) return;
    persistAsked = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (err) {}
  }
  function catById(id) { for (var i = 0; i < state.cats.length; i++) if (state.cats[i].id === id) return state.cats[i]; return null; }
  function addEntry(e) {
    var entry = { id: uid(), amt: e.amt, catId: e.catId, note: e.note || '', ts: e.ts || Date.now() };
    state.entries.push(entry); save(); requestPersist();
    return entry;
  }
  function removeEntry(id) {
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].id === id) { var e = state.entries.splice(i, 1)[0]; save(); return e; }
    }
    return null;
  }

  /* =========================================================
     Formatting
     ========================================================= */
  var nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function money(minor) { return state.currency + (minor % 100 === 0 ? nf0.format(minor / 100) : nf2.format(minor / 100)); }
  function minorToStr(minor) { return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2).replace(/0$/, ''); }
  function parseAmount(s) { var n = parseFloat(String(s).replace(/[^\d.]/g, '')); return isFinite(n) ? Math.round(n * 100) : 0; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function dayLabel(t) {
    var now = new Date(), k = dayKey(t);
    if (k === dayKey(now)) return 'Today';
    if (k === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday';
    var d = new Date(t);
    return d.toLocaleDateString('en-IN', d.getFullYear() === now.getFullYear()
      ? { weekday: 'long', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function timeLabel(t) { return new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, function (m, a) { return ' ' + a.toUpperCase() + 'M'; }); }
  function toLocalInput(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fromLocalInput(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null;
  }
  function toMin(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
  function clock12(min, withMer) {
    var h = Math.floor(min / 60) % 24, m = min % 60, mer = h < 12 ? 'AM' : 'PM', h12 = h % 12 || 12;
    return h12 + (m ? ':' + pad(m) : '') + (withMer ? ' ' + mer : '');
  }
  function fmtWin(w) {
    var s = toMin(w.s), e = toMin(w.e), same = (s < 720) === (e < 720) && s < e;
    return clock12(s, !same) + '–' + clock12(e, true);
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* =========================================================
     Smart engine
     Scores every category from four signals and explains the winner:
       rule  – the category's own time windows (Food: breakfast, lunch, dinner)
       note  – keywords in the note, plus words you've filed before
       habit – past expenses near this time of day, day type and amount
       usage – how often you've used it lately
     ========================================================= */
  var DAY_MIN = 1440;
  function minOf(t) { var d = new Date(t); return d.getHours() * 60 + d.getMinutes(); }
  function circ(a, b) { var d = Math.abs(a - b) % DAY_MIN; return Math.min(d, DAY_MIN - d); }
  function inWin(min, w) { var s = toMin(w.s), e = toMin(w.e); return s < e ? (min >= s && min < e) : (min >= s || min < e); }
  function isWeekend(t) { var g = new Date(t).getDay(); return g === 0 || g === 6; }
  function tokens(text) {
    return String(text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 2; });
  }
  var noteMemo = { rev: -1, map: null };
  function learnedWords() {
    if (noteMemo.rev === rev && noteMemo.map) return noteMemo.map;
    var map = {};
    state.entries.forEach(function (e) {
      if (!e.note) return;
      uniq(tokens(e.note)).forEach(function (t) {
        if (t.length < 3 || /^\d+$/.test(t)) return;
        (map[t] = map[t] || {})[e.catId] = (map[t][e.catId] || 0) + 1;
      });
    });
    noteMemo = { rev: rev, map: map };
    return map;
  }

  function suggest(amt, note, ts) {
    var cats = state.cats;
    if (!cats.length) return null;
    var min = minOf(ts), wk = isWeekend(ts), P = {};
    cats.forEach(function (c) { P[c.id] = { rule: 0, note: 0, habit: 0, usage: 0 }; });

    cats.forEach(function (c) {
      c.windows.forEach(function (w) {
        if (inWin(min, w) && !P[c.id].rule) { P[c.id].rule = 3; P[c.id].win = w; }
      });
    });

    var toks = tokens(note);
    if (toks.length) {
      var low = String(note).toLowerCase();
      cats.forEach(function (c) {
        for (var i = 0; i < c.keywords.length; i++) {
          var k = c.keywords[i];
          var hit = k.indexOf(' ') >= 0 ? low.indexOf(k) >= 0
            : toks.indexOf(k) >= 0 || (k.length >= 4 && toks.some(function (t) { return t.indexOf(k) === 0; }));
          if (hit) { P[c.id].note = 8; P[c.id].word = k; break; }
        }
      });
      if (state.learn) {
        var L = learnedWords();
        toks.forEach(function (t) {
          var m = L[t]; if (!m) return;
          var tot = 0; for (var id in m) tot += m[id];
          for (var cid in m) {
            if (!P[cid]) continue;
            var v = 7 * (m[cid] / tot) * Math.min(1, tot / 2);
            if (v > P[cid].note) { P[cid].note = v; P[cid].word = t; P[cid].learned = true; }
          }
        });
      }
    }

    if (state.learn && state.entries.length) {
      var now = Date.now(), H = {}, U = {}, hTot = 0, uTot = 0, la = amt > 0 ? Math.log(amt) : null;
      for (var i = state.entries.length - 1, n = 0; i >= 0 && n < 3000; i--, n++) {
        var e = state.entries[i];
        if (!P[e.catId]) continue;
        var age = (now - e.ts) / 864e5;
        if (age > 240 || age < -1) continue;
        var rec = Math.exp(-Math.max(0, age) / 60);
        U[e.catId] = (U[e.catId] || 0) + rec; uTot += rec;
        var dt = circ(min, minOf(e.ts));
        var w = Math.exp(-(dt * dt) / (2 * 80 * 80)) * (isWeekend(e.ts) === wk ? 1 : 0.6) * rec;
        if (la !== null) { var da = la - Math.log(e.amt); w *= Math.exp(-(da * da) / (2 * 0.5 * 0.5)); }
        H[e.catId] = (H[e.catId] || 0) + w; hTot += w;
      }
      for (var h in H) P[h].habit = 4.5 * H[h] / (hTot + 1.2);
      for (var u in U) P[u].usage = 0.6 * U[u] / (uTot + 1);
    }

    var best = null, bestScore = -1;
    cats.forEach(function (c, i) {
      var p = P[c.id];
      var s = p.rule + p.note + p.habit + p.usage + 0.01 * (cats.length - i) / cats.length;
      if (s > bestScore) { bestScore = s; best = c; }
    });
    var p = P[best.id];
    var top = [['note', p.note], ['rule', p.rule], ['habit', p.habit], ['usage', p.usage]]
      .sort(function (a, b) { return b[1] - a[1]; })[0];
    var why = null;
    if (top[1] >= 0.15) {
      if (top[0] === 'note') why = p.learned ? 'You filed “' + p.word + '” here before' : 'Note says “' + p.word + '”';
      else if (top[0] === 'rule') why = p.win.label ? p.win.label + ' time' : 'Set for ' + fmtWin(p.win);
      else if (top[0] === 'habit') why = amt > 0 ? 'Like your past spends at this hour' : 'Your usual at this hour';
      else why = 'Your most used';
    }
    return { id: best.id, why: why };
  }

  /* =========================================================
     Elements
     ========================================================= */
  function $(id) { return document.getElementById(id); }
  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-i]').forEach(function (el) {
      if (!el.querySelector('svg.i')) el.insertAdjacentHTML('afterbegin', icon(el.getAttribute('data-i')));
    });
  }
  hydrateIcons();

  var VIEWS = { add: $('v-add'), insights: $('v-insights'), categories: $('v-categories'), settings: $('v-settings') };
  var PARENT = { insights: 'add', settings: 'add', categories: 'settings', add: 'add' };
  var amountEl = $('amount'), digitsEl = $('digits'), curEl = $('cur'), zoneEl = amountEl.parentNode;
  var stripEl = $('strip'), keypadEl = $('keypad'), saveEl = $('save'), smartEl = $('smart');
  var notePill = $('note-pill'), noteText = $('note-text'), noteEl = $('note');
  var whenPill = $('when-pill'), whenEl = $('when'), whenText = $('when-text'), whenReset = $('when-reset');
  var toastEl = $('toast');
  var current = 'add';

  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (err) {} }

  /* =========================================================
     Capture screen
     ========================================================= */
  var cap = { buf: '', manualId: null, ts: null };
  var sugg = null;
  function bufMinor() { if (!cap.buf) return 0; var n = Number(cap.buf); return isFinite(n) ? Math.round(n * 100) : 0; }
  function selectedId() {
    if (cap.manualId && catById(cap.manualId)) return cap.manualId;
    if (sugg && catById(sugg.id)) return sugg.id;
    return state.cats[0] && state.cats[0].id;
  }
  function recompute() { sugg = suggest(bufMinor(), noteEl.value, cap.ts || Date.now()); }

  function press(k) {
    var b = cap.buf;
    if (k === 'back') b = b.slice(0, -1);
    else if (k === '.') { if (b.indexOf('.') < 0) b = (b || '0') + '.'; }
    else {
      var parts = b.split('.');
      if (parts.length === 2) { if (parts[1].length >= 2) return nudge(false); b += k; }
      else {
        if (b === '0') b = '';
        if (b.length >= 7) return nudge(false);
        b = (b === '' && k === '0') ? '0' : b + k;
      }
    }
    cap.buf = b;
    recompute();
    renderCapture();
  }
  function bufText() {
    if (!cap.buf) return '0';
    var parts = cap.buf.split('.');
    var i = nf0.format(Number(parts[0] || '0'));
    return parts.length === 2 ? i + '.' + parts[1] : i;
  }
  function fitAmount(text) {
    var digits = (text.match(/\d/g) || []).length;
    var ems = digits * 0.6 + (text.length - digits) * 0.26 + state.currency.length * 0.3 + 0.3;
    var max = window.innerHeight <= 660 ? 60 : window.innerHeight <= 760 ? 72 : 88;
    var fs = Math.max(34, Math.min(max, Math.floor((zoneEl.clientWidth - 12) / ems)));
    amountEl.style.fontSize = fs + 'px';
  }
  var nudgeTimer;
  function nudge(withHint) {
    amountEl.classList.remove('shake'); void amountEl.offsetWidth; amountEl.classList.add('shake');
    buzz(30);
    if (withHint) {
      saveEl.textContent = 'Enter an amount first';
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(renderSave, 1400);
    }
  }

  function tileHtml(c) {
    return '<button type="button" class="tile cc" role="radio" aria-checked="false" data-id="' + esc(c.id) + '" style="' + cvars(c.color) + '">' +
      '<span class="bubble">' + icon(c.icon) + '</span><span class="tname">' + esc(c.name) + '</span>' +
      '<span class="spark" hidden>' + icon('sparkle') + '</span></button>';
  }
  function renderStrip() {
    stripEl.innerHTML = state.cats.map(tileHtml).join('') +
      '<button type="button" class="tile add" data-new="1" aria-label="New category"><span class="bubble">' + icon('plus') + '</span><span class="tname">New</span></button>';
    lastSel = null;
    updateStrip();
  }
  var lastSel = null;
  function updateStrip() {
    var sel = selectedId(), sid = sugg && sugg.why ? sugg.id : null;
    stripEl.querySelectorAll('.tile[data-id]').forEach(function (t) {
      var id = t.getAttribute('data-id');
      t.setAttribute('aria-checked', String(id === sel));
      t.querySelector('.spark').hidden = id !== sid;
    });
    if (sel !== lastSel) {
      lastSel = sel;
      var t = stripEl.querySelector('.tile[data-id="' + cssEsc(sel) + '"]');
      if (t) {
        var sr = stripEl.getBoundingClientRect(), tr = t.getBoundingClientRect();
        if (tr.left < sr.left + 8 || tr.right > sr.right - 8) {
          stripEl.scrollTo({ left: stripEl.scrollLeft + tr.left - sr.left - 20, behavior: 'smooth' });
        }
      }
    }
  }
  function cssEsc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

  function renderSmart() {
    var sel = catById(selectedId());
    if (!sel) { smartEl.innerHTML = ''; return; }
    var manualOther = cap.manualId && sugg && sugg.why && cap.manualId !== sugg.id;
    if (manualOther) {
      var s = catById(sugg.id);
      smartEl.outerHTML = '<button type="button" id="smart" class="smart">' + icon('sparkles') +
        '<span class="why">Use suggestion: ' + esc(s.name) + '</span></button>';
    } else {
      var html = (sugg && sugg.why && sugg.id === sel.id ? icon('sparkles') : icon('tag')) + '<b>' + esc(sel.name) + '</b>' +
        (sugg && sugg.why && sugg.id === sel.id ? '<span class="why">· ' + esc(sugg.why) + '</span>' : '');
      smartEl.outerHTML = '<div id="smart" class="smart">' + html + '</div>';
    }
    smartEl = $('smart');
  }
  var flashUntil = 0;
  function renderSave() {
    if (Date.now() < flashUntil) return;
    saveEl.classList.remove('done');
    var amt = bufMinor(), c = catById(selectedId());
    if (amt <= 0 || !c) { saveEl.disabled = true; saveEl.textContent = 'Enter an amount'; return; }
    saveEl.disabled = false;
    saveEl.innerHTML = '<span class="save-dot cc" style="' + cvars(c.color) + '">' + icon(c.icon) + '</span>' +
      '<span class="lbl">Add <span class="amt">' + esc(money(amt)) + '</span> to ' + esc(c.name) + '</span>';
  }
  function renderAmount() {
    curEl.textContent = state.currency;
    var text = bufText();
    digitsEl.textContent = text;
    amountEl.classList.toggle('empty', bufMinor() <= 0);
    amountEl.setAttribute('aria-label', 'Amount ' + state.currency + text);
    fitAmount(text);
  }
  function renderWhen() {
    if (!cap.ts) { whenText.textContent = 'Now'; whenPill.classList.remove('set'); whenReset.hidden = true; return; }
    whenText.textContent = dayLabel(cap.ts) + ', ' + timeLabel(cap.ts);
    whenPill.classList.add('set'); whenReset.hidden = false;
  }
  function renderNotePill() {
    var v = noteEl.value.trim();
    noteText.textContent = v ? (v.length > 22 ? v.slice(0, 21) + '…' : v) : 'Add note';
    notePill.classList.toggle('set', !!v);
  }
  function renderCapture() { renderAmount(); updateStrip(); renderSmart(); renderSave(); }

  function renderTotals() {
    var now = new Date(), dk = dayKey(now), y = now.getFullYear(), m = now.getMonth(), t = 0, mo = 0;
    state.entries.forEach(function (e) {
      var d = new Date(e.ts);
      if (d.getFullYear() === y && d.getMonth() === m) { mo += e.amt; if (dayKey(d) === dk) t += e.amt; }
    });
    $('today-date').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    $('t-today').textContent = money(t);
    $('t-month').textContent = 'today · ' + money(mo) + ' this month';
  }

  function resetCapture() {
    cap.buf = ''; cap.manualId = null; cap.ts = null;
    noteEl.value = ''; noteEl.hidden = true; notePill.hidden = false;
    renderNotePill(); renderWhen();
  }

  function doSave() {
    var amt = bufMinor();
    if (amt <= 0) return nudge(true);
    var c = catById(selectedId());
    if (!c) return;
    var prev = { buf: cap.buf, ts: cap.ts, manualId: cap.manualId, note: noteEl.value.trim() };
    var entry = addEntry({ amt: amt, catId: c.id, note: prev.note, ts: cap.ts || Date.now() });
    resetCapture();
    recompute();
    var tile = stripEl.querySelector('.tile[data-id="' + cssEsc(c.id) + '"]');
    if (tile) { tile.classList.remove('pop'); void tile.offsetWidth; tile.classList.add('pop'); }
    buzz(14);
    flashUntil = Date.now() + 750;
    saveEl.disabled = true;
    saveEl.classList.add('done');
    saveEl.innerHTML = icon('check') + 'Added';
    setTimeout(renderSave, 780);
    renderTotals();
    renderAmount(); updateStrip(); renderSmart();
    toast('Added <b>' + esc(money(amt)) + '</b> to ' + esc(c.name), 'Undo', function () {
      removeEntry(entry.id);
      cap.buf = prev.buf; cap.ts = prev.ts; cap.manualId = prev.manualId;
      if (prev.note) noteEl.value = prev.note;
      flashUntil = 0;
      renderNotePill(); renderWhen(); renderTotals(); recompute(); renderCapture();
      toast('Removed', null, null, 'info');
    });
  }

  /* Keypad: tap, hold ⌫ to clear */
  var holdTimer = null, holdFired = false;
  keypadEl.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('[data-k="back"]')) return;
    holdFired = false; clearTimeout(holdTimer);
    holdTimer = setTimeout(function () { holdFired = true; cap.buf = ''; recompute(); renderCapture(); buzz(20); }, 450);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { keypadEl.addEventListener(t, function () { clearTimeout(holdTimer); }); });
  keypadEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]');
    if (!b) return;
    if (b.getAttribute('data-k') === 'back' && holdFired) { holdFired = false; return; }
    press(b.getAttribute('data-k'));
  });
  saveEl.addEventListener('click', doSave);

  /* Category strip: tap selects, long-press edits */
  var lp = { timer: null, fired: false, x: 0, y: 0 };
  stripEl.addEventListener('pointerdown', function (e) {
    var t = e.target.closest('.tile[data-id]');
    lp.fired = false; clearTimeout(lp.timer);
    if (!t) return;
    lp.x = e.clientX; lp.y = e.clientY;
    lp.timer = setTimeout(function () { lp.fired = true; buzz(18); openCatEditor(t.getAttribute('data-id')); }, 520);
  });
  stripEl.addEventListener('pointermove', function (e) {
    if (Math.abs(e.clientX - lp.x) > 10 || Math.abs(e.clientY - lp.y) > 10) clearTimeout(lp.timer);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { stripEl.addEventListener(t, function () { clearTimeout(lp.timer); }); });
  stripEl.addEventListener('contextmenu', function (e) { if (e.target.closest('.tile')) e.preventDefault(); });
  stripEl.addEventListener('click', function (e) {
    if (lp.fired) { lp.fired = false; return; }
    var t = e.target.closest('.tile');
    if (!t) return;
    if (t.hasAttribute('data-new')) return openCatEditor(null, { select: true });
    var id = t.getAttribute('data-id');
    cap.manualId = id;
    buzz(6);
    renderCapture();
  });
  document.getElementById('v-add').addEventListener('click', function (e) {
    if (e.target.closest('button#smart')) { cap.manualId = null; renderCapture(); }
  });

  /* Note */
  notePill.addEventListener('click', function () {
    notePill.hidden = true; noteEl.hidden = false; noteEl.focus();
  });
  noteEl.addEventListener('input', function () { recompute(); updateStrip(); renderSmart(); renderSave(); });
  noteEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); noteEl.blur(); } });
  noteEl.addEventListener('blur', function () { noteEl.hidden = true; notePill.hidden = false; renderNotePill(); });

  /* When */
  function primeWhen() { whenEl.value = toLocalInput(cap.ts || Date.now()); whenEl.max = toLocalInput(Date.now()); }
  whenPill.addEventListener('pointerdown', primeWhen);
  whenEl.addEventListener('focus', primeWhen);
  whenEl.addEventListener('click', function () { try { if (whenEl.showPicker) whenEl.showPicker(); } catch (err) {} });
  whenEl.addEventListener('change', function () {
    var t = fromLocalInput(whenEl.value);
    if (t && t > Date.now()) t = null;
    if (t && Math.abs(t - Date.now()) < 60000) t = null;
    cap.ts = t;
    renderWhen(); recompute(); renderCapture();
  });
  whenReset.addEventListener('click', function () { cap.ts = null; renderWhen(); recompute(); renderCapture(); });

  /* Physical keyboard */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheetEl.hidden) { closeSheet(); return; }
    if (current !== 'add' || !sheetEl.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === '.' || e.key === ',') press('.');
    else if (e.key === 'Backspace') press('back');
    else if (e.key === 'Enter') { if (t && t.tagName === 'BUTTON') return; doSave(); }
    else if (e.key === 'Escape') { cap.buf = ''; recompute(); renderCapture(); }
    else return;
    e.preventDefault();
  });

  /* =========================================================
     Toast
     ========================================================= */
  var toastTimer;
  function toast(html, actionLabel, action, kind) {
    toastEl.innerHTML = '<span class="ti"' + (kind === 'info' ? ' style="background:var(--muted)"' : '') + '>' + icon(kind === 'info' ? 'info' : 'check') + '</span>' +
      '<span class="msg">' + html + '</span>' + (actionLabel ? '<button type="button">' + esc(actionLabel) + '</button>' : '');
    if (actionLabel) toastEl.querySelector('button').addEventListener('click', function () { hideToast(); action(); });
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, actionLabel ? 5000 : 2200);
  }
  function hideToast() { toastEl.classList.remove('show'); }

  /* =========================================================
     Insights
     ========================================================= */
  var ins = { y: 0, m: 0, filter: null };
  function resetInsights() { var n = new Date(); ins = { y: n.getFullYear(), m: n.getMonth(), filter: null }; }
  function monthRange(y, m) { return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()]; }
  function sum(list) { var s = 0; list.forEach(function (e) { s += e.amt; }); return s; }
  function monthEntries() {
    var r = monthRange(ins.y, ins.m);
    return state.entries.filter(function (e) { return e.ts >= r[0] && e.ts < r[1]; }).sort(function (a, b) { return b.ts - a.ts; });
  }
  function renderInsights() {
    var now = new Date(), list = monthEntries(), total = sum(list);
    var isCur = ins.y === now.getFullYear() && ins.m === now.getMonth();
    var dim = new Date(ins.y, ins.m + 1, 0).getDate();
    var elapsed = isCur ? now.getDate() : dim;
    var mName = new Date(ins.y, ins.m, 1).toLocaleDateString('en-IN', { month: 'long' });
    $('m-label').textContent = new Date(ins.y, ins.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    $('m-next').disabled = ins.y > now.getFullYear() || (ins.y === now.getFullYear() && ins.m >= now.getMonth());
    $('h-label').textContent = isCur ? 'Spent so far in ' + mName : 'Spent in ' + mName;
    $('h-total').textContent = money(total);
    $('h-sub').textContent = list.length
      ? plural(list.length, 'expense', 'expenses') + ' · ' + money(Math.round(total / elapsed / 100) * 100) + ' a day'
      : 'Nothing logged yet';

    // Same days of the previous month, so a half-finished month compares fairly.
    var ps = new Date(ins.y, ins.m - 1, 1).getTime();
    var pe = Math.min(new Date(ins.y, ins.m - 1, elapsed + 1).getTime(), new Date(ins.y, ins.m, 1).getTime());
    var prev = 0;
    state.entries.forEach(function (e) { if (e.ts >= ps && e.ts < pe) prev += e.amt; });
    var dEl = $('h-delta');
    if (prev > 0 && total > 0) {
      var pct = Math.round((total - prev) * 100 / prev);
      var pm = new Date(ins.y, ins.m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
      dEl.className = 'delta ' + (pct > 0 ? 'up' : 'down');
      dEl.innerHTML = icon(pct > 0 ? 'arrow-up-right' : 'arrow-down-right') + Math.abs(pct) + '% vs ' + esc(pm);
      dEl.title = (pct > 0 ? 'More' : 'Less') + ' than the same days of ' + pm;
    } else { dEl.className = ''; dEl.innerHTML = ''; }

    var perDay = []; for (var d = 0; d < dim; d++) perDay.push(0);
    list.forEach(function (e) { perDay[new Date(e.ts).getDate() - 1] += e.amt; });
    var maxDay = Math.max.apply(null, perDay.concat([1]));
    $('bars').innerHTML = perDay.map(function (v, i) {
      var cls = isCur && i + 1 === now.getDate() ? 'today' : (isCur && i + 1 > now.getDate() ? 'future' : '');
      return '<span class="' + cls + '" style="height:' + (v ? Math.max(6, v * 100 / maxDay) : 4).toFixed(1) + '%"></span>';
    }).join('');
    $('bars-axis').innerHTML = '<span>1 ' + esc(mName.slice(0, 3)) + '</span><span>' + Math.ceil(dim / 2) + '</span><span>' + dim + '</span>';

    var by = {}, cnt = {};
    list.forEach(function (e) { by[e.catId] = (by[e.catId] || 0) + e.amt; cnt[e.catId] = (cnt[e.catId] || 0) + 1; });
    var rows = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    $('by-cat').hidden = !rows.length;
    $('stack').innerHTML = rows.map(function (r) {
      var c = catById(r[0]) || { color: 'slate' };
      return '<span class="cc" style="' + cvars(c.color) + ';flex:' + r[1] + '"></span>';
    }).join('');
    $('crows').innerHTML = rows.map(function (r) {
      var c = catById(r[0]) || { name: 'Unknown', icon: 'tag', color: 'slate' };
      var p = r[1] * 100 / total, pt = p > 0 && p < 1 ? '&lt;1%' : Math.round(p) + '%';
      return '<button type="button" class="crow cc' + (ins.filter === r[0] ? ' on' : '') + '" data-id="' + esc(r[0]) + '" style="' + cvars(c.color) + '" aria-pressed="' + (ins.filter === r[0]) + '">' +
        '<span class="bubble">' + icon(c.icon) + '</span>' +
        '<span class="mid"><span class="t1">' + esc(c.name) + '</span><span class="t2">' + plural(cnt[r[0]], 'expense', 'expenses') + '</span></span>' +
        '<span class="r"><b>' + esc(money(r[1])) + '</b><span>' + pt + '</span></span></button>';
    }).join('');

    var fc = $('filter-chip'), fcat = ins.filter && catById(ins.filter);
    if (fcat) {
      fc.hidden = false; fc.setAttribute('style', cvars(fcat.color));
      fc.innerHTML = esc(fcat.name) + icon('x'); fc.setAttribute('aria-label', 'Clear filter: ' + fcat.name);
    } else { fc.hidden = true; ins.filter = null; }

    var shown = ins.filter ? list.filter(function (e) { return e.catId === ins.filter; }) : list;
    var groups = [];
    shown.forEach(function (e) {
      var k = dayKey(e.ts);
      if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k: k, ts: e.ts, items: [] });
      groups[groups.length - 1].items.push(e);
    });
    $('days').innerHTML = groups.length ? groups.map(function (g) {
      return '<section class="day"><div class="day-h"><span>' + esc(dayLabel(g.ts)) + '</span><span>' + esc(money(sum(g.items))) + '</span></div>' +
        '<div class="list">' + g.items.map(txHtml).join('') + '</div></section>';
    }).join('') : '<div class="empty"><span class="bubble cc" style="' + cvars('slate') + '">' + icon('receipt') + '</span>' +
      'No expenses in ' + esc(mName) + (isCur ? ' yet.' : '.') + '</div>';
    $('csv-month').disabled = $('csv-copy').disabled = !list.length;
  }
  function txHtml(e) {
    var c = catById(e.catId) || { name: 'Unknown', icon: 'tag', color: 'slate' };
    return '<button type="button" class="tx cc" data-id="' + esc(e.id) + '" style="' + cvars(c.color) + '">' +
      '<span class="bubble">' + icon(c.icon) + '</span>' +
      '<span class="mid"><span class="t1">' + esc(e.note || c.name) + '</span><span class="t2">' + esc(e.note ? c.name + ' · ' + timeLabel(e.ts) : timeLabel(e.ts)) + '</span></span>' +
      '<span class="amt">' + esc(money(e.amt)) + '</span></button>';
  }
  $('m-prev').addEventListener('click', function () { ins.m--; if (ins.m < 0) { ins.m = 11; ins.y--; } renderInsights(); });
  $('m-next').addEventListener('click', function () { ins.m++; if (ins.m > 11) { ins.m = 0; ins.y++; } renderInsights(); });
  $('crows').addEventListener('click', function (e) {
    var r = e.target.closest('.crow'); if (!r) return;
    var id = r.getAttribute('data-id');
    ins.filter = ins.filter === id ? null : id;
    renderInsights();
  });
  $('filter-chip').addEventListener('click', function () { ins.filter = null; renderInsights(); });
  $('days').addEventListener('click', function (e) { var r = e.target.closest('.tx'); if (r) openEntryEditor(r.getAttribute('data-id')); });

  /* =========================================================
     Export / share
     ========================================================= */
  function csvCell(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(list) {
    var lines = [['Date', 'Time', 'Amount', 'Category', 'Note']];
    list.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (e) {
      var d = new Date(e.ts), c = catById(e.catId);
      lines.push([d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), pad(d.getHours()) + ':' + pad(d.getMinutes()),
        (e.amt / 100).toFixed(2), c ? c.name : '', e.note || '']);
    });
    return lines.map(function (r) { return r.map(csvCell).join(','); }).join('\n') + '\n';
  }
  function shareOrDownload(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    function fallback() {
      try {
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      } catch (err) { toast("Couldn't save a file here. Use Copy instead.", null, null, 'info'); }
    }
    try {
      var file = new File([blob], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch(function (err) { if (!err || err.name !== 'AbortError') fallback(); });
        return;
      }
    } catch (err) {}
    fallback();
  }
  function copyText(text, what) {
    try {
      navigator.clipboard.writeText(text).then(function () { toast('Copied ' + esc(what)); }, function () { toast("Couldn't copy here", null, null, 'info'); });
    } catch (err) { toast("Couldn't copy here", null, null, 'info'); }
  }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  $('csv-month').addEventListener('click', function () { shareOrDownload('kharcha-' + ins.y + '-' + pad(ins.m + 1) + '.csv', toCSV(monthEntries()), 'text/csv'); });
  $('csv-copy').addEventListener('click', function () { copyText(toCSV(monthEntries()), 'as CSV'); });

  /* =========================================================
     Bottom sheet
     ========================================================= */
  var sheetEl = $('sheet'), sheetBody = $('sheet-body'), sheetFoot = $('sheet-foot'), sheetHandler = null, sheetCloseTimer, sheetReturn = null;
  function openSheet(title, body, foot, handler) {
    clearTimeout(sheetCloseTimer);
    $('sheet-title').textContent = title;
    sheetBody.innerHTML = body; sheetFoot.innerHTML = foot || '';
    sheetHandler = handler || {};
    sheetReturn = document.activeElement;
    sheetEl.hidden = false;
    Object.keys(VIEWS).forEach(function (k) { VIEWS[k].inert = true; });
    VIEWS[current].classList.add('locked');
    sheetBody.scrollTop = 0;
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheetEl.classList.add('open'); }); });
  }
  function closeSheet() {
    if (sheetEl.hidden) return;
    sheetEl.classList.remove('open');
    Object.keys(VIEWS).forEach(function (k) { VIEWS[k].inert = false; VIEWS[k].classList.remove('locked'); });
    sheetHandler = null;
    if (document.activeElement && sheetEl.contains(document.activeElement)) document.activeElement.blur();
    sheetCloseTimer = setTimeout(function () { sheetEl.hidden = true; sheetBody.innerHTML = ''; sheetFoot.innerHTML = ''; }, 330);
    try { if (sheetReturn && sheetReturn.focus && document.body.contains(sheetReturn)) sheetReturn.focus({ preventScroll: true }); } catch (err) {}
  }
  var scrimArmed = false;
  sheetEl.addEventListener('pointerdown', function (e) { scrimArmed = e.target.classList.contains('scrim'); });
  sheetEl.addEventListener('click', function (e) {
    if (e.target.classList.contains('scrim')) { if (scrimArmed) closeSheet(); scrimArmed = false; return; }
    if (e.target.closest('[data-close]')) return closeSheet();
    if (sheetHandler && sheetHandler.click) sheetHandler.click(e);
  });
  sheetEl.addEventListener('input', function (e) { if (sheetHandler && sheetHandler.input) sheetHandler.input(e); });
  sheetEl.addEventListener('change', function (e) { if (sheetHandler && sheetHandler.change) sheetHandler.change(e); });

  /* ---------- Entry editor ---------- */
  function catChips(sel) {
    return '<div class="chips" role="radiogroup" aria-label="Category">' + state.cats.map(function (c) {
      return '<button type="button" class="cchip cc" role="radio" aria-checked="' + (c.id === sel) + '" data-cat="' + esc(c.id) + '" style="' + cvars(c.color) + '">' +
        '<span class="bubble">' + icon(c.icon) + '</span>' + esc(c.name) + '</button>';
    }).join('') + '</div>';
  }
  function openEntryEditor(id) {
    var e = null; state.entries.forEach(function (x) { if (x.id === id) e = x; });
    if (!e) return;
    var catId = catById(e.catId) ? e.catId : state.cats[0].id;
    var body =
      '<label class="f-label" for="ee-amt">Amount</label>' +
      '<div class="amt-field"><span>' + esc(state.currency) + '</span><input id="ee-amt" inputmode="decimal" autocomplete="off" value="' + esc(minorToStr(e.amt)) + '"></div>' +
      '<span class="f-label">Category</span>' + catChips(catId) +
      '<label class="f-label" for="ee-note">Note</label>' +
      '<input class="field" id="ee-note" maxlength="80" autocomplete="off" placeholder="Optional" value="' + esc(e.note) + '">' +
      '<label class="f-label" for="ee-when">Date and time</label>' +
      '<input class="field" id="ee-when" type="datetime-local" value="' + toLocalInput(e.ts) + '">';
    setTimeout(function () {
      var sc = sheetBody.querySelector('.cchip[aria-checked="true"]'), row = sc && sc.parentNode;
      if (sc) row.scrollLeft = sc.offsetLeft - row.clientWidth / 2 + sc.offsetWidth / 2;
    }, 0);
    var foot = '<button type="button" class="btn danger" data-act="del">' + icon('trash-2') + 'Delete</button>' +
      '<button type="button" class="btn primary" data-act="save">Save changes</button>';
    openSheet('Edit expense', body, foot, {
      click: function (ev) {
        var chip = ev.target.closest('.cchip');
        if (chip) {
          catId = chip.getAttribute('data-cat');
          sheetBody.querySelectorAll('.cchip').forEach(function (c) { c.setAttribute('aria-checked', String(c === chip)); });
          return;
        }
        var act = ev.target.closest('[data-act]');
        if (!act) return;
        if (act.getAttribute('data-act') === 'del') {
          var removed = removeEntry(e.id);
          closeSheet(); refreshAll();
          if (removed) toast('Deleted <b>' + esc(money(removed.amt)) + '</b>', 'Undo', function () { state.entries.push(removed); save(); refreshAll(); toast('Restored'); });
        } else {
          var amt = parseAmount($('ee-amt').value);
          if (!(amt > 0)) { $('ee-amt').focus(); return toast('Enter an amount above zero', null, null, 'info'); }
          var ts = fromLocalInput($('ee-when').value) || e.ts;
          e.amt = amt; e.catId = catId; e.note = $('ee-note').value.trim().slice(0, 80); e.ts = ts;
          save(); closeSheet(); refreshAll();
          toast('Expense updated');
        }
      }
    });
  }

  /* ---------- Category editor ---------- */
  function unusedColor() {
    var used = {}; state.cats.forEach(function (c) { used[c.color] = 1; });
    for (var i = 0; i < COLOR_KEYS.length; i++) if (!used[COLOR_KEYS[i]]) return COLOR_KEYS[i];
    return COLOR_KEYS[state.cats.length % COLOR_KEYS.length];
  }
  function winsHtml(wins) {
    return wins.map(function (w, i) {
      return '<div class="win" data-w="' + i + '">' +
        '<input class="field wl" data-wf="label" maxlength="20" placeholder="Label, e.g. Lunch" value="' + esc(w.label) + '" aria-label="Label">' +
        '<button type="button" class="icon-btn rm" data-act="rm-win" data-w="' + i + '" aria-label="Remove this time">' + icon('trash-2') + '</button>' +
        '<div class="wt"><input class="field" type="time" data-wf="s" value="' + esc(w.s) + '" aria-label="From"><span>to</span>' +
        '<input class="field" type="time" data-wf="e" value="' + esc(w.e) + '" aria-label="Until"></div></div>';
    }).join('');
  }
  function openCatEditor(id, opts) {
    opts = opts || {};
    var orig = id ? catById(id) : null;
    if (id && !orig) return;
    var d = orig ? clone(orig) : { id: uid(), name: '', icon: 'tag', color: unusedColor(), windows: [], keywords: [] };
    var count = orig ? state.entries.filter(function (e) { return e.catId === orig.id; }).length : 0;
    var others = state.cats.filter(function (c) { return !orig || c.id !== orig.id; });

    var body =
      '<div class="ce-top cc" id="ce-top" style="' + cvars(d.color) + '"><span class="bubble" id="ce-bubble">' + icon(d.icon) + '</span>' +
      '<input class="field" id="ce-name" maxlength="24" autocomplete="off" placeholder="Category name" aria-label="Category name" value="' + esc(d.name) + '"></div>' +
      '<span class="f-label">Icon</span>' +
      '<div class="icon-grid cc" id="ce-icons" role="radiogroup" aria-label="Icon" style="' + cvars(d.color) + '">' +
      CAT_ICONS.map(function (n) {
        return '<button type="button" role="radio" aria-checked="' + (n === d.icon) + '" aria-label="' + esc(n.replace(/-/g, ' ')) + '" data-icon="' + n + '">' + icon(n) + '</button>';
      }).join('') + '</div>' +
      '<span class="f-label">Colour</span>' +
      '<div class="swatches" role="radiogroup" aria-label="Colour">' + COLOR_KEYS.map(function (k) {
        return '<button type="button" class="cc" role="radio" aria-checked="' + (k === d.color) + '" aria-label="' + k + '" data-color="' + k + '" style="' + cvars(k) + '">' + icon('check') + '</button>';
      }).join('') + '</div>' +
      '<span class="f-label">Pick automatically at</span>' +
      '<div id="ce-wins">' + winsHtml(d.windows) + '</div>' +
      '<button type="button" class="add-row" data-act="add-win">' + icon('plus') + 'Add a time</button>' +
      '<p class="f-help">During these hours, this category is selected for you when you open the app.</p>' +
      '<label class="f-label" for="ce-kw">Keywords in notes</label>' +
      '<input class="field" id="ce-kw" autocomplete="off" autocapitalize="off" placeholder="e.g. swiggy, zomato, chai" value="' + esc(d.keywords.join(', ')) + '">' +
      '<p class="f-help">If a note contains one of these words, this category is picked.</p>' +
      (orig ? '<div class="danger-box">' +
        (others.length ? '<button type="button" class="btn danger block" data-act="del">' + icon('trash-2') + 'Delete category</button>' +
          '<div id="ce-del" hidden><p class="f-help">' + (count ? 'Move its ' + plural(count, 'expense', 'expenses') + ' to:' : 'It has no expenses, so nothing else changes.') + '</p>' +
          '<div class="row">' + (count ? '<select class="field" id="ce-move" aria-label="Move expenses to">' + others.map(function (c) {
            return '<option value="' + esc(c.id) + '"' + (c.id === 'other' ? ' selected' : '') + '>' + esc(c.name) + '</option>';
          }).join('') + '</select>' : '') + '<button type="button" class="btn danger-solid" data-act="del-confirm">Delete</button></div></div>'
          : '<p class="f-help">This is your only category, so it can\'t be deleted.</p>') +
        '</div>' : '');
    var foot = '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-act="save">' + (orig ? 'Save' : 'Create') + '</button>';

    function readWins() {
      var out = [];
      sheetBody.querySelectorAll('.win').forEach(function (row) {
        out.push({
          label: row.querySelector('[data-wf="label"]').value.trim(),
          s: row.querySelector('[data-wf="s"]').value, e: row.querySelector('[data-wf="e"]').value
        });
      });
      return out;
    }
    function setColor(k) {
      d.color = k;
      ['ce-top', 'ce-icons'].forEach(function (x) { $(x).setAttribute('style', cvars(k)); });
      sheetBody.querySelectorAll('[data-color]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-color') === k)); });
    }

    openSheet(orig ? 'Edit category' : 'New category', body, foot, {
      click: function (ev) {
        var ib = ev.target.closest('[data-icon]');
        if (ib) {
          d.icon = ib.getAttribute('data-icon');
          $('ce-bubble').innerHTML = icon(d.icon);
          sheetBody.querySelectorAll('[data-icon]').forEach(function (b) { b.setAttribute('aria-checked', String(b === ib)); });
          return;
        }
        var cb = ev.target.closest('[data-color]');
        if (cb) return setColor(cb.getAttribute('data-color'));
        var act = ev.target.closest('[data-act]');
        if (!act) return;
        var a = act.getAttribute('data-act');
        if (a === 'add-win') {
          d.windows = readWins();
          if (d.windows.length >= 6) return toast('Up to 6 times per category', null, null, 'info');
          d.windows.push({ label: '', s: '09:00', e: '10:00' });
          $('ce-wins').innerHTML = winsHtml(d.windows);
        } else if (a === 'rm-win') {
          d.windows = readWins();
          d.windows.splice(+act.getAttribute('data-w'), 1);
          $('ce-wins').innerHTML = winsHtml(d.windows);
        } else if (a === 'del') {
          act.hidden = true; $('ce-del').hidden = false;
        } else if (a === 'del-confirm') {
          var target = $('ce-move') ? $('ce-move').value : null;
          var snapshot = clone(state.cats), moved = [];
          state.entries.forEach(function (e) { if (e.catId === orig.id) { e.catId = target; moved.push(e.id); } });
          state.cats = state.cats.filter(function (c) { return c.id !== orig.id; });
          if (cap.manualId === orig.id) cap.manualId = null;
          save(); closeSheet(); refreshAll(true);
          toast('Deleted ' + esc(orig.name), 'Undo', function () {
            state.cats = snapshot;
            state.entries.forEach(function (e) { if (moved.indexOf(e.id) >= 0) e.catId = orig.id; });
            save(); refreshAll(true); toast('Restored ' + esc(orig.name));
          });
        } else if (a === 'save') {
          var name = $('ce-name').value.trim().slice(0, 24);
          if (!name) { $('ce-name').focus(); return toast('Give the category a name', null, null, 'info'); }
          var clash = state.cats.some(function (c) { return c.id !== d.id && c.name.toLowerCase() === name.toLowerCase(); });
          if (clash) { $('ce-name').focus(); return toast('You already have “' + esc(name) + '”', null, null, 'info'); }
          var wins = readWins().filter(function (w) { return HHMM.test(w.s) && HHMM.test(w.e) && w.s !== w.e; });
          var kws = uniq($('ce-kw').value.split(/[,\n]/).map(function (k) { return k.trim().toLowerCase(); }).filter(Boolean)).slice(0, 60);
          var next = cleanCat({ id: d.id, name: name, icon: d.icon, color: d.color, windows: wins, keywords: kws });
          if (orig) {
            state.cats = state.cats.map(function (c) { return c.id === orig.id ? next : c; });
          } else {
            var oi = -1; state.cats.forEach(function (c, i) { if (c.id === 'other') oi = i; });
            if (oi === state.cats.length - 1) state.cats.splice(oi, 0, next); else state.cats.push(next);
            if (opts.select) cap.manualId = next.id;
          }
          save(); closeSheet(); refreshAll(true);
          toast(orig ? 'Saved ' + esc(name) : 'Created ' + esc(name));
        }
      }
    });
    if (!orig) setTimeout(function () { try { $('ce-name').focus({ preventScroll: true }); } catch (err) {} }, 360);
  }

  /* =========================================================
     Category manager (drag to reorder)
     ========================================================= */
  function catMeta(c) {
    var n = state.entries.filter(function (e) { return e.catId === c.id; }).length, bits = [plural(n, 'expense', 'expenses')];
    if (c.windows.length) {
      var labels = c.windows.map(function (w) { return w.label; }).filter(Boolean);
      bits.push(labels.length === c.windows.length ? labels.join(', ') : plural(c.windows.length, 'time', 'times'));
    }
    if (c.keywords.length) bits.push(plural(c.keywords.length, 'keyword', 'keywords'));
    return bits.join(' · ');
  }
  function renderManage() {
    $('mlist').innerHTML = state.cats.map(function (c) {
      return '<div class="mrow" data-id="' + esc(c.id) + '">' +
        '<span class="grip" aria-hidden="true">' + icon('grip-vertical') + '</span>' +
        '<button type="button" class="open cc" data-open="' + esc(c.id) + '" style="' + cvars(c.color) + '">' +
        '<span class="bubble">' + icon(c.icon) + '</span>' +
        '<span class="mid"><span class="t1">' + esc(c.name) + '</span><span class="t2">' + esc(catMeta(c)) + '</span></span>' +
        icon('chevron-right') + '</button></div>';
    }).join('');
  }
  $('mlist').addEventListener('click', function (e) { var b = e.target.closest('[data-open]'); if (b) openCatEditor(b.getAttribute('data-open')); });
  $('cat-new').addEventListener('click', function () { openCatEditor(null); });
  $('cat-new-top').addEventListener('click', function () { openCatEditor(null); });
  $('mlist').addEventListener('pointerdown', function (e) {
    var grip = e.target.closest('.grip'); if (!grip) return;
    e.preventDefault();
    var row = grip.closest('.mrow'), rows = Array.prototype.slice.call($('mlist').children);
    var from = rows.indexOf(row), to = from, startY = e.clientY, h = row.getBoundingClientRect().height;
    try { grip.setPointerCapture(e.pointerId); } catch (err) {}
    row.classList.add('dragging'); buzz(10);
    function move(ev) {
      var dy = ev.clientY - startY;
      dy = Math.max(-from * h, Math.min((rows.length - 1 - from) * h, dy));
      row.style.transform = 'translateY(' + dy + 'px)';
      var t = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)));
      if (t !== to) {
        to = t; buzz(4);
        rows.forEach(function (r, i) {
          if (r === row) return;
          var s = 0;
          if (from < to && i > from && i <= to) s = -h;
          if (from > to && i < from && i >= to) s = h;
          r.style.transform = s ? 'translateY(' + s + 'px)' : '';
        });
      }
    }
    function up() {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
      rows.forEach(function (r) { r.style.transform = ''; });
      row.classList.remove('dragging');
      if (to !== from) {
        var c = state.cats.splice(from, 1)[0];
        state.cats.splice(to, 0, c);
        save(); renderStrip(); recompute(); renderCapture();
      }
      renderManage();
    }
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  });

  /* =========================================================
     Settings
     ========================================================= */
  function quickLink() { return location.origin + location.pathname + '?amt=250&cat=auto'; }
  function mealCat() { return catById('food') || state.cats.filter(function (c) { return c.windows.length; })[0] || null; }
  function renderSettings() {
    $('s-cat-count').textContent = plural(state.cats.length, 'category', 'categories');
    $('s-learn').checked = state.learn;
    var mc = mealCat();
    $('s-meals').hidden = !mc;
    if (mc) $('s-meals-sub').textContent = mc.windows.length ? mc.name + ' · ' + mc.windows.map(fmtWin).join(', ') : 'Not set';
    $('s-currency').value = state.currency;
    $('s-theme').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === state.theme)); });
    $('s-link').textContent = quickLink();
    $('s-count').textContent = plural(state.entries.length, 'expense', 'expenses') + ' on this phone';
    var st = $('s-storage');
    st.textContent = storageOK ? 'Everything stays on this phone. Nothing is uploaded.' : "This browser isn't saving data. Anything you log will be lost when the app closes.";
    st.style.color = storageOK ? '' : 'var(--danger)';
    resetErase();
  }
  $('s-learn').addEventListener('change', function () { state.learn = this.checked; save(); recompute(); renderCapture(); });
  $('s-meals').addEventListener('click', function () { var c = mealCat(); if (c) openCatEditor(c.id); });
  $('s-currency').addEventListener('change', function () {
    state.currency = this.value.trim().slice(0, 4) || '₹'; this.value = state.currency;
    save(); refreshAll();
  });
  $('s-theme').addEventListener('click', function (e) {
    var b = e.target.closest('[data-v]'); if (!b) return;
    state.theme = b.getAttribute('data-v'); save(); applyTheme(); renderSettings();
  });
  $('s-link-copy').addEventListener('click', function () { copyText(quickLink(), 'link'); });
  $('s-backup').addEventListener('click', function () {
    shareOrDownload('kharcha-backup-' + stamp() + '.json', JSON.stringify({
      app: 'kharcha', version: 2, exported: new Date().toISOString(),
      currency: state.currency, learn: state.learn, theme: state.theme, cats: state.cats, entries: state.entries
    }), 'application/json');
  });
  $('s-csv').addEventListener('click', function () { shareOrDownload('kharcha-all-' + stamp() + '.csv', toCSV(state.entries), 'text/csv'); });
  $('s-restore').addEventListener('click', function () { $('s-file').click(); });
  $('s-file').addEventListener('change', function () {
    var input = this, f = input.files && input.files[0];
    if (!f) return;
    f.text().then(function (txt) {
      var data = JSON.parse(txt);
      var isV1 = data && Array.isArray(data.entries) && data.entries.some(function (e) { return e && e.cat && !e.catId; });
      var inc = isV1 ? fromV1(data) : sanitize(data);
      var map = {}, byName = {};
      state.cats.forEach(function (c) { byName[c.name.toLowerCase()] = c.id; map[c.id] = c.id; });
      inc.cats.forEach(function (c) {
        if (map[c.id]) return;
        var same = byName[c.name.toLowerCase()];
        if (same) map[c.id] = same; else { state.cats.push(c); map[c.id] = c.id; byName[c.name.toLowerCase()] = c.id; }
      });
      var have = {}; state.entries.forEach(function (e) { have[e.id] = 1; });
      var added = 0;
      inc.entries.forEach(function (e) { if (!have[e.id]) { e.catId = map[e.catId] || e.catId; state.entries.push(e); added++; } });
      save(); refreshAll(true);
      toast('Restored ' + plural(added, 'expense', 'expenses'));
    }).catch(function () { toast("That file isn't a Kharcha backup", null, null, 'info'); })
      .then(function () { input.value = ''; });
  });
  var eraseArmed = false, eraseTimer;
  function resetErase() { eraseArmed = false; $('s-erase-text').textContent = 'Erase all expenses'; }
  $('s-erase').addEventListener('click', function () {
    if (!state.entries.length) return toast('Nothing to erase', null, null, 'info');
    if (!eraseArmed) {
      eraseArmed = true;
      $('s-erase-text').textContent = 'Tap again to erase ' + plural(state.entries.length, 'expense', 'expenses');
      clearTimeout(eraseTimer); eraseTimer = setTimeout(resetErase, 4000);
      return;
    }
    state.entries = []; save(); refreshAll();
    toast('All expenses erased');
  });

  /* =========================================================
     Theme
     ========================================================= */
  var metaThemes = Array.prototype.slice.call(document.querySelectorAll('meta[name="theme-color"]'));
  var metaDefaults = metaThemes.map(function (m) { return m.content; });
  function applyTheme() {
    var r = document.documentElement;
    if (state.theme === 'system') {
      if (r.getAttribute('data-kh-theme')) { r.removeAttribute('data-theme'); r.removeAttribute('data-kh-theme'); }
      metaThemes.forEach(function (m, i) { m.content = metaDefaults[i]; });
    } else {
      r.setAttribute('data-theme', state.theme); r.setAttribute('data-kh-theme', '1');
      var bg = state.theme === 'dark' ? '#0A0C10' : '#F4F5F7';
      metaThemes.forEach(function (m) { m.content = bg; });
    }
  }

  /* =========================================================
     Routing
     ========================================================= */
  function routeName() {
    var h = (location.hash || '').replace('#', '');
    if (h === 'history') h = 'insights';
    return VIEWS[h] ? h : 'add';
  }
  function go(name, replace) {
    if (name === current && !replace) return;
    var depth = (history.state && history.state.khDepth) || 0;
    try {
      if (replace) history.replaceState({ khDepth: depth }, '', '#' + name);
      else history.pushState({ khDepth: depth + 1 }, '', '#' + name);
    } catch (err) { location.hash = name; return; }
    route();
  }
  function route() {
    var next = routeName();
    if (!sheetEl.hidden) closeSheet();
    Object.keys(VIEWS).forEach(function (k) { VIEWS[k].hidden = k !== next; });
    if (next === 'insights' && current !== 'insights') { resetInsights(); VIEWS.insights.scrollTop = 0; }
    if (next !== current) VIEWS[next].scrollTop = 0;
    current = next;
    if (next === 'add') { renderTotals(); recompute(); renderCapture(); }
    if (next === 'insights') renderInsights();
    if (next === 'categories') renderManage();
    if (next === 'settings') renderSettings();
  }
  function refreshAll(stripToo) {
    if (stripToo) renderStrip();
    renderTotals(); recompute(); renderCapture();
    if (current === 'insights') renderInsights();
    if (current === 'categories') renderManage();
    if (current === 'settings') renderSettings();
  }
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', function () { if (routeName() !== current) route(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a) { e.preventDefault(); go(a.getAttribute('href').slice(1) || 'add'); return; }
    var back = e.target.closest('.back');
    if (back) {
      var depth = (history.state && history.state.khDepth) || 0;
      if (depth > 0) history.back(); else go(PARENT[current] || 'add', true);
    }
  });

  // Back from the background after a while (a back-tap): land on a fresh pad.
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 2 * 60 * 1000) {
      resetCapture();
      if (!sheetEl.hidden) closeSheet();
      if (current !== 'add') { go('add', true); return; }
    }
    if (current === 'add') { renderTotals(); recompute(); renderCapture(); }
  });
  var resizeRaf;
  window.addEventListener('resize', function () { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(renderAmount); });

  /* =========================================================
     Quick-add link: ?amt=250&cat=Food|auto&note=chai
     ========================================================= */
  function handleParams() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (err) { return; }
    var a = p.get('amt') || p.get('a');
    if (!a) return;
    var amt = parseAmount(a);
    var catQ = (p.get('cat') || p.get('c') || '').trim().toLowerCase();
    var note = (p.get('note') || p.get('n') || '').trim().slice(0, 80);
    try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (err) {}
    if (!(amt > 0)) return;
    var cat = null;
    if (catQ === 'auto' || catQ === 'smart') { var s = suggest(amt, note, Date.now()); cat = s && catById(s.id); }
    else if (catQ) state.cats.forEach(function (c) { if (!cat && (c.id.toLowerCase() === catQ || c.name.toLowerCase() === catQ)) cat = c; });
    if (cat) {
      var entry = addEntry({ amt: amt, catId: cat.id, note: note });
      renderTotals(); recompute(); renderCapture();
      toast('Added <b>' + esc(money(amt)) + '</b> to ' + esc(cat.name), 'Undo', function () {
        removeEntry(entry.id); renderTotals(); recompute(); renderCapture(); toast('Removed', null, null, 'info');
      });
    } else {
      cap.buf = minorToStr(amt);
      if (note) { noteEl.value = note; renderNotePill(); }
      recompute(); renderCapture();
    }
  }

  /* =========================================================
     Start
     ========================================================= */
  applyTheme();
  renderStrip();
  try { history.replaceState({ khDepth: 0 }, '', location.pathname + location.search + '#' + routeName()); } catch (err) {}
  route();
  handleParams();
  if (!storageOK) toast("This browser isn't saving data", null, null, 'info');
  try {
    if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(function () {});
  } catch (err) {}
})();
