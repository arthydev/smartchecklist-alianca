
import { ChecklistEntry, AppSettings, Equipment, ChecklistItem, ApprovalStatus, User, Absence } from '../types';
import { CHECKLIST_ITEMS } from '../constants';

const STORAGE_KEYS = {
  CHECKLISTS: 'alianca_checklists',
  SETTINGS: 'alianca_manager_settings',
  USERS: 'alianca_users',
  EQUIPMENT: 'alianca_equipment',
  ABSENCES: 'alianca_absences'
};

class BackendService {
  private checklists: ChecklistEntry[] = [];
  private users: User[] = [
    { id: '1', name: 'Administrador Master', username: 'admin', password: 'admin', role: 'MANAGER', phone: '5511999999999' }
  ];
  private equipments: Equipment[] = [
    { id: '1', code: 'COL-01', description: 'Zebra TC21', active: true, type: 'PRIMARY', managerId: '1' },
    { id: '2', code: 'COL-02', description: 'Zebra TC26', active: true, type: 'PRIMARY', managerId: '1' },
    { id: '3', code: 'COL-03', description: 'Honeywell EDA51', active: true, type: 'PRIMARY', managerId: '1' },
    { id: '4', code: 'RES-01', description: 'Backup Zebra TC21', active: true, type: 'BACKUP', managerId: '1' }
  ];
  private absences: Absence[] = [];

