
import { ChecklistEntry } from '../types';

/**
 * Alerta enviado do Campo para o Gestor (Quando há NC)
 * FOCO: Apenas informação técnica, sem links.
 */
export const sendWhatsAppAlert = (entry: ChecklistEntry, targetPhone: string) => {
  const dateStr = new Date(entry.createdAt).toLocaleString('pt-BR');

  // Define a função com base na área
  const roleTitle = entry.area === 'QUALIDADE' ? 'Inspetor' : entry.area === 'MATERIAIS' ? 'Apontador' : 'Operador';

  let message = `*🚨 ALIANÇA: ${entry.area?.toUpperCase() || 'LOGÍSTICA'} (${roleTitle.toUpperCase()})*\n`;
  message += `--------------------------\n`;
  message += `*Veículo:* ${entry.equipmentNo}\n`;
  message += `*Responsável:* ${entry.userName}\n`;
  message += `*Data/Hora:* ${dateStr}\n`;
  message += `\n*ITENS NÃO CONFORMES:*\n`;

  const ncItems = entry.items.filter(i => i.status === 'NC');
  const ncCustom = entry.customData ? Object.entries(entry.customData).filter(([k, v]) => v === 'NC' || v === 'Não Conforme') : [];

  ncItems.forEach(i => {
    message += `- ${i.description}\n`;
  });

  ncCustom.forEach(([k, v]) => {
    // Tenta formatar a chave leetcode style camelCase para Texto
    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    message += `- ${label}\n`;
  });

  // Calculate total photos
  const totalPhotos = entry.evidence.length;

  message += `\n*OBSERVAÇÕES:* ${entry.observations || 'Nenhuma'}\n`;
  message += `\n--------------------------\n`;
  message += `*EVIDÊNCIAS:* ${totalPhotos} fotos anexadas pelo ${roleTitle}.\n`;
  message += `*AÇÃO REQUERIDA:* Analise as evidências e responda se o veículo está LIBERADO ou BLOQUEADO para carregamento.`;

  // Abre o WhatsApp
  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');
};

/**
 * Resposta formalizada (opcional) para registro
 */
export const sendWhatsAppResponse = (entry: ChecklistEntry, status: 'APPROVED' | 'REJECTED', managerName: string) => {
  const isApproved = status === 'APPROVED';

  let message = `*📢 DECISÃO TÉCNICA: ${entry.equipmentNo}*\n`;
  message += `--------------------------\n`;
  message += `*Status:* ${isApproved ? '✅ LIBERADO PARA USO' : '❌ USO PROIBIDO'}\n`;
  message += `*Responsável:* ${managerName}\n`;

  if (!isApproved) {
    message += `\nO coletor deve ser encaminhado para manutenção imediata.`;
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};
