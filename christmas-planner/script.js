"use strict";

const STORAGE_PREFIX = "merry-managed:";
const currentYear = new Date().getFullYear();
const yearSelect = document.querySelector("#planner-year");
const toast = document.querySelector("#toast");
let selectedYear = currentYear;
let planner = loadPlanner(selectedYear);
let toastTimer;

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createListItem(text, completed = false) {
  return { id: makeId(), text, completed };
}

function defaultPlanner(year) {
  return {
    year,
    overallBudget: 0,
    tasks: [],
    decorIdeas: [],
    giftPeople: [],
    budgetCategories: [],
    expenses: [],
    traditions: [],
    outings: [],
    plans: { eve: "", day: "" },
    homemadeGifts: [],
  };
}

function normalizePlanner(data, year) {
  const defaults = defaultPlanner(year);
  const normalized = { ...defaults, ...data, year };
  normalized.plans = { ...defaults.plans, ...(data?.plans || {}) };
  ["tasks", "decorIdeas", "giftPeople", "budgetCategories", "expenses", "traditions", "outings", "homemadeGifts"].forEach((key) => {
    if (!Array.isArray(normalized[key])) normalized[key] = defaults[key];
  });
  return normalized;
}

function loadPlanner(year) {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${year}`);
  if (!stored) return defaultPlanner(year);

  try {
    return normalizePlanner(JSON.parse(stored), year);
  } catch (error) {
    console.warn("Planner data could not be read; loading a fresh year.", error);
    return defaultPlanner(year);
  }
}

function savePlanner() {
  localStorage.setItem(`${STORAGE_PREFIX}${selectedYear}`, JSON.stringify(planner));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value, includeCents = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: includeCents ? 2 : 0,
    minimumFractionDigits: includeCents ? 2 : 0,
  }).format(Number(value) || 0);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function emptyState(title, note) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>`;
}

function deleteButton(type, id, label) {
  return `<button class="delete-button" type="button" data-delete="${type}" data-id="${escapeHtml(id)}" aria-label="Remove ${escapeHtml(label)}">×</button>`;
}

function updateCountdown(year) {
  const now = new Date();
  const christmas = new Date(year, 11, 25, 0, 0, 0);
  const difference = christmas.getTime() - now.getTime();
  const number = document.querySelector("#countdown-number");
  const label = document.querySelector("#countdown-label");

  if (difference < 0) {
    number.textContent = "✓";
    label.textContent = `${year} season complete`;
    return;
  }

  number.textContent = String(Math.ceil(difference / 86400000));
  label.textContent = "days until Christmas";
}

function renderOverview() {
  const completed = planner.tasks.filter((task) => task.completed).length;
  const percent = planner.tasks.length ? Math.round((completed / planner.tasks.length) * 100) : 0;
  const spent = planner.expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const remaining = planner.overallBudget - spent;
  const progressRing = document.querySelector("#progress-ring");

  progressRing.style.setProperty("--progress", percent);
  progressRing.setAttribute("aria-label", `${percent} percent complete`);
  document.querySelector("#progress-percent").textContent = `${percent}%`;
  document.querySelector("#tasks-complete").textContent = String(completed);
  document.querySelector("#tasks-total").textContent = String(planner.tasks.length);
  document.querySelector("#spent-amount").textContent = formatCurrency(spent);
  document.querySelector("#budget-total").textContent = `${formatCurrency(planner.overallBudget)} budget`;
  document.querySelector("#remaining-amount").textContent = planner.overallBudget
    ? `${formatCurrency(remaining)} remaining`
    : "Set your overall budget";
  document.querySelector("#budget-bar").style.width = planner.overallBudget
    ? `${Math.min((spent / planner.overallBudget) * 100, 100)}%`
    : "0%";

  const nextTask = planner.tasks.find((task) => !task.completed);
  document.querySelector("#next-task-title").textContent = nextTask?.title || (planner.tasks.length ? "Everything is wrapped up" : "Your first plan");
  document.querySelector("#next-task-note").textContent = nextTask?.note || (planner.tasks.length ? "Your master list is complete. Enjoy the season." : "Add a task to begin shaping the season.");
}

