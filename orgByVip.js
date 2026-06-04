/**
 * orgByVip.js
 * Sistema de Organograma por VIP
 * Responsável por filtrar e renderizar a hierarquia baseada em níveis VIP.
 */

const OrgByVip = (() => {
  "use strict";

  // Configuração interna
  const CONFIG = {
    containerId: 'org-chart-container',
    vipLevels: ['Gold', 'Silver', 'Bronze', 'Standard']
  };

  /**
   * Filtra e agrupa dados por nível VIP
   * @param {Array} data - Lista de usuários
   * @returns {Object} Dados agrupados
   */
  const groupByVip = (data) => {
    if (!Array.isArray(data)) throw new Error("Dados inválidos fornecidos para agrupamento.");
    
    return data.reduce((acc, item) => {
      const level = item.vipLevel || 'Standard';
      if (!acc[level]) acc[level] = [];
      acc[level].push(item);
      return acc;
    }, {});
  };

  /**
   * Renderiza o organograma no DOM
   * @param {Array} data 
   */
  const render = (data) => {
    try {
      const container = document.getElementById(CONFIG.containerId);
      if (!container) throw new Error("Container não encontrado");

      const grouped = groupByVip(data);
      container.innerHTML = '';

      CONFIG.vipLevels.forEach(level => {
        if (grouped[level]) {
          const section = document.createElement('div');
          section.className = `vip-section vip-${level.toLowerCase()}`;
          section.innerHTML = `<h3>${level} Members</h3><ul>${grouped[level].map(u => `<li>${u.name}</li>`).join('')}</ul>`;
          container.appendChild(section);
        }
      });
    } catch (err) {
      console.error("Erro ao renderizar organograma:", err);
    }
  };

  /**
   * Inicializa listeners de eventos
   */
  const init = () => {
    document.addEventListener('DOMContentLoaded', () => {
      const filterBtn = document.getElementById('filter-vip-btn');
      if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
          console.log("Filtrando organograma...");
        });
      }
    });
  };

  return { render, init };
})();

// Inicialização automática
OrgByVip.init();