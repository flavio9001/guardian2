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
    const url = path.startsWith("/api/") ? `${API}api.php?path=${path.slice(5)}` : `${API}${path}`; 
    const response = await fetch(url, { 
        ...options, 
        headers: { "content-type": "application/json", "x-user-id": currentUser?.id || "", ...(options.headers || {}) } 
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
    if (text.startsWith("<")) return `Erro no servidor (${status})`; 
    return text || `Erro desconhecido (${status})`; 
}

async function loadPublicPeople() { 
    try {
        const people = await api("/api/people/public"); 
        state.people = people || [];
        const list = $("#loginPerson");
        if (list) {
            list.innerHTML = (state.people).map((person) => 
                `<option value="${person.id}" data-user="${escapeHtml(person.username)}">${escapeHtml(person.name)}</option>`
            ).join(""); 
        }
        const saved = localStorage.getItem(SESSION_KEY); 
        if (saved && state.people.some((person) => person.id === saved)) {
            if($("#loginPerson")) $("#loginPerson").value = saved; 
        }
        fillLoginUser(); 
    } catch (error) {
        if($("#loginPerson")) $("#loginPerson").innerHTML = `<option>Servidor indisponível</option>`;
        const hint = $(".login-hint");
        if(hint) hint.textContent = `Detalhe: ${error.message}`;
    }
} 

function fillLoginUser() { 
    const selected = $("#loginPerson")?.selectedOptions[0]; 
    if($("#loginUser")) $("#loginUser").value = selected?.dataset.user || ""; 
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
    
    // Proteções globais
    state.people = state.people || [];
    state.groups = state.groups || [];
    state.chatRooms = state.chatRooms || [];
    state.chats = state.chats || {};
    state.schedules = state.schedules || {};

    ensureSelectedRoom(); 
    const storageStatus = $("#storageStatus");
    if(storageStatus) storageStatus.textContent = `Sincronizado ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`; 
    
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
    
    const label = $("#currentUserLabel");
    if (label && currentUser) {
        label.textContent = `${currentUser.name} · ${gestor ? "Gestor" : "Colaborador"}`; 
        // Estilo Verde
        label.style.backgroundColor = '#28a745';
        label.style.color = '#ffffff';
        label.style.padding = '5px 12px';
        label.style.borderRadius = '20px';
    }

    if (!gestor && currentView === "settings") navTo("dashboard"); 
} 

function isGestor() { return currentUser?.userType === "gestor"; } 
function groupById(id) { return (state.groups || []).find((group) => group.id === id); } 
function personById(id) { return (state.people || []).find((person) => person.id === id); } 
function peopleInGroup(groupId) { return (state.people || []).filter((person) => person.groupId === groupId && person.active); } 

function initials(name = "") { 
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); 
} 

function avatar(person) { 
    if (person.photo) return `<img src="${escapeHtml(person.photo)}" class="avatar" alt="Foto">`; 
    return `<div class="avatar avatar-placeholder">${initials(person.name)}</div>`; 
} 

function escapeHtml(value = "") { 
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); 
} 

function normalizePhone(value = "") { return value.replace(/\D/g, ""); } 
function parsePhones(value = "") { return value.split(/[,\n;]/).map((phone) => normalizePhone(phone)).filter(Boolean); } 
function parseAvailability(value = "") { 
    const normalized = value.replace(/terça/gi, "Terca").replace(/sábado/gi, "Sabado").split(/[,\n;]/).map((item) => item.trim()).filter(Boolean); 
    return normalized.length ? normalized : ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"]; 
} 

function navTo(view) { 
    if (view === "settings" && !isGestor()) return; 
    currentView = view; 
    $$(".view").forEach((item) => item.classList.toggle("active", item.id === view)); 
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view)); 
    
    const title = $("#viewTitle");
    if(title) {
        title.textContent = { dashboard: "Visão geral", org: "Organograma", people: "Funcionários", admin: "Cadastro", schedule: "Escala", chat: "Chat", settings: "Configurações" }[view]; 
    }
    render(); 
} 