function renderTasks() {
  const list = document.querySelector("#todo-list");
  const completed = planner.tasks.filter((task) => task.completed).length;
  document.querySelector("#todo-summary").textContent = `${completed} of ${planner.tasks.length} complete`;
  document.querySelector("#clear-completed").disabled = completed === 0;

  if (!planner.tasks.length) {
    list.innerHTML = emptyState("A lovely blank slate", "Add the first thing you want to remember.");
    return;
  }

  list.innerHTML = planner.tasks
    .map(
      (task) => `
        <li class="check-row ${task.completed ? "completed" : ""}">
          <label>
            <input type="checkbox" data-toggle="task" data-id="${task.id}" ${task.completed ? "checked" : ""} />
            <span class="check-copy">
              <strong>${escapeHtml(task.title)}</strong>
              ${task.note ? `<small>${escapeHtml(task.note)}</small>` : ""}
            </span>
          </label>
          ${deleteButton("task", task.id, task.title)}
        </li>`,
    )
    .join("");
}

function renderDecor() {
  const list = document.querySelector("#decor-list");
  if (!planner.decorIdeas.length) {
    list.innerHTML = emptyState("Your mood board starts here", "Add a room, color, or little detail you want to try.");
    return;
  }

  list.innerHTML = planner.decorIdeas
    .map((item) => `<article class="idea-card"><p>${escapeHtml(item.text)}</p>${deleteButton("decorIdeas", item.id, item.text)}</article>`)
    .join("");
}

