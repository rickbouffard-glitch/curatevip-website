/* t.js: first-party visit counter for curatevip.app (Admin > Marketing).
   Counts each browser session: landing page, source (UTM, referrer, Instagram
   in-app browser), time on site, scroll depth and whether the application was
   started. No cookies, no IP stored, no third parties. Skipped when the visitor
   declined analytics or sends Global Privacy Control. */
(function () {
  var CONSENT_KEY = 'cvip_analytics_consent';
  function optedOut() {
    try { if (navigator.globalPrivacyControl) return true; } catch (e) {}
    try { return window.localStorage.getItem(CONSENT_KEY) === 'denied'; } catch (e) { return false; }
  }
  if (optedOut()) return;
  if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent || '')) return;

  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function sget(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  function lget(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  var sid = sget('cvip_sid'); if (!sid) { sid = rid(); sset('cvip_sid', sid); }
  var vid = lget('cvip_vid'); if (!vid) { vid = rid(); lset('cvip_vid', vid); }

  // First-touch source for this session (survives moving from / to /join).
  var src = null;
  try { src = JSON.parse(sget('cvip_src') || 'null'); } catch (e) { src = null; }
  if (!src) {
    var q = new URLSearchParams(window.location.search);
    src = {
      utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'),
      utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content'),
      fbclid: !!q.get('fbclid'), ref: document.referrer || null,
    };
    sset('cvip_src', JSON.stringify(src));
  }

  // Active (visible) time, summed across pages in this session.
  var priorMs = parseInt(sget('cvip_ms') || '0', 10) || 0;
  var visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
  function activeMs() { return priorMs + (visibleSince ? Date.now() - visibleSince : 0); }
  function saveMs() { sset('cvip_ms', String(activeMs())); }

  var maxScroll = 0, joined = sget('cvip_join') === '1', cta = sget('cvip_cta') === '1';
  function onScroll() {
    var h = document.documentElement, b = document.body;
    var total = Math.max(h.scrollHeight, b ? b.scrollHeight : 0) - window.innerHeight;
    var pct = total > 0 ? Math.round((window.scrollY / total) * 100) : 100;
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
  }

  function send(ev) {
    if (optedOut()) return;
    var p = {
      ev: ev, sid: sid, vid: vid, page: window.location.pathname,
      dur: Math.round(activeMs() / 1000), scroll: maxScroll,
      join: joined, cta: cta, sw: window.screen ? window.screen.width : null,
      utm_source: src.utm_source, utm_medium: src.utm_medium,
      utm_campaign: src.utm_campaign, utm_content: src.utm_content,
      fbclid: src.fbclid, ref: src.ref,
    };
    var body = JSON.stringify(p);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/v', body)) return;
    } catch (e) {}
    try { fetch('/api/v', { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Started the application: any field in the /join funnel gets focus.
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!joined && t && /INPUT|SELECT|TEXTAREA/.test(t.tagName) && window.location.pathname.indexOf('/join') === 0) {
      joined = true; sset('cvip_join', '1'); send('ping');
    }
  });
  // Clicked a call to action (Request an Invitation and similar).
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a,button') : null;
    if (!a || cta) return;
    var href = a.getAttribute('href') || '';
    if (/join|#apply/i.test(href) || /request|invitation|apply/i.test(a.textContent || '')) {
      cta = true; sset('cvip_cta', '1');
    }
  });

  var pings = 0;
  var timer = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    if (++pings > 40) { clearInterval(timer); return; }
    send('ping');
  }, 30000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (visibleSince) { priorMs += Date.now() - visibleSince; visibleSince = null; }
      saveMs(); send('ping');
    } else {
      visibleSince = Date.now();
    }
  });
  window.addEventListener('pagehide', function () { saveMs(); send('ping'); });

  onScroll();
  send('start');
})();
