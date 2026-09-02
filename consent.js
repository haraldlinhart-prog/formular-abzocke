(function () {
  var GA_ID = 'G-12XNPEKQS9';
  var CONSENT_KEY = 'fa-analytics-consent';

  function loadGA() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'granted') { loadGA(); return; }
  if (consent === 'denied') { return; }

  // Noch keine Entscheidung: Banner zeigen.
  document.addEventListener('DOMContentLoaded', function () {
    var banner = document.createElement('div');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-Einwilligung');
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100;background:#161d21;border-top:1px solid #263139;padding:16px clamp(18px,5vw,56px);display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-family:Inter,-apple-system,sans-serif;';
    banner.innerHTML =
      '<p style="margin:0;flex:1;min-width:240px;color:#eef2f4;font-size:14px;line-height:1.5;">' +
      'Diese Website möchte Google Analytics nutzen, um zu sehen, wie viele Menschen die Aufklärungsinhalte erreichen. ' +
      'Ohne Ihre Zustimmung wird kein Analyse-Cookie gesetzt. <a href="/datenschutz.html" style="color:#ffc266;">Mehr dazu</a>.' +
      '</p>' +
      '<div style="display:flex;gap:10px;flex-shrink:0;">' +
      '<button id="fa-consent-decline" style="padding:9px 16px;border-radius:8px;border:1px solid #263139;background:transparent;color:#eef2f4;font-size:13.5px;cursor:pointer;">Ablehnen</button>' +
      '<button id="fa-consent-accept" style="padding:9px 16px;border-radius:8px;border:none;background:#f0a93a;color:#191308;font-weight:700;font-size:13.5px;cursor:pointer;">Zustimmen</button>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('fa-consent-accept').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'granted');
      banner.remove();
      loadGA();
    });
    document.getElementById('fa-consent-decline').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'denied');
      banner.remove();
    });
  });
})();