function initViewNavigation() { 
    const viewButtons = document.querySelectorAll('[data-view]'); 
    viewButtons.forEach(button => { 
        button.addEventListener('click', function() { navTo(this.dataset.view); }); 
    }); 
} 

function emptyNode() { return $("#emptyTemplate").content.firstElementChild.cloneNode(true); } 
function setEmpty(container) { container.innerHTML = ""; container.append(emptyNode()); } 

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
    const groups = state.groups || [];
    const groupOptions = [`<option value="all">Todos os grupos</option>`, ...groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)].join(""); 
    
    ["#orgGroupFilter", "#peopleGroupFilter"].forEach((selector) => { 
        const el = $(selector);
        if(!el) return;
        const old = el.value; 
        el.innerHTML = groupOptions; 
        el.value = groups.some((group) => group.id === old) || old === "all" ? old : "all"; 
    }); 
    
    ["#groupInput", "#scheduleGroup"].forEach((selector) => { 
        const el = $(selector);
        if(!el) return;
        const old = el.value; 
        el.innerHTML = groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join(""); 
        if (groups.some((group) => group.id === old)) el.value = old; 
    }); 
    
    const vipOptions = (state.people || [])
        .filter((person) => person.isVip || !person.managerId || person.userType === "gestor") 
        .map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`) 
        .join(""); 
    
    if($("#groupVipInput")) $("#groupVipInput").innerHTML = vipOptions || `<option value="">Cadastre um VIP</option>`; 
    
    const selectedId = $("#personId")?.value; 
    if($("#managerInput")) {
        $("#managerInput").innerHTML = [ 
            `<option value="">Sem superior / topo</option>`, 
            ...(state.people || [])
                .filter((person) => person.id !== selectedId) 
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) 
                .map((person) => `<option value="${person.id}">${escapeHtml(person.name)} - ${escapeHtml(person.role)}</option>`) 
        ].join(""); 
    }
} 

function renderDashboard() { 
    const people = state.people || [];
    const groups = state.groups || [];
    const metrics = $("#metrics");

    if(metrics) {
        metrics.innerHTML = [ 
            ["Funcionários", people.length], 
            ["Ativos", people.filter((person) => person.active).length], 
            ["Grupos", groups.length], 
            ["Chats liberados", (state.chatRooms || []).length] 
        ].map(([label, value]) => `<div class="card metric-card"><h3>${label}</h3><div class="metric-value">${value}</div></div>`).join(""); 
    }

    const groupBoard = $("#groupBoard"); 
    if(groupBoard) {
        if (!groups.length) setEmpty(groupBoard); 
        else {
            groupBoard.innerHTML = groups.map((group) => { 
                const vip = personById(group.vipId); 
                return `<div class="card">
                    <h3>${escapeHtml(group.name)}</h3>
                    <p class="text-secondary">VIP: ${vip ? escapeHtml(vip.name) : "Não definido"} · ${peopleInGroup(group.id).length} integrantes</p>
                    <button class="btn btn-outline" data-open-group="${group.id}">Ver</button>
                </div>`; 
            }).join(""); 
        }
    }

    const recent = [...people].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5); 
    const list = $("#recentPeople"); 
    if(list) {
        if (!recent.length) setEmpty(list); 
        else {
            list.innerHTML = recent.map((person) => `<div class="list-item" data-person="${person.id}">
                ${avatar(person)}
                <div class="list-item-content">
                    <div class="list-item-title">${escapeHtml(person.name)}</div>
                    <div class="list-item-subtitle">${escapeHtml(person.role)} · ${escapeHtml(groupById(person.groupId)?.name || "Sem grupo")}</div>
                </div>
            </div>`).join(""); 
        }
    }
} 

function filteredPeople(prefix) { 
    const group = $(`#${prefix}GroupFilter`)?.value || "all"; 
    const search = ($(`#${prefix}Search`)?.value || "").toLowerCase(); 
    return (state.people || []).filter((person) => { 
        const haystack = [person.name, person.role, person.email, person.address, person.summary, ...(person.phones || [])].join(" ").toLowerCase(); 
        return (group === "all" || person.groupId === group) && haystack.includes(search); 
    }); 
} 

