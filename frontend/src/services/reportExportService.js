import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * 📄 1. Exportar Ficha Zootécnica y Genealógica Individual en PDF
 */
export function exportFichaAnimalPDF(animal, genealogia = null, pesajes = [], eventosSanitarios = []) {
  const doc = new jsPDF();

  // Membrete Superior CowIA
  doc.setFillColor(11, 18, 28);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(16, 185, 129);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CowIA', 15, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma Integral de Ganadería Inteligente & Zootecnia', 15, 26);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 145, 26);

  // Título de la Ficha
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`FICHA TÉCNICA OFICIAL: ${animal.arete_visual || animal.areteVisual || 'RES-001'}`, 15, 48);

  // 1. Datos Biológicos e Identificación
  const datosBasicos = [
    ['Arete Visual / Caravana', animal.arete_visual || animal.areteVisual || 'N/A', 'Número de Hierro', animal.numero_hierro || animal.numeroHierro || 'Sin marca'],
    ['Raza Zootécnica', animal.raza || 'Brahman', 'Categoría', animal.categoria || 'Novillo'],
    ['Sexo Biológico', animal.sexo || 'Macho', 'Fecha Nacimiento', animal.fecha_nacimiento ? new Date(animal.fecha_nacimiento).toLocaleDateString() : 'N/A'],
    ['Propietario Actual', animal.propietario_nombre || 'Agropecuaria Principal', 'Collar IoT Vinculado', animal.collar_id || 'Sin collar'],
    ['Estado en el Hato', animal.activo !== false ? 'ACTIVO EN CAMPO' : `BAJA (${animal.motivo_baja || 'Salida'})`, 'Peso Actual', `${parseFloat(animal.peso_actual || 350).toFixed(1)} kg`]
  ];

  autoTable(doc, {
    startY: 54,
    head: [['Propiedad', 'Detalle', 'Propiedad', 'Detalle']],
    body: datosBasicos,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  // 2. Pedigrí y Genealogía
  let currentY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('🧬 Árbol Genealógico y Linaje', 15, currentY);

  const madreStr = genealogia?.padres?.madre ? `${genealogia.padres.madre.areteVisual} (${genealogia.padres.madre.raza})` : 'No registrada';
  const padreStr = genealogia?.padres?.padre ? `${genealogia.padres.padre.areteVisual} (${genealogia.padres.padre.raza})` : 'No registrado';
  const abueloPat = genealogia?.abuelos?.paternos?.abuelo?.areteVisual || 'Desc.';
  const abuelaPat = genealogia?.abuelos?.paternos?.abuela?.areteVisual || 'Desc.';
  const abueloMat = genealogia?.abuelos?.maternos?.abuelo?.areteVisual || 'Desc.';
  const abuelaMat = genealogia?.abuelos?.maternos?.abuela?.areteVisual || 'Desc.';

  const tablaGenealogia = [
    ['Madre', madreStr, 'Abuelos Maternos', `${abueloMat} (Abuelo) / ${abuelaMat} (Abuela)`],
    ['Padre', padreStr, 'Abuelos Paternos', `${abueloPat} (Abuelo) / ${abuelaPat} (Abuela)`]
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Ascendencia Directa', 'Identificación', 'Generación Previa', 'Identificación']],
    body: tablaGenealogia,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 }
  });

  // 3. Historial de Pesajes
  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.text('⚖️ Historial de Pesajes y Curva de Crecimiento', 15, currentY);

  const rowsPesajes = pesajes.length > 0 
    ? pesajes.map(p => [new Date(p.fecha_pesaje).toLocaleDateString(), `${parseFloat(p.peso).toFixed(1)} kg`, p.notas || 'Pesaje de control'])
    : [[new Date().toLocaleDateString(), `${parseFloat(animal.peso_actual || 350).toFixed(1)} kg`, 'Pesaje inicial']];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Fecha de Pesada', 'Peso Registrado', 'Observaciones']],
    body: rowsPesajes,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  // Pie de página de validez técnica
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Documento emitido automáticamente por CowIA • Página ${i} de ${pageCount} • Trazabilidad Ganadera Certificada`, 15, 290);
  }

  doc.save(`Ficha_Zootecnica_${animal.arete_visual || animal.areteVisual || 'RES'}.pdf`);
}

/**
 * 📊 2. Exportar Inventario Ganadero Completo a Excel (.xlsx)
 */
export function exportInventarioGanaderoExcel(animalesList = [], nombreFinca = 'CowIA_Ganado') {
  const data = animalesList.map((a, idx) => ({
    'N°': idx + 1,
    'Arete Visual': a.arete_visual || a.areteVisual || '',
    'Hierro': a.numero_hierro || a.numeroHierro || 'Sin marca',
    'Raza': a.raza || '',
    'Sexo': a.sexo || '',
    'Categoría': a.categoria || '',
    'Fecha Nacimiento': a.fecha_nacimiento ? new Date(a.fecha_nacimiento).toLocaleDateString() : '',
    'Peso Actual (kg)': parseFloat(a.peso_actual || 0).toFixed(1),
    'Propietario': a.propietario_nombre || 'Agropecuaria Principal',
    'Collar IoT': a.collar_id || 'Sin collar',
    'Batería (%)': a.nivel_bateria ?? 'N/A',
    'Estado Cerca': a.estado_cerca || 'DENTRO',
    'Activo': a.activo !== false ? 'SÍ' : 'BAJA'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario Ganadero');

  // Auto-ajustar ancho de columnas
  const max_width = data.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
  worksheet['!cols'] = [
    { wch: 5 },  // N
    { wch: 16 }, // Arete
    { wch: 14 }, // Hierro
    { wch: 15 }, // Raza
    { wch: 10 }, // Sexo
    { wch: 12 }, // Categoria
    { wch: 16 }, // Fecha Nac
    { wch: 14 }, // Peso
    { wch: 25 }, // Propietario
    { wch: 15 }, // Collar
    { wch: 12 }, // Bateria
    { wch: 15 }, // Estado Cerca
    { wch: 10 }  // Activo
  ];

  XLSX.writeFile(workbook, `Inventario_Ganadero_${nombreFinca}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 📡 3. Exportar Inventario de Collares IoT a Excel (.xlsx)
 */
