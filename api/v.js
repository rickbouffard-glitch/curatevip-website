// Visit beacon relay for the Admin > Marketing dashboard.
// The browser posts to this same-origin endpoint (no CORS, works with
// sendBeacon). We add Vercel's city-level geo headers and forward to the API.
// The visitor's IP is never forwarded or stored.
const API = process.env.CURATE_API_URL || 'https://api.curatevip.ai';

function header(req, name) {
  const v = req.headers[name];
  if (!v) return null;
  try { return decodeURIComponent(String(v)); } catch (e) { return String(v); }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  try {
    let body = req.body;
    if (typeof body !== 'string') body = body ? JSON.stringify(body) : '';
    if (!body || body.length > 8000) { res.statusCode = 204; return res.end(); }
    const data = JSON.parse(body);
    data.city    = header(req, 'x-vercel-ip-city');
    data.region  = header(req, 'x-vercel-ip-country-region');
    data.country = header(req, 'x-vercel-ip-country');
    data.ua      = String(req.headers['user-agent'] || '').slice(0, 400);
    await fetch(API + '/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    // Analytics must never surface an error to the visitor.
  }
  res.statusCode = 204;
  res.end();
};
