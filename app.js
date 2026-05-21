const STORAGE_KEY = "simple-todo.tasks";
const SUPABASE_TABLE = "tasks";

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const dateInput = document.querySelector("#date-input");
const calendarTitle = document.querySelector("#calendar-title");
const calendarGrid = document.querySelector("#calendar-grid");
const dayList = document.querySelector("#day-list");
const summary = document.querySelector("#summary");
const prevMonthButton = document.querySelector("#prev-month");
const nextMonthButton = document.querySelector("#next-month");

let tasks = [];
let selectedDate = toDateKey(new Date());
let visibleMonth = startOfMonth(parseDateKey(selectedDate));
let storageMode = isSupabaseConfigured() ? "cloud" : "local";

dateInput.value = selectedDate;
initialize();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  const task = {
    id: crypto.randomUUID(),
    text,
    dueDate: dateInput.value || selectedDate,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);
  input.value = "";
  dateInput.value = selectedDate;
  render();

  try {
    await createTask(task);
    await refreshTasks();
  } catch (error) {
    rollbackTask(task.id);
    showStorageError(error);
  }
});

prevMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  render();
});

nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  render();
});

calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".calendar-day");
  if (!button) return;

  selectedDate = button.dataset.date;
  dateInput.value = selectedDate;
  visibleMonth = startOfMonth(parseDateKey(selectedDate));
  render();
});

dayList.addEventListener("change", async (event) => {
  if (!event.target.matches(".task__check")) return;

  const id = event.target.closest(".task").dataset.id;
  const previousTasks = [...tasks];
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: event.target.checked } : task
  );
  render();

  try {
    await updateTask(id, { completed: event.target.checked });
  } catch (error) {
    tasks = previousTasks;
    showStorageError(error);
  }
});

dayList.addEventListener("click", async (event) => {
  if (!event.target.matches(".task__delete")) return;

  const id = event.target.closest(".task").dataset.id;
  const previousTasks = [...tasks];
  tasks = tasks.filter((task) => task.id !== id);
  render();

  try {
    await deleteTask(id);
  } catch (error) {
    tasks = previousTasks;
    showStorageError(error);
  }
});

async function initialize() {
  try {
    tasks = await loadTasks();
  } catch (error) {
    storageMode = "local";
    tasks = loadLocalTasks();
    console.warn("Supabase load failed. Falling back to localStorage.", error);
  }
  render();
}

async function refreshTasks() {
  tasks = await loadTasks();
  render();
}

function render() {
  renderCalendar();
  renderAgenda();

  const activeCount = tasks.filter((task) => !task.completed).length;
  const label = storageMode === "cloud" ? "\u30af\u30e9\u30a6\u30c9\u4fdd\u5b58" : "\u30d6\u30e9\u30a6\u30b6\u4fdd\u5b58";
  summary.textContent = `${activeCount}\u4ef6\u306e\u672a\u5b8c\u4e86 / ${tasks.length}\u4ef6\u30fb${label}`;
}

function renderCalendar() {
  calendarTitle.textContent = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(visibleMonth);

  const firstDay = startOfMonth(visibleMonth);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  const today = toDateKey(new Date());
  const taskCounts = countTasksByDate();
  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.dataset.date = key;
    button.setAttribute("aria-label", formatFullDate(key));

    if (date.getMonth() !== visibleMonth.getMonth()) button.classList.add("is-outside");
    if (key === today) button.classList.add("is-today");
    if (key === selectedDate) button.classList.add("is-selected");

    const number = document.createElement("span");
    number.className = "calendar-day__number";
    number.textContent = String(date.getDate());
    button.append(number);

    if (taskCounts[key]) {
      const dot = document.createElement("span");
      dot.className = "calendar-day__dot";
      dot.textContent = String(taskCounts[key]);
      button.append(dot);
    }

    days.push(button);
  }

  calendarGrid.replaceChildren(...days);
}

