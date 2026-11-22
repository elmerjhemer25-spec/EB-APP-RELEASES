(() => {
  const endpoint = '/.netlify/functions/admin-auth';
  const loginView = document.getElementById('loginView');
  const adminView = document.getElementById('adminView');
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('authError');
  const button = document.getElementById('loginButton');
  const showError = (message) => { errorBox.textContent = message; errorBox.style.display = 'block'; };
  const showAdmin = (email) => {
    document.getElementById('adminEmail').textContent = email;
    loginView.style.display = 'none'; adminView.classList.add('ready');
  };
  async function checkSession() {
    try {
      const response = await fetch(`${endpoint}?action=session`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.authenticated) showAdmin(data.email);
    } catch (_) { /* Fail closed: login form remains visible. */ }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); errorBox.style.display = 'none'; button.disabled = true; button.textContent = 'Verifyingâ€¦';
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: {'content-type':'application/json'}, body: JSON.stringify({ action:'login', email:document.getElementById('email').value.trim(), password:document.getElementById('password').value }) });
      const data = await response.json();
      if (!response.ok || !data.authenticated) throw new Error(data.error || 'Sign in failed. Check your credentials.');
      document.getElementById('password').value = ''; showAdmin(data.email);
    } catch (error) { showError(error.message || 'Unable to sign in. Please try again.'); }
    finally { button.disabled = false; button.textContent = 'Sign in securely â†’'; }
  });
  document.getElementById('logoutButton').addEventListener('click', async () => {
    try { await fetch(endpoint, { method:'POST', credentials:'same-origin', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'logout'}) }); } finally { location.reload(); }
  });
  checkSession();
})();