// ORGANOGRAMA COM VIPS E LINHAS
function buildTreeHTML(person, allPeople) {
    const children = allPeople.filter(p => p.managerId === person.id);
    const nodeClass = person.isVip ? "org-node vip-node" : "org-node";
    
    let html = `<li>
        <div class="${nodeClass}">
            ${personCard(person)}
        </div>`;
        
    if (children.length > 0) {
        html += `<ul>${children.map(c => buildTreeHTML(c, allPeople)).join('')}</ul>`;
    }
    html += `</li>`;
    return html;
}

function renderOrg() { 
    const chart = $("#orgChart"); 
    if(!chart) return;

    const people = filteredPeople("org"); 
    if (!people.length) return setEmpty(chart); 

    const ids = new Set(people.map(p => p.id));
    const allRoots = people.filter(p => !p.managerId || !ids.has(p.managerId));
    
    const vipRoots = allRoots.filter(p => p.isVip);
    const normalRoots = allRoots.filter(p => !p.isVip);

    let finalHTML = `<div class="org-tree-container">`;
    
    vipRoots.forEach(vip => {
        finalHTML += `
        <div class="vip-org-section">
            <h3 style="text-align:center; color:#062b51; margin-bottom:15px;">👑 Organograma: ${escapeHtml(vip.name)}</h3>
            <div class="org-tree">
                <ul>${buildTreeHTML(vip, people)}</ul>
            </div>
        </div>`;
    });

    if (normalRoots.length > 0) {
        finalHTML += `
        <div class="vip-org-section" style="margin-top: 30px;">
            <h3 style="text-align:center; color:#666; margin-bottom:15px;">Outras Equipes</h3>
            <div class="org-tree">
                <ul>${normalRoots.map(root => buildTreeHTML(root, people)).join('')}</ul>
            </div>
        </div>`;
    }

    finalHTML += `</div>`;
    chart.innerHTML = finalHTML; 
} 

function personCard(person) { 
    const group = groupById(person.groupId); 
    return `<div class="org-card" data-person="${person.id}">
        ${avatar(person)}
        <div class="org-card-title">${escapeHtml(person.name)}</div>
        <div class="org-card-subtitle">${escapeHtml(person.role)}</div>
        <div class="org-card-meta">${person.isVip ? "VIP" : escapeHtml(group?.name || "Sem grupo")}</div>
    </div>`; 
} 

function renderPeople() { 
    const container = $("#peopleList"); 
    if(!container) return;

    let people = filteredPeople("people"); 
    if ($("#peopleSort")?.value === "group") { 
        people = people.sort((a, b) => `${groupById(a.groupId)?.name || ""}${a.name}`.localeCompare(`${groupById(b.groupId)?.name || ""}${b.name}`, "pt-BR")); 
    } else { 
        people = people.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")); 
    } 
    if (!people.length) return setEmpty(container); 
    
    container.innerHTML = people.map((person) => `<div class="list-item">
        ${avatar(person)}
        <div class="list-item-content">
            <div class="list-item-title">${escapeHtml(person.name)}</div>
            <div class="list-item-subtitle">${escapeHtml(person.role)} · ${escapeHtml(groupById(person.groupId)?.name || "Sem grupo")}</div>
        </div>
        <div class="list-item-actions">
            <button class="btn btn-outline" data-person="${person.id}">Resumo</button>
            <button class="btn btn-outline gestor-only" data-edit="${person.id}">Editar</button>
        </div>
    </div>`).join(""); 
} 

function renderGroupsAdmin() { 
    const container = $("#adminGroupList"); 
    if(!container) return;

    const groups = state.groups || [];
    if (!groups.length) return setEmpty(container); 
    
    container.innerHTML = groups.map((group) => `<div class="card">
        <input type="text" class="input" value="${escapeHtml(group.name)}" data-group-name="${group.id}">
        <select class="input" data-group-vip="${group.id}">
            <option value="">Sem VIP</option>
            ${(state.people || []).map((person) => `<option value="${person.id}" ${person.id === group.vipId ? "selected" : ""}>${escapeHtml(person.name)}</option>`).join("")}
        </select>
        <p class="text-secondary">${peopleInGroup(group.id).length} pessoas</p>
        <div class="flex-row" style="margin-top:10px">
            <button class="btn btn-primary" data-save-group="${group.id}">Salvar</button>
            <button class="btn btn-danger" data-delete-group="${group.id}">Excluir</button>
        </div>
    </div>`).join(""); 
} 