function renderGifts() {
  const board = document.querySelector("#gift-board");
  const select = document.querySelector("#gift-person");
  const giftInput = document.querySelector("#gift-idea");
  const giftButton = document.querySelector("#gift-form button[type='submit']");
  const selectedPerson = select.value;

  board.innerHTML = planner.giftPeople.length
    ? planner.giftPeople.map((person) => {
      const purchased = person.gifts.filter((gift) => gift.purchased).length;
      const gifts = person.gifts.length
        ? person.gifts
            .map(
              (gift) => `
                <li class="gift-item ${gift.purchased ? "purchased" : ""}">
                  <label>
                    <input type="checkbox" data-toggle="gift" data-person-id="${person.id}" data-id="${gift.id}" ${gift.purchased ? "checked" : ""} />
                    <span>${escapeHtml(gift.text)}</span>
                  </label>
                  <button class="delete-button" type="button" data-delete="gift" data-person-id="${person.id}" data-id="${gift.id}" aria-label="Remove ${escapeHtml(gift.text)}">×</button>
                </li>`,
            )
            .join("")
        : `<li class="empty-state"><strong>No ideas yet</strong><span>Add one below when inspiration strikes.</span></li>`;

      return `
        <article class="card gift-person-card">
          <header class="gift-person-header">
            <div><h3>${escapeHtml(person.name)}</h3><span>${purchased}/${person.gifts.length} purchased</span></div>
            <button class="person-delete-button" type="button" data-delete-person="${person.id}" aria-label="Remove ${escapeHtml(person.name)} from the gift list">×</button>
          </header>
          <ul class="gift-list">${gifts}</ul>
        </article>`;
    })
    .join("")
    : `<div class="card empty-state gift-board-empty"><strong>Who are you shopping for?</strong><span>Add your first person below to begin their gift list.</span></div>`;

  const hasPeople = planner.giftPeople.length > 0;
  select.innerHTML = hasPeople
    ? planner.giftPeople.map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`).join("")
    : `<option value="">Add a person first</option>`;
  select.disabled = !hasPeople;
  giftInput.disabled = !hasPeople;
  giftButton.disabled = !hasPeople;
  giftInput.placeholder = hasPeople ? "Add a gift idea…" : "Add a person first";
  if (planner.giftPeople.some((person) => person.id === selectedPerson)) select.value = selectedPerson;
}

function renderBudget() {
  const categories = document.querySelector("#budget-categories");
  const expenseCategory = document.querySelector("#expense-category");
  const previousCategory = expenseCategory.value;
  const planned = planner.budgetCategories.reduce((total, category) => total + Number(category.amount || 0), 0);
  const spent = planner.expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const remaining = planner.overallBudget - spent;

  document.querySelector("#overall-budget").value = planner.overallBudget || "";
  document.querySelector("#planned-total").textContent = formatCurrency(planned);
  document.querySelector("#spent-total").textContent = formatCurrency(spent);
  document.querySelector("#remaining-total").textContent = formatCurrency(remaining);
  document.querySelector("#remaining-total").style.color = remaining < 0 ? "var(--cranberry)" : "";
  document.querySelector("#spending-running-total").textContent = formatCurrency(spent, true);

  categories.innerHTML = planner.budgetCategories.length
    ? planner.budgetCategories
        .map((category) => {
          const categoryBudget = Number(category.amount) || 0;
          const categorySpent = planner.expenses
            .filter((expense) => expense.category === category.name)
            .reduce((total, expense) => total + Number(expense.amount || 0), 0);
          const categoryRemaining = categoryBudget - categorySpent;
          const categoryPercent = categoryBudget ? Math.min((categorySpent / categoryBudget) * 100, 100) : 0;

          return `
            <div class="category-row ${categoryRemaining < 0 ? "over-budget" : ""}">
              <div class="category-row-heading">
                <div class="category-overview">
                  <label for="category-${category.id}">${escapeHtml(category.name)}</label>
                  <div class="category-progress" role="progressbar" aria-label="${escapeHtml(category.name)} spending" aria-valuemin="0" aria-valuemax="${Math.max(categoryBudget, categorySpent, 1)}" aria-valuenow="${categorySpent}" aria-valuetext="${formatCurrency(categorySpent, true)} spent of ${formatCurrency(categoryBudget, true)}">
                    <span style="width: ${categoryPercent}%"></span>
                  </div>
                </div>
                ${deleteButton("budgetCategory", category.id, category.name)}
              </div>
              <div class="category-metrics">
                <div class="category-stat category-budget-stat">
                  <span>Budget</span>
                  <div class="category-budget-input"><span aria-hidden="true">$</span><input id="category-${category.id}" type="number" inputmode="decimal" min="0" step="0.01" value="${categoryBudget}" data-category-amount="${category.id}" aria-label="${escapeHtml(category.name)} budget" /></div>
                </div>
                <div class="category-stat">
                  <span>Spent</span>
                  <strong>${formatCurrency(categorySpent, true)}</strong>
                </div>
                <div class="category-stat category-left">
                  <span>Left</span>
                  <strong>${formatCurrency(categoryRemaining, true)}</strong>
                </div>
              </div>
            </div>`;
        })
        .join("")
    : emptyState("No categories yet", "Add a rough budget category below.");

  expenseCategory.innerHTML = planner.budgetCategories.length
    ? planner.budgetCategories.map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join("")
    : `<option value="Other">Other</option>`;
  if ([...expenseCategory.options].some((option) => option.value === previousCategory)) expenseCategory.value = previousCategory;

  const rows = document.querySelector("#expense-list");
  rows.innerHTML = planner.expenses.length
    ? planner.expenses
        .map(
          (expense) => `
            <tr>
              <td>${escapeHtml(expense.description)}</td>
              <td>${escapeHtml(expense.category)}</td>
              <td class="number-cell">${formatCurrency(expense.amount, true)}</td>
              <td>${deleteButton("expense", expense.id, expense.description)}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="empty-state"><strong>No spending recorded</strong><span>Add the first purchase above.</span></td></tr>`;
}

function renderTraditions() {
  const list = document.querySelector("#traditions-list");
  list.innerHTML = planner.traditions.length
    ? planner.traditions
        .map((item) => `<li class="keepsake-item"><p>${escapeHtml(item.text)}</p>${deleteButton("traditions", item.id, item.text)}</li>`)
        .join("")
    : emptyState("Traditions belong here", "Add the moments your family looks forward to.");
}

function renderOutings() {
  const list = document.querySelector("#outings-list");
  list.innerHTML = planner.outings.length
    ? planner.outings
        .map(
          (item) => `
            <li class="check-row ${item.completed ? "completed" : ""}">
              <label>
                <input type="checkbox" data-toggle="outings" data-id="${item.id}" ${item.completed ? "checked" : ""} />
                <span class="check-copy"><strong>${escapeHtml(item.text)}</strong></span>
              </label>
              ${deleteButton("outings", item.id, item.text)}
            </li>`,
        )
        .join("")
    : emptyState("A season to explore", "Add a festive activity or place you would love to visit.");
}

function renderHomemade() {
  const list = document.querySelector("#homemade-list");
  list.innerHTML = planner.homemadeGifts.length
    ? planner.homemadeGifts
        .map((item) => `<article class="project-card"><span>Make this</span><p>${escapeHtml(item.text)}</p>${deleteButton("homemadeGifts", item.id, item.text)}</article>`)
        .join("")
    : emptyState("Nothing on the craft table", "Add a homemade gift you would enjoy making.");
}

function renderPlans() {
  document.querySelector("#christmas-eve-plan").value = planner.plans.eve || "";
  document.querySelector("#christmas-day-plan").value = planner.plans.day || "";
}

function renderAll() {
  updateCountdown(selectedYear);
  renderOverview();
  renderTasks();
  renderDecor();
  renderGifts();
  renderBudget();
  renderTraditions();
  renderOutings();
  renderHomemade();
  renderPlans();
}

function commit(message) {
  savePlanner();
  renderAll();
  if (message) showToast(message);
}

function setYearOptions() {
  for (let year = currentYear - 5; year <= currentYear + 7; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    option.selected = year === currentYear;
    yearSelect.append(option);
  }
}

setYearOptions();
renderAll();

yearSelect.addEventListener("change", () => {
  selectedYear = Number(yearSelect.value);
  planner = loadPlanner(selectedYear);
  renderAll();
  showToast(`${selectedYear} planner opened`);
});

document.querySelector("#todo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  planner.tasks.push({ id: makeId(), title: data.get("title").trim(), note: data.get("note").trim(), completed: false });
  event.currentTarget.reset();
  commit("Task added");
});

document.querySelectorAll("[data-list-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const listName = event.currentTarget.dataset.listForm;
    const text = new FormData(event.currentTarget).get("item").trim();
    planner[listName].push(createListItem(text));
    event.currentTarget.reset();
    commit("Idea saved");
  });
});

document.querySelector("#recipient-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name").trim();
  if (!name) return;

  const duplicate = planner.giftPeople.some((person) => person.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (duplicate) {
    showToast(`${name} is already on your list`);
    return;
  }

  const person = { id: makeId(), name, gifts: [] };
  planner.giftPeople.push(person);
  event.currentTarget.reset();
  commit(`${name} added to your gift list`);
  document.querySelector("#gift-person").value = person.id;
  document.querySelector("#gift-idea").focus();
});

document.querySelector("#gift-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const person = planner.giftPeople.find((item) => item.id === data.get("person"));
  if (!person) {
    showToast("Add a person before adding a gift idea");
    document.querySelector("#recipient-name").focus();
    return;
  }
  person.gifts.push({ id: makeId(), text: data.get("idea").trim(), purchased: false });
  event.currentTarget.querySelector("#gift-idea").value = "";
  commit("Gift idea saved");
});

document.querySelector("#category-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name").trim();
  if (!name) return;
  const duplicate = planner.budgetCategories.some((category) => category.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (duplicate) {
    showToast(`${name} already has a budget category`);
    return;
  }
  planner.budgetCategories.push({ id: makeId(), name, amount: Number(data.get("amount")) || 0 });
  event.currentTarget.reset();
  commit("Budget category added");
});

document.querySelector("#expense-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  planner.expenses.push({
    id: makeId(),
    description: data.get("description").trim(),
    category: data.get("category"),
    amount: Number(data.get("amount")) || 0,
  });
  event.currentTarget.reset();
  commit("Expense added");
});

document.querySelector("#overall-budget").addEventListener("change", (event) => {
  planner.overallBudget = Math.max(0, Number(event.target.value) || 0);
  commit("Overall budget updated");
});

document.querySelector("#clear-completed").addEventListener("click", () => {
  const completed = planner.tasks.filter((task) => task.completed).length;
  if (!completed) return;
  planner.tasks = planner.tasks.filter((task) => !task.completed);
  commit(`${completed} completed ${completed === 1 ? "task" : "tasks"} cleared`);
});

document.querySelectorAll("[data-plan]").forEach((textarea) => {
  textarea.addEventListener("input", (event) => {
    planner.plans[event.target.dataset.plan] = event.target.value;
    savePlanner();
  });
  textarea.addEventListener("change", () => showToast("Holiday plans saved"));
});

document.querySelector("#print-planner").addEventListener("click", () => window.print());

document.querySelector("#copy-previous-year").addEventListener("click", () => {
  const source = loadPlanner(selectedYear - 1);
  const hasStoredSource = localStorage.getItem(`${STORAGE_PREFIX}${selectedYear - 1}`);
  if (!hasStoredSource) {
    showToast(`No saved ${selectedYear - 1} planner found`);
    return;
  }

  const confirmed = window.confirm(`Copy reusable lists from ${selectedYear - 1} into ${selectedYear}? Current traditions, outings, decor ideas, gifts, and budget categories will be replaced.`);
  if (!confirmed) return;

  planner.decorIdeas = source.decorIdeas.map((item) => ({ ...item, id: makeId() }));
  planner.giftPeople = source.giftPeople.map((person) => ({
    ...person,
    id: makeId(),
    gifts: person.gifts.map((gift) => ({ ...gift, id: makeId(), purchased: false })),
  }));
  planner.budgetCategories = source.budgetCategories.map((item) => ({ ...item, id: makeId() }));
  planner.traditions = source.traditions.map((item) => ({ ...item, id: makeId(), completed: false }));
  planner.outings = source.outings.map((item) => ({ ...item, id: makeId(), completed: false }));
  planner.homemadeGifts = source.homemadeGifts.map((item) => ({ ...item, id: makeId(), completed: false }));
  commit(`Reusable ideas copied from ${selectedYear - 1}`);
});

document.querySelector("#export-planner").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(planner, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `christmas-planner-${selectedYear}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Planner backup downloaded");
});

