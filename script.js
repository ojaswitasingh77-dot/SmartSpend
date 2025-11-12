// script.js (module)
// NOTE: Before using, replace FIREBASE_CONFIG placeholder with your firebaseConfig object.
// If you don't want Firebase yet, leave firebaseConfig = null to use localStorage fallback.

const firebaseConfig = null; 
/* Example (replace with your actual):
const firebaseConfig = {
  apiKey: "AAA...",
  authDomain: "yourproj.firebaseapp.com",
  projectId: "yourproj",
  storageBucket: "yourproj.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js";

let useFirebase = false;
let auth, db;

if (firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  useFirebase = true;
  document.getElementById('publishState').textContent = 'Connected';
} else {
  document.getElementById('publishState').textContent = 'Offline (localStorage)';
}

// ---------- App state ----------
let currentUser = null;
let txListenerUnsub = null;

// local fallback
const LS_KEY = 'smartspend_tx';
const LS_BUDGET = 'smartspend_budget';
const LS_GOALS = 'smartspend_goals';

// Utility
const $ = id => document.getElementById(id);
const toast = (t) => {
  const el = $('toast'); el.textContent = t; el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),2200);
}

// ---------- UI / Navigation ----------
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click', e=>{
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const sec = btn.dataset.section;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('visible'));
    document.getElementById(sec).classList.add('visible');
  });
});

// Quick add button
$('quickAdd').addEventListener('click', ()=> {
  document.querySelector('.nav-item[data-section="transactions"]').click();
  window.scrollTo({top:0,behavior:'smooth'});
});

// Search filter
$('searchInput').addEventListener('input', e => renderTxList(e.target.value));

// ---------- Transactions: Add / render ----------
const txForm = $('txForm');
txForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const amount = parseFloat($('txAmount').value || 0);
  const type = $('txType').value;
  const category = $('txCategory').value;
  const payment = $('txPayment').value;
  const date = $('txDate').value || new Date().toISOString().slice(0,10);
  const note = $('txNote').value || '';
  if (!amount) { toast('Enter amount'); return; }

  const tx = { amount, type, category, payment, date, note, createdAt: new Date().toISOString() };

  if (useFirebase && currentUser) {
    // save to Firestore under users/{uid}/transactions
    try {
      await db.collection('users').doc(currentUser.uid).collection('transactions').add(tx);
      toast('Transaction saved');
    } catch (err) { console.error(err); toast('Save failed'); }
  } else {
    // localStorage fallback
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    arr.push(tx);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
    toast('Saved locally');
    refreshFromLocal();
  }
  txForm.reset();
});

// sample data helper
$('importSample').addEventListener('click', ()=>{
  const sample = [
    {amount:80,type:'expense',category:'Food',payment:'Cash',date:today(),note:'Snack'},
    {amount:200,type:'expense',category:'Transport',payment:'UPI',date:today(),note:'Ride'},
    {amount:1500,type:'income',category:'Savings',payment:'UPI',date:today(),note:'Pocket money'}
  ];
  const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]').concat(sample);
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
  refreshFromLocal();
  toast('Sample data added');
});

// ---------- Budgets ----------
$('saveBudget').addEventListener('click', async ()=>{
  const v = parseFloat($('monthlyBudgetInput').value || 0);
  if (useFirebase && currentUser) {
    try {
      await db.collection('users').doc(currentUser.uid).set({ budget: v }, { merge: true });
      toast('Budget saved');
    } catch (err) { console.error(err); toast('Budget failed'); }
  } else {
    localStorage.setItem(LS_BUDGET, JSON.stringify(v));
    toast('Budget saved locally');
    refreshFromLocal();
  }
});

// ---------- Goals ----------
$('goalForm').addEventListener('submit', e=>{
  e.preventDefault();
  const title = $('goalTitle').value.trim();
  const amount = parseFloat($('goalAmount').value||0);
  if (!title||!amount) { toast('Add title & amount'); return; }
  const goals = JSON.parse(localStorage.getItem(LS_GOALS) || '[]');
  goals.push({title,amount,progress:0,createdAt:today()});
  localStorage.setItem(LS_GOALS, JSON.stringify(goals));
  renderGoals();
  $('goalForm').reset();
  toast('Goal added');
});

// ---------- Filters ----------
$('filterCategory').addEventListener('change', ()=>renderTxList());
$('filterType').addEventListener('change', ()=>renderTxList());
$('clearFilters').addEventListener('click', ()=>{
  $('filterCategory').value=''; $('filterType').value=''; $('filterFrom').value='';
  renderTxList();
});

// ---------- Auth UI ----------
$('signinBtn').addEventListener('click', ()=>$('authModal').classList.remove('hidden'));
$('closeAuth').addEventListener('click', ()=>$('authModal').classList.add('hidden'));
$('emailSignup').addEventListener('click', async ()=>{
  if (!useFirebase) { toast('Enable Firebase config to use Auth'); return; }
  const email = $('emailInput').value, pass = $('passInput').value;
  try { await auth.createUserWithEmailAndPassword(auth, email, pass); toast('Signed up'); $('authModal').classList.add('hidden'); }
  catch(err){ console.error(err); toast(err.message || 'Signup error'); }
});
$('emailLogin').addEventListener('click', async ()=>{
  if (!useFirebase) { toast('Enable Firebase config to use Auth'); return; }
  const email = $('emailInput').value, pass = $('passInput').value;
  try { await auth.signInWithEmailAndPassword(auth, email, pass); toast('Signed in'); $('authModal').classList.add('hidden'); }
  catch(err){ console.error(err); toast(err.message || 'Login error'); }
});
$('googleSignIn').addEventListener('click', async ()=>{
  toast('Google sign in not configured in this snippet');
});

// ---------- Helpers: today ----------
function today(){ return new Date().toISOString().slice(0,10); }

// ---------- Local storage refresh ----------
function refreshFromLocal(){
  const txs = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  window._localTx = txs;
  renderTxList();
  updateDashboardFromLocal();
  renderChartsLocal();
}

// ---------- Render TX lists ----------
function renderTxList(search=''){
  const list = $('txList');
  const recent = $('recentList');
  const txs = useFirebase && currentUser ? window._remoteTx || [] : window._localTx || [];
  const filterCat = $('filterCategory') ? $('filterCategory').value : '';
  const filterType = $('filterType').value;
  const monthFrom = $('filterFrom').value;

  const filtered = txs.filter(t=>{
    if (filterCat && t.category !== filterCat) return false;
    if (filterType && t.type !== filterType) return false;
    if (monthFrom){
      const [y,m] = monthFrom.split('-'); if (!t.date.startsWith(`${y}-${m}`)) return false;
    }
    if (search){
      const s = search.toLowerCase();
      return (t.category.toLowerCase().includes(s) || (t.note && t.note.toLowerCase().includes(s)));
    }
    return true;
  }).sort((a,b)=> new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  list.innerHTML = '';
  filtered.forEach(t=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${t.category}</strong> <span class="muted">${t.note||''}</span></div>
                    <div>${t.type==='expense' ? '-' : '+'} ₹${t.amount} <small class="muted">${t.date}</small></div>`;
    list.appendChild(li);
  });

  // recent (first 5)
  recent.innerHTML = '';
  filtered.slice(0,5).forEach(t=>{
    const li = document.createElement('li');
    li.innerHTML = `<div>${t.category}</div><div>${t.type==='expense' ? '-' : '+'} ₹${t.amount}</div>`;
    recent.appendChild(li);
  });

  // update filters category list
  const cats = Array.from(new Set((txs||[]).map(x=>x.category)));
  const catSelect = $('filterCategory');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option>${c}</option>`).join('');
  }
}

// ---------- Dashboard / summary ----------
function updateDashboardFromLocal(){
  const txs = window._localTx || [];
  const income = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;
  $('balance').textContent = `₹${balance.toFixed(0)}`;
  const budget = JSON.parse(localStorage.getItem(LS_BUDGET) || '0');
  $('budgetText').textContent = `You’ve spent ₹${expense} of ₹${budget||0} budget`;
  const used = budget ? (expense / budget) * 100 : 0;
  $('budgetProgress').style.width = Math.min(used,100) + '%';
  $('budgetAlert').textContent = used>90 ? 'Careful! You’re about to hit your limit ⚠️' : (used>70 ? 'Keep an eye 👀 — you’ve used 70%+' : '');
  $('savedSummary').textContent = `Saved this month: ₹${Math.max(0, income - expense).toFixed(0)}`;

  // mini stats:
  const daysLogged = new Set(txs.map(t=>t.date)).size;
  $('daysLogged').textContent = daysLogged;
  const avgDaily = daysLogged ? Math.round(expense / daysLogged) : 0; $('avgDaily').textContent = `₹${avgDaily}`;
  // top category:
  const catTotals = {};
  txs.filter(t=>t.type==='expense').forEach(t=>catTotals[t.category] = (catTotals[t.category]||0)+t.amount);
  const top = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0]; $('topCategory').textContent = top ? `${top[0]} (₹${top[1]})` : '—';

  renderChartsLocal();
}

function renderChartsLocal(){
  const txs = window._localTx || [];
  // category pie
  const catTotals = {};
  txs.filter(t=>t.type==='expense').forEach(t=>catTotals[t.category] = (catTotals[t.category]||0)+t.amount);
  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);

  if (window.catChart) window.catChart.destroy();
  const ctx = $('catChart').getContext('2d');
  window.catChart = new Chart(ctx, { type:'pie', data:{labels, datasets:[{data, backgroundColor:['#00B894','#74B9FF','#FF7675','#FFEAA7','#A29BFE','#F7A8B8']}] } });

  // weekly bar: map days in current month to weeks
  const now = new Date();
  const weekly = [0,0,0,0,0];
  txs.filter(t=>t.type==='expense' && new Date(t.date).getMonth()===now.getMonth()).forEach(t=>{
    const wk = Math.min(4, Math.floor((new Date(t.date).getDate()-1)/7));
    weekly[wk]+=t.amount;
  });
  if (window.weekChart) window.weekChart.destroy();
  const wctx = $('weekChart').getContext('2d');
  window.weekChart = new Chart(wctx, { type:'bar', data:{labels:['W1','W2','W3','W4','W5'], datasets:[{label:'₹', data:weekly, backgroundColor: weekly.map(v=> v <= (JSON.parse(localStorage.getItem(LS_BUDGET)||0)/4 || Infinity) ? '#00B894' : '#FF7675')}] } });

  // monthly trend (simple last 6 months)
  const months = [];
  const totalsByMonth = {};
  for (let i=5;i>=0;i--){
    const d = new Date(); d.setMonth(d.getMonth()-i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push(key);
    totalsByMonth[key] = 0;
  }
  txs.filter(t=>t.type==='expense').forEach(t=>{
    const k = t.date.slice(0,7);
    if (k in totalsByMonth) totalsByMonth[k]+=t.amount;
  });
  if (window.trendChart) window.trendChart.destroy();
  const tctx = $('trendChart').getContext('2d');
  window.trendChart = new Chart(tctx, { type:'line', data:{labels:months, datasets:[{label:'Monthly spend', data:months.map(m=>totalsByMonth[m]), fill:false, borderColor:'#74B9FF'}]} });
}

// ---------- On load: populate local or remote ----------
function init(){
  // set default date fields
  document.querySelectorAll('input[type="date"]').forEach(i=>i.value = today());
  // load local
  refreshFromLocal();
  renderGoals();
  // show offline
  if (!useFirebase) {
    $('publishState').textContent = 'Local mode';
  } else {
    // TODO: wire up Firebase real-time listeners & auth state
    // NOTE: In this compat snippet, you should implement auth state listener and Firestore subscription.
    $('publishState').textContent = 'Connected to Firebase';
  }
}

function renderGoals(){
  const g = JSON.parse(localStorage.getItem(LS_GOALS) || '[]');
  const el = $('goalsList'); el.innerHTML = '';
  g.forEach((goal,idx)=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${goal.title}</strong><div class="muted">₹${goal.amount}</div></div>
                    <div>${Math.min(100, Math.round((goal.progress||0)/goal.amount*100))}%</div>`;
    el.appendChild(li);
  });
}

init();
