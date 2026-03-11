
import { ChecklistEntry, AppSettings, Equipment, ChecklistItem, ApprovalStatus, User, Absence, ScrapClientDirectoryEntry } from '../types';
import { CHECKLIST_ITEMS } from '../constants';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').trim();

const normalizeApiBaseUrl = (value: string): string => {
  if (value === '') {
    return '/api';
  }

  if (value.startsWith('/')) {
    return value.replace(/\/$/, '');
  }

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, '');
  }

  // Support host:port/path values accidentally configured without protocol.
  if (/^[a-z0-9.-]+(?::\d+)?(\/.*)?$/i.test(value)) {
    return `http://${value}`.replace(/\/$/, '');
  }

  return value.replace(/\/$/, '');
};

const API_URL = normalizeApiBaseUrl(configuredBase);
console.log('API base URL:', API_URL);

class BackendService {
  private normalizeScrapDirectory(source: any): ScrapClientDirectoryEntry[] {
    if (Array.isArray(source.scrapDirectory)) {
      return source.scrapDirectory
        .filter((entry: any) => entry && typeof entry === 'object')
        .map((entry: any, index: number) => ({
          id: typeof entry.id === 'string' && entry.id.trim() !== '' ? entry.id : `SCRAP-${index + 1}`,
          client: typeof entry.client === 'string' ? entry.client.trim().toUpperCase() : '',
          recipients: Array.isArray(entry.recipients)
            ? entry.recipients.map((value: any) => String(value).trim()).filter(Boolean)
            : [],
          active: entry.active !== false,
        }))
        .filter((entry) => entry.client !== '');
    }

    return [];
  }