function renderSchedule() { 
    const groupId = $("#scheduleGroup")?.value || state.groups?.[0]?.id; 
    const month = $("#scheduleMonth")?.value || new Date().toISOString().slice(0, 7); 
    const container = $("#scheduleGrid"); 
    if(!container) return;

    if (!groupId) return setEmpty(container); 
    
    const schedule = state.schedules[groupId]?.[month] || buildBlankMonth(month); 
    const team = peopleInGroup(groupId); 
    const blanks = new Date(`${month}-01T12:00:00`).getDay(); 
    const cells = Array.from({ length: blanks }, () => `<div class="schedule-cell empty"></div>`); 
    
    schedule.forEach((entry) => { 
        const date = new Date(`${entry.date}T12:00:00`); 
        cells.push(`<div class="schedule-cell">
            <div class="schedule-date">${date.getDate()} <small>${weekdayLabels[weekdays[date.getDay()]]}</small></div>
            <select multiple class="input" data-schedule-date="${entry.date}">
                ${team.map((person) => `<option value="${person.id}" ${entry.assignments.includes(person.id) ? "selected" : ""}>${escapeHtml(person.name)} · ${escapeHtml(person.period || "")}</option>`).join("")}
            </select>
        </div>`); 
    }); 
    
    container.innerHTML = `<div class="schedule-header">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => `<div>${day}</div>`).join("")}</div><div class="schedule-body">${cells.join("")}</div>`; 
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
    const chatRoomsEl = $("#chatRooms");
    if(chatRoomsEl) chatRoomsEl.innerHTML = rooms.map((room) => `<div class="list-item ${room.id === selectedChatRoom ? 'active' : ''}" data-room="${room.id}">${escapeHtml(room.name)}</div>`).join(""); 
    
    const chatTitle = $("#chatTitle");
    if(chatTitle) chatTitle.textContent = rooms.find((room) => room.id === selectedChatRoom)?.name || "Chat"; 
    
    const messages = state.chats[selectedChatRoom] || []; 
    const container = $("#chatMessages"); 
    if(!container) return;

    if (!messages.length) return setEmpty(container); 
    
    container.innerHTML = messages.map((message) => `<div class="chat-message ${message.authorId === currentUser?.id ? 'own' : ''}">
        <div class="chat-meta">${escapeHtml(message.author || "Anônimo")} · ${new Date(message.at).toLocaleString("pt-BR")}</div>
        <div class="chat-bubble">${escapeHtml(message.text)}</div>
    </div>`).join(""); 
    container.scrollTop = container.scrollHeight; 
} 

