/* px.js: Meta Pixel for pages without their own loader (index.html).
   /join has its own loader in join.html. Keep both IDs in sync.
   Opt-out model: loads unless the visitor declined analytics on /join or
   sends Global Privacy Control. Lets Ads Manager credit visits and
   applications to the exact ad or Reel, and builds retargeting audiences. */
(function () {
  var META_PIXEL_ID = '1815295053230528';
  if (!META_PIXEL_ID) return;
  try { if (navigator.globalPrivacyControl) return; } catch (e) {}
  try { if (window.localStorage.getItem('cvip_analytics_consent') === 'denied') return; } catch (e) {}
  if (window.fbq) return;
  var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
  if (!window._fbq) window._fbq = n;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  var s = document.createElement('script');
  s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
  // Tapping a "Request an Invitation" style button counts as interest.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a,button') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/join|#apply/i.test(href) || /request|invitation|apply/i.test(a.textContent || '')) {
      try { window.fbq('trackCustom', 'RequestInviteClick'); } catch (err) {}
    }
  });
})();
