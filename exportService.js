import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportEmployeeSummary = async (elementId, employeeName) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', [60, 100]);
  pdf.addImage(imgData, 'PNG', 0, 0, 60, 100);
  pdf.save(`resumo_${employeeName}.pdf`);
};

// CSS for the summary card component
/*
.employee-summary-card {
  width: 60mm;
  height: 100mm;
  padding: 5mm;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Arial', sans-serif;
}
.employee-photo {
  width: 40mm;
  height: 40mm;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 5mm;
}
.employee-info {
  width: 100%;
  font-size: 10pt;
  color: #333;
}
*/