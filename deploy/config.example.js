// EB APK DEPLOY — Cloud configuration (Netlify build)
// Copy this file to config.js and fill in the values.
// config.js is gitignored. NEVER commit real secrets to GitHub.
window.EB_CONFIG = {
  functionUrl: 'https://hpkmbwbcsynluqcmvekm.supabase.co/functions/v1/apk-deploy',
  anonKey: 'PASTE_PUBLISHABLE_KEY_HERE',
};