function openPerson(id) { 
    const person = personById(id); 
    if (!person) return; 
    const manager = personById(person.managerId); 
    const phones = person.phones || []; 
    
    $("#personDetails").innerHTML = `
        <div class="text-center">${avatar(person)}</div>
        <div class="text-center text-secondary">${person.isVip ? "VIP / diretor do fluxo" : escapeHtml(groupById(person.groupId)?.name || "Sem grupo")}</div>
        <h2 class="text-center">${escapeHtml(person.name)}</h2>
        <div class="text-center">${escapeHtml(person.role)}</div>
        <hr>
        <p><b>Telefones:</b> ${phones.length ? phones.map(escapeHtml).join(", ") : "Não informado"}</p>
        <p><b>WhatsApp:</b> ${escapeHtml(person.whatsapp || "Não informado")}</p>
        <p><b>Superior:</b> ${manager ? escapeHtml(manager.name) : "Topo da hierarquia"}</p>
        <p><b>Escala:</b> ${escapeHtml(person.period || "Sem período")} · ${(person.availability || []).map((day) => weekdayLabels[day] || day).join(", ")}</p>
        <p><b>E-mail:</b> ${escapeHtml(person.email || "Não informado")}</p>
        <p><b>Endereço:</b> ${escapeHtml(person.address || "Não informado")}</p>
        <p><b>Resumo:</b> ${escapeHtml(person.summary || "Sem resumo cadastrado")}</p>
        <div class="flex-row" style="margin-top:20px">
            <button class="btn btn-primary" data-export-summary="${person.id}">Exportar JPG</button>
            <button class="btn btn-outline gestor-only" data-edit="${person.id}">Editar cadastro</button>
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
    
    // Senha em branco por padrão ao editar
    $("#passwordInput").value = ""; 
    $("#passwordInput").placeholder = "Deixe em branco para manter a atual";

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
    const form = $("#personForm");
    if(form) form.reset(); 
    if($("#formTitle")) $("#formTitle").textContent = "Novo funcionário"; 
    if($("#personId")) $("#personId").value = ""; 
    if($("#photoPreview")) $("#photoPreview").src = ""; 
    if($("#passwordInput")) $("#passwordInput").placeholder = DEFAULT_PASSWORD; 
    photoDraft = ""; 
    if($("#activeInput")) $("#activeInput").checked = true; 
    if($("#deletePerson")) $("#deletePerson").style.visibility = "hidden"; 
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
    await api("/api/groups", { method: "PUT", body: JSON.stringify({ id: uid("group"), name, vipId: $("#groupVipInput").value, color: colors[(state.groups||[]).length % colors.length] }) }); 
    $("#groupForm").reset(); 
    await loadState(); 
} 

async function saveGroup(id) { 
    const group = groupById(id); 
    if (!group || !isGestor()) return; 
    await api("/api/groups", { method: "PUT", body: JSON.stringify({ ...group, name: $(`[data-group-name="${id}"]`).value.trim(), vipId: $(`[data-group-vip="${id}"]`).value }) }); 
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
    // Notificação de chat omitida por brevidade, mas mantida a estrutura
} 

function startPolling() { 
    clearInterval(pollTimer); 
    pollTimer = setInterval(async () => { 
        try { await loadState(true); renderChat(); renderDashboard(); } catch {} 
    }, 5000); 
} 

async function exportData() { 
    const data = await api("/api/export"); 
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); 
    const url = URL.createObjectURL(blob); 
    const link = document.createElement("a"); 
    link.href = url; link.download = `sol-equipes-${new Date().toISOString().slice(0, 10)}.json`; 
    link.click(); URL.revokeObjectURL(url); 
} 

function importData(event) { 
    const file = event.target.files?.[0]; 
    if (!file || !isGestor()) return; 
    const reader = new FileReader(); 
    reader.onload = async () => { 
        try { 
            await api("/api/import", { method: "POST", body: reader.result, headers: { "content-type": "application/json" } }); 
            await loadState(); 
        } catch (error) { alert(`Arquivo inválido: ${error.message}`); } 
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

// EXPORTAÇÃO 17x12cm
function exportSummaryJpg(id = $("#personId").value) {
    const person = personById(id);
    if (!person) return alert("Selecione ou abra um funcionário para exportar o resumo.");

    const exportArea = document.createElement('div');
    exportArea.className = 'summary-export-landscape';
    
    const photoSrc = person.photo || 'https://via.placeholder.com/150?text=Sem+Foto';
    const group = groupById(person.groupId);

    exportArea.innerHTML = `
        <img src="${photoSrc}" class="export-photo-side" id="export-img-temp" crossorigin="anonymous">
        <div class="export-info-side">
            <p><b>Nome Completo</b> ${escapeHtml(person.name)}</p>
            <p><b>Função / Cargo</b> ${escapeHtml(person.role)}</p>
            <p><b>Grupo Operacional</b> ${escapeHtml(group?.name || 'Sem grupo')}</p>
            <p><b>Endereço Residencial</b> ${escapeHtml(person.address || 'Não informado')}</p>
            <p><b>Status do Cadastro</b> ${person.active ? 'Ativo' : 'Inativo'}</p>
        </div>
    `;

    document.body.appendChild(exportArea);
    
    const imgElement = document.getElementById('export-img-temp');
    
    const generatePrint = () => {
        if (typeof html2canvas === 'undefined') {
            alert("Erro: Biblioteca html2canvas não encontrada.");
            document.body.removeChild(exportArea);
            return;
        }
        html2canvas(exportArea, { 
            scale: 3, 
            useCORS: true,
            allowTaint: true,
            width: 642, // 17cm
            height: 453  // 12cm
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `RESUMO_SOL_${person.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            document.body.removeChild(exportArea);
        });
    };

    if (imgElement.complete) {
        generatePrint();
    } else {
        imgElement.onload = generatePrint;
        imgElement.onerror = generatePrint;
    }
}

