// Global Data
let transactions = [];
let budget = 0;
let goals = [];

// 🔄 Section Switcher
function showSection(id) {
  document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "dashboard" || id === "insights") updateDashboard();
}

// 💾 Save all data to localStorage
function saveData() {
  const data = { transactions, budget, goals };
  localStorage.setItem("smartSpendData", JSON.stringify(data));
}

// 🔁 Load data from localStorage when app starts
document.addEventListener("DOMContentLoaded", () => {
  const savedData = localStorage.getItem("smartSpendData");
  if (savedData) {
    const parsed = JSON.parse(savedData);
    transactions = parsed.transactions || [];
    budget = parsed.budget || 0;
    goals = parsed.goals || [];
    renderTransactions();
    renderGoals();
    updateDashboard();
  }
});

// ➕ Add Transaction
function addTransaction() {
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;

  if (!amount) return alert("Enter an amount!");

  const transaction = {
    amount,
    type,
    category,
    date: new Date().toLocaleDateString()
  };

  transactions.push(transaction);
  renderTransactions();
  updateDashboard();
  saveData();
  document.getElementById("amount").value = "";
}

// 🧾 Render Transactions List
function renderTransactions() {
  const list = document.getElementById("transaction-list");
  if (!list) return;
  list.innerHTML = "";
  transactions.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.type === "Expense" ? "💸" : "💰"} ₹${t.amount} - ${t.category} (${t.date})`;
    list.appendChild(li);
  });
}

// 💰 Set Monthly Budget
function setBudget() {
  const value = parseFloat(document.getElementById("budget").value);
  if (!value) return alert("Enter a valid amount");
  budget = value;
  document.getElementById("budget-display").textContent = budget;
  updateDashboard();
  saveData();
}

// 🎯 Add Goal
function addGoal() {
  const name = document.getElementById("goalName").value;
  const target = parseFloat(document.getElementById("goalTarget").value);
  if (!name || !target) return alert("Enter goal name and target");
  goals.push({ name, target });
  renderGoals();
  saveData();
  document.getElementById("goalName").value = "";
  document.getElementById("goalTarget").value = "";
}

// 🧾 Render Goals
function renderGoals() {
  const list = document.getElementById("goalList");
  if (!list) return;
  list.innerHTML = "";
  goals.forEach(g => {
    const li = document.createElement("li");
    li.textContent = `${g.name} — Target ₹${g.target}`;
    list.appendChild(li);
  });
}

// 📊 Update Dashboard (Balance, Saved, etc.)
function updateDashboard() {
  const income = transactions.filter(t => t.type === "Income").reduce((a, b) => a + b.amount, 0);
  const expense = transactions.filter(t => t.type === "Expense").reduce((a, b) => a + b.amount, 0);
  const saved = income - expense;
  const remaining = budget - expense;

  const balanceEl = document.getElementById("current-balance");
  const savedEl = document.getElementById("total-saved");
  const budgetEl = document.getElementById("budget-display");

  if (balanceEl) balanceEl.textContent = remaining.toFixed(2);
  if (savedEl) savedEl.textContent = saved.toFixed(2);
  if (budgetEl) budgetEl.textContent = budget;

  renderCharts();
  saveData();
}

// 📈 Charts for Dashboard + Insights
function renderCharts() {
  const expenseData = transactions.filter(t => t.type === "Expense");
  if (expenseData.length === 0) return;

  const categories = [...new Set(expenseData.map(t => t.category))];
  const values = categories.map(cat => expenseData.filter(t => t.category === cat)
    .reduce((a, b) => a + b.amount, 0));

  // Dashboard Chart
  const ctx1 = document.getElementById("dashboardChart");
  if (ctx1) {
    new Chart(ctx1, {
      type: "bar",
      data: {
        labels: categories,
        datasets: [{
          label: "Spending by Category",
          data: values,
          backgroundColor: "#26a69a"
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Insights Chart
  const ctx2 = document.getElementById("insightChart");
  if (ctx2) {
    new Chart(ctx2, {
      type: "pie",
      data: {
        labels: categories,
        datasets: [{
          label: "Expense Share",
          data: values,
          backgroundColor: ["#4db6ac", "#80cbc4", "#b2dfdb", "#00796b", "#004d40"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}