export function exportInventarioCollaresExcel(collaresList = []) {
  const data = collaresList.map((c, idx) => ({
    'N°': idx + 1,
    'ID Collar': c.id,
    'Estado Ciclo': c.estado,
    'Lote Origen': c.lote_codigo || c.lote_id || 'Directo',
    'Res Asignada': c.arete_visual || 'En Almacén',
    'Finca / Tenant': c.tenant_nombre || 'CowIA Central',
    'Nivel Batería (%)': c.nivel_bateria ?? 100,
    'Señal Celular': `${c.senal_celular ?? 4}/5`,
    'Línea SIM': c.numero_sim || 'N/A',
    'IMEI Módem': c.imei || 'N/A',
    'Versión Firmware': c.version_firmware || '1.0.0',
    'Última Conexión': c.ultima_conexion ? new Date(c.ultima_conexion).toLocaleString() : 'Recién Registrado'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Collares IoT');

  worksheet['!cols'] = [
    { wch: 5 },  // N
    { wch: 16 }, // ID
    { wch: 16 }, // Estado
    { wch: 18 }, // Lote
    { wch: 16 }, // Res
    { wch: 25 }, // Tenant
    { wch: 16 }, // Bateria
    { wch: 14 }, // Señal
    { wch: 18 }, // SIM
    { wch: 20 }, // IMEI
    { wch: 15 }, // Firmware
    { wch: 22 }  // Conexion
  ];

  XLSX.writeFile(workbook, `Flota_Collares_IoT_CowIA_${new Date().toISOString().split('T')[0]}.xlsx`);
}