function renderAgenda() {
  const panels = [];

  for (let offset = 0; offset < 3; offset += 1) {
    const key = toDateKey(addDays(parseDateKey(selectedDate), offset));
    const panel = document.createElement("article");
    panel.className = "day-panel";

    const title = document.createElement("header");
    title.className = "day-panel__title";

    const date = document.createElement("span");
    date.className = "day-panel__date";
    date.textContent = formatShortDate(key);

    const weekday = document.createElement("span");
    weekday.className = "day-panel__weekday";
    weekday.textContent = formatWeekday(key);

    title.append(date, weekday);
    panel.append(title);

    const dayTasks = tasks
      .filter((task) => task.dueDate === key)
      .sort(compareTasks);

    if (dayTasks.length > 0) {
      const list = document.createElement("ul");
      list.className = "task-list";
      list.append(...dayTasks.map(createTaskItem));
      panel.append(list);
    } else {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "\u30bf\u30b9\u30af\u306f\u3042\u308a\u307e\u305b\u3093";
      panel.append(empty);
    }

    panels.push(panel);
  }

  dayList.replaceChildren(...panels);
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = `task${task.completed ? " is-completed" : ""}`;
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.className = "task__check";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `${task.text}\u3092\u5b8c\u4e86\u306b\u3059\u308b`);

  const text = document.createElement("span");
  text.className = "task__text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "task__delete";
  deleteButton.type = "button";
  deleteButton.textContent = "x";
  deleteButton.setAttribute("aria-label", `${task.text}\u3092\u524a\u9664`);

  item.append(checkbox, text, deleteButton);
  return item;
}

async function loadTasks() {
  if (storageMode === "cloud") {
    return fetchSupabaseTasks();
  }
  return loadLocalTasks();
}

async function createTask(task) {
  if (storageMode === "cloud") {
    await supabaseRequest("", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(toSupabaseTask(task)),
    });
    return;
  }
  saveLocalTasks(tasks);
}

async function updateTask(id, values) {
  if (storageMode === "cloud") {
    await supabaseRequest(`?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(toSupabaseTask(values)),
    });
    return;
  }
  saveLocalTasks(tasks);
}

async function deleteTask(id) {
  if (storageMode === "cloud") {
    await supabaseRequest(`?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return;
  }
  saveLocalTasks(tasks);
}

async function fetchSupabaseTasks() {
  const rows = await supabaseRequest("?select=*&order=created_at.desc");
  return rows.map(fromSupabaseTask);
}

async function supabaseRequest(query = "", options = {}) {
  const config = getSupabaseConfig();
  const headers = {
    apikey: config.anonKey,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (!config.anonKey.startsWith("sb_publishable_")) {
    headers.Authorization = `Bearer ${config.anonKey}`;
  }

  const response = await fetch(`${config.url}/rest/v1/${SUPABASE_TABLE}${query}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function toSupabaseTask(task) {
  const row = {};
  if ("id" in task) row.id = task.id;
  if ("text" in task) row.text = task.text;
  if ("dueDate" in task) row.due_date = task.dueDate;
  if ("completed" in task) row.completed = task.completed;
  if ("createdAt" in task) row.created_at = task.createdAt;
  return row;
}

function fromSupabaseTask(row) {
  return {
    id: row.id,
    text: row.text,
    dueDate: row.due_date,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

function rollbackTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  render();
}

function showStorageError(error) {
  console.error(error);
  alert("\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002Supabase\u306e\u8a2d\u5b9a\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  render();
}

function getSupabaseConfig() {
  return window.SUPABASE_CONFIG || {};
}

function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(
    config.url &&
      config.anonKey &&
      !config.url.includes("YOUR_SUPABASE_URL") &&
      !config.anonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

function loadLocalTasks() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map((task) => ({
      dueDate: selectedDate,
      createdAt: new Date().toISOString(),
      ...task,
    }));
  } catch {
    return [];
  }
}

function saveLocalTasks(nextTasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
}

function countTasksByDate() {
  return tasks.reduce((counts, task) => {
    if (!task.dueDate) return counts;
    counts[task.dueDate] = (counts[task.dueDate] || 0) + 1;
    return counts;
  }, {});
}

function compareTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFullDate(key) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(parseDateKey(key));
}

function formatShortDate(key) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(parseDateKey(key));
}

function formatWeekday(key) {
  return new Intl.DateTimeFormat("ja-JP", {
    weekday: "long",
  }).format(parseDateKey(key));
}
