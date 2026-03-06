
import { ChecklistItem } from './types';

export const CHECKLIST_ITEMS: Omit<ChecklistItem, 'status'>[] = [
  { id: 1, description: 'A capa protetora apresenta alguma avaria?' },
  { id: 2, description: 'A alça de apoio apresenta alguma avaria?' },
  { id: 3, description: 'Integridade da tela.' },
  { id: 4, description: 'Integridade dos botões.' },
  { id: 5, description: 'Integridade dos gatilhos de leitura.' },
  { id: 6, description: 'Integridade do laser de leitura.' },
  { id: 7, description: 'Integridade da camera.' },
  { id: 8, description: 'Integridade da bateria.' },
];

export const SHIFTS = ['1º Turno', '2º Turno', '3º Turno', 'Central', 'Revezamento'];
export const AREAS = ['PRODUÇÃO', 'MATERIAIS', 'LOGÍSTICA', 'QUALIDADE', 'SUCATA'];
export const EQUIPMENT_CATEGORIES = [
  'COLETOR',
  'PONTE ROLANTE',
  'EMPILHADEIRA',
  'REBOCADOR',
  'TABLET',
  'CAMINHÃO',
  'CARRETA'
];
