
// ===============================
// synTAX Accounting System Script
// ===============================

// ---------- GLOBAL VARIABLES ----------
let journalEntries = JSON.parse(localStorage.getItem("journalEntries")) || [];
let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
let contacts = JSON.parse(localStorage.getItem("contacts")) || [];

let undoStack = [];
let redoStack = [];

// ---------- SIDEBAR NAVIGATION ----------
document.querySelectorAll(".sidebar li").forEach(li => {
  li.addEventListener("click", () => {
    document.querySelectorAll(".sidebar li").forEach(i => i.classList.remove("active"));
    li.classList.add("active");
    const section = li.dataset.section;

    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(section).classList.add("active");
  });
});

// ---------- SAVE TO LOCAL STORAGE ----------
function saveData() {
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  localStorage.setItem("accounts", JSON.stringify(accounts));
  localStorage.setItem("contacts", JSON.stringify(contacts));
}

// ---------- FORM HELPERS ----------
function clearForm(form) {
  form.reset();
}

// ==========================================
//        CHART OF ACCOUNTS SECTION
// ==========================================
const accountForm = document.getElementById("accountForm");
const accountsTable = document.getElementById("accountsTable")?.querySelector("tbody");

if (accountForm) {
  accountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("accName").value.trim();
    const type = document.getElementById("accType").value;

    if (!name) return alert("Please enter an account name.");

    const codePrefix = {
      Asset: "1000",
      Liability: "2000",
      Equity: "3000",
      Revenue: "4000",
      Expense: "5000"
    }[type];

    const code = `${codePrefix}-${accounts.length + 1}`;
    accounts.push({ code, name, type });

    saveData();
    renderAccounts();
    clearForm(accountForm);
  });
}

function renderAccounts() {
  if (!accountsTable) return;
  accountsTable.innerHTML = "";

  accounts.forEach((acc, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${acc.code}</td>
      <td>${acc.name}</td>
      <td>${acc.type}</td>
      <td>
        <button onclick="deleteAccount(${i})">🗑️</button>
      </td>`;
    accountsTable.appendChild(tr);
  });
}

function deleteAccount(i) {
  if (confirm("Delete this account?")) {
    accounts.splice(i, 1);
    saveData();
    renderAccounts();
  }
}

// ==========================================
//        JOURNAL ENTRIES SECTION
// ==========================================
const journalForm = document.getElementById("journalForm");
const journalTable = document.getElementById("journalTable")?.querySelector("tbody");

if (journalForm) {
  journalForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const entry = {
      date: document.getElementById("jDate").value,
      desc: document.getElementById("jDesc").value.trim(),
      debit: document.getElementById("jDebit").value.trim(),
      credit: document.getElementById("jCredit").value.trim(),
      amount: parseFloat(document.getElementById("jAmount").value),
    };

    if (!entry.date || !entry.desc || !entry.debit || !entry.credit || !entry.amount) {
      return alert("Please fill out all fields.");
    }

    journalEntries.push(entry);
    undoStack.push([...journalEntries]);
    redoStack = [];

    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
    clearForm(journalForm);
  });
}

function renderJournal() {
  if (!journalTable) return;
  journalTable.innerHTML = "";

  journalEntries.forEach((entry, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.desc}</td>
      <td>${entry.debit}</td>
      <td>${entry.credit}</td>
      <td>₱${entry.amount.toLocaleString()}</td>
      <td>
        <button onclick="deleteJournal(${index})">🗑️</button>
      </td>`;
    journalTable.appendChild(tr);
  });
}

function deleteJournal(index) {
  if (confirm("Delete this journal entry?")) {
    journalEntries.splice(index, 1);
    undoStack.push([...journalEntries]);
    redoStack = [];
    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
  }
}

// ---------- Undo / Redo ----------
document.getElementById("undoBtn")?.addEventListener("click", () => {
  if (undoStack.length > 0) {
    redoStack.push([...journalEntries]);
    journalEntries = undoStack.pop();
    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
  }
});

document.getElementById("redoBtn")?.addEventListener("click", () => {
  if (redoStack.length > 0) {
    undoStack.push([...journalEntries]);
    journalEntries = redoStack.pop();
    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
  }
});

