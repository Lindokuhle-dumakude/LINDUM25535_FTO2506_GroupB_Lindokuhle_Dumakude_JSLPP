const STORAGE_KEY = "tasks";
const API_URL = "https://jsl-kanban-api.vercel.app/";

/**
 * Load tasks from localStorage.
 * @returns {Array<Object>} list of task objects or empty array
 */
function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse tasks from localStorage", error);
    return [];
  }
}

/**
 * Save tasks array into localStorage.
 * @param {Array<Object>} tasks
 */
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Fetch tasks from the remote API.
 * Falls back to an empty array if API request fails.
 * @async
 * @returns {Promise<Array<Object>>} Array of normalized task objects
 */
async function fetchInitialTasks() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    // Normalize tasks to ensure consistent structure
    return data.map((task, index) => ({
      id: task.id || index + 1,
      title: task.title || "Untitled Task",
      description: task.description || "",
      status: task.status || "todo",
    }));
  } catch (error) {
    console.error("Failed to fetch tasks from API:", error);
    return []; // fallback if fetch fails
  }
}

/**
 * Return the DOM container element for a status.
 * @param {"todo"|"doing"|"done"} status
 * @returns {HTMLElement|null}
 */
function getTaskContainer(status) {
  return document.querySelector(`.${status}-container`);
}

/**
 * Find a task in tasks array by id.
 * @param {Array<Object>} tasks
 * @param {number|string} id
 * @returns {Object|undefined}
 */
function findTaskById(tasks, id) {
  return tasks.find((t) => String(t.id) === String(id));
}

/**
 * Create a single task card element and attach click handler to open edit modal.
 * @param {Object} task
 * @param {number} task.id
 * @param {string} task.title
 * @param {string} task.description
 * @param {string} task.status
 * @returns {HTMLElement}
 */
function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "card";
  card.textContent = task.title;
  card.dataset.id = task.id;

  // open modal in edit mode when clicked
  card.addEventListener("click", () => {
    openTaskModal(task);
  });

  return card;
}

/**
 * Render all tasks into their appropriate columns and update counts.
 * @param {Array<Object>} tasks
 */
function renderTasks(tasks) {
  // clear containers
  ["todo", "doing", "done"].forEach((status) => {
    const container = getTaskContainer(status);
    if (container) container.innerHTML = "";
  });

  // create and append cards
  tasks.forEach((task) => {
    const container = getTaskContainer(task.status);
    if (container) {
      const card = createTaskCard(task);
      container.appendChild(card);
    } else {
      console.warn("Missing container for status:", task.status);
    }
  });

  updateColumnCounts(tasks);
}

/**
 * Update the column heading counts (TODO / DOING / DONE).
 * @param {Array<Object>} tasks
 */
function updateColumnCounts(tasks) {
  const map = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const todoHeading = document.querySelector(".todo-heading");
  const doingHeading = document.querySelector(".doing-heading");
  const doneHeading = document.querySelector(".done-heading");

  if (todoHeading) todoHeading.textContent = `TODO (${map.todo})`;
  if (doingHeading) doingHeading.textContent = `DOING (${map.doing})`;
  if (doneHeading) doneHeading.textContent = `DONE (${map.done})`;
}

/**
 * Open modal. If `task` is provided, open in Edit mode. If null, open Add mode.
 * If task provided in edit mode show delete button. If null, in add mode hide delete button.
 * @param {Object|null} task
 */
function openTaskModal(task = null) {
  const modal = document.getElementById("taskModal");
  if (!modal) return;

  // populate fields
  const modalTitle = document.getElementById("modalTitle");
  const idField = document.getElementById("taskId");
  const titleField = document.getElementById("taskTitle");
  const descField = document.getElementById("taskDescription");
  const statusField = document.getElementById("taskStatus");
  const submitBtn = modal.querySelector(".submit-btn");
  const deleteBtn = document.getElementById("deleteTaskBtn");

  if (task) {
    modalTitle.textContent = "Edit Task";
    idField.value = task.id;
    titleField.value = task.title;
    descField.value = task.description || "";
    statusField.value = task.status;
    submitBtn.textContent = "Save Changes";
    deleteBtn.style.display = "block";
  } else {
    modalTitle.textContent = "Add New Task";
    idField.value = "";
    titleField.value = "";
    descField.value = "";
    statusField.value = "todo";
    submitBtn.textContent = "Create Task";
    deleteBtn.style.display = "none"; // hides delete button in add mode
  }

  modal.classList.add("show");
  // focus title
  titleField.focus();
}

