const API = "";
const DEFAULT_PASSWORD = "Sol@1234";
const SESSION_KEY = "sol-equipes-user";
const colors = ["#0a3764", "#f4b400", "#266f55", "#b85d3f", "#4f6ea8", "#7a5e9a"];
const weekdays = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
const weekdayLabels = { Domingo: "Domingo", Segunda: "Segunda", Terca: "Terça", Quarta: "Quarta", Quinta: "Quinta", Sexta: "Sexta", Sabado: "Sábado" };

let state = { people: [], groups: [], chatRooms: [], chats: {}, schedules: {} };
let currentUser = null;
let currentView = "dashboard";
let selectedChatRoom = "";
let photoDraft = "";
let lastMessageStamp = 0;
let pollTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

async function api(path, options = {}) {
  // Converte /api/rota → api.php?path=rota (compatível com Hostinger sem mod_rewrite)
  const url = path.startsWith("/api/")
    ? `${API}api.php?path=${path.slice(5)}`
    : `${API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-user-id": currentUser?.id || "",
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const message = await response.text();
    throw new Error(cleanServerError(message, response.status));
  }
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(cleanServerError(text, response.status));
  }
  return response.json();
}

function cleanServerError(message, status) {
  const text = String(message || "").trim();
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
    return `A API do sistema não está ativa no servidor web. Rota retornou HTML/erro ${status}. Publique também o arquivo api.php e o .htaccess atualizado.`;
  }
  return text || `Erro ${status} no servidor`;
}

async function loadPublicPeople() {
  const people = await api("/api/people-public");
  $("#loginPerson").innerHTML = people.map((person) => `<option value="${person.id}" data-user="${escapeHtml(person.username)}">${escapeHtml(person.name)}</option>`).join("");
  const saved = localStorage.getItem(SESSION_KEY);
  if (saved && people.some((person) => person.id === saved)) $("#loginPerson").value = saved;
  fillLoginUser();
}

function fillLoginUser() {
  const selected = $("#loginPerson").selectedOptions[0];
  $("#loginUser").value = selected?.dataset.user || "";
}

async function login(event) {
  event.preventDefault();
  try {
    currentUser = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        personId: $("#loginPerson").value,
        username: $("#loginUser").value.trim(),
        password: $("#loginPassword").value
      })
    });
    localStorage.setItem(SESSION_KEY, currentUser.id);
    $("#loginScreen").classList.add("is-hidden");
    $("#appShell").classList.remove("is-hidden");
    await loadState();
    applyPermissions();
    navTo("dashboard");
    startPolling();
  } catch (error) {
    alert(`Não foi possível entrar: ${error.message}`);
  }
}

async function loadState(silent = false) {
  const previousLatest = latestMessageStamp();
  state = await api("/api/state");
  ensureSelectedRoom();
  $("#storageStatus").textContent = `Sincronizado ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (!silent) render();
  const nextLatest = latestMessageStamp();
  if (silent && previousLatest && nextLatest > previousLatest) notifyNewMessage();
  lastMessageStamp = nextLatest;
}

function ensureSelectedRoom() {
  const available = state.chatRooms || [];
  if (!available.some((room) => room.id === selectedChatRoom)) selectedChatRoom = available[0]?.id || "";
}

function applyPermissions() {
  const gestor = isGestor();
  $$(".gestor-only").forEach((node) => node.classList.toggle("is-hidden", !gestor));
  $("#currentUserLabel").textContent = `${currentUser.name} · ${gestor ? "Gestor" : "Colaborador"}`;
  if (!gestor && currentView === "settings") navTo("dashboard");
}

function isGestor() {
  return currentUser?.userType === "gestor";
}

function groupById(id) {
  return state.groups.find((group) => group.id === id);
}

function personById(id) {
  return state.people.find((person) => person.id === id);
}

