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
