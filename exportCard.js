function exportEmployeeCard(employeeData) {
  const container = document.createElement('div');
  container.id = 'export-container';
  container.style.width = '17cm';
  container.style.height = '12cm';
  container.style.padding = '15px';
  container.style.backgroundColor = '#ffffff';
  container.style.border = '2px solid #28a745';
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.gap = '20px';
  container.style.boxSizing = 'border-box';
  container.style.position = 'absolute';
  container.style.left = '-9999px';

  container.innerHTML = `
    <div style="width: 40%; display: flex; align-items: center; justify-content: center;">
      <img src="${employeeData.photoUrl}" style="width: 100%; height: auto; border-radius: 8px; border: 2px solid #28a745;" />
    </div>
    <div style="width: 60%; color: #333; font-family: sans-serif;">
      <h2 style="color: #28a745; margin-top: 0;">${employeeData.name}</h2>
      <p><strong>Cargo:</strong> ${employeeData.role}</p>
      <p><strong>Grupo:</strong> ${employeeData.group}</p>
      <p><strong>Status:</strong> ${employeeData.status}</p>
      <p><strong>Endereço:</strong> ${employeeData.address}</p>
    </div>
  `;

  document.body.appendChild(container);

  html2canvas(container, { scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `funcionario_${employeeData.name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    document.body.removeChild(container);
  });
}