// ==========================================
//              LEDGER SECTION
// ==========================================
function renderLedger() {
  const ledgerDiv = document.getElementById("generalLedger");
  if (!ledgerDiv) return;

  if (journalEntries.length === 0) {
    ledgerDiv.innerHTML = "<p>No ledger entries yet.</p>";
    return;
  }

  const ledger = {};

  journalEntries.forEach(e => {
    ledger[e.debit] = (ledger[e.debit] || 0) + e.amount;
    ledger[e.credit] = (ledger[e.credit] || 0) - e.amount;
  });

  ledgerDiv.innerHTML = `
    <table>
      <thead><tr><th>Account</th><th>Balance</th></tr></thead>
      <tbody>
        ${Object.entries(ledger)
          .map(([acc, bal]) => `<tr><td>${acc}</td><td>₱${bal.toLocaleString()}</td></tr>`)
          .join("")}
      </tbody>
    </table>`;
}

// ==========================================
//           DASHBOARD & CHARTS
// ==========================================
function updateDashboard() {
  let income = 0, expenses = 0;

  journalEntries.forEach(e => {
    if (e.debit.toLowerCase().includes("expense")) expenses += e.amount;
    if (e.credit.toLowerCase().includes("revenue") || e.credit.toLowerCase().includes("income")) income += e.amount;
  });

  const cashBalance = income - expenses;
  const profit = income - expenses;

  document.getElementById("cashBalance").textContent = `₱${cashBalance.toLocaleString()}`;
  document.getElementById("totalIncome").textContent = `₱${income.toLocaleString()}`;
  document.getElementById("totalExpenses").textContent = `₱${expenses.toLocaleString()}`;
  document.getElementById("netProfit").textContent = `₱${profit.toLocaleString()}`;

  renderCharts(income, expenses);
}

function renderCharts(income, expenses) {
  const ctx1 = document.getElementById("cashFlowChart");
  const ctx2 = document.getElementById("incomeExpenseChart");

  if (ctx1) {
    new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["Inflows", "Outflows"],
        datasets: [{
          label: "Cash Flow",
          data: [income, expenses],
          backgroundColor: ["#0077b6", "#d90429"]
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  if (ctx2) {
    new Chart(ctx2, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{
          label: "Income",
          borderColor: "#0077b6",
          data: [income / 3, income / 2, income],
          fill: false
        }, {
          label: "Expenses",
          borderColor: "#d90429",
          data: [expenses / 3, expenses / 2, expenses],
          fill: false
        }]
      },
      options: { responsive: true }
    });
  }
}

// ==========================================
//           CONTACTS SECTION
// ==========================================
const contactForm = document.getElementById("contactForm");
const contactTable = document.getElementById("contactTable")?.querySelector("tbody");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const contact = {
      name: document.getElementById("cName").value,
      type: document.getElementById("cType").value,
      email: document.getElementById("cEmail").value
    };

    contacts.push(contact);
    saveData();
    renderContacts();
    clearForm(contactForm);
  });
}

