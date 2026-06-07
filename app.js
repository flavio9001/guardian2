// ... (todo o código anterior mantido - login, api, etc.) ...

// ==================== ORGANOGRAMA MELHORADO ====================
function renderOrgChart() {
  const container = document.getElementById('orgContainer');
  if (!container) return;
  
  container.innerHTML = '';

  // Pegar todos os VIPs (cabeças de organograma)
  const vips = (state.people || []).filter(p => p.isVip && p.active);
  
  if (vips.length === 0) {
    container.innerHTML = `<div class="empty-state"><strong>Nenhum VIP/CEO cadastrado</strong><span>Cadastre pelo menos um funcionário como VIP para gerar organogramas.</span></div>`;
    return;
  }

  vips.forEach(vip => {
    const orgHTML = buildSingleOrgChart(vip);
    container.innerHTML += orgHTML;
  });
}

function buildSingleOrgChart(vip) {
  const subordinates = buildHierarchy(vip.id);
  
  let html = `
    <div class="org-board">
      <div class="org-header">
        <h2>Organograma - ${escapeHtml(vip.name)}</h2>
        <span class="vip-badge">VIP / CEO</span>
      </div>
      <div class="org-tree">
        <div class="org-node root">
          ${avatar(vip)}
          <div class="node-info">
            <strong>${escapeHtml(vip.name)}</strong>
            <span>${escapeHtml(vip.role || 'CEO')}</span>
          </div>
        </div>
        <div class="org-children">
          ${subordinates.map(sub => buildNode(sub)).join('')}
        </div>
      </div>
    </div>
  `;
  return html;
}

function buildHierarchy(managerId) {
  const allPeople = (state.people || []).filter(p => p.active);
  const directSubs = allPeople.filter(p => p.managerId === managerId);
  
  return directSubs.map(person => ({
    ...person,
    children: buildHierarchy(person.id)
  }));
}

function buildNode(person) {
  const childrenHTML = person.children && person.children.length > 0 
    ? `<div class="org-children">${person.children.map(child => buildNode(child)).join('')}</div>` 
    : '';
  
  return `
    <div class="org-node">
      ${avatar(person)}
      <div class="node-info">
        <strong>${escapeHtml(person.name)}</strong>
        <span>${escapeHtml(person.role || '')}</span>
        ${person.whatsapp ? `<small>📱 ${person.whatsapp}</small>` : ''}
      </div>
      ${childrenHTML}
    </div>
  `;
}

// ==================== FUNÇÃO RENDER PRINCIPAL (atualizada) ====================
function render() {
  if (currentView === 'org') {
    renderOrgChart();
  }
  // ... resto das renderizações (people, chat, etc.)
}

// ==================== Inicialização ====================
function init() {
  document.getElementById('loginForm').addEventListener('submit', login);
  
  // Evento de busca no organograma
  const orgSearch = document.getElementById('orgSearch');
  if (orgSearch) {
    orgSearch.addEventListener('input', () => {
      // Implementar filtro se desejar no futuro
      renderOrgChart();
    });
  }

  loadPublicPeople();
}

document.addEventListener('DOMContentLoaded', init);