function peopleInGroup(groupId) {
  return state.people.filter((person) => person.groupId === groupId && person.active);
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function avatar(person) {
  if (person.photo) return `<img class="avatar" src="${person.photo}" alt="Foto de ${escapeHtml(person.name)}" />`;
  return `<div class="avatar initials" aria-hidden="true">${initials(person.name)}</div>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function normalizePhone(value = "") {
  return value.replace(/\D/g, "");
}

function parsePhones(value = "") {
  return value.split(/[,\n;]/).map((phone) => normalizePhone(phone)).filter(Boolean);
}

function parseAvailability(value = "") {
  const normalized = value
    .replace(/terça/gi, "Terca")
    .replace(/sábado/gi, "Sabado")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"];
}

function navTo(view) {
  if (view === "settings" && !isGestor()) return;
  currentView = view;
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === view));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $("#viewTitle").textContent = { dashboard: "Visão geral", org: "Organograma", people: "Funcionários", admin: "Cadastro", schedule: "Escala", chat: "Chat", settings: "Configurações" }[view];
  render();
}

function emptyNode() {
  return $("#emptyTemplate").content.firstElementChild.cloneNode(true);
}

function setEmpty(container) {
  container.innerHTML = "";
  container.append(emptyNode());
}

function render() {
  populateSelectors();
  renderDashboard();
  renderOrg();
  renderPeople();
  renderGroupsAdmin();
  renderSchedule();
  renderChat();
  applyPermissions();
}

function populateSelectors() {
  const groupOptions = [`<option value="all">Todos os grupos</option>`, ...state.groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)].join("");
  ["#orgGroupFilter", "#peopleGroupFilter"].forEach((selector) => {
    const old = $(selector).value;
    $(selector).innerHTML = groupOptions;
    $(selector).value = state.groups.some((group) => group.id === old) || old === "all" ? old : "all";
  });

  ["#groupInput", "#scheduleGroup"].forEach((selector) => {
    const old = $(selector).value;
    $(selector).innerHTML = state.groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join("");
    if (state.groups.some((group) => group.id === old)) $(selector).value = old;
  });

  const vipOptions = state.people
    .filter((person) => person.isVip || !person.managerId || person.userType === "gestor")
    .map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`)
    .join("");
  $("#groupVipInput").innerHTML = vipOptions || `<option value="">Cadastre um VIP</option>`;

  const selectedId = $("#personId").value;
  $("#managerInput").innerHTML = [
    `<option value="">Sem superior / topo</option>`,
    ...state.people
      .filter((person) => person.id !== selectedId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((person) => `<option value="${person.id}">${escapeHtml(person.name)} - ${escapeHtml(person.role)}</option>`)
  ].join("");
}

function renderDashboard() {
  $("#metrics").innerHTML = [
    ["Funcionários", state.people.length],
    ["Ativos", state.people.filter((person) => person.active).length],
    ["Grupos", state.groups.length],
    ["Chats liberados", state.chatRooms.length]
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");

  const groupBoard = $("#groupBoard");
  if (!state.groups.length) return setEmpty(groupBoard);
  groupBoard.innerHTML = state.groups.map((group) => {
    const vip = personById(group.vipId);
    return `
      <article class="group-card">
        <span class="group-color" style="background:${group.color}"></span>
        <div>
          <strong>${escapeHtml(group.name)}</strong>
          <p>VIP: ${vip ? escapeHtml(vip.name) : "Não definido"} · ${peopleInGroup(group.id).length} integrantes</p>
        </div>
        <button class="ghost small" data-open-group="${group.id}" type="button">Ver</button>
      </article>
    `;
  }).join("");

  const recent = [...state.people].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const list = $("#recentPeople");
  if (!recent.length) return setEmpty(list);
  list.innerHTML = recent.map((person) => `
    <button class="compact-person" data-person="${person.id}" type="button">
      <div class="avatar-line">${avatar(person)}<div><strong>${escapeHtml(person.name)}</strong><p>${escapeHtml(person.role)} · ${escapeHtml(groupById(person.groupId)?.name || "Sem grupo")}</p></div></div>
    </button>
  `).join("");
}

function filteredPeople(prefix) {
  const group = $(`#${prefix}GroupFilter`)?.value || "all";
  const search = ($(`#${prefix}Search`)?.value || "").toLowerCase();
  return state.people.filter((person) => {
    const haystack = [person.name, person.role, person.email, person.address, person.summary, ...(person.phones || [])].join(" ").toLowerCase();
    return (group === "all" || person.groupId === group) && haystack.includes(search);
  });
}

function renderOrg() {
  const chart = $("#orgChart");
  const people = filteredPeople("org");
  if (!people.length) return setEmpty(chart);
  const ids = new Set(people.map((person) => person.id));
  const roots = people.filter((person) => !person.managerId || !ids.has(person.managerId));
  const levels = [];
  const queue = roots.map((person) => ({ person, level: 0 }));
  const visited = new Set();

  while (queue.length) {
    const { person, level } = queue.shift();
    if (visited.has(person.id)) continue;
    visited.add(person.id);
    levels[level] ||= [];
    levels[level].push(person);
    people
      .filter((candidate) => candidate.managerId === person.id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .forEach((child) => queue.push({ person: child, level: level + 1 }));
  }
  people.filter((person) => !visited.has(person.id)).forEach((person) => {
    levels[levels.length] ||= [];
    levels[levels.length - 1].push(person);
  });

  chart.innerHTML = levels.map((level) => `<div class="org-level">${level.map((person) => personCard(person)).join("")}</div>`).join("");
}

function personCard(person) {
  const group = groupById(person.groupId);
  return `
    <button class="person-card" data-person="${person.id}" type="button">
      <div class="avatar-line">${avatar(person)}<div><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.role)}</span></div></div>
      <span class="badge" style="border-left:4px solid ${group?.color || "#0a3764"}">${person.isVip ? "VIP" : escapeHtml(group?.name || "Sem grupo")}</span>
    </button>
  `;
}

function renderPeople() {
  const container = $("#peopleList");
  let people = filteredPeople("people");
  if ($("#peopleSort").value === "group") {
    people = people.sort((a, b) => `${groupById(a.groupId)?.name || ""}${a.name}`.localeCompare(`${groupById(b.groupId)?.name || ""}${b.name}`, "pt-BR"));
  } else {
    people = people.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
  if (!people.length) return setEmpty(container);
  container.innerHTML = people.map((person) => `
    <article class="person-row">
      ${avatar(person)}
      <div>
        <strong>${escapeHtml(person.name)}</strong>
        <p>${escapeHtml(person.role)} · ${escapeHtml(groupById(person.groupId)?.name || "Sem grupo")}</p>
        <div class="person-actions">
          <button class="ghost small" data-person="${person.id}" type="button">Resumo</button>
          <button class="ghost small gestor-only" data-edit="${person.id}" type="button">Editar</button>
          ${person.phones?.[0] ? `<a class="action-link" href="tel:${person.phones[0]}">Ligar</a>` : ""}
          ${person.whatsapp ? `<a class="action-link" target="_blank" rel="noreferrer" href="https://wa.me/55${normalizePhone(person.whatsapp)}">WhatsApp</a>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

function renderGroupsAdmin() {
  const container = $("#adminGroupList");
  if (!state.groups.length) return setEmpty(container);
  container.innerHTML = state.groups.map((group) => `
    <article class="group-config">
      <input value="${escapeHtml(group.name)}" data-group-name="${group.id}" />
      <select data-group-vip="${group.id}">
        ${state.people.map((person) => `<option value="${person.id}" ${person.id === group.vipId ? "selected" : ""}>${escapeHtml(person.name)}</option>`).join("")}
      </select>
      <div class="config-line"><span class="badge" style="border-left:4px solid ${group.color}">${peopleInGroup(group.id).length} pessoas</span></div>
      <div class="person-actions">
        <button class="primary small" data-save-group="${group.id}" type="button">Salvar grupo</button>
        <button class="ghost small" data-open-group="${group.id}" type="button">Organograma</button>
        <button class="danger ghost small" data-delete-group="${group.id}" type="button">Excluir grupo</button>
      </div>
    </article>
  `).join("");
}

function renderSchedule() {
  const groupId = $("#scheduleGroup").value || state.groups[0]?.id;
  const month = $("#scheduleMonth").value || new Date().toISOString().slice(0, 7);
  const container = $("#scheduleGrid");
  if (!groupId) return setEmpty(container);
  const schedule = state.schedules[groupId]?.[month] || buildBlankMonth(month);
  const team = peopleInGroup(groupId);
  const blanks = new Date(`${month}-01T12:00:00`).getDay();
  const cells = Array.from({ length: blanks }, () => `<div class="calendar-cell muted-cell"></div>`);

  schedule.forEach((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    cells.push(`
      <article class="calendar-cell">
        <header><strong>${date.getDate()}</strong><span>${weekdayLabels[weekdays[date.getDay()]]}</span></header>
        <select multiple data-schedule-date="${entry.date}">
          ${team.map((person) => `<option value="${person.id}" ${entry.assignments?.includes(person.id) ? "selected" : ""}>${escapeHtml(person.name)} · ${escapeHtml(person.period || "")}</option>`).join("")}
        </select>
      </article>
    `);
  });
  container.innerHTML = `<div class="calendar-weekdays">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`;
}

function buildBlankMonth(month) {
  const first = new Date(`${month}-01T12:00:00`);
  const entries = [];
  const cursor = new Date(first);
  while (cursor.getMonth() === first.getMonth()) {
    entries.push({ date: cursor.toISOString().slice(0, 10), assignments: [] });
    cursor.setDate(cursor.getDate() + 1);
  }
  return entries;
}

function collectScheduleFromDom() {
  const month = $("#scheduleMonth").value;
  return $$("[data-schedule-date]").map((select) => ({
    date: select.dataset.scheduleDate,
    assignments: [...select.selectedOptions].map((option) => option.value)
  })).filter((entry) => entry.date.startsWith(month));
}

function renderChat() {
  const rooms = state.chatRooms || [];
  $("#chatRooms").innerHTML = rooms.map((room) => `<button class="chat-room ${selectedChatRoom === room.id ? "active" : ""}" data-room="${room.id}" type="button">${escapeHtml(room.name)}</button>`).join("");
  $("#chatTitle").textContent = rooms.find((room) => room.id === selectedChatRoom)?.name || "Chat";
  const messages = state.chats[selectedChatRoom] || [];
  const container = $("#chatMessages");
  if (!messages.length) return setEmpty(container);
  container.innerHTML = messages.map((message) => `
    <article class="message ${message.authorId === currentUser?.id ? "own-message" : ""}">
      <header><strong>${escapeHtml(message.author || "Anônimo")}</strong><span>${new Date(message.at).toLocaleString("pt-BR")}</span></header>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `).join("");
  container.scrollTop = container.scrollHeight;
}

function openPerson(id) {
  const person = personById(id);
  if (!person) return;
  const manager = personById(person.managerId);
  const phones = person.phones || [];
  $("#personDetails").innerHTML = `
    <div class="detail-wrap" id="summaryCard">
      <div class="detail-head">${avatar(person)}<div><p class="eyebrow">${person.isVip ? "VIP / diretor do fluxo" : escapeHtml(groupById(person.groupId)?.name || "Sem grupo")}</p><h2>${escapeHtml(person.name)}</h2><p>${escapeHtml(person.role)}</p></div></div>
      <div class="detail-grid">
        <div class="detail-item"><span>Telefones</span><p>${phones.length ? phones.map(escapeHtml).join(", ") : "Não informado"}</p></div>
        <div class="detail-item"><span>WhatsApp</span><p>${escapeHtml(person.whatsapp || "Não informado")}</p></div>
        <div class="detail-item"><span>Superior</span><p>${manager ? escapeHtml(manager.name) : "Topo da hierarquia"}</p></div>
        <div class="detail-item"><span>Escala</span><p>${escapeHtml(person.period || "Sem período")} · ${(person.availability || []).map((day) => weekdayLabels[day] || day).join(", ")}</p></div>
        <div class="detail-item"><span>E-mail</span><p>${escapeHtml(person.email || "Não informado")}</p></div>
        <div class="detail-item"><span>Endereço</span><p>${escapeHtml(person.address || "Não informado")}</p></div>
      </div>
      <div class="detail-item"><span>Resumo</span><p>${escapeHtml(person.summary || "Sem resumo cadastrado")}</p></div>
      <div class="dialog-actions">
        ${phones.map((phone) => `<a class="action-link" href="tel:${phone}">Ligar ${phone}</a>`).join("")}
        ${person.whatsapp ? `<a class="action-link" target="_blank" rel="noreferrer" href="https://wa.me/55${normalizePhone(person.whatsapp)}">Mensagem WhatsApp</a>` : ""}
        <button class="ghost gestor-only" data-edit="${person.id}" type="button">Editar cadastro</button>
        <button class="ghost" data-export-summary="${person.id}" type="button">Exportar JPG</button>
      </div>
    </div>
  `;
  $("#personDialog").showModal();
  applyPermissions();
}

function editPerson(id) {
  const person = personById(id);
  if (!person || !isGestor()) return;
  photoDraft = person.photo || "";
  $("#formTitle").textContent = "Editar funcionário";
  $("#personId").value = person.id;
  $("#photoPreview").src = photoDraft || "";
  $("#nameInput").value = person.name;
  $("#roleInput").value = person.role;
  $("#groupInput").value = person.groupId;
  populateSelectors();
  $("#managerInput").value = person.managerId || "";
  $("#phonesInput").value = (person.phones || []).join(", ");
  $("#whatsappInput").value = person.whatsapp || "";
  $("#emailInput").value = person.email || "";
  $("#periodInput").value = person.period || "";
  $("#usernameInput").value = person.username || slugUser(person.name);
  $("#passwordInput").value = "";
  $("#userTypeInput").value = person.userType || "colaborador";
  $("#addressInput").value = person.address || "";
  $("#availabilityInput").value = (person.availability || []).map((day) => weekdayLabels[day] || day).join(", ");
  $("#summaryInput").value = person.summary || "";
  $("#vipInput").checked = Boolean(person.isVip);
  $("#activeInput").checked = Boolean(person.active);
  $("#deletePerson").style.visibility = "visible";
  $("#personDialog").close();
  navTo("admin");
}

function clearForm() {
  $("#personForm").reset();
  $("#formTitle").textContent = "Novo funcionário";
  $("#personId").value = "";
  $("#photoPreview").src = "";
  $("#passwordInput").placeholder = DEFAULT_PASSWORD;
  photoDraft = "";
  $("#activeInput").checked = true;
  $("#deletePerson").style.visibility = "hidden";
  populateSelectors();
}

function slugUser(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
}

async function savePerson(event) {
  event.preventDefault();
  if (!isGestor()) return;
  const id = $("#personId").value || uid("person");
  const existing = personById(id);
  const person = {
    id,
    name: $("#nameInput").value.trim(),
    role: $("#roleInput").value.trim(),
    groupId: $("#groupInput").value,
    managerId: $("#managerInput").value,
    phones: parsePhones($("#phonesInput").value),
    whatsapp: normalizePhone($("#whatsappInput").value),
    email: $("#emailInput").value.trim(),
    address: $("#addressInput").value.trim(),
    availability: parseAvailability($("#availabilityInput").value),
    period: $("#periodInput").value.trim() || "08:00-17:00",
    username: $("#usernameInput").value.trim() || slugUser($("#nameInput").value.trim()),
    password: $("#passwordInput").value || existing?.password || DEFAULT_PASSWORD,
    userType: $("#userTypeInput").value,
    summary: $("#summaryInput").value.trim(),
    photo: photoDraft,
    isVip: $("#vipInput").checked,
    active: $("#activeInput").checked,
    createdAt: existing?.createdAt || Date.now()
  };
  if (!person.name || !person.role) return;
  await api("/api/people", { method: "PUT", body: JSON.stringify(person) });
  await loadState();
  clearForm();
  navTo("people");
}

async function deletePerson() {
  const id = $("#personId").value;
  if (!id || !isGestor()) return;
  await api(`/api/people/${id}`, { method: "DELETE" });
  await loadState();
  clearForm();
}

async function addGroup(event) {
  event.preventDefault();
  if (!isGestor()) return;
  const name = $("#groupNameInput").value.trim();
  if (!name) return;
  await api("/api/groups", { method: "PUT", body: JSON.stringify({ id: uid("group"), name, vipId: $("#groupVipInput").value, color: colors[state.groups.length % colors.length] }) });
  $("#groupForm").reset();
  await loadState();
}

async function saveGroup(id) {
  const group = groupById(id);
  if (!group || !isGestor()) return;
  await api("/api/groups", {
    method: "PUT",
    body: JSON.stringify({
      ...group,
      name: $(`[data-group-name="${id}"]`).value.trim(),
      vipId: $(`[data-group-vip="${id}"]`).value
    })
  });
  await loadState();
}

async function deleteGroup(id) {
  if (!isGestor()) return;
  if (peopleInGroup(id).length) return alert("Remova ou transfira os funcionários antes de excluir o grupo.");
  await api(`/api/groups/${id}`, { method: "DELETE" });
  await loadState();
}

async function generateSchedule() {
  const groupId = $("#scheduleGroup").value;
  const month = $("#scheduleMonth").value;
  await api("/api/schedules/generate", { method: "POST", body: JSON.stringify({ groupId, month }) });
  await loadState();
}

async function saveSchedule() {
  const groupId = $("#scheduleGroup").value;
  const month = $("#scheduleMonth").value;
  await api("/api/schedules", { method: "PUT", body: JSON.stringify({ groupId, month, entries: collectScheduleFromDom() }) });
  await loadState();
}

async function sendMessage(event) {
  event.preventDefault();
  const text = $("#chatInput").value.trim();
  if (!text || !selectedChatRoom) return;
  await api("/api/chats/message", { method: "POST", body: JSON.stringify({ roomId: selectedChatRoom, text }) });
  $("#chatInput").value = "";
  await loadState();
}

function latestMessageStamp() {
  return Math.max(0, ...Object.values(state.chats || {}).flat().map((message) => message.at || 0));
}

function notifyNewMessage() {
  // Toca o som
  playMessageSound();

  // Descobre a última mensagem nova
  let latestMsg = null;
  let latestRoom = null;
  let latestAt = 0;
  for (const [roomId, msgs] of Object.entries(state.chats || {})) {
    for (const m of (msgs || [])) {
      if ((m.at || 0) > latestAt && m.authorId !== currentUser?.id) {
        latestAt = m.at || 0;
        latestMsg = m;
        latestRoom = roomId;
      }
    }
  }

  const roomName = state.chatRooms?.find(r => r.id === latestRoom)?.name || "Chat";
  const authorName = latestMsg?.authorName || "Alguém";
  const msgText = latestMsg?.text || "Nova mensagem";

  // Remove pop-up anterior se existir
  const old = document.getElementById("chatPopup");
  if (old) old.remove();

  // Cria o pop-up
  const popup = document.createElement("div");
  popup.id = "chatPopup";
  popup.innerHTML = `
    <div id="chatPopupInner">
      <div id="chatPopupIcon">💬</div>
      <div id="chatPopupBody">
        <div id="chatPopupRoom">${escapeHtml(roomName)}</div>
        <div id="chatPopupAuthor">${escapeHtml(authorName)}</div>
        <div id="chatPopupText">${escapeHtml(msgText.slice(0, 80))}${msgText.length > 80 ? "…" : ""}</div>
      </div>
      <button id="chatPopupClose" type="button" aria-label="Fechar">✕</button>
    </div>
  `;

  // Estilos inline (não dependem do CSS externo)
  Object.assign(popup.style, {
    position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
    zIndex: "99999", width: "min(96vw, 420px)", cursor: "pointer",
    animation: "chatPopupIn .28s cubic-bezier(.22,1,.36,1) both"
  });
  const inner = popup.querySelector("#chatPopupInner");
  Object.assign(inner.style, {
    display: "flex", alignItems: "center", gap: "12px",
    background: "#1a2b3c", color: "#fff",
    borderRadius: "16px", padding: "14px 16px",
    boxShadow: "0 8px 32px rgba(0,0,0,.45)",
    borderLeft: "5px solid #25d366"
  });
  Object.assign(popup.querySelector("#chatPopupIcon").style, {
    fontSize: "28px", lineHeight: "1", flexShrink: "0"
  });
  Object.assign(popup.querySelector("#chatPopupBody").style, {
    flex: "1", minWidth: "0"
  });
  Object.assign(popup.querySelector("#chatPopupRoom").style, {
    fontSize: "11px", fontWeight: "700", color: "#25d366",
    textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "2px"
  });
  Object.assign(popup.querySelector("#chatPopupAuthor").style, {
    fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "2px"
  });
  Object.assign(popup.querySelector("#chatPopupText").style, {
    fontSize: "13px", color: "#c8d8e8",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  });
  const closeBtn = popup.querySelector("#chatPopupClose");
  Object.assign(closeBtn.style, {
    background: "none", border: "none", color: "#8aa", fontSize: "16px",
    cursor: "pointer", padding: "4px 6px", flexShrink: "0", lineHeight: "1"
  });

  // Injectar animação CSS se ainda não existir
  if (!document.getElementById("chatPopupStyle")) {
    const style = document.createElement("style");
    style.id = "chatPopupStyle";
    style.textContent = `
      @keyframes chatPopupIn {
        from { opacity:0; transform:translateX(-50%) translateY(-18px) scale(.94); }
        to   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);   }
      }
      @keyframes chatPopupOut {
        to   { opacity:0; transform:translateX(-50%) translateY(-14px) scale(.94); }
      }
    `;
    document.head.appendChild(style);
  }

  const dismiss = () => {
    popup.style.animation = "chatPopupOut .22s ease forwards";
    setTimeout(() => popup.remove(), 230);
  };

  // Clique no pop-up → vai ao chat e seleciona a sala
  popup.addEventListener("click", (e) => {
    if (e.target === closeBtn || closeBtn.contains(e.target)) { dismiss(); return; }
    if (latestRoom) {
      selectedChatRoom = latestRoom;
      navTo("chat");
      renderChat();
    }
    dismiss();
  });

  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); dismiss(); });

  document.body.appendChild(popup);

  // Auto-dismiss após 6s
  setTimeout(dismiss, 6000);
}

function playMessageSound() {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
  } catch {}
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      await loadState(true);
      renderChat();
      renderDashboard();
    } catch {}
  }, 5000);
}

