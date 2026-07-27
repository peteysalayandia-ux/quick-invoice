const STORAGE_KEY = "quick-invoice-v1";
const fields = ["businessName","businessDetails","invoiceNumber","clientName","clientDetails","issueDate","dueDate","currency","notes","taxRate"];
const $ = (id) => document.getElementById(id);
const items = $("items");
const template = $("itemTemplate");
let saveTimer;

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: $("currency").value }).format(value || 0);
  } catch {
    return Number(value || 0).toFixed(2);
  }
}

function addItem(item = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector(".item-description").value = item.description || "";
  row.querySelector(".item-quantity").value = item.quantity ?? 1;
  row.querySelector(".item-rate").value = item.rate ?? 0;
  row.querySelector(".remove-item").addEventListener("click", () => {
    row.remove();
    if (!items.children.length) addItem();
    update();
  });
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
  items.append(row);
  calculate();
}

function getItems() {
  return [...items.children].map((row) => ({
    description: row.querySelector(".item-description").value,
    quantity: Number(row.querySelector(".item-quantity").value) || 0,
    rate: Number(row.querySelector(".item-rate").value) || 0
  }));
}

function calculate() {
  let subtotal = 0;
  [...items.children].forEach((row) => {
    const amount = (Number(row.querySelector(".item-quantity").value) || 0) * (Number(row.querySelector(".item-rate").value) || 0);
    subtotal += amount;
    row.querySelector(".item-amount").textContent = money(amount);
  });
  const tax = subtotal * ((Number($("taxRate").value) || 0) / 100);
  $("subtotal").textContent = money(subtotal);
  $("taxAmount").textContent = money(tax);
  $("total").textContent = money(subtotal + tax);
}

function serialize() {
  const data = Object.fromEntries(fields.map((id) => [id, $(id).value]));
  data.items = getItems();
  return data;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
  $("saveStatus").textContent = "Saved locally";
}

function update() {
  calculate();
  $("saveStatus").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 350);
}

function load() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (saved) fields.forEach((id) => { if (saved[id] != null) $(id).value = saved[id]; });
  else {
    $("issueDate").value = today();
    $("dueDate").value = today(14);
  }
  items.innerHTML = "";
  (saved?.items?.length ? saved.items : [{ description: "", quantity: 1, rate: 0 }]).forEach(addItem);
  calculate();
}

function reset() {
  if (!confirm("Start a new invoice? Your current invoice will be replaced.")) return;
  localStorage.removeItem(STORAGE_KEY);
  fields.forEach((id) => $(id).value = "");
  $("businessName").value = "Your Business";
  $("invoiceNumber").value = `INV-${String(Date.now()).slice(-4)}`;
  $("currency").value = "USD";
  $("taxRate").value = "0";
  $("issueDate").value = today();
  $("dueDate").value = today(14);
  items.innerHTML = "";
  addItem();
  update();
}

fields.forEach((id) => $(id).addEventListener("input", update));
$("addItem").addEventListener("click", () => { addItem(); update(); });
$("newInvoice").addEventListener("click", reset);
$("printInvoice").addEventListener("click", () => window.print());
window.addEventListener("beforeprint", save);
load();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}
