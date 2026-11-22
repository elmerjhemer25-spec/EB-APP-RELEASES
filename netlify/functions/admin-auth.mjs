import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'eb_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store, max-age=0', 'x-content-type-options':'nosniff', ...extra } });
const cookieValue = (header, name) => (header || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const b64 = value => Buffer.from(value).toString('base64url');
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');
const safeEqual = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
function validSession(request, secret) {
  const token = cookieValue(request.headers.get('cookie'), COOKIE);
  if (!token) return null;
  const parts = token.split('.'); if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!safeEqual(sign(payload, secret), signature)) return null;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); if (!data.exp || data.exp < Math.floor(Date.now()/1000)) return null; return data; } catch { return null; }
}
function setCookie(token, maxAge) { return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
export default async (request) => {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (secret.length < 32 || !adminEmail || adminPassword.length < 12) return json({ error:'Admin authentication is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters), and ADMIN_SESSION_SECRET (32+ characters) in Netlify.' }, 503);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.searchParams.get('action') === 'session') {
    const session = validSession(request, secret);
    return session ? json({ authenticated:true, email:session.email }) : json({ authenticated:false }, 401);
  }
  if (request.method !== 'POST') return json({ error:'Method not allowed.' }, 405, { allow:'GET, POST' });
  let body; try { body = await request.json(); } catch { return json({ error:'Invalid request.' }, 400); }
  if (body.action === 'logout') return json({ authenticated:false }, 200, { 'set-cookie':setCookie('', 0) });
  if (body.action !== 'login') return json({ error:'Unsupported action.' }, 400);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error:'Request origin rejected.' }, 403);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!safeEqual(email, adminEmail) || !safeEqual(password, adminPassword)) return json({ error:'Invalid email or password.' }, 401);
  const payload = b64(JSON.stringify({ email:adminEmail, iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+SESSION_SECONDS }));
  const token = `${payload}.${sign(payload, secret)}`;
  return json({ authenticated:true, email:adminEmail }, 200, { 'set-cookie':setCookie(token, SESSION_SECONDS) });
};