function renderContacts() {
  if (!contactTable) return;
  contactTable.innerHTML = "";

  contacts.forEach((c, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.type}</td>
      <td>${c.email}</td>`;
    contactTable.appendChild(tr);
  });
}

// ==========================================
//            SETTINGS SECTION
// ==========================================
function backupData() {
  const data = {
    journalEntries,
    accounts,
    contacts
  };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "syntax_backup.json";
  a.click();
}

function restoreData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = JSON.parse(event.target.result);
      journalEntries = data.journalEntries || [];
      accounts = data.accounts || [];
      contacts = data.contacts || [];
      saveData();
      renderAll();
    };
    reader.readAsText(file);
  };
  input.click();
}

// ---------- THEME TOGGLE ----------
document.getElementById("themeSwitch")?.addEventListener("change", (e) => {
  document.body.classList.toggle("dark-theme", e.target.checked);
});

// ==========================================
//             INITIAL LOAD
// ==========================================
function renderAll() {
  renderAccounts();
  renderJournal();
  renderLedger();
  renderContacts();
  updateDashboard();
}

document.addEventListener("DOMContentLoaded", renderAll);

// ===== DARK MODE TOGGLE =====
const themeToggle = document.getElementById("toggleTheme");
const body = document.body;

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  body.classList.add("dark-mode");
  themeToggle.textContent = "☀️ Light Mode";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

/* ==========================
   Account list (no code numbers)
   ========================== */
const ACCOUNT_LIST = [
  // Current Assets
  "Cash","Petty Cash","Cash in Bank","Accounts Receivable","Notes Receivable",
  "Allowance for Doubtful Accounts","Inventory","Prepaid Expenses","Short-term Investments","Accrued Income",
  // Non-current Assets
  "Land","Building","Accumulated Depreciation – Building","Office Equipment","Accumulated Depreciation – Equipment",
  "Furniture and Fixtures","Vehicles","Accumulated Depreciation – Vehicles","Goodwill","Patents",
  // Current Liabilities
  "Accounts Payable","Notes Payable","Accrued Expenses","Salaries Payable","Interest Payable","Taxes Payable","Unearned Revenue",
  // Non-current Liabilities
  "Bonds Payable","Mortgage Payable","Deferred Tax Liabilities","Pension Liabilities",
  // Owner's Equity
  "Capital","Drawing","Retained Earnings","Additional Paid-in Capital","Treasury Stock","Revaluation Surplus",
  // Revenues
  "Sales","Sales Returns and Allowances","Sales Discounts","Service Revenue","Interest Income","Rent Income","Commission Income","Other Income",
  // Expenses
  "Cost of Goods Sold","Salaries and Wages Expense","Rent Expense","Utilities Expense","Supplies Expense","Depreciation Expense",
  "Insurance Expense","Advertising Expense","Repairs and Maintenance Expense","Delivery Expense","Taxes and Licenses","Miscellaneous Expense",
  "Purchase","Purchase Returns and Allowances","Purchase Discount","Interest Expense","Loss on Disposal of Assets","Bad Debts Expense"
];

/* Populate every select.accountSelect available in DOM */
function populateAccountDropdowns() {
  const selects = document.querySelectorAll(".accountSelect");
  selects.forEach(select => {
    // if already populated (option length > 1) you can clear and repopulate to be sure:
    select.innerHTML = '<option value="">Select Account</option>';
    ACCOUNT_LIST.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc;
      opt.textContent = acc;
      select.appendChild(opt);
    });
  });
}

/* Open / close modal */
function openJournalModal() {
  populateAccountDropdowns();             // ensure dropdowns are filled
  const modal = document.getElementById("journalModal");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}
function closeJournalModal() {
  const modal = document.getElementById("journalModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

/* safe helper to add 1 journal entry row to storage */
function addJournalEntry(j) {
  // j expected: { date, description, account, debit, credit, partyType, party }
  const journals = JSON.parse(localStorage.getItem("journals") || "[]");
  journals.push(j);
  localStorage.setItem("journals", JSON.stringify(journals));
}

/* When the modal form is submitted: read both rows and save */
document.addEventListener("DOMContentLoaded", () => {
  populateAccountDropdowns(); // fill on page load too

  const addForm = document.getElementById("addJournalForm");
  if (!addForm) return;

  addForm.addEventListener("submit", (ev) => {
    ev.preventDefault();

    const entryType = document.getElementById("entryType").value.trim();
    const seriesCode = document.getElementById("seriesCode").value.trim();
    const companyDesc = document.getElementById("companyDesc").value.trim();
    const postingDate = document.getElementById("postingDate").value;

    const rows = Array.from(document.querySelectorAll("#addJournalTable tbody tr"));

    // We'll collect lines and ensure dual entry (sum debit == sum credit)
    const lines = [];
    rows.forEach((tr, idx) => {
      const account = tr.querySelector(".accountSelect")?.value || "";
      const partyType = tr.querySelector(".partyType")?.value || "";
      const party = tr.querySelector(".party")?.value || "";
      const debit = parseFloat(tr.querySelector(".debit")?.value || 0) || 0;
      const credit = parseFloat(tr.querySelector(".credit")?.value || 0) || 0;

      if (account) {
        lines.push({
          no: idx + 1,
          account,
          partyType,
          party,
          debit,
          credit
        });
      }
    });

    if (lines.length < 2) {
      return alert("Please select accounts for both lines (debit and credit).");
    }

    // Validate duality: total debits == total credits
    const totalDebit = lines.reduce((s,l) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s,l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      return alert("Debits and Credits must be equal. Please correct the amounts.");
    }

    // Build descriptive header for the journal entry
    const headerDesc = `${entryType} | ${companyDesc} | ${seriesCode}`;

    // Save each line as a journal record (this format matches prior code patterns)
    lines.forEach(line => {
      addJournalEntry({
        date: postingDate,
        header: headerDesc,
        desc: headerDesc,
        account: line.account,
        partyType: line.partyType,
        party: line.party,
        debit: line.debit || 0,
        credit: line.credit || 0
      });
    });

    // refresh UI pieces (function names shown below — ensure they exist)
    if (typeof updateJournalTable === "function") updateJournalTable();
    if (typeof updateLedger === "function") updateLedger();
    if (typeof generateReports === "function") generateReports();

    closeJournalModal();
    // optional friendly feedback
    alert("Journal entry saved.");
  });
});

// Save Journal Entry
popupForm.onsubmit = (e) => {
  e.preventDefault();
  
  const date = document.getElementById("postingDate").value;
  const type = document.getElementById("entryType").value;
  const desc = document.getElementById("companyDesc").value;
  
  const debitInput = document.querySelector(".debit").value;
  const creditInput = document.querySelector(".credit").value;
  const accountSelect = document.querySelector(".accountSelect").value;

  if (!date || !accountSelect) return alert("Please fill all fields.");

  const entry = {
    date,
    type,
    desc,
    account: accountSelect,
    debit: parseFloat(debitInput) || 0,
    credit: parseFloat(creditInput) || 0
  };

  // Save to localStorage
  let journals = JSON.parse(localStorage.getItem("journals")) || [];
  journals.push(entry);
  localStorage.setItem("journals", JSON.stringify(journals));

 refreshAll();
entryModal.style.display = "none";
};

// Populate journal table
function updateJournalTable() {
  journalTable.innerHTML = "";
  const journals = JSON.parse(localStorage.getItem("journals")) || [];

  journals.forEach((j, i) => {
    const row = `<tr>
      <td>${j.date}</td>
      <td>${j.type}</td>
      <td>${j.desc}</td>
      <td>${j.debit ? j.account : ""}</td>
      <td>${j.credit ? j.account : ""}</td>
      <td>₱${j.debit || j.credit}</td>
    </tr>`;
    journalTable.innerHTML += row;
  });
}

updateJournalTable();

// ================= LEDGER AUTO-POSTING =================

// Classification map for account → major category + normal balance side
const accountMap = {
  // ASSETS
  "Cash": { category: "Assets", normal: "Debit" },
  "Petty Cash": { category: "Assets", normal: "Debit" },
  "Cash in Bank": { category: "Assets", normal: "Debit" },
  "Accounts Receivable": { category: "Assets", normal: "Debit" },
  "Inventory": { category: "Assets", normal: "Debit" },
  "Prepaid Expenses": { category: "Assets", normal: "Debit" },

  // LIABILITIES
  "Accounts Payable": { category: "Liabilities", normal: "Credit" },
  "Notes Payable": { category: "Liabilities", normal: "Credit" },
  "Accrued Expenses": { category: "Liabilities", normal: "Credit" },

  // CAPITAL / EQUITY
  "Capital": { category: "Capital", normal: "Credit" },
  "Drawing": { category: "Capital", normal: "Debit" },
  "Retained Earnings": { category: "Capital", normal: "Credit" },

  // REVENUES
  "Sales": { category: "Revenues", normal: "Credit" },
  "Service Revenue": { category: "Revenues", normal: "Credit" },
  "Rent Income": { category: "Revenues", normal: "Credit" },

  // EXPENSES
  "Rent Expense": { category: "Expenses", normal: "Debit" },
  "Salaries Expense": { category: "Expenses", normal: "Debit" },
  "Utilities Expense": { category: "Expenses", normal: "Debit" },
  "Supplies Expense": { category: "Expenses", normal: "Debit" }
};

// Function to compute and display Ledger from Journals
function updateLedger() {
  const journals = JSON.parse(localStorage.getItem("journals")) || [];
  const ledgerDiv = document.getElementById("generalLedger");
  ledgerDiv.innerHTML = "";

  // Organize ledger entries by account
  const ledger = {};

  journals.forEach(entry => {
    const acc = entry.account;
    if (!ledger[acc]) ledger[acc] = [];
    ledger[acc].push({
      date: entry.date,
      desc: entry.desc,
      debit: entry.debit,
      credit: entry.credit
    });
  });

  // Render ledgers per major category
  const categories = ["Assets", "Liabilities", "Capital", "Revenues", "Expenses"];
  categories.forEach(cat => {
    const header = document.createElement("h2");
    header.textContent = cat;
    ledgerDiv.appendChild(header);

    // Filter accounts belonging to that category
    Object.keys(ledger).forEach(acc => {
      if (accountMap[acc]?.category === cat) {
        const table = document.createElement("table");
        table.innerHTML = `
          <thead>
            <tr><th colspan="4">${acc}</th></tr>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody></tbody>
          <tfoot><tr><td colspan="4" class="balance"></td></tr></tfoot>
        `;
        const tbody = table.querySelector("tbody");
        let debitTotal = 0, creditTotal = 0;

        ledger[acc].forEach(e => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${e.date}</td>
            <td>${e.desc}</td>
            <td>${e.debit ? "₱" + e.debit.toFixed(2) : ""}</td>
            <td>${e.credit ? "₱" + e.credit.toFixed(2) : ""}</td>
          `;
          tbody.appendChild(row);
          debitTotal += e.debit || 0;
          creditTotal += e.credit || 0;
        });

        // Compute ending balance based on normal side
        let balance = 0;
        const normal = accountMap[acc]?.normal || "Debit";
        if (normal === "Debit") balance = debitTotal - creditTotal;
        else balance = creditTotal - debitTotal;

        table.querySelector(".balance").textContent =
          `Balance: ₱${balance.toFixed(2)}`;
        ledgerDiv.appendChild(table);
      }
    });
  });
}