/**
 * Handle deleting a task by ID with confirmation
 * @param {Array<Object>} tasksRef
 */
function setupDeleteHandler(tasksRef) {
  const deleteBtn = document.getElementById("deleteTaskBtn");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", () => {
    const idField = document.getElementById("taskId");
    const taskId = idField.value;

    if (!taskId) return; // nothing to delete in add mode

    if (confirm("Are you sure you want to delete this task?")) {
      const index = tasksRef.findIndex((t) => String(t.id) === String(taskId));
      if (index > -1) {
        tasksRef.splice(index, 1); // remove task
        saveTasks(tasksRef);
        renderTasks(tasksRef);
        closeTaskModal();
      }
    }
  });
}

/** Close modal */
function closeTaskModal() {
  const modal = document.getElementById("taskModal");
  if (!modal) return;
  modal.classList.remove("show");
}

/**
 * Handle form submit for add/edit task.
 * - If taskId exists, update existing task
 * - Otherwise create new task with unique id
 * @param {Event} e
 * @param {Array<Object>} tasksRef (array reference to mutate)
 */
function handleFormSubmit(e, tasksRef) {
  e.preventDefault();

  const idField = document.getElementById("taskId");
  const titleField = document.getElementById("taskTitle");
  const descField = document.getElementById("taskDescription");
  const statusField = document.getElementById("taskStatus");

  const title = titleField.value.trim();
  const description = descField.value.trim();
  const status = statusField.value;

  // Validate title
  if (!title) {
    alert("Please enter a task title.");
    titleField.focus();
    return;
  }

  const taskId = idField.value;

  if (taskId) {
    // edit existing
    const task = findTaskById(tasksRef, taskId);
    if (task) {
      task.title = title;
      task.description = description;
      task.status = status;
    } else {
      console.warn("Tried to edit non-existent task id:", taskId);
    }
  } else {
    // create new
    const newTask = {
      id: Date.now(), // simple unique id
      title,
      description,
      status,
    };
    tasksRef.push(newTask);
  }

  // persist and re-render
  saveTasks(tasksRef);
  renderTasks(tasksRef);
  closeTaskModal();
}

/**
 * Toggle sidebar visibility
 * @param {boolean} isVisible - true to show, false to hide
 * Save preference to local storage.
 */
function toggleSidebar(isVisible) {
  const sidebar = document.querySelector(".kanban-sidebar");
  const hideBtn = document.querySelector(".hide-sidebar-btn");
  const showBtn = document.querySelector(".show-sidebar-btn");

  if (!sidebar || !hideBtn || !showBtn) return;

  if (isVisible) {
    sidebar.style.display = "block";
    hideBtn.style.display = "inline-block";
    showBtn.style.display = "none";
  } else {
    sidebar.style.display = "none";
    hideBtn.style.display = "none";
    showBtn.style.display = "inline-block";
  }

  localStorage.setItem("sidebarVisible", JSON.stringify(isVisible));
}

/**
 * Setup sidebar buttons for hiding/showing
 * Load saved state from localStorage on page load.
 */
function setupSidebarInteraction() {
  const hideBtn = document.querySelector(".hide-sidebar-btn");
  const showBtn = document.querySelector(".show-sidebar-btn");

  if (hideBtn) {
    hideBtn.addEventListener("click", () => toggleSidebar(false));
  }
  if (showBtn) {
    showBtn.addEventListener("click", () => toggleSidebar(true));
  }

  const savedState = JSON.parse(localStorage.getItem("sidebarVisible"));
  if (savedState === false) {
    toggleSidebar(false);
  } else {
    toggleSidebar(true);
  }
}

