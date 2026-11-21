(function () {
  const C = window.MIRA_CONFIG || {}, KEY = 'mira_session';
  const $ = id => document.getElementById(id);
  const call = (fn, args, extra) => fetch(C.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ fn, args: args || [], session: localStorage.getItem(KEY) || '' }, extra || {})) }).then(r => r.json());

  // ทำให้โค้ดเดิม google.script.run.xxx() ทำงานผ่าน API ได้ทั้งหมด
  function chain(ok, fail) {
    return new Proxy({}, { get(_, name) {
      if (name === 'withSuccessHandler') return f => chain(f, fail);
      if (name === 'withFailureHandler') return f => chain(ok, f);
      if (name === 'withUserObject') return () => chain(ok, fail);
      return (...args) => {
        call(name, args).then(r => {
          if (r.ok) { try { ok && ok(r.data); } catch (e) { console.error(e); } }
          else if (r.code === 'auth') { localStorage.removeItem(KEY); location.reload(); }
          else { fail ? fail(new Error(r.msg)) : alert(r.msg || 'เกิดข้อผิดพลาด'); }
        }).catch(e => { fail ? fail(e) : alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ' + e.message); });
      };
    }});
  }
  window.google = window.google || {};
  const shim = { run: chain(), url: { getLocation: cb => cb({ parameter: Object.fromEntries(new URLSearchParams(location.search)) }) } };
  window.google.script = shim;

  function err(m) { $('loginErr').textContent = m || ''; }
  let started = false;
  function unlock(u) {
    window.google.script = shim;
    document.body.classList.remove('locked');
    $('userEmail').textContent = u.email; $('userName').textContent = u.name || '';
    if (!started) { started = true; window.__appStart(); }
  }
  window.miraLogout = function () {
    call('authLogout').finally(() => { localStorage.removeItem(KEY); location.reload(); });
  };
  async function onCred(resp) {
    err(''); $('loginBusy').style.display = 'block';
    try {
      const r = await call('authLogin', [], { idToken: resp.credential });
      if (!r.ok) throw new Error(r.msg);
      localStorage.setItem(KEY, r.session); unlock(r.data);
    } catch (e) { err(e.message); }
    $('loginBusy').style.display = 'none';
  }
  function initGoogle() {
    if (!(window.google && google.accounts)) return setTimeout(initGoogle, 200);
    google.accounts.id.initialize({ client_id: C.GOOGLE_CLIENT_ID, callback: onCred });
    google.accounts.id.renderButton($('gBtn'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280 });
  }
  window.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('locked');
    if (!C.API_URL || !C.GOOGLE_CLIENT_ID) return err('ยังไม่ได้ตั้งค่า docs/config.js (API_URL / GOOGLE_CLIENT_ID)');
    if (localStorage.getItem(KEY)) {
      try { const r = await call('authCheck'); if (r.ok) return unlock(r.data); } catch (e) {}
      localStorage.removeItem(KEY);
    }
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = initGoogle; document.head.appendChild(s);
  });

  // ไฮไลต์เมนูที่เปิดอยู่
  window.addEventListener('load', () => {
    const tv = window.toggleView;
    window.toggleView = function (v) { tv(v); document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === (v || 'pos'))); };
  });
})();