  private async parseJsonSafe(response: Response): Promise<any | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private getErrorMessage(response: Response, payload: any): string {
    if (payload && typeof payload === 'object' && typeof payload.error === 'string' && payload.error.trim() !== '') {
      return payload.error;
    }
    return `HTTP ${response.status}`;
  }

  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(path, init);
    const payload = await this.parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(this.getErrorMessage(response, payload));
    }
    if (payload === null) {
      throw new Error('Invalid JSON response');
    }
    return payload as T;
  }

  private normalizeSettings(payload: any): AppSettings {
    const source = payload && typeof payload === 'object' ? payload : {};
    const substitute = source.substitute && typeof source.substitute === 'object' ? source.substitute : {};

    return {
      ...source,
      items: Array.isArray(source.items) ? source.items : [],
      equipment: Array.isArray(source.equipment) ? source.equipment : [],
      absences: Array.isArray(source.absences) ? source.absences : [],
      scrapDirectory: this.normalizeScrapDirectory(source),
      substitute: {
        name: typeof substitute.name === 'string' ? substitute.name : '',
        phone: typeof substitute.phone === 'string' ? substitute.phone : '',
        isActive: Boolean(substitute.isActive),
      },
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
    });
  }

  // --- Auth ---
  async authenticate(username: string, password: string): Promise<User | null> {
    try {
      const data = await this.requestJson<any>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      // Compat: Node antigo retornava user direto; PHP novo retorna { ok, user }
      return data?.user ?? data ?? null;
    } catch (e) {
      console.error('Auth error:', e);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await this.requestJson<any>('/auth/me');
      return data?.authenticated ? data.user : null;
    } catch (e) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // no-op
    }
  }

  // --- Health ---
  async checkHealth(): Promise<{ isConnected: boolean; error?: string }> {
    try {
      const response = await this.request('/health');
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        let errorMsg = `Erro HTTP: ${response.status}`;
        if (isJson) {
          try {
            const errData = await response.json();
            if (errData.error) errorMsg = errData.error;
          } catch (e) { }
        } else {
          errorMsg += " (Servidor Indisponível/Página HTML Retornada)";
        }
        return { isConnected: false, error: errorMsg };
      }

      if (!isJson) {
        return { isConnected: false, error: "Servidor fora do ar (A API retornou um documento não-JSON)" };
      }

      const data = await response.json();
      const isConnected = data.status === 'ok' && (
        data.database === 'connected' ||
        data.db?.ok === true ||
        data.db?.enabled === false
      );
      return {
        isConnected,
        error: isConnected ? undefined : (data.error || 'Desconectado sem mensagem')
      };
    } catch (e: any) {
      if (e.message && e.message.includes('Unexpected token')) {
        return { isConnected: false, error: 'Servidor indisponível ou rota incorreta (Erro de parsing JSON)' };
      }
      if (e.message && e.message.includes('Failed to fetch')) {
        return { isConnected: false, error: 'O backend PHP está desligado ou inacessível.' };
      }
      return { isConnected: false, error: e.message || 'Falha de conexão na rede' };
    }
  }

  // --- Checklists ---
  async getChecklists(managerId: string): Promise<ChecklistEntry[]> {
    try {
      const response = await this.request(`/checklists?managerId=${managerId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error('Get Checklists error:', e);
      return [];
    }
  }

  async addChecklist(entry: ChecklistEntry): Promise<ChecklistEntry> {
    return await this.requestJson<ChecklistEntry>('/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  }

  async updateChecklist(id: string, updates: Partial<ChecklistEntry>): Promise<void> {
    // Ideally we should use PATCH /checklists/:id, but for now we reuse POST (Upsert) 
    // or just assume the caller has the full object? 
    // The current UI code passes "updates" which might be partial.
    // Our Node server's POST /checklists expects a full object for the JSON replacement.
    // This is a partial mismatch. 
    // To fix this correctly without massive backend work:
    // We should fetch, merge, and save. OR implement PATCH on backend.
    // For fast migration: Let's assume the frontend context (React state) usually has the full object when editing.
    // But updateChecklist signature is `Partial`.
    // Let's implement a PATCH on the backend side or fetch-merge-save here.
    // Fetch-merge-save here is slower but safer for now.

    // NOTE: This is a simplification. Real apps should do this on server.
    // But since we don't have getChecklistById easily without filtering...
    // Let's try to assume for now we might need to change the API later.
    // Current Usage in App.tsx: `handleUpdateChecklist` receives `updated: ChecklistEntry`. 
    // It seems `App.tsx` passes the FULL object.

    if ((updates as ChecklistEntry).managerId) {
      await this.addChecklist(updates as ChecklistEntry);
    }
  }

  // --- Settings ---
  async getManagerSettings(managerId: string): Promise<AppSettings> {
    try {
      const response = await this.request(`/settings?managerId=${managerId}`);
      if (!response.ok) {
        return this.normalizeSettings({});
      }
      const payload = await response.json();
      return this.normalizeSettings(payload);
    } catch (e) {
      return this.normalizeSettings({});
    }
  }

  async updateManagerSettings(managerId: string, updates: Partial<AppSettings>): Promise<void> {
    await this.requestJson('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId, updates })
    });
  }

  // --- Helpers (Stateless) ---

  hasChecklistForShiftToday(
    equipmentNo: string,
    shift: string,
    managerId: string,
    checklists: ChecklistEntry[]
  ): boolean {
    const today = new Date().toISOString().split('T')[0];
    return checklists.some(c =>
      c.managerId === managerId &&
      c.equipmentNo === equipmentNo &&
      c.shift === shift &&
      c.date.startsWith(today)
    );
  }

  getManagerTargetPhone(managerId: string, settings: AppSettings) {
    if (settings?.substitute?.phone) {
      return settings.substitute.phone.replace(/\D/g, '');
    }
    return '';
  }

  isEquipmentLocked(
    equipmentCode: string,
    managerId: string,
    equipments: Equipment[],
    checklists: ChecklistEntry[],
    absences: Absence[]
  ): { locked: boolean; reason?: 'PENDING' | 'REJECTED' | 'MAINTENANCE' } {

    // Logic copied from old backend but using passed arguments
    const equipment = equipments.find(e => e.code === equipmentCode && e.managerId === managerId);

    // isEntityInAbsence logic inline
    const today = new Date().toISOString().split('T')[0];
    const isMaintenance = absences.some(a =>
      equipment && a.entityId === equipment.id && today >= a.startDate && today <= a.endDate
    );

    if (equipment && isMaintenance) return { locked: true, reason: 'MAINTENANCE' };

    const lastCheck = checklists.find(c => c.equipmentNo === equipmentCode && c.managerId === managerId);
    if (!lastCheck) return { locked: false };
    if (lastCheck.approvalStatus === 'PENDING') return { locked: true, reason: 'PENDING' };
    if (lastCheck.approvalStatus === 'REJECTED') return { locked: true, reason: 'REJECTED' };
    return { locked: false };
  }
  // --- Users ---
  async getUsers(managerId: string): Promise<User[]> {
    try {
      const response = await this.request(`/users?managerId=${managerId}`);
      if (!response.ok) {
        // Fallback to empty if endpoint not ready or error
        return [];
      }
      return await response.json();
    } catch (e) {
      console.error('Get Users error:', e);
      return [];
    }
  }

  isEntityInAbsence(entityId: string, date: string, absences: Absence[]): boolean {
    return absences.some(a =>
      a.entityId === entityId &&
      date >= a.startDate &&
      date <= a.endDate
    );
  }
  // --- Users Management ---
  async addUser(user: User): Promise<void> {
    await this.requestJson('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await this.requestJson(`/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  }

  async removeUser(id: string): Promise<void> {
    await this.requestJson(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Absences ---
  async addAbsence(absence: Absence): Promise<void> {
    await this.requestJson('/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(absence)
    });
  }

  async removeAbsence(id: string): Promise<void> {
    await this.requestJson(`/absences/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Brasiltec ---
  async getBrasiltecUsers(managerId?: string, allForQualidade: boolean = false): Promise<any[]> {
    try {
      let path = '/brasiltec';
      if (allForQualidade) {
        path += '?all=1';
      } else if (managerId) {
        path += `?managerId=${encodeURIComponent(managerId)}`;
      }
      const response = await this.request(path);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error('Get Brasiltec error:', e);
      return [];
    }
  }

  async validateBrasiltecUser(userId: string, password: string, managerId: string): Promise<boolean> {
    try {
      const response = await this.request('/brasiltec/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, managerId }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return Boolean(data?.ok);
    } catch (e) {
      return false;
    }
  }

  async addBrasiltecUser(user: any): Promise<void> {
    await this.requestJson('/brasiltec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  }

  async removeBrasiltecUser(id: string): Promise<void> {
    await this.requestJson(`/brasiltec/${id}`, {
      method: 'DELETE'
    });
  }
}

export const backend = new BackendService();