/**
 * Updates the Kanban board logo based on the selected theme.
 *
 * @param {"light"|"dark"} theme - The current theme.
 * Use "dark" to set dark logo, "light" for light logo.
 */
function updateLogo(theme) {
  const desktopLogo = document.getElementById("kanbanLogo");
  const mobileLogo = document.querySelector(".menu-toggle");

  if (desktopLogo) {
    desktopLogo.src =
      theme === "dark"
        ? desktopLogo.dataset.logoDark
        : desktopLogo.dataset.logoLight;
  }

  if (mobileLogo) {
    mobileLogo.src =
      theme === "dark"
        ? mobileLogo.dataset.logoDark
        : mobileLogo.dataset.logoLight;
  }
}

function setupThemeToggle() {
  const desktopToggle = document.getElementById("themeToggle");
  const mobileToggle = document.getElementById("themeToggleMobile");
  const body = document.body;

  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "light";

  // Apply saved theme
  if (savedTheme === "dark") {
    body.classList.add("dark");
    if (desktopToggle) desktopToggle.checked = true;
    if (mobileToggle) mobileToggle.checked = true;
  } else {
    body.classList.remove("dark");
    if (desktopToggle) desktopToggle.checked = false;
    if (mobileToggle) mobileToggle.checked = false;
  }

  // Set logo based on saved theme
  updateLogo(savedTheme);

  function toggleTheme(isDark) {
    const theme = isDark ? "dark" : "light";

    if (isDark) body.classList.add("dark");
    else body.classList.remove("dark");

    localStorage.setItem("theme", theme);

    // Update logo
    updateLogo(theme);

    // Keep both toggles in sync
    if (desktopToggle) desktopToggle.checked = isDark;
    if (mobileToggle) mobileToggle.checked = isDark;
  }

  if (desktopToggle)
    desktopToggle.addEventListener("change", (e) =>
      toggleTheme(e.target.checked)
    );
  if (mobileToggle)
    mobileToggle.addEventListener("change", (e) =>
      toggleTheme(e.target.checked)
    );
}

/**
 * Set up modal event listeners: close button, backdrop click, add buttons, and form submit.
 * @param {Array<Object>} tasksRef
 */
function setupModalEventListeners(tasksRef) {
  const modal = document.getElementById("taskModal");
  const closeBtn = modal?.querySelector(".close-btn");
  const form = document.getElementById("taskForm");

  if (closeBtn) closeBtn.addEventListener("click", closeTaskModal);

  // click on backdrop -> close
  window.addEventListener("click", (ev) => {
    if (ev.target === modal) closeTaskModal();
  });

  // Escape key closes modal
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeTaskModal();
  });

  // Add task buttons
  const addBtn = document.querySelector(".addTask-btn");
  const addBtnMobile = document.getElementById("mobileAddTask-btn");
  if (addBtn) addBtn.addEventListener("click", () => openTaskModal(null));
  if (addBtnMobile)
    addBtnMobile.addEventListener("click", () => openTaskModal(null));

  // form submit
  if (form)
    form.addEventListener("submit", (e) => handleFormSubmit(e, tasksRef));
}

/**
 * Initialize the Task Board application once the DOM is fully loaded.
 * - Loads tasks from localStorage if available.
 * - If empty, fetches from API.
 * - Renders tasks into their respective columns.
 * - Sets up modal and form event listeners.
 */

document.addEventListener("DOMContentLoaded", async () => {
  let tasks = loadTasks();

  // Show loading message
  const main = document.querySelector("main");
  let loadingEl;
  if (main) {
    loadingEl = document.createElement("p");
    loadingEl.className = "loading";
    loadingEl.textContent = "Loading tasks...";
    main.appendChild(loadingEl);
  }

  // If no tasks in localStorage, fetch from API
  if (!tasks || tasks.length === 0) {
    tasks = await fetchInitialTasks();
    saveTasks(tasks);
  }

  // Remove loading message safely
  if (loadingEl) loadingEl.remove();

  // initial render
  renderTasks(tasks);

  // Wire up modal + delete + sidebar handlers
  setupModalEventListeners(tasks);
  setupDeleteHandler(tasks);
  setupSidebarInteraction();
  setupThemeToggle();
});
