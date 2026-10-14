/* Library Management System — Shared JS */

const API = `${location.origin}/api`;

// ── Storage helpers ───────────────────────────────────────────────────────
const getToken = ()  => localStorage.getItem('lms_token');
const getUser  = ()  => { try { return JSON.parse(localStorage.getItem('lms_user')); } catch { return null; } };
const setAuth  = (token, user) => {
  localStorage.setItem('lms_token', token);
  localStorage.setItem('lms_user', JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem('lms_token');
  localStorage.removeItem('lms_user');
};

// ── Auth guard ────────────────────────────────────────────────────────────
function requireAuth(role = null) {
  const token = getToken(), user = getUser();
  if (!token || !user) { location.href = (role === 'admin' ? '/admin/login.html' : '/login.html'); return false; }
  if (role && user.role !== role) {
    location.href = user.role === 'admin' ? '/admin/dashboard.html' : '/student/dashboard.html';
    return false;
  }
  return true;
}

function logout() {
  const u = getUser();
  clearAuth();
  location.href = (u && u.role === 'admin') ? '/admin/login.html' : '/login.html';
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${getToken()}` },
      ...options
    });
    // A 401 on the login endpoints just means wrong credentials, not an expired session
    if (res.status === 401 && !endpoint.startsWith('/auth/login')) { logout(); return null; }
    // Backend may return non-JSON bodies on 4xx/5xx (e.g. Flask error page).
    // Avoid throwing during `res.json()` so callers can still show a meaningful error.
    let data = null;
    try {
      data = await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      data = text ? { error: text } : null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    showToast('Cannot connect to server. Is Flask running?', 'error');
    return null;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  document.getElementById('lms-toast')?.remove();
  const colors = { success:'#10b981', error:'#ef4444', info:'#4f46e5', warning:'#f59e0b' };
  const el = document.createElement('div');
  el.id = 'lms-toast';
  el.textContent = msg;
  Object.assign(el.style, {
    position:'fixed', bottom:'80px', right:'20px', background:colors[type]||colors.info,
    color:'#fff', padding:'12px 20px', borderRadius:'10px', fontSize:'14px',
    zIndex:'9999', boxShadow:'0 4px 16px rgba(0,0,0,.18)', maxWidth:'320px',
    opacity:'0', transition:'opacity .25s, transform .25s', transform:'translateY(8px)'
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateY(0)'; });
  setTimeout(() => {
    el.style.opacity='0'; el.style.transform='translateY(8px)';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ── Modal helpers ─────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── Utilities ─────────────────────────────────────────────────────────────
function parseDateTime(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  if (typeof d === 'number') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const s = String(d).trim();
  if (!s) return null;

  // Date-only (MySQL DATE): YYYY-MM-DD (no timezone)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  }

  // DateTime (MySQL TIMESTAMP/DATETIME): YYYY-MM-DD HH:mm:ss(.SSS)?
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
  if (m) {
    const y  = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = m[6] !== undefined ? Number(m[6]) : 0;
    // MySQL returns TIMESTAMP/DATETIME strings without timezone info.
    // The server runs in IST and the browser is also in IST (local time).
    // Parse the components directly as local time — no offset math needed.
    const dt = new Date(y, mo, da, hh, mm, ss, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Fallback (ISO strings, etc.)
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(d) {
  const dt = parseDateTime(d);
  if (!dt) return '—';
  return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function formatTime(d) {
  const dt = parseDateTime(d);
  if (!dt) return '';
  return dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
}
function formatDateTime(d) {
  const dt = parseDateTime(d);
  if (!dt) return '—';
  const date = dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const time = dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
  return date + ', ' + time;
}
function formatAmount(a) { return `Rs.${parseFloat(a||0).toFixed(2)}`; }
function timeAgo(d) {
  const dt = parseDateTime(d) || (d ? new Date(d) : null);
  if (!dt || isNaN(dt.getTime())) return '';
  const diff = Date.now() - dt.getTime();
  const m = Math.floor(diff/60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
function debounce(fn, ms=300) {
  let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),ms); };
}

// ── Notification badge ────────────────────────────────────────────────────
async function loadNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge || !getToken()) return;
  const r = await apiFetch('/notifications/unread-count');
  if (r?.ok && r.data.count > 0) {
    badge.textContent = r.data.count;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

// ── PWA install prompt ────────────────────────────────────────────────────
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const bar = document.getElementById('install-bar');
  if (bar) bar.classList.add('show');
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    document.getElementById('install-bar')?.classList.remove('show');
  });
}

// Run badge on every page load
window.addEventListener('load', loadNotifBadge);

// ── Book cover / text helpers ─────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Gradient placeholder shown when a book has no cover image
function bookFallback(b) {
  let h = 0; for (const ch of String(b.title || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `<div class="book-cover-fallback" style="background:linear-gradient(160deg,hsl(${h},55%,38%),hsl(${(h+40)%360},60%,24%))">
    <div class="bc-title">${esc(b.title)}</div><div class="bc-author">${esc(b.author)}</div></div>`;
}

// Cover image: uses cover_url if set, else Open Library by ISBN, else the placeholder.
function bookCover(b) {
  const src = b.cover_url
    || (b.isbn ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(b.isbn)}-L.jpg?default=false` : '');
  if (!src) return bookFallback(b);
  const fb = esc(bookFallback(b));   // fully escaped so titles can't inject HTML
  return `<img src="${esc(src)}" alt="${esc(b.title)}" loading="lazy"
            onerror="this.parentNode.innerHTML=this.dataset.fb" data-fb="${fb}">`;
}

