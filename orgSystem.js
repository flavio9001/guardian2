/**
 * Sistema de Organograma por VIP
 * Gerencia a visualização hierárquica baseada em categorias VIP
 */

// 1. Função para obter lista de VIPs únicos
function getUniqueVips(people) {
  const vips = new Set();
  people.forEach(p => p.vipId && vips.add(p.vipId));
  return Array.from(vips);
}

// 2. Função getPeopleByVip(vipId) - retorna pessoas associadas a um VIP
function getPeopleByVip(people, vipId) {
  return people.filter(p => p.vipId === vipId);
}

// 3. Função groupPeopleByHierarchy(people) - agrupa pessoas por hierarquia
function groupPeopleByHierarchy(people) {
  const hierarchy = {};
  people.forEach(person => {
    const level = person.level || 'default';
    if (!hierarchy[level]) hierarchy[level] = [];
    hierarchy[level].push(person);
  });
  return hierarchy;
}

// 4. Função renderVipCard(vip) - renderiza o card do VIP
function renderVipCard(vipId) {
  return `<div class="vip-header"><h3>VIP: ${escapeHtml(vipId || 'Sem Categoria')}</h3></div>`;
}

// 5. Função renderIndividualOrgChart(people, vipId) - renderiza organograma individual
function renderIndividualOrgChart(people, vipId) {
  const filtered = getPeopleByVip(people, vipId);
  const grouped = groupPeopleByHierarchy(filtered);
  let html = renderVipCard(vipId);
  
  Object.keys(grouped).sort().forEach(level => {
    html += `<div class="level-group"><h4>Nível ${level}</h4><div class="row">`;
    grouped[level].forEach(person => {
      html += `<div class="card">${renderAvatar(person.avatar)}<p>${escapeHtml(person.name)}</p></div>`;
    });
    html += `</div></div>`;
  });
  return html;
}

// 6. Função renderOrgByVip() - renderiza todos os organogramas por VIP
function renderOrgByVip(allPeople) {
  const container = document.getElementById('org-container');
  const vips = getUniqueVips(allPeople);
  container.innerHTML = '';
  
  vips.forEach(vipId => {
    container.innerHTML += renderIndividualOrgChart(allPeople, vipId);
  });
}

// 7. Atualização dos event listeners para o novo filtro de VIP
function initVipFilter(allPeople) {
  const filterSelect = document.getElementById('vip-filter');
  if (!filterSelect) return;

  filterSelect.addEventListener('change', (e) => {
    const selectedVip = e.target.value;
    if (selectedVip === 'all') {
      renderOrgByVip(allPeople);
    } else {
      document.getElementById('org-container').innerHTML = renderIndividualOrgChart(allPeople, selectedVip);
    }
  });
}

// Integração inicial
document.addEventListener('DOMContentLoaded', () => {
  const data = window.appData || [];
  renderOrgByVip(data);
  initVipFilter(data);
});