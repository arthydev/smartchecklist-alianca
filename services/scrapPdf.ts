import { jsPDF } from 'jspdf';
import type { User, ChecklistEntry, ScrapPdfMeta } from '../types';

export interface ScrapFormData {
  secondWeightTime: string;
  client: string;
  bucketNumber: string;
  bucketType: string;
  bucketTare: string;
  ticketNumber: string;
  truckPlate: string;
  driverName: string;
  driverCpf: string;
  truckTare: string;
  netWeight: string;
  obs: string;
}

export interface ScrapPdfResult {
  pdfBlob: Blob;
  fileName: string;
  previewUrl: string;
  pdfMeta: ScrapPdfMeta;
}

interface BuildInput {
  formData: ScrapFormData;
  evidences: string[];
  user: User;
  entryId: ChecklistEntry['id'];
}

const TEMPLATE_NAME = 'FICHA_SAIDA_SUCATA_FORNECEDOR_EQUIV';
const PDF_VERSION = 'SCRAP_PDF_V1';

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const hashSnapshot = async (snapshot: unknown): Promise<string> => {
  const text = JSON.stringify(snapshot);
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const addSectionTitle = (pdf: jsPDF, title: string, y: number): number => {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(24, 39, 60);
  pdf.text(title.toUpperCase(), 12, y);
  pdf.setDrawColor(200, 210, 220);
  pdf.line(12, y + 2, 198, y + 2);
  return y + 8;
};

const addField = (
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  labelSize = 8,
  valueSize = 10
): number => {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(labelSize);
  pdf.setTextColor(100, 110, 120);
  pdf.text(label.toUpperCase(), x, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(valueSize);
  pdf.setTextColor(15, 23, 42);
  const text = value.trim() === '' ? '-' : value;
  const lines = pdf.splitTextToSize(text, width);
  pdf.text(lines, x, y + 5);
  return y + 5 + lines.length * 4.6 + 2;
};

const addFieldWithMaxLines = (
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  maxLines: number
): number => {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 110, 120);
  pdf.text(label.toUpperCase(), x, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  const text = value.trim() === '' ? '-' : value;
  const lines = pdf.splitTextToSize(text, width).slice(0, maxLines);
  pdf.text(lines, x, y + 5);
  return y + 5 + lines.length * 4 + 2;
};

const drawImagePreserveAspect = (
  pdf: jsPDF,
  imageData: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) => {
  const props = pdf.getImageProperties(imageData);
  const imgW = props.width;
  const imgH = props.height;

  if (!imgW || !imgH) {
    throw new Error('Invalid image dimensions');
  }

  const scale = Math.min(boxW / imgW, boxH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = boxY + (boxH - drawH) / 2;

  const format = imageData.includes('image/png') ? 'PNG' : 'JPEG';
  pdf.addImage(imageData, format, drawX, drawY, drawW, drawH, undefined, 'FAST');
};

const decodeBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const renderPdfFirstPageAsImage = async (pdfDataUrl: string): Promise<string> => {
  const base64Part = pdfDataUrl.split(',')[1];
  if (!base64Part) {
    throw new Error('Invalid PDF data URL');
  }

  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);

  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = (workerModule as any).default;

  const pdfBytes = decodeBase64(base64Part);
  const loadingTask = (pdfjsLib as any).getDocument({ data: pdfBytes });
  const loadedPdf = await loadingTask.promise;
  const page = await loadedPdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
};

export const buildScrapPdf = async ({ formData, evidences, user, entryId }: BuildInput): Promise<ScrapPdfResult> => {
  const generatedAt = new Date().toISOString();
  const snapshot = {
    entryId,
    formData,
    user: { id: user.id, name: user.name },
    evidencesCount: evidences.length,
  };

  const formSnapshotHash = await hashSnapshot(snapshot);
  const fileName = `ficha-sucata-${formData.ticketNumber || entryId}.pdf`;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  pdf.setFillColor(14, 23, 41);
  pdf.rect(0, 0, 210, 18, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('FICHA DE SAIDA DE SUCATA EM CACAMBA', 12, 11);

  pdf.setTextColor(60, 70, 80);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Gerado em: ${formatDateTime(generatedAt)}  |  Colaborador: ${user.name}`, 12, 23);

  let y = 30;
  y = addSectionTitle(pdf, 'Dados da Cacamba', y);
  const leftX = 12;
  const rightX = 106;

  const y1 = addField(pdf, 'Numero da Cacamba', formData.bucketNumber, leftX, y, 80, 13, 15);
  const y2 = addField(pdf, 'Tipo da Cacamba', formData.bucketType, rightX, y, 80, 13, 15);
  y = Math.max(y1, y2) + 2;

  const y3 = addField(pdf, 'Tara Cacamba (kg)', formData.bucketTare, leftX, y, 80, 13, 15);
  const y4 = addField(pdf, 'Cliente/Destino', formData.client, rightX, y, 80, 13, 15);
  y = Math.max(y3, y4) + 2;

  y = addSectionTitle(pdf, 'Dados do Transporte', y);
  const y5 = addField(pdf, 'Ticket Balanca', formData.ticketNumber, leftX, y, 80, 13, 15);
  const y6 = addField(pdf, 'Placa Veiculo', formData.truckPlate, rightX, y, 80, 13, 15);
  y = Math.max(y5, y6) + 2;

  const y7 = addField(pdf, 'Motorista', formData.driverName, leftX, y, 80, 13, 15);
  const y8 = addField(pdf, 'CPF Motorista', formData.driverCpf, rightX, y, 80, 13, 15);
  y = Math.max(y7, y8) + 2;

  const y9 = addField(pdf, 'Hora 2a Pesagem', formData.secondWeightTime, leftX, y, 80, 13, 15);
  const y10 = addField(pdf, 'Tara Caminhao (kg)', formData.truckTare, rightX, y, 80, 13, 15);
  y = Math.max(y9, y10) + 2;

  const y11 = addField(pdf, 'Peso Liquido (kg)', formData.netWeight, leftX, y, 80, 13, 15);
  y = y11 + 2;

  y = addSectionTitle(pdf, 'Observacoes', y);
  y = addFieldWithMaxLines(pdf, 'Observacoes gerais', formData.obs, leftX, y, 186, 2);

  // Ticket evidence page (full page).
  pdf.addPage('a4', 'portrait');
  pdf.setFillColor(14, 23, 41);
  pdf.rect(0, 0, 210, 18, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('TICKET DA BALANCA - EVIDENCIA', 12, 11);
  pdf.setTextColor(80, 90, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Documento: ${fileName}`, 12, 23);
  pdf.text(`Gerado em: ${formatDateTime(generatedAt)}`, 12, 27);

  const ticketX = 12;
  const ticketY = 34;
  const ticketW = 186;
  const ticketH = 248;
  pdf.setDrawColor(210, 220, 230);
  pdf.rect(ticketX, ticketY, ticketW, ticketH);

  const ticketEvidence = evidences[4];
  if (ticketEvidence) {
    if (ticketEvidence.startsWith('data:application/pdf')) {
      try {
        const ticketImage = await renderPdfFirstPageAsImage(ticketEvidence);
        drawImagePreserveAspect(pdf, ticketImage, ticketX + 1, ticketY + 1, ticketW - 2, ticketH - 2);
      } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(45, 55, 72);
        pdf.text('Falha ao incorporar ticket em PDF', ticketX + 45, ticketY + 116);
      }
    } else {
      try {
        drawImagePreserveAspect(pdf, ticketEvidence, ticketX + 1, ticketY + 1, ticketW - 2, ticketH - 2);
      } catch {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Falha ao renderizar ticket', ticketX + 70, ticketY + ticketH / 2);
      }
    }
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nao informado', ticketX + 84, ticketY + ticketH / 2);
  }

  // Other evidences page.
  pdf.addPage('a4', 'portrait');
  pdf.setFillColor(14, 23, 41);
  pdf.rect(0, 0, 210, 18, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('EVIDENCIAS FOTOGRAFICAS - FICHA SUCATA', 12, 11);
  pdf.setTextColor(80, 90, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Documento: ${fileName}`, 12, 23);
  pdf.text(`Gerado em: ${formatDateTime(generatedAt)}`, 12, 27);

  const evidenceSlots = [
    { label: '1. Superior', sourceIndex: 0, x: 12, y: 36, w: 90, h: 102 },
    { label: '2. Lateral', sourceIndex: 1, x: 108, y: 36, w: 90, h: 102 },
    { label: '3. Frontal', sourceIndex: 2, x: 12, y: 146, w: 90, h: 102 },
    { label: '4. Traseira', sourceIndex: 3, x: 108, y: 146, w: 90, h: 102 },
  ];

  evidenceSlots.forEach((slot) => {
    pdf.setDrawColor(210, 220, 230);
    pdf.rect(slot.x, slot.y, slot.w, slot.h);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(90, 100, 110);
    pdf.text(slot.label, slot.x, slot.y - 1.5);

    const evidence = evidences[slot.sourceIndex];
    if (evidence && !evidence.startsWith('data:application/pdf')) {
      try {
        drawImagePreserveAspect(pdf, evidence, slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 2);
      } catch {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Falha ao renderizar imagem', slot.x + 6, slot.y + slot.h / 2);
      }
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Nao informada', slot.x + (slot.w / 2) - 12, slot.y + slot.h / 2);
    }
  });

  const pdfBlob = pdf.output('blob');
  const previewUrl = URL.createObjectURL(pdfBlob);

  return {
    pdfBlob,
    fileName,
    previewUrl,
    pdfMeta: {
      version: PDF_VERSION,
      templateName: TEMPLATE_NAME,
      generatedAt,
      generatedBy: { id: user.id, name: user.name },
      fileName,
      formSnapshotHash,
    },
  };
};