document.querySelector("#import-planner").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    planner = normalizePlanner(imported, selectedYear);
    commit("Planner backup imported");
  } catch (error) {
    console.warn("Import failed", error);
    showToast("That backup could not be imported");
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#reset-planner").addEventListener("click", () => {
  const confirmed = window.confirm(`Reset the ${selectedYear} planner? This clears every change saved for this year.`);
  if (!confirmed) return;
  localStorage.removeItem(`${STORAGE_PREFIX}${selectedYear}`);
  planner = defaultPlanner(selectedYear);
  commit(`${selectedYear} planner reset`);
});

document.addEventListener("change", (event) => {
  const toggle = event.target.dataset.toggle;
  const id = event.target.dataset.id;

  if (toggle === "task") {
    const task = planner.tasks.find((item) => item.id === id);
    if (task) task.completed = event.target.checked;
    commit();
  }

  if (toggle === "outings") {
    const item = planner.outings.find((outing) => outing.id === id);
    if (item) item.completed = event.target.checked;
    commit();
  }

  if (toggle === "gift") {
    const person = planner.giftPeople.find((item) => item.id === event.target.dataset.personId);
    const gift = person?.gifts.find((item) => item.id === id);
    if (gift) gift.purchased = event.target.checked;
    commit();
  }

  if (event.target.matches("[data-category-amount]")) {
    const category = planner.budgetCategories.find((item) => item.id === event.target.dataset.categoryAmount);
    if (category) category.amount = Math.max(0, Number(event.target.value) || 0);
    commit("Category budget updated");
  }
});

