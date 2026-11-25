'use strict';

// Cloud config: set in config.js (see config.example.js). Falls back to
// same-origin local server when running via START.bat.
const CFG = window.EB_CONFIG || {};
const API = CFG.functionUrl || ''; // e.g. https://<ref>.supabase.co/functions/v1/apk-deploy
const ANON_KEY = CFG.anonKey || '';
const ADMIN_PW = CFG.adminPassword || '';
function adminPw() {
  const el = document.getElementById('adminPw');
  return (el && el.value.trim()) || ADMIN_PW;
}
const AUTH_HEADERS = ANON_KEY
  ? { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
  : {};
function headers(extra) {
  const pw = adminPw();
  return { ...AUTH_HEADERS, ...(pw ? { 'X-Admin-Password': pw } : {}), ...(extra || {}) };
}
function endpoint(action) { return API ? API + '?action=' + action : '/api/' + action.replace('-', '/'); }

const panelsEl = document.getElementById('panels');
const appCountEl = document.getElementById('appCount');
const addAppBtn = document.getElementById('addAppBtn');
const addAppForm = document.getElementById('addAppForm');
const closeAddBtn = document.getElementById('closeAddBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const saveAppBtn = document.getElementById('saveAppBtn');
const successCard = document.getElementById('successCard');
const logEl = document.getElementById('log');

let apps = [];
const results = {}; // appId -> inspect data

function log(msg, cls = '') {
  const line = document.createElement('div');
  line.className = 'log-line ' + cls;
  line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---- load panels ----------------------------------------------------------
async function loadApps() {
  try {
    const res = await fetch(endpoint('apps'), { headers: headers() });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed to load apps');
    apps = data.apps;
    appCountEl.textContent = apps.length;
    renderPanels();
    log('Loaded ' + apps.length + ' app panels.', 'ok');
  } catch (err) {
    log('Error: ' + err.message, 'err');
  }
}

function renderPanels() {
  panelsEl.innerHTML = '';
  if (!apps.length) {
    panelsEl.innerHTML =
      '<div class="card"><p style="color:var(--muted)">No app panels yet. Click "+ Add new app".</p></div>';
    return;
  }
  for (const app of apps) panelsEl.appendChild(buildPanel(app));
}

function buildPanel(app) {
  const el = document.createElement('article');
  el.className = 'panel';
  el.dataset.appId = app.id;

  const live = app.live;
  const liveHtml = live
    ? '<span class="live-tag">LIVE v' + esc(live.version) + '</span>' +
      '<a href="' + esc(live.releaseUrl) + '" target="_blank" rel="noopener">release &#8599;</a>'
    : '<span class="live-none">NO RELEASE YET</span>';

  el.innerHTML =
    '<div class="panel-head">' +
      '<div class="app-icon" style="background:linear-gradient(145deg,' + esc(app.color) + ',#111)">' +
        esc(app.iconText || 'EB') +
      '</div>' +
      '<div class="panel-info">' +
        '<h3>' + esc(app.name) + '</h3>' +
        (app.package ? '<div class="pkg">' + esc(app.package) + '</div>' : '<div class="pkg">package: auto-detect</div>') +
        '<p class="desc">' + esc(app.description || 'No description yet.') + '</p>' +
        (app.category ? '<div class="cat">' + esc(app.category) + '</div>' : '') +
      '</div>' +
      '<button class="del-btn" data-del="' + esc(app.id) + '" title="Delete app panel" aria-label="Delete ' + esc(app.name) + '">&#128465;</button>' +
    '</div>' +
    '<div class="live-row">' + liveHtml + '</div>' +
    '<div class="dropzone" tabindex="0" role="button" data-app="' + esc(app.id) + '">' +
      '<div class="dz-icon">&#8681;</div>' +
      '<div class="dz-main">Drop your APK here</div>' +
      '<div class="dz-sub">or <span>browse files</span> &mdash; .apk only</div>' +
    '</div>' +
    '<input type="file" accept=".apk" data-input="' + esc(app.id) + '">' +
    '<div class="panel-result hidden" data-result="' + esc(app.id) + '"></div>';

  const zone = el.querySelector('.dropzone');
  const input = el.querySelector('input[type=file]');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => {
    e.preventDefault(); zone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
  }));
  zone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) handleFile(app, e.dataTransfer.files[0], zone, input);
  });
  input.addEventListener('change', () => {
    if (input.files.length) handleFile(app, input.files[0], zone, input);
  });

  // Delete this app panel (server-side catalog entry).
  const delBtn = el.querySelector('[data-del]');
  delBtn.addEventListener('click', () => deleteApp(app));

  // Restore a previous inspect result if any
  if (results[app.id]) {
    renderResult(app, results[app.id]);
    input.value = '';
  }

  return el;
}