  private managerSettings: Record<string, { items: Omit<ChecklistItem, 'status'>[], substitute: any, scrapRecipients?: string[], scrapClients?: string[] }> = {
    '1': {
      items: CHECKLIST_ITEMS.map(i => ({ ...i, area: 'PRODUÇÃO' })),
      substitute: { name: 'Gestor Produção', phone: '5511999999999', isActive: true },
      scrapRecipients: ['faturamento@acosalianca.com.br'],
      scrapClients: ['Usiminas', 'Aetra', 'Magneti Marelli']
    }
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const checks = localStorage.getItem(STORAGE_KEYS.CHECKLISTS);
    const mSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    const eqs = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    const abs = localStorage.getItem(STORAGE_KEYS.ABSENCES);

    if (checks) this.checklists = JSON.parse(checks);
    if (mSettings) this.managerSettings = JSON.parse(mSettings);
    if (eqs) this.equipments = JSON.parse(eqs);
    if (abs) this.absences = JSON.parse(abs);

    if (users) {
      const storedUsers = JSON.parse(users);
      if (storedUsers.length > 0) {
        const hardcodedUsernames = new Set(this.users.map(u => u.username));
        this.users = [
          ...this.users,
          ...storedUsers.filter((u: User) => !hardcodedUsernames.has(u.username))
        ];
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(this.checklists));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.managerSettings));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(this.equipments));
    localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(this.absences));
  }

  // Users
  authenticate(username: string, password: string): User | null {
    const user = this.users.find(u => u.username === username && u.password === password);
    return user ? { ...user } : null;
  }

  getUsers(managerId: string) {
    return this.users.filter(u => u.id === managerId || u.managerId === managerId);
  }

  addUser(user: User) {
    this.users.push(user);
    this.saveToStorage();
  }

  updateUser(id: string, updates: Partial<User>) {
    this.users = this.users.map(u => u.id === id ? { ...u, ...updates } : u);
    this.saveToStorage();
  }

  removeUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    this.saveToStorage();
  }

  // Checklists
  getChecklists(managerId: string) {
    return this.checklists.filter(c => c.managerId === managerId);
  }

  addChecklist(entry: ChecklistEntry) {
    this.checklists = [entry, ...this.checklists];
    this.saveToStorage();
    return entry;
  }

  updateChecklist(id: string, updates: Partial<ChecklistEntry>) {
    this.checklists = this.checklists.map(c => c.id === id ? { ...c, ...updates } : c);
    this.saveToStorage();
  }

  // Settings
  getManagerSettings(managerId: string): AppSettings {
    const config = this.managerSettings[managerId] || {
      items: [],
      substitute: { name: '', phone: '', isActive: false }
    };

    return {
      items: config.items || [],
      substitute: config.substitute || { name: '', phone: '', isActive: false },
      equipment: this.equipments.filter(e => e.managerId === managerId),
      absences: this.absences.filter(a => a.managerId === managerId),
      scrapRecipients: config.scrapRecipients || [],
      scrapClients: config.scrapClients || []
    };
  }

  updateManagerSettings(managerId: string, updates: Partial<AppSettings>) {
    const current = this.managerSettings[managerId] || { items: [], substitute: { name: '', phone: '', isActive: false } };

    if (updates.items !== undefined) current.items = updates.items;
    if (updates.substitute !== undefined) current.substitute = updates.substitute;
    if (updates.scrapRecipients !== undefined) (current as any).scrapRecipients = updates.scrapRecipients;
    if (updates.scrapClients !== undefined) (current as any).scrapClients = updates.scrapClients;

    this.managerSettings[managerId] = current;

    if (updates.equipment) {
      this.equipments = [
        ...this.equipments.filter(e => e.managerId !== managerId),
        ...updates.equipment
      ];
    }

    if (updates.absences) {
      this.absences = [
        ...this.absences.filter(a => a.managerId !== managerId),
        ...updates.absences
      ];
    }

    this.saveToStorage();
  }

  // Absences
  addAbsence(absence: Absence) {
    this.absences.push(absence);
    this.saveToStorage();
  }

  removeAbsence(id: string) {
    this.absences = this.absences.filter(a => a.id !== id);
    this.saveToStorage();
  }

  isEntityInAbsence(entityId: string, date: string = new Date().toISOString().split('T')[0]): boolean {
    return this.absences.some(a =>
      a.entityId === entityId &&
      date >= a.startDate &&
      date <= a.endDate
    );
  }

  hasChecklistForShiftToday(equipmentNo: string, shift: string, managerId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.checklists.some(c =>
      c.managerId === managerId &&
      c.equipmentNo === equipmentNo &&
      c.shift === shift &&
      c.date.startsWith(today)
    );
  }

  isEquipmentLocked(equipmentCode: string, managerId: string): { locked: boolean; reason?: 'PENDING' | 'REJECTED' | 'MAINTENANCE' } {
    const equipment = this.equipments.find(e => e.code === equipmentCode && e.managerId === managerId);
    if (equipment && this.isEntityInAbsence(equipment.id)) return { locked: true, reason: 'MAINTENANCE' };

    const lastCheck = this.checklists.find(c => c.equipmentNo === equipmentCode && c.managerId === managerId);
    if (!lastCheck) return { locked: false };
    if (lastCheck.approvalStatus === 'PENDING') return { locked: true, reason: 'PENDING' };
    if (lastCheck.approvalStatus === 'REJECTED') return { locked: true, reason: 'REJECTED' };
    return { locked: false };
  }

  getManagerTargetPhone(managerId: string) {
    const settings = this.managerSettings[managerId];
    if (settings?.substitute?.phone) {
      return settings.substitute.phone.replace(/\D/g, '');
    }
    return '';
  }

  // Brasiltec Users
  private brasiltecUsers: { id: string, name: string, password: string, managerId: string }[] = [];

  getBrasiltecUsers(managerId: string) {
    // Load if empty (simple lazy load logic for this example, ideally unified in loadFromStorage)
    if (this.brasiltecUsers.length === 0) {
      const stored = localStorage.getItem('alianca_brasiltec_users');
      if (stored) this.brasiltecUsers = JSON.parse(stored);
    }
    return this.brasiltecUsers.filter(u => u.managerId === managerId);
  }

  addBrasiltecUser(user: { id: string, name: string, password: string, managerId: string }) {
    this.brasiltecUsers.push(user);
    localStorage.setItem('alianca_brasiltec_users', JSON.stringify(this.brasiltecUsers));
  }

  removeBrasiltecUser(id: string) {
    this.brasiltecUsers = this.brasiltecUsers.filter(u => u.id !== id);
    localStorage.setItem('alianca_brasiltec_users', JSON.stringify(this.brasiltecUsers));
  }

  validateBrasiltecUser(id: string, password: string): boolean {
    const user = this.brasiltecUsers.find(u => u.id === id);
    return user ? user.password === password : false;
  }
}


export const backend = new BackendService();