// Hook ledger update after adding journal entry
function refreshAll() {
  updateJournalTable();
  updateLedger();
}
updateLedger();

// ===================== FINANCIAL STATEMENTS =====================

// Compute balances first
function getAccountBalances() {
  const journals = JSON.parse(localStorage.getItem("journals")) || [];
  const balances = {};

  journals.forEach(e => {
    if (!balances[e.account]) balances[e.account] = { debit: 0, credit: 0 };
    balances[e.account].debit += e.debit || 0;
    balances[e.account].credit += e.credit || 0;
  });

  const results = {};
  Object.keys(balances).forEach(acc => {
    const normal = accountMap[acc]?.normal || "Debit";
    const bal = (normal === "Debit")
      ? balances[acc].debit - balances[acc].credit
      : balances[acc].credit - balances[acc].debit;
    results[acc] = bal;
  });
  return results;
}

// Generate Trial Balance
function generateTrialBalance(balances) {
  const div = document.getElementById("trialBalance");
  div.innerHTML = "";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr><th>Account</th><th>Debit (₱)</th><th>Credit (₱)</th></tr>
    </thead>
    <tbody></tbody>
    <tfoot><tr><td><b>Total</b></td><td id="tbDebit"></td><td id="tbCredit"></td></tr></tfoot>
  `;

  let totalDebit = 0, totalCredit = 0;
  const tbody = table.querySelector("tbody");

  Object.keys(balances).forEach(acc => {
    const normal = accountMap[acc]?.normal || "Debit";
    const bal = balances[acc];
    const row = document.createElement("tr");
    if (normal === "Debit" && bal >= 0) {
      row.innerHTML = `<td>${acc}</td><td>${bal.toFixed(2)}</td><td></td>`;
      totalDebit += bal;
    } else {
      row.innerHTML = `<td>${acc}</td><td></td><td>${bal.toFixed(2)}</td>`;
      totalCredit += bal;
    }
    tbody.appendChild(row);
  });

  table.querySelector("#tbDebit").textContent = totalDebit.toFixed(2);
  table.querySelector("#tbCredit").textContent = totalCredit.toFixed(2);
  div.appendChild(table);
}

// Generate Income Statement
function generateIncomeStatement(balances) {
  const div = document.getElementById("incomeStatement");
  div.innerHTML = "";

  let totalRevenue = 0, totalExpense = 0;

  const revTable = document.createElement("table");
  revTable.innerHTML = `<thead><tr><th>Revenues</th><th>Amount (₱)</th></tr></thead><tbody></tbody>`;
  const revBody = revTable.querySelector("tbody");

  const expTable = document.createElement("table");
  expTable.innerHTML = `<thead><tr><th>Expenses</th><th>Amount (₱)</th></tr></thead><tbody></tbody>`;
  const expBody = expTable.querySelector("tbody");

  Object.keys(balances).forEach(acc => {
    const category = accountMap[acc]?.category;
    const bal = balances[acc];
    if (category === "Revenues") {
      totalRevenue += bal;
      revBody.innerHTML += `<tr><td>${acc}</td><td>${bal.toFixed(2)}</td></tr>`;
    }
    if (category === "Expenses") {
      totalExpense += bal;
      expBody.innerHTML += `<tr><td>${acc}</td><td>${bal.toFixed(2)}</td></tr>`;
    }
  });

  const netIncome = totalRevenue - totalExpense;

  div.appendChild(revTable);
  div.appendChild(expTable);

  const summary = document.createElement("p");
  summary.innerHTML = `<b>Net Income:</b> ₱${netIncome.toFixed(2)}`;
  div.appendChild(summary);

  localStorage.setItem("netIncome", netIncome);
}

// Generate Balance Sheet
function generateBalanceSheet(balances) {
  const div = document.getElementById("balanceSheet");
  div.innerHTML = "";

  const netIncome = parseFloat(localStorage.getItem("netIncome") || 0);

  const sections = {
    Assets: [],
    Liabilities: [],
    Capital: []
  };

  Object.keys(balances).forEach(acc => {
    const cat = accountMap[acc]?.category;
    if (sections[cat]) sections[cat].push({ acc, bal: balances[acc] });
  });

  const table = document.createElement("table");
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  let totalAssets = 0, totalLiabilities = 0, totalCapital = 0;

  tbody.innerHTML += `<tr><th colspan="2">Assets</th></tr>`;
  sections.Assets.forEach(a => {
    tbody.innerHTML += `<tr><td>${a.acc}</td><td>${a.bal.toFixed(2)}</td></tr>`;
    totalAssets += a.bal;
  });

  tbody.innerHTML += `<tr><th colspan="2">Liabilities</th></tr>`;
  sections.Liabilities.forEach(a => {
    tbody.innerHTML += `<tr><td>${a.acc}</td><td>${a.bal.toFixed(2)}</td></tr>`;
    totalLiabilities += a.bal;
  });

  tbody.innerHTML += `<tr><th colspan="2">Capital</th></tr>`;
  sections.Capital.forEach(a => {
    tbody.innerHTML += `<tr><td>${a.acc}</td><td>${a.bal.toFixed(2)}</td></tr>`;
    totalCapital += a.bal;
  });

  tbody.innerHTML += `<tr><td>Net Income</td><td>${netIncome.toFixed(2)}</td></tr>`;
  totalCapital += netIncome;

  tbody.innerHTML += `
    <tr><td><b>Total Assets</b></td><td><b>${totalAssets.toFixed(2)}</b></td></tr>
    <tr><td><b>Total Liabilities + Capital</b></td><td><b>${(totalLiabilities + totalCapital).toFixed(2)}</b></td></tr>
  `;

  div.appendChild(table);
}

// Generate all
function generateReports() {
  const balances = getAccountBalances();
  generateTrialBalance(balances);
  generateIncomeStatement(balances);
  generateBalanceSheet(balances);
}

document.addEventListener("DOMContentLoaded", () => {
  const addEntryBtn = document.getElementById("addEntryBtn");
  const deleteEntryBtn = document.getElementById("deleteEntryBtn");
  const modal = document.getElementById("journalModal");
  const closeModal = document.getElementById("closeModal");
  const saveBtn = document.getElementById("saveEntry");
  const journalBody = document.getElementById("journalBody");
  const journalTable = document.getElementById("journalTable");

  let deleteMode = false;
  let entryCount = 0;

  // 🧩 Add Entry
  addEntryBtn.addEventListener("click", () => {
    modal.classList.add("show");
  });

  // 🧩 Close Modal
  closeModal.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  // 🧩 Save New Journal Entry
  saveBtn.addEventListener("click", () => {
    const entryType = document.getElementById("entryType").value;
    const seriesCode = document.getElementById("seriesCode").value;
    const company = document.getElementById("companyName").value;
    const postingDate = document.getElementById("postingDate").value;
    const rows = document.querySelectorAll("#addJournalTable tbody tr");

    rows.forEach(row => {
      const account = row.querySelector(".accountSelect").value;
      const partyType = row.querySelector(".partyType").value;
      const party = row.querySelector(".party").value;
      const debit = row.querySelector(".debit").value;
      const credit = row.querySelector(".credit").value;

      entryCount++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox"></td>
        <td>${entryCount}</td>
        <td>${account}</td>
        <td>${partyType}</td>
        <td>${party}</td>
        <td>${debit}</td>
        <td>${credit}</td>
        <td><button class="edit-btn">✏️</button></td>
      `;
      journalBody.appendChild(tr);
    });

    modal.classList.remove("show");
  });

  // 🧩 Delete Mode Toggle
  deleteEntryBtn.addEventListener("click", () => {
    deleteMode = !deleteMode;
    journalTable.classList.toggle("show-checkboxes");

    if (!deleteMode) {
      // When exiting delete mode, remove selected rows
      const checked = document.querySelectorAll("#journalTable input[type='checkbox']:checked");
      checked.forEach(chk => chk.closest("tr").remove());
    }
  });

  // 🧩 Populate Account Dropdowns
  const accounts = [
    "Cash","Petty Cash","Cash in Bank","Accounts Receivable","Notes Receivable",
    "Allowance for Doubtful Accounts","Inventory","Prepaid Expenses","Short-term Investments","Accrued Income",
    "Land","Building","Accumulated Depreciation – Building","Office Equipment",
    "Accumulated Depreciation – Equipment","Furniture and Fixtures","Vehicles",
    "Accumulated Depreciation – Vehicles","Goodwill","Patents",
    "Accounts Payable","Notes Payable","Accrued Expenses","Salaries Payable",
    "Interest Payable","Taxes Payable","Unearned Revenue","Bonds Payable",
    "Mortgage Payable","Deferred Tax Liabilities","Pension Liabilities",
    "Capital","Drawing","Retained Earnings","Additional Paid-in Capital",
    "Treasury Stock","Revaluation Surplus",
    "Sales","Sales Returns and Allowances","Sales Discounts","Service Revenue",
    "Interest Income","Rent Income","Commission Income","Other Income",
    "Cost of Goods Sold","Salaries and Wages Expense","Rent Expense",
    "Utilities Expense","Supplies Expense","Depreciation Expense","Insurance Expense",
    "Advertising Expense","Repairs and Maintenance Expense","Delivery Expense",
    "Taxes and Licenses","Miscellaneous Expense","Purchase",
    "Purchase Returns and Allowances","Purchase Discount",
    "Interest Expense","Loss on Disposal of Assets","Bad Debts Expense"
  ];

  document.querySelectorAll(".accountSelect").forEach(select => {
    accounts.forEach(acc => {
      const option = document.createElement("option");
      option.value = acc;
      option.textContent = acc;
      select.appendChild(option);
    });
  });
});