// ---- delete app panel -----------------------------------------------------
async function deleteApp(app) {
  const confirm = window.confirm(
    'Delete the "' + app.name + '" panel from EB APP CENTER?\n\n' +
    'This removes the panel from the catalog. Published GitHub releases are NOT deleted.'
  );
  if (!confirm) return;
  log('[' + app.name + '] Deleting panel...');
  try {
    const res = await fetch(endpoint('delete-app') + '&id=' + encodeURIComponent(app.id), {
      method: 'POST',
      headers: headers(),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Delete failed.');
    log('[' + app.name + '] Panel deleted.', 'ok');
    delete results[app.id];
    await loadApps();
  } catch (err) {
    log('[' + app.name + '] Delete error: ' + err.message, 'err');
    alert(err.message);
  }
}

// ---- per-panel inspect ----------------------------------------------------
async function handleFile(app, file, zone, input) {
  const resultEl = panelsEl.querySelector('[data-result="' + app.id + '"]');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = '<div class="flow-note">Reading APK metadata...</div>';
  zone.classList.add('busy');
  log('[' + app.name + '] Inspecting ' + file.name + '...');

  try {
    const res = await fetch(endpoint('inspect'), {
      method: 'POST',
      headers: headers({
        'X-File-Name': encodeURIComponent(file.name),
        'X-App-Id': app.id,
        'Content-Type': 'application/octet-stream',
      }),
      body: file,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Inspection failed.');

    results[app.id] = { ...data, fileName: file.name, file };
    renderResult(app, results[app.id]);
    log('[' + app.name + '] Detected v' + data.info.version + ' — ' +
        (data.newer ? 'NEW UPDATE' : 'not newer'), data.newer ? 'ok' : '');
  } catch (err) {
    resultEl.innerHTML = '<span class="badge err">ERROR</span> ' + esc(err.message);
    log('[' + app.name + '] Error: ' + err.message, 'err');
  } finally {
    zone.classList.remove('busy');
  }
}

function renderResult(app, data) {
  const resultEl = panelsEl.querySelector('[data-result="' + app.id + '"]');
  if (!resultEl) return;
  const i = data.info;
  const badge = data.newer
    ? '<span class="badge ok">READY TO DEPLOY</span>'
    : '<span class="badge warn">VERSION NOT NEWER</span>';
  const note = data.newer
    ? (data.live
        ? 'Users with an older version will see <b>UPDATE</b> in EB APP CENTER.'
        : 'This is the first release — users will see <b>DOWNLOAD</b>.')
    : 'Live release is v' + (data.live ? data.live.version : '—') +
      '. Bump the APK version and drop it again.';

  resultEl.innerHTML =
    '<div class="panel-result">' +
      badge +
      '<div class="result-grid">' +
        '<div><span>NEW VERSION</span><strong>v' + esc(i.version) + '</strong></div>' +
        '<div><span>BUILD</span><strong>' + esc(i.versionCode || '—') + '</strong></div>' +
        '<div><span>SIZE</span><strong>' + esc(i.sizeText) + '</strong></div>' +
        '<div><span>TAG</span><strong>' + esc(i.tag) + '</strong></div>' +
        '<div><span>ASSET</span><strong>' + esc(i.assetName) + '</strong></div>' +
        '<div><span>PACKAGE</span><strong>' + esc(i.package) + '</strong></div>' +
        '<div style="grid-column:1/-1"><span>SHA-256</span><strong>' + esc(i.sha256) + '</strong></div>' +
      '</div>' +
      '<div class="flow-note' + (data.newer ? '' : ' warn') + '" style="margin-top:10px">' + note + '</div>' +
      '<label class="notes-label" for="notes-' + esc(app.id) + '">Release notes (optional)</label>' +
      '<textarea id="notes-' + esc(app.id) + '" rows="3" placeholder="Leave blank to auto-generate."></textarea>' +
      '<div class="result-actions">' +
        '<button class="btn btn-primary btn-sm" data-deploy="' + esc(app.id) + '"' +
          (data.newer ? '' : ' disabled') + '>Deploy release</button>' +
        '<button class="btn btn-quiet btn-sm" data-clear="' + esc(app.id) + '">Clear</button>' +
      '</div>' +
    '</div>';

  resultEl.querySelector('[data-deploy]').addEventListener('click', () => deploy(app));
  resultEl.querySelector('[data-clear]').addEventListener('click', () => {
    delete results[app.id];
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';
  });
}

// ---- deploy ---------------------------------------------------------------
async function deploy(app) {
  const data = results[app.id];
  if (!data || !data.newer) return;
  const btn = panelsEl.querySelector('[data-deploy="' + app.id + '"]');
  btn.disabled = true;
  btn.textContent = 'Publishing...';
  log('[' + app.name + '] Creating release ' + data.info.tag + '...');

  try {
    const notes = document.getElementById('notes-' + app.id).value || '';
    const res = await fetch(endpoint('deploy'), {
      method: 'POST',
      headers: headers({
        'X-File-Name': encodeURIComponent(data.fileName),
        'X-App-Id': app.id,
        'X-Notes': encodeURIComponent(notes),
        'Content-Type': 'application/octet-stream',
      }),
      body: data.file,
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.error || 'Deploy failed.');

    log('[' + app.name + '] Published ' + result.result.tag, 'ok');
    successCard.classList.remove('hidden');
    document.getElementById('successMsg').textContent =
      result.result.title + ' is now live. EB APP CENTER users will see ' +
      (result.result.replacedVersion ? 'UPDATE' : 'DOWNLOAD') + '.';
    document.getElementById('releaseLink').href = result.result.releaseUrl;
    document.getElementById('downloadLink').href = result.result.downloadUrl;
    successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

    delete results[app.id];
    await loadApps();
  } catch (err) {
    log('[' + app.name + '] Deploy error: ' + err.message, 'err');
    const resultEl = panelsEl.querySelector('[data-result="' + app.id + '"]');
    if (resultEl) {
      resultEl.querySelector('.flow-note').className = 'flow-note warn';
      resultEl.querySelector('.flow-note').textContent = 'Error: ' + err.message;
    }
    btn.disabled = false;
    btn.textContent = 'Deploy release';
  }
}

// ---- add app form ---------------------------------------------------------
addAppBtn.addEventListener('click', () => {
  addAppForm.classList.remove('hidden');
  document.getElementById('fName').focus();
  addAppForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
[closeAddBtn, cancelAddBtn].forEach((b) =>
  b.addEventListener('click', () => addAppForm.classList.add('hidden')));

saveAppBtn.addEventListener('click', async () => {
  const name = document.getElementById('fName').value.trim();
  if (!name) { alert('App name is required.'); return; }
  saveAppBtn.disabled = true;
  try {
    const res = await fetch(endpoint('add-app'), {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        name,
        package: document.getElementById('fPackage').value.trim(),
        description: document.getElementById('fDescription').value.trim(),
        category: document.getElementById('fCategory').value.trim(),
        iconText: document.getElementById('fIcon').value.trim().toUpperCase(),
        color: document.getElementById('fColor').value,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save app');
    log('Added app panel: ' + data.app.name, 'ok');
    addAppForm.classList.add('hidden');
    ['fName', 'fPackage', 'fDescription', 'fCategory', 'fIcon'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    await loadApps();
  } catch (err) {
    log('Error: ' + err.message, 'err');
    alert(err.message);
  } finally {
    saveAppBtn.disabled = false;
  }
});

// Re-load panels when the admin password is entered (cloud mode).
const adminInput = document.getElementById('adminPw');
if (adminInput) {
  adminInput.addEventListener('change', () => loadApps());
  adminInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadApps();
  });
}

loadApps();
