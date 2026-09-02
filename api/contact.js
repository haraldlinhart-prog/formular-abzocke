function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Eine einzelne Zeichenkette >60 Zeichen ohne Leerzeichen ist fast immer
// Bot-generierter Zufallstext, keine echte Nachricht.
function looksHuman(text) {
  const noSpaces = String(text || '').replace(/\s/g, '');
  return !(noSpaces.length > 60 && noSpaces.length === String(text || '').length);
}

const BLOCKED_EMAILS = new Set([]);
function normalizeEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at === -1) return e;
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  local = local.split('+')[0];
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
  }
  return local + '@' + (domain === 'googlemail.com' ? 'gmail.com' : domain);
}

// Erkennt kurze Bot-Zufallstoken: wenige Vokale UND unnatürlich häufiger
// Groß-/Kleinschreibungswechsel, beides zusammen nötig, um echte Wörter
// (z. B. "McDonald") nicht fälschlich zu blocken.
function isGibberish(str) {
  const trimmed = String(str || '').trim();
  if (/^[a-zA-ZäöüÄÖÜß]{10,40}$/.test(trimmed) && /[a-zäöüß]/.test(trimmed) && /[A-ZÄÖÜ]/.test(trimmed)) {
    return true;
  }
  const words = String(str || '').split(/\s+/).filter(w => w.length >= 6);
  const vowelChars = 'aeiouyAEIOUYäöüÄÖÜàáâãåèéêëìíîïòóôõùúûýÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝ';
  for (const word of words) {
    const letters = word.replace(/[^a-zA-ZäöüÄÖÜßàáâãåèéêëìíîïòóôõùúûýÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝ]/g, '');
    if (letters.length < 6) continue;
    let vowels = 0;
    for (const ch of letters) if (vowelChars.includes(ch)) vowels++;
    const vowelRatio = vowels / letters.length;
    let transitions = 0;
    for (let i = 1; i < letters.length; i++) {
      const prevUpper = letters[i - 1] === letters[i - 1].toUpperCase() && letters[i - 1] !== letters[i - 1].toLowerCase();
      const curUpper = letters[i] === letters[i].toUpperCase() && letters[i] !== letters[i].toLowerCase();
      if (prevUpper !== curUpper) transitions++;
    }
    const transitionRatio = transitions / (letters.length - 1);
    const vowelThreshold = letters.length >= 14 ? 0.28 : (letters.length >= 11 ? 0.22 : 0.16);
    if (vowelRatio < vowelThreshold && transitionRatio > 0.3) return true;
  }
  if (/\S{61,}/.test(String(str || ''))) return true;
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, email, message, website, elapsed } = req.body || {};

    // Gibberish-Bot-Erkennung — silent success wie Honeypot
    if (isGibberish(message) || isGibberish(name) || BLOCKED_EMAILS.has(normalizeEmail(email))) {
      res.status(200).json({ ok: true });
      return;
    }

    // Honeypot
    if (website) {
      res.status(200).json({ ok: true });
      return;
    }

    // Mindestzeit: ein Mensch braucht länger als 3s, um das Formular auszufüllen.
    if (typeof elapsed !== 'number' || elapsed < 3000) {
      res.status(400).json({ error: 'Bitte versuchen Sie es erneut.' });
      return;
    }

    if (!name || !email || !message) {
      res.status(400).json({ error: 'Pflichtfelder fehlen.' });
      return;
    }
    if (String(name).length > 100 || !looksHuman(name) || !looksHuman(message)) {
      res.status(400).json({ error: 'Bitte versuchen Sie es erneut.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
      return;
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f1417; padding: 20px; text-align: center;">
          <h1 style="color: #f0a93a; font-size: 1.3rem; margin: 0;">formular-abzocke.de</h1>
          <p style="color: rgba(255,255,255,0.65); margin: 5px 0 0; font-size: 0.85rem;">Neue Kontaktanfrage</p>
        </div>
        <div style="padding: 28px; background: #f7f5f2; border: 1px solid #ddd;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #5a6a7e; font-size: 0.85rem; width: 110px;">Name:</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #5a6a7e; font-size: 0.85rem;">E-Mail:</td><td style="padding: 8px 0;"><a href="mailto:${safeEmail}" style="color:#0f1417;">${safeEmail}</a></td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 18px 0;">
          <p style="line-height: 1.7; color: #222; white-space: pre-line;">${safeMessage}</p>
        </div>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'formular-abzocke.de <noreply@pan21.com>',
        to: 'haraldlinhart@gmail.com',
        reply_to: email,
        subject: 'Kontaktanfrage formular-abzocke.de',
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact route error:', err);
    res.status(500).json({ error: 'Serverfehler.' });
  }
};
