document.getElementById('currentUserLabel').style.backgroundColor = '#28a745'; 
async function loadPublicPeople() {
    const people = await api("/api/people/public");
    state.people = people || [];
    populateLogin();
} 
// 3. Navegação inteligente das Pills
document.addEventListener('click', function(e) {
    const pill = e.target.closest('.user-pill');
    if (!pill) return;
    const text = pill.innerText.toLowerCase();
    if (text.includes('equipe')) navTo('people');
    else if (text.includes('grupo')) navTo('org');
    else navTo('dashboard');
});
function handlePillClick(element) { const text = element.innerText || element.textContent; if (text === 'Equipe') navTo('people'); else if (text === 'Grupos') navTo('org'); else if (text === 'Ativos') navTo('dashboard'); } 

function exportSummaryJpg(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 642; // 17cm em pixels (96dpi)
    canvas.height = 453; // 12cm em pixels (96dpi)
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#28a745';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(data.name, 20, 40);
    
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.fillText('Endereço: ' + (data.address || 'Não informado'), 20, 80);
const safeMap = (arr, callback) => (arr || []).map(callback);