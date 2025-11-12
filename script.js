function showSection(id) {
  document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Add transactions
const form = document.getElementById("transaction-form");
const list = document.getElementById("transaction-list");

form.addEventListener("submit", e => {
  e.preventDefault();
  const category = document.getElementById("category").value;
  const amount = document.getElementById("amount").value;
  const type = document.getElementById("type").value;
  
  const li = document.createElement("li");
  li.textContent = `${type === "expense" ? "💸" : "💰"} ${category}: ₹${amount}`;
  list.appendChild(li);

  form.reset();
});

// Load saved data on page load
document.addEventListener("DOMContentLoaded", () => {
  const savedTransactions = JSON.parse(localStorage.getItem("transactions")) || [];
  savedTransactions.forEach(addTransactionToTable);
});

// Add transaction and save
function addTransaction() {
  const amount = document.getElementById("amount").value;
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const payment = document.getElementById("payment").value;
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value;

  const transaction = { amount, type, category, payment, date, note };
  
  addTransactionToTable(transaction);

  // Save to local storage
  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  transactions.push(transaction);
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function addTransactionToTable(transaction) {
  const table = document.getElementById("transactions");
  const row = table.insertRow();
  row.innerHTML = `
    <td>${transaction.amount}</td>
    <td>${transaction.type}</td>
    <td>${transaction.category}</td>
    <td>${transaction.payment}</td>
    <td>${transaction.date}</td>
    <td>${transaction.note}</td>
  `;
}
