/**
 * exportService.js
 * Servico utilitario para exportacao de imagens e comunicacao externa
 * Integrado ao ecossistema Guardian
 */

/**
 * Verifica se o ambiente atual e uma WebView Android
 */
export const isAndroidWebView = () => {
  return typeof window !== 'undefined' && window.AndroidBridge !== undefined;
};

/**
 * Processa a exportacao de um elemento HTML como imagem JPG
 * @param {string} elementId - ID do elemento DOM a ser capturado
 */
export const processarExportacaoResumo = async (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Elemento nao encontrado');

  // Nota: Requer html2canvas no projeto
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element);
  const base64Image = canvas.toDataURL('image/jpeg', 0.9);

  if (isAndroidWebView()) {
    // Comunicacao com a ponte nativa Android
    window.AndroidBridge.saveBase64Image(base64Image, `resumo_${Date.now()}.jpg`);
  } else {
    // Download padrao no navegador
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = `resumo_${Date.now()}.jpg`;
    link.click();
  }
};

/**
 * Abre o WhatsApp para envio de mensagens
 * @param {string} phone - Numero com DDI e DDD (ex: 5511999999999)
 * @param {string} message - Mensagem pre-formatada
 */
export const abrirComunicacaoWhatsapp = (phone, message) => {
  const encodedMessage = encodeURIComponent(message);
  
  if (isAndroidWebView()) {
    // Tenta abrir via intent do sistema ou esquema de URL
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    window.AndroidBridge.openExternalApp(whatsappUrl);
  } else {
    // Abre no navegador desktop ou mobile
    const webUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(webUrl, '_blank');
  }
};