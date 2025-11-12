// script.js - frontend interactions (works with deployed backend)
const API_BASE = ''; // same origin when deployed

function $(id){return document.getElementById(id);}
function showSection(name){
  ['home','about','collection','dashboard','loginModal','signupModal','adminPanel'].forEach(s=>{
    const el = $(s); if(!el) return;
    el.classList.toggle('hidden', s !== name);
  });
}

// auth helpers
function saveAuth(data){ localStorage.setItem('ews_auth', JSON.stringify(data)); renderAuth(); }
function getAuth(){ const v = localStorage.getItem('ews_auth'); return v?JSON.parse(v):null; }
function clearAuth(){ localStorage.removeItem('ews_auth'); renderAuth(); }

function renderAuth(){
  const auth = getAuth();
  if(auth && auth.user){
    $('authLinks').classList.add('hidden');
    $('userArea').classList.remove('hidden');
    $('userArea').innerHTML = `${auth.user.name} <button class="btn ghost" onclick="logout()">Logout</button>`;
    if(auth.user.isAdmin) $('lnAdmin').classList.remove('hidden'); else $('lnAdmin').classList.add('hidden');
  } else {
    $('authLinks').classList.remove('hidden');
    $('userArea').classList.add('hidden');
    $('lnAdmin').classList.add('hidden');
  }
}

async function api(path, opts = {}) {
  const auth = getAuth();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if(auth && auth.token) headers['Authorization'] = 'Bearer ' + auth.token;
  const res = await fetch(API_BASE + path, {...opts, headers});
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw json;
  return json;
}

// login / signup flows
$('btnLogin').addEventListener('click', async ()=> {
  const email = $('loginEmail').value; const pass = $('loginPass').value;
  try {
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) });
    saveAuth({ user: r.user, token: r.token });
    alert('Login success'); hideLogin(); showSection('home');
  } catch (err) { alert(err.error || 'Login failed'); }
});
$('loginBtn').addEventListener('click', ()=> $('btnLogin').click());

$('signupBtn').addEventListener('click', async ()=> {
  const name = $('suName').value, email = $('suEmail').value, pass = $('suPass').value;
  try {
    const r = await api('/api/signup', { method: 'POST', body: JSON.stringify({ name, email, password: pass }) });
    saveAuth({ user: r.user, token: r.token });
    alert('Account created & logged in'); hideSignup(); showSection('home');
  } catch (err) { alert(err.error || 'Signup failed'); }
});

function hideLogin(){ showSection('home'); $('loginEmail').value=''; $('loginPass').value=''; }
function hideSignup(){ showSection('home'); $('suName').value=''; $('suEmail').value=''; $('suPass').value=''; }
function logout(){ clearAuth(); alert('Logged out'); showSection('home'); }

document.getElementById('btnLogin').onclick = ()=> showSection('loginModal');
document.getElementById('btnSignup').onclick = ()=> showSection('signupModal');
document.getElementById('lnCollection').onclick = ()=> showSection('collection');
document.getElementById('lnDashboard').onclick = ()=> { showSection('dashboard'); loadDashboard(); };
document.getElementById('lnHome').onclick = ()=> showSection('home');
document.getElementById('lnAdmin').onclick = ()=> showSection('adminPanel');

// submit collection
$('reqForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const auth = getAuth(); if(!auth){ alert('Login first'); showSection('loginModal'); return; }
  const body = {
    itemType: $('itemType').value,
    quantity: parseInt($('quantity').value||0,10),
    address: $('address').value,
    phone: $('phone').value,
    preferredDate: $('preferredDate').value
  };
  try {
    const r = await api('/api/requests', { method: 'POST', body: JSON.stringify(body) });
    alert('Request submitted');
    $('reqForm').reset();
    showSection('dashboard');
    loadDashboard();
  } catch (err) {
    alert(err.error || 'Failed to submit');
  }
});

// load dashboard (user or admin)
async function loadDashboard(){
  const auth = getAuth(); if(!auth) { alert('Login first'); showSection('loginModal'); return; }
  if(auth.user.isAdmin){
    $('dashTitle').innerText = 'Admin Dashboard';
    const r = await api('/api/admin/requests');
    renderAdminTable(r.requests);
  } else {
    $('dashTitle').innerText = 'Your Requests';
    const r = await api('/api/requests/mine');
    renderUserTable(r.requests);
  }
  showSection('dashboard');
}

function renderUserTable(requests){
  let html = '';
  if(requests.length===0) html = '<div class="small">No requests yet.</div>';
  else {
    html = '<table class="table"><thead><tr><th>ID</th><th>Item</th><th>Date</th><th>Status</th></tr></thead><tbody>';
    requests.forEach(r=>{
      html += `<tr><td>${r.id}</td><td>${r.itemType} x ${r.quantity}</td><td>${r.preferredDate}</td><td><span class="status ${r.status}">${r.status}</span></td></tr>`;
    });
    html += '</tbody></table>';
  }
  $('dashContent').innerHTML = html;
}

function renderAdminTable(requests){
  let html = '';
  if(requests.length===0) html = '<div class="small'>No requests yet.</div>';
  else {
    html = '<div style="margin-bottom:8px"><input id="adminSearch" placeholder="Search..." oninput="adminSearchHandler()" style="padding:8px;border-radius:6px;border:1px solid #e6e7eb;width:60%"><select id="adminStatusFilter" onchange="adminFilterHandler()"><option value="all">All</option><option value="pending">Pending</option><option value="collected">Collected</option></select></div>';
    html += '<table class="table"><thead><tr><th>ID</th><th>User</th><th>Item</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody id="adminRows">';
    requests.forEach(r=>{
      html += `<tr data-id="${r.id}"><td>${r.id}</td><td>${r.userName}<br/><span class="small">${r.userEmail}</span></td><td>${r.itemType} x ${r.quantity}</td><td>${r.preferredDate}</td><td><span class="status ${r.status}">${r.status}</span></td><td><button onclick="toggleStatus(${r.id},'${r.status}')">${r.status==='pending'? 'Mark Collected':'Mark Pending'}</button></td></tr>`;
    });
    html += '</tbody></table>';
  }
  $('dashContent').innerHTML = html;
}

async function toggleStatus(id, current){
  const newStatus = current === 'pending' ? 'collected' : 'pending';
  try {
    const r = await api(`/api/admin/requests/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    alert('Status updated');
    loadDashboard();
  } catch (err) { alert(err.error || 'Failed'); }
}

window.loadDashboard = loadDashboard;

window.adminSearchHandler = async function(){
  const q = $('adminSearch').value || '';
  const status = $('adminStatusFilter').value || 'all';
  try {
    const r = await api(`/api/admin/requests/search?q=${encodeURIComponent(q)}&status=${status}`);
    renderAdminTable(r.requests);
  } catch (err) { alert(err.error || 'Search failed'); }
}
window.adminFilterHandler = window.adminSearchHandler;

(function init(){
  const d = new Date(); d.setDate(d.getDate() + 1); $('preferredDate').value = d.toISOString().slice(0,10);
  renderAuth();
})();