function wireEvents() { 
    $("#loginPerson")?.addEventListener("change", fillLoginUser); 
    $("#loginForm")?.addEventListener("submit", login); 
    $("#logoutButton")?.addEventListener("click", () => { localStorage.removeItem(SESSION_KEY); location.reload(); }); 
    
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
        if (groupButton) { $("#orgGroupFilter").value = groupButton.dataset.openGroup; navTo("org"); } 
        if (deleteGroupButton) deleteGroup(deleteGroupButton.dataset.deleteGroup); 
        if (saveGroupButton) saveGroup(saveGroupButton.dataset.saveGroup); 
        if (roomButton) { selectedChatRoom = roomButton.dataset.room; renderChat(); } 
        if (summaryButton) exportSummaryJpg(summaryButton.dataset.exportSummary); 
    }); 

    ["#orgGroupFilter", "#orgSearch", "#peopleSort", "#peopleGroupFilter", "#peopleSearch", "#scheduleGroup", "#scheduleMonth"].forEach((selector) => { 
        $(selector)?.addEventListener("input", render); 
    }); 

    $("#personForm")?.addEventListener("submit", savePerson); 
    $("#clearForm")?.addEventListener("click", clearForm); 
    $("#deletePerson")?.addEventListener("click", deletePerson); 
    $("#groupForm")?.addEventListener("submit", addGroup); 
    $("#generateSchedule")?.addEventListener("click", generateSchedule); 
    $("#saveSchedule")?.addEventListener("click", saveSchedule); 
    $("#chatForm")?.addEventListener("submit", sendMessage); 
    $("#closeDialog")?.addEventListener("click", () => $("#personDialog").close()); 
    $("#exportData")?.addEventListener("click", exportData); 
    $("#importData")?.addEventListener("change", importData); 
    $("#passwordForm")?.addEventListener("submit", changePassword); 
    $("#exportSummaryJpg")?.addEventListener("click", () => exportSummaryJpg()); 
    
    $("#photoInput")?.addEventListener("change", (event) => { 
        const file = event.target.files?.[0]; 
        if (!file) return; 
        const reader = new FileReader(); 
        reader.onload = () => { photoDraft = reader.result; $("#photoPreview").src = photoDraft; }; 
        reader.readAsDataURL(file); 
    }); 
    
    $("#nameInput")?.addEventListener("input", () => { 
        if (!$("#personId").value && !$("#usernameInput").value) $("#usernameInput").value = slugUser($("#nameInput").value); 
    }); 
} 

function initDates() { 
    if($("#scheduleMonth")) $("#scheduleMonth").value = new Date().toISOString().slice(0, 7); 
} 

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    wireEvents(); 
    initDates(); 
    clearForm(); 
    loadPublicPeople();

    // Navegação Inteligente das Pills
    document.addEventListener('click', function(e) {
        const pill = e.target.closest('.user-pill');
        if (!pill) return;
        const text = pill.innerText.toLowerCase();
        const parentSection = pill.closest('.card')?.querySelector('h3')?.innerText.toLowerCase() || '';

        if (parentSection.includes('equipe') || parentSection.includes('funcionário')) {
            navTo('people');
        } else if (text.includes('alpha') || text.includes('bravo') || text.includes('grupo')) {
            navTo('org');
        } else if (parentSection.includes('ativos') || parentSection.includes('operacional')) {
            navTo('dashboard');
        }
    });
});