async function exportData() {
  const data = await api("/api/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sol-equipes-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file || !isGestor()) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await api("/api/import", { method: "POST", body: reader.result, headers: { "content-type": "application/json" } });
      await loadState();
    } catch (error) {
      alert(`Arquivo inválido: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

async function changePassword(event) {
  event.preventDefault();
  const password = $("#newPasswordInput").value;
  await api("/api/password", { method: "POST", body: JSON.stringify({ password }) });
  $("#newPasswordInput").value = "";
  alert("Senha alterada.");
}

function exportSummaryJpg(id = $("#personId").value) {
  const person = personById(id);
  if (!person) return alert("Selecione ou abra um funcionário para exportar o resumo.");
  const group = groupById(person.groupId);

  // Dimensões cédula RG Brasil: 85.6 × 54 mm a 300 dpi → 1012 × 638 px
  const W = 1012, H = 638;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Fundo branco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Faixa superior azul
  const HEADER_H = 90;
  ctx.fillStyle = "#062b51";
  ctx.fillRect(0, 0, W, HEADER_H);

  // Logo SOL + subtítulo no cabeçalho
  ctx.fillStyle = "#f4b400";
  ctx.font = "bold 30px Arial";
  ctx.fillText("SOL Equipes", 22, 38);
  ctx.fillStyle = "#ffffff";
  ctx.font = "15px Arial";
  ctx.fillText("Segurança · Operação · Logística", 22, 62);

  // Linha dourada decorativa sob o cabeçalho
  ctx.fillStyle = "#f4b400";
  ctx.fillRect(0, HEADER_H, W, 4);

  // ── Área da foto (esquerda) ──────────────────────────────
  const PHOTO_X = 22, PHOTO_Y = HEADER_H + 18;
  const PHOTO_W = 160, PHOTO_H = 200;

  const drawPhotoFrame = () => {
    // Borda azul
    ctx.strokeStyle = "#062b51";
    ctx.lineWidth = 3;
    ctx.strokeRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
    // Fundo cinza claro caso sem foto
    ctx.fillStyle = "#e8edf2";
    ctx.fillRect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4);
    ctx.fillStyle = "#8a9baa";
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sem foto", PHOTO_X + PHOTO_W / 2, PHOTO_Y + PHOTO_H / 2 + 5);
    ctx.textAlign = "left";
  };

  const renderCard = () => {
    // ── Dados textuais (direita da foto) ─────────────────
    const TX = PHOTO_X + PHOTO_W + 22;
    const TW = W - TX - 20;

    // Nome
    ctx.fillStyle = "#062b51";
    ctx.font = "bold 26px Arial";
    const nameY = PHOTO_Y + 26;
    wrapTextReturn(ctx, person.name, TX, nameY, TW, 30);

    // Cargo
    ctx.fillStyle = "#f4b400";
    ctx.font = "bold 17px Arial";
    ctx.fillText(person.role || "", TX, nameY + 58);

    // Linha separadora fina
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(TX, nameY + 68, TW, 1);

    // Dados em grade
    ctx.fillStyle = "#333333";
    ctx.font = "15px Arial";
    const info = [
      ["Grupo",    group?.name || "Sem grupo"],
      ["Tel",      (person.phones || []).join(", ") || "—"],
      ["WhatsApp", person.whatsapp || "—"],
      ["E-mail",   person.email || "—"],
      ["Período",  person.period || "—"],
      ["Disponib.",`${(person.availability || []).map(d => weekdayLabels[d] || d).join(", ") || "—"}`]
    ];
    info.forEach(([label, value], i) => {
      const y = nameY + 90 + i * 26;
      ctx.fillStyle = "#888888";
      ctx.font = "bold 13px Arial";
      ctx.fillText(label.toUpperCase(), TX, y);
      ctx.fillStyle = "#222222";
      ctx.font = "15px Arial";
      const labelW = ctx.measureText(label.toUpperCase() + "  ").width + 8;
      // Trunca valor se muito largo
      let val = value;
      while (val.length > 2 && ctx.measureText(val).width > TW - labelW) val = val.slice(0, -1);
      if (val !== value) val += "…";
      ctx.fillText(val, TX + labelW, y);
    });

    // ── Faixa inferior com resumo ─────────────────────────
    const FOOTER_Y = PHOTO_Y + PHOTO_H + 20;
    ctx.fillStyle = "#f5f7fa";
    ctx.fillRect(0, FOOTER_Y, W, H - FOOTER_Y);
    ctx.fillStyle = "#062b51";
    ctx.fillRect(0, FOOTER_Y, W, 3);

    ctx.fillStyle = "#555555";
    ctx.font = "italic 14px Arial";
    wrapTextReturn(ctx, person.summary || "Sem resumo cadastrado.", 22, FOOTER_Y + 22, W - 44, 20);

    // ── Rodapé com data ───────────────────────────────────
    ctx.fillStyle = "#062b51";
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - 16, H - 10);
    ctx.textAlign = "left";

    // ── Download ──────────────────────────────────────────
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.download = `cracha-${slugUser(person.name)}.jpg`;
    link.click();
  };

  // Tenta carregar a foto
  if (person.photo) {
    const img = new Image();
    img.onload = () => {
      // Clip circular não: recorte retangular preenchendo o frame
      ctx.drawImage(img, PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4);
      ctx.strokeStyle = "#062b51";
      ctx.lineWidth = 3;
      ctx.strokeRect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
      renderCard();
    };
    img.onerror = () => { drawPhotoFrame(); renderCard(); };
    img.src = person.photo;
  } else {
    drawPhotoFrame();
    renderCard();
  }
}

// wrapText com retorno de Y final (não quebra a assinatura antiga)
function wrapTextReturn(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text || "").split(" ");
  let line = "";
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, y);
  return y;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  words.forEach((word) => {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, x, y);
}

function wireEvents() {
  $("#loginPerson").addEventListener("change", fillLoginUser);
  $("#loginForm").addEventListener("submit", login);
  $("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  });
  $$(".nav-item").forEach((item) => item.addEventListener("click", () => navTo(item.dataset.view)));
  $$("[data-jump]").forEach((item) => item.addEventListener("click", () => navTo(item.dataset.jump)));
  document.addEventListener("click", (event) => {
    const personButton = event.target.closest("[data-person]");
    const editButton = event.target.closest("[data-edit]");
    const groupButton = event.target.closest("[data-open-group]");
    const deleteGroupButton = event.target.closest("[data-delete-group]");
    const saveGroupButton = event.target.closest("[data-save-group]");
    const roomButton = event.target.closest("[data-room]");
    const summaryButton = event.target.closest("[data-export-summary]");
    if (personButton) openPerson(personButton.dataset.person);
    if (editButton) editPerson(editButton.dataset.edit);
    if (groupButton) {
      $("#orgGroupFilter").value = groupButton.dataset.openGroup;
      navTo("org");
    }
    if (deleteGroupButton) deleteGroup(deleteGroupButton.dataset.deleteGroup);
    if (saveGroupButton) saveGroup(saveGroupButton.dataset.saveGroup);
    if (roomButton) {
      selectedChatRoom = roomButton.dataset.room;
      renderChat();
    }
    if (summaryButton) exportSummaryJpg(summaryButton.dataset.exportSummary);
  });

  ["#orgGroupFilter", "#orgSearch", "#peopleSort", "#peopleGroupFilter", "#peopleSearch", "#scheduleGroup", "#scheduleMonth"].forEach((selector) => {
    $(selector).addEventListener("input", render);
  });
  $("#personForm").addEventListener("submit", savePerson);
  $("#clearForm").addEventListener("click", clearForm);
  $("#deletePerson").addEventListener("click", deletePerson);
  $("#groupForm").addEventListener("submit", addGroup);
  $("#generateSchedule").addEventListener("click", generateSchedule);
  $("#saveSchedule").addEventListener("click", saveSchedule);
  $("#chatForm").addEventListener("submit", sendMessage);
  $("#closeDialog").addEventListener("click", () => $("#personDialog").close());
  $("#exportData").addEventListener("click", exportData);
  $("#importData").addEventListener("change", importData);
  $("#passwordForm").addEventListener("submit", changePassword);
  $("#exportSummaryJpg").addEventListener("click", () => exportSummaryJpg());
  $("#photoInput").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      photoDraft = reader.result;
      $("#photoPreview").src = photoDraft;
    };
    reader.readAsDataURL(file);
  });
  $("#nameInput").addEventListener("input", () => {
    if (!$("#personId").value && !$("#usernameInput").value) $("#usernameInput").value = slugUser($("#nameInput").value);
  });
}

function initDates() {
  $("#scheduleMonth").value = new Date().toISOString().slice(0, 7);
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

wireEvents();
initDates();
clearForm();
loadPublicPeople().catch((error) => {
  $("#loginPerson").innerHTML = `<option>Servidor indisponível</option>`;
  $(".login-hint").textContent = `Abra pelo servidor local. Detalhe: ${error.message}`;
});