// ── Shared sidebar (same menu + icons on every page) ──────────────────────
const _I = {
  dash : '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  book : '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  plus : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  ret  : '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>',
  warn : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  user : '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  home : '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  chat : '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  card : '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  cal  : '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  bell : '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  out  : '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  list : '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
};
const _ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="nav-icon">${_I[k]}</svg>`;

const _NAV = {
  admin: [
    ['Main', [['Dashboard','/admin/dashboard.html','dash'],['Books','/admin/books.html','book']]],
    ['Issue / Return', [['Issue Book','/admin/issue.html','plus'],['Return Book','/admin/return.html','ret'],['Overdue','/admin/overdue.html','warn']]],
    ['Students', [['Students','/admin/students.html','user'],['Who Is In','/admin/who-is-in.html','home'],['Feedback Corner','/admin/feedback.html','chat','fb-badge']]],
    ['Membership', [['Members','/admin/members.html','card']]],
    ['Communication', [['Events','/admin/events.html','cal'],['Notifications','/admin/notifications.html','bell','notif-badge']]],
    ['Settings', [['Profile','/admin/profile.html','user']]]
  ],
  student: [
    ['Main', [['Dashboard','/student/dashboard.html','dash'],['Browse Books','/student/books.html','search'],['My Books','/student/my-books.html','book']]],
    ['Services', [['Membership Card','/student/membership.html','card'],['Events','/student/events.html','cal'],['Notifications','/student/notifications.html','bell','notif-badge'],['Feedback Corner','/student/feedback.html','chat']]],
    ['Account', [['Profile','/student/profile.html','user']]]
  ]
};

function renderSidebar() {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const role = location.pathname.startsWith('/admin') ? 'admin' : 'student';
  const nav = _NAV[role].map(([section, items]) =>
    `<div class="nav-section">${section}</div>` +
    items.map(([label, href, icon, badge]) =>
      `<a class="nav-item${location.pathname === href ? ' active' : ''}" href="${href}">${_ic(icon)} ${label}` +
      (badge ? ` <span class="notif-badge" id="${badge}" style="display:none">0</span>` : '') + `</a>`
    ).join('')
  ).join('');
  el.innerHTML = `
    <div class="sidebar-brand"><div class="logo">LMS</div><div><div class="brand-name">Library LMS</div>
      <div class="brand-sub">${role === 'admin' ? 'Admin Panel' : 'Student Portal'}</div></div></div>
    <nav class="sidebar-nav">${nav}</nav>
    <div class="sidebar-footer"><div class="nav-item" onclick="logout()">${_ic('out')} Logout</div></div>`;
}
renderSidebar();

// Book cell for tables: cover thumbnail + title + author + short description
function bookCell(b) {
  return `<div style="display:flex;gap:12px;align-items:center;min-width:230px">
    <div class="book-thumb">${bookCover(b)}</div>
    <div><strong>${esc(b.title)}</strong><br><small style="color:#94a3b8">${esc(b.author)}</small>
      ${b.description ? `<div class="clamp-2" style="font-size:12px;color:var(--muted);max-width:320px">${esc(b.description)}</div>` : ''}
    </div></div>`;
}

// ── Avatars / profile photo ───────────────────────────────────────────────
function avatarHtml(name, photo, size = 64) {
  const inner = photo ? `<img src="${esc(photo)}" alt="">` : esc((name || '?').trim()[0]?.toUpperCase() || '?');
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size/2.6)}px">${inner}</div>`;
}