document.addEventListener("click", (event) => {
  const jumpButton = event.target.closest("[data-jump]");
  if (jumpButton) document.querySelector(jumpButton.dataset.jump)?.scrollIntoView({ behavior: "smooth" });

  const personDeleteControl = event.target.closest("[data-delete-person]");
  if (personDeleteControl) {
    const person = planner.giftPeople.find((item) => item.id === personDeleteControl.dataset.deletePerson);
    if (person) {
      const shouldRemove = !person.gifts.length || window.confirm(`Remove ${person.name} and ${person.gifts.length} saved gift ${person.gifts.length === 1 ? "idea" : "ideas"}?`);
      if (shouldRemove) {
        planner.giftPeople = planner.giftPeople.filter((item) => item.id !== person.id);
        commit(`${person.name} removed from your gift list`);
      }
    }
  }

  const deleteControl = event.target.closest("[data-delete]");
  if (deleteControl) {
    const { delete: type, id, personId } = deleteControl.dataset;
    if (type === "gift") {
      const person = planner.giftPeople.find((item) => item.id === personId);
      if (person) person.gifts = person.gifts.filter((gift) => gift.id !== id);
    } else {
      const key = type === "task" ? "tasks" : type === "budgetCategory" ? "budgetCategories" : type === "expense" ? "expenses" : type;
      planner[key] = planner[key].filter((item) => item.id !== id);
    }
    commit("Item removed");
  }

  if (event.target.closest(".menu-button")) {
    const open = document.body.classList.toggle("nav-open");
    document.querySelector(".menu-button").setAttribute("aria-expanded", String(open));
  } else if (event.target.closest(".nav-link") || (document.body.classList.contains("nav-open") && !event.target.closest(".sidebar"))) {
    document.body.classList.remove("nav-open");
    document.querySelector(".menu-button").setAttribute("aria-expanded", "false");
  }
});

const observedSections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".nav-link")];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
  },
  { rootMargin: "-20% 0px -65%", threshold: [0.05, 0.25, 0.5] },
);
observedSections.forEach((section) => sectionObserver.observe(section));
