// Assumes you have: export const initialTasks = [...] in js/initialData.js
import { initialTasks } from "./initialData.js";

const STORAGE_KEY = "tasks";

/**
 * Load tasks from localStorage. If none are saved, fall back to initialTasks.
 * @returns {Array<Object>} list of task objects
 */
function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...initialTasks]; // return copy of initial tasks
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse tasks from localStorage", error);
    return [...initialTasks];
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

  if (task) {
    modalTitle.textContent = "Edit Task";
    idField.value = task.id;
    titleField.value = task.title;
    descField.value = task.description || "";
    statusField.value = task.status;
    submitBtn.textContent = "Save Task";
  } else {
    modalTitle.textContent = "Add New Task";
    idField.value = "";
    titleField.value = "";
    descField.value = "";
    statusField.value = "todo";
    submitBtn.textContent = "Create Task";
  }

  modal.classList.add("show");
  // focus title
  titleField.focus();
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
 * - Loads tasks from localStorage (or fallback initial data).
 * - Renders tasks into their respective columns.
 * - Sets up modal and form event listeners with a reference to tasks array.
 * - Optionally exposes the tasks array globally for debugging.
 */

document.addEventListener("DOMContentLoaded", () => {
  // load tasks into memory
  const tasks = loadTasks();

  // initial render
  renderTasks(tasks);

  // modal + form wiring (pass tasks array reference)
  setupModalEventListeners(tasks);
});