// Crop to a centred square, shrink to 256px, return a small JPEG data URL
function pickPhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened'));
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

async function uploadPhoto(input, reload) {
  try {
    const photo = await pickPhoto(input.files[0]);
    const r = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ photo }) });
    if (r?.ok) { showToast('Photo updated!', 'success'); reload && reload(); }
    else showToast(r?.data?.error || 'Could not save photo', 'error');
  } catch (e) { showToast(e.message, 'error'); }
  input.value = '';
}
async function removePhoto(reload) {
  const r = await apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ photo: null }) });
  if (r?.ok) { showToast('Photo removed', 'info'); reload && reload(); }
}

// ── Membership card (used by student page + admin "click a name") ─────────
function memberCardHtml(i) {
  const today  = new Date().toISOString().slice(0, 10);
  const status = i.status || 'none';
  const active = status === 'approved' && (!i.end_date || i.end_date >= today);
  const label  = active ? `${String(i.plan || '').toUpperCase()} MEMBER`
               : status === 'approved' ? 'EXPIRED'
               : status === 'pending'  ? 'PENDING APPROVAL'
               : status === 'rejected' ? 'REJECTED' : 'NO MEMBERSHIP';
  const photo  = i.photo ? `<img src="${esc(i.photo)}" alt="">` : esc((i.name || '?')[0].toUpperCase());
  return `<div class="member-card-display ${active ? '' : 'mc-inactive'}" style="max-width:380px">
    <div style="font-size:11px;opacity:.7;margin-bottom:14px;letter-spacing:1px">LIBRARY MEMBERSHIP CARD</div>
    <div style="display:flex;gap:14px;align-items:center">
      <div class="mc-photo">${photo}</div>
      <div><div class="mc-name">${esc(i.name)}</div><div class="mc-id" style="margin-bottom:0">${esc(i.member_id)}</div></div>
    </div>
    <div style="margin-top:16px"><span class="mc-plan">${label}</span></div>
    <div class="mc-valid">${i.start_date ? `Valid: ${formatDate(i.start_date)} – ${formatDate(i.end_date)}` : 'No validity period'}</div>
  </div>`;
}

// Admin: click a student's name → modal with their membership card + details
async function showMemberCard(uid) {
  let m = document.getElementById('mc-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'mc-modal'; m.className = 'modal-overlay';
    m.onclick = e => { if (e.target === m) closeModal('mc-modal'); };
    m.innerHTML = `<div class="modal"><div class="modal-header"><span>Membership Card</span>
      <button class="close-btn" onclick="closeModal('mc-modal')">&times;</button></div>
      <div class="modal-body" id="mc-modal-body"></div></div>`;
    document.body.appendChild(m);
  }
  const body = document.getElementById('mc-modal-body');
  body.innerHTML = '<p style="text-align:center;color:var(--muted)">Loading…</p>';
  openModal('mc-modal');
  const r = await apiFetch(`/membership/user/${uid}`);
  if (!r?.ok) { body.innerHTML = `<p style="text-align:center;color:var(--danger)">${esc(r?.data?.error || 'Could not load')}</p>`; return; }
  const d = r.data, row = (k, v) => v ? `<tr><td style="color:var(--muted);padding:4px 12px 4px 0">${k}</td><td>${esc(v)}</td></tr>` : '';
  body.innerHTML = `<div style="display:flex;justify-content:center">${memberCardHtml(d)}</div>
    <table style="margin-top:18px;font-size:13px;width:auto">
      ${row('Email', d.email)}${row('Phone', d.phone)}${row('Joined', formatDate(d.created_at))}
      ${d.plan ? row('Plan', d.plan) + row('Amount', 'Rs.' + d.amount) + row('Txn ID', d.txn_id) : ''}
    </table>`;
}

// Keep the sidebar scroll position when moving between pages
(function () {
  const el = document.getElementById('sidebar');
  if (!el) return;
  try { el.scrollTop = parseInt(sessionStorage.getItem('lms_side_scroll') || '0', 10); } catch {}
  el.addEventListener('click', () => { try { sessionStorage.setItem('lms_side_scroll', el.scrollTop); } catch {} });
})();
