
export type Status = 'C' | 'NC' | null;
export type Role = 'MANAGER' | 'OPERATOR';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EquipmentType = 'PRIMARY' | 'BACKUP';
export type AbsenceReason = 'VACATION' | 'LEAVE' | 'MAINTENANCE';

export interface Absence {
  id: string;
  entityId: string; // ID do Usuário ou do Equipamento
  type: 'USER' | 'EQUIPMENT';
  reason: AbsenceReason;
  startDate: string;
  endDate: string;
  managerId: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  phone?: string;
  email?: string;
  managerId?: string; // For Operators, this is the ID of the Manager who created them
  area?: string;
}

export interface Equipment {
  id: string;
  code: string;
  category?: string;
  description: string;
  active: boolean;
  type: EquipmentType;
  managerId: string;
}

export interface ChecklistItem {
  id: number;
  description: string;
  status: Status;
  area?: string;
}

export interface SubstituteConfig {
  name: string;
  phone: string;
  isActive: boolean;
}

export interface AppSettings {
  items: (Omit<ChecklistItem, 'status'> & { area?: string })[];
  equipment: Equipment[];
  substitute: SubstituteConfig;
  absences: Absence[];
  scrapRecipients?: string[];
  scrapClients?: string[];
}

export interface BrasiltecUser {
  id: string;
  name: string;
  password: string; // Simple hash/storage
  managerId: string;
}

export interface ChecklistEntry {
  id: string;
  userId: string;
  userName: string;
  date: string;
  equipmentNo: string;
  area: string;
  shift: string;
  items: ChecklistItem[];
  observations: string;
  evidence?: string[];
  approvalStatus: ApprovalStatus;
  supervisorName?: string;
  createdAt: number;
  managerId: string;
  customData?: any;
  brasiltec?: {
    present: boolean;
    userId?: string;
    justification?: string;
  };
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  NEW_CHECK = 'NEW_CHECK',
  HISTORY = 'HISTORY',
  VALIDATION = 'VALIDATION',
  SETTINGS = 'SETTINGS'
}
