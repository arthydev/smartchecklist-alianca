import React, { useEffect, useMemo, useState } from 'react';
import { AppSettings, User, Role, Absence, AbsenceReason } from '../types';
import { backend } from '../services/backend';
import { AREAS } from '../constants.tsx';
import { Calendar, MessageSquare, Plus, Trash2, Users, Wrench } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  user: User | null;
}

const SettingsView: React.FC<Props> = ({ settings, onUpdate, user }) => {
  const managerId = useMemo(() => {
    if (!user) return null;
    return user.role === 'MANAGER' ? user.id : (user.managerId || null);
  }, [user]);

  const [waPhone, setWaPhone] = useState(settings.substitute?.phone || '');
  const [scrapRecipients, setScrapRecipients] = useState('');
  const [newClient, setNewClient] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    role: 'OPERATOR' as Role,
    area: user?.area || AREAS[0],
  });

  const [absenceForm, setAbsenceForm] = useState<Partial<Absence>>({
    type: 'USER',
    reason: 'VACATION',
    entityId: '',
    startDate: '',
    endDate: '',
  });

  const [brasiltecUsers, setBrasiltecUsers] = useState<any[]>([]);
  const [newBrasiltec, setNewBrasiltec] = useState({ name: '', password: '' });

  useEffect(() => {
    setWaPhone(settings.substitute?.phone || '');
    setScrapRecipients((settings.scrapRecipients || []).join('; '));
  }, [settings.substitute?.phone, settings.scrapRecipients]);

  useEffect(() => {
    if (user?.area) {
      setNewUser(prev => ({ ...prev, area: user.area || prev.area }));
    }
  }, [user?.area]);

  useEffect(() => {
    if (!managerId) return;

    const load = async () => {
      const fetchedUsers = await backend.getUsers(managerId);
      setUsers(fetchedUsers);

      if (user?.area === 'QUALIDADE') {
        const fetchedBrasiltec = await backend.getBrasiltecUsers(managerId);
        setBrasiltecUsers(fetchedBrasiltec);
      } else {
        setBrasiltecUsers([]);
      }
    };

    void load();
  }, [managerId, user?.area]);

  const refreshUsers = async () => {
    if (!managerId) return;
    setUsers(await backend.getUsers(managerId));
  };

  const refreshBrasiltec = async () => {
    if (!managerId) return;
    setBrasiltecUsers(await backend.getBrasiltecUsers(managerId));
  };

  const saveWaPhone = () => {
    onUpdate({
      ...settings,
      substitute: {
        ...settings.substitute,
        phone: waPhone.trim(),
        isActive: true,
      },
    });
    alert('Telefone de WhatsApp salvo.');
  };

  const saveScrapRecipients = () => {
    const recipients = scrapRecipients
      .split(';')
      .map(v => v.trim())
      .filter(Boolean);

    onUpdate({
      ...settings,
      scrapRecipients: recipients,
    });
    alert('Destinatários de sucata salvos.');
  };

  const addScrapClient = () => {
    const value = newClient.trim().toUpperCase();
    if (!value) return;

    const current = settings.scrapClients || [];
    if (current.includes(value)) {
      setNewClient('');
      return;
    }

    onUpdate({
      ...settings,
      scrapClients: [...current, value],
    });
    setNewClient('');
  };

  const removeScrapClient = (client: string) => {
    onUpdate({
      ...settings,
      scrapClients: (settings.scrapClients || []).filter(c => c !== client),
    });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerId) return;

    if (!newUser.name.trim() || !newUser.username.trim() || !newUser.password.trim()) {
      alert('Preencha nome, usuário e senha.');
      return;
    }

    try {
      await backend.addUser({
        id: crypto.randomUUID(),
        name: newUser.name.trim(),
        username: newUser.username.trim(),
        password: newUser.password,
        email: newUser.email.trim() || undefined,
        role: newUser.role,
        area: newUser.area,
        managerId,
      });

      setNewUser({
        name: '',
        username: '',
        password: '',
        email: '',
        role: 'OPERATOR',
        area: user?.area || AREAS[0],
      });

      await refreshUsers();
      alert('Usuário criado.');
    } catch (err: any) {
      alert(err?.message || 'Falha ao criar usuário.');
    }
  };

  const removeUser = async (id: string) => {
    if (!confirm('Remover este usuário?')) return;
    try {
      await backend.removeUser(id);
      await refreshUsers();
    } catch (err: any) {
      alert(err?.message || 'Falha ao remover usuário.');
    }
  };

  const addAbsence = async () => {
    if (!managerId) return;

    if (!absenceForm.entityId || !absenceForm.startDate || !absenceForm.endDate) {
      alert('Selecione entidade e período.');
      return;
    }

    try {
      await backend.addAbsence({
        id: crypto.randomUUID(),
        managerId,
        entityId: absenceForm.entityId,
        type: (absenceForm.type || 'USER') as 'USER' | 'EQUIPMENT',
        reason: (absenceForm.reason || 'VACATION') as AbsenceReason,
        startDate: absenceForm.startDate,
        endDate: absenceForm.endDate,
      } as Absence);

      const fresh = await backend.getManagerSettings(managerId);
      onUpdate(fresh);
      setAbsenceForm({
        type: 'USER',
        reason: 'VACATION',
        entityId: '',
        startDate: '',
        endDate: '',
      });

      alert('Ausência/manutenção registrada.');
    } catch (err: any) {
      alert(err?.message || 'Falha ao registrar ausência/manutenção.');
    }
  };

  const removeAbsence = async (id: string) => {
    if (!managerId) return;
    try {
      await backend.removeAbsence(id);
      const fresh = await backend.getManagerSettings(managerId);
      onUpdate(fresh);
    } catch (err: any) {
      alert(err?.message || 'Falha ao remover ausência/manutenção.');
    }
  };

  const addBrasiltec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerId) return;

    if (!newBrasiltec.name.trim() || !newBrasiltec.password.trim()) {
      alert('Informe nome e senha do colaborador Brasiltec.');
      return;
    }

    try {
      await backend.addBrasiltecUser({
        id: crypto.randomUUID(),
        name: newBrasiltec.name.trim(),
        password: newBrasiltec.password,
        managerId,
      });
      setNewBrasiltec({ name: '', password: '' });
      await refreshBrasiltec();
      alert('Colaborador Brasiltec adicionado.');
    } catch (err: any) {
      alert(err?.message || 'Falha ao adicionar colaborador Brasiltec.');
    }
  };

  const removeBrasiltec = async (id: string) => {
    if (!confirm('Remover colaborador Brasiltec?')) return;
    try {
      await backend.removeBrasiltecUser(id);
      await refreshBrasiltec();
    } catch (err: any) {
      alert(err?.message || 'Falha ao remover colaborador Brasiltec.');
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto transition-colors duration-300">
      <div className="flex items-center justify-between pb-6 border-b-2 border-slate-100 dark:border-slate-800">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Configurações Gerais</h2>
      </div>

      {user?.area !== 'SUCATA' && (
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-5">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <MessageSquare size={18} className="text-emerald-500" /> WhatsApp do Gestor
          </h3>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={waPhone}
              onChange={e => setWaPhone(e.target.value)}
              className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
              placeholder="5511999999999"
            />
            <button
              onClick={saveWaPhone}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
            >
              Salvar
            </button>
          </div>
        </section>
      )}

      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-5">
        <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
          <MessageSquare size={18} className="text-emerald-500" /> Configuração Sucata
        </h3>

        <textarea
          value={scrapRecipients}
          onChange={e => setScrapRecipients(e.target.value)}
          className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
          placeholder="destino1@empresa.com; destino2@empresa.com"
          rows={3}
        />
        <button
          onClick={saveScrapRecipients}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
        >
          Salvar Destinatários
        </button>

        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-3">
            <input
              value={newClient}
              onChange={e => setNewClient(e.target.value)}
              className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
              placeholder="Cliente / destino"
            />
            <button
              onClick={addScrapClient}
              className="px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all"
            >
              Adicionar
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(settings.scrapClients || []).map(client => (
              <div key={client} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
                {client}
                <button className="text-red-500" onClick={() => removeScrapClient(client)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-5">
        <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
          <Calendar size={18} className="text-emerald-500" /> Ausências e Manutenções
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={absenceForm.type || 'USER'}
            onChange={e => setAbsenceForm(prev => ({ ...prev, type: e.target.value as 'USER' | 'EQUIPMENT', entityId: '' }))}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          >
            <option value="USER">Usuário</option>
            <option value="EQUIPMENT">Equipamento</option>
          </select>

          <select
            value={absenceForm.entityId || ''}
            onChange={e => setAbsenceForm(prev => ({ ...prev, entityId: e.target.value }))}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          >
            <option value="">Selecione</option>
            {(absenceForm.type === 'EQUIPMENT' ? settings.equipment : users).map((entity: any) => (
              <option key={entity.id} value={entity.id}>{entity.code || entity.name}</option>
            ))}
          </select>

          <select
            value={absenceForm.reason || 'VACATION'}
            onChange={e => setAbsenceForm(prev => ({ ...prev, reason: e.target.value as AbsenceReason }))}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          >
            <option value="VACATION">Férias</option>
            <option value="LEAVE">Licença</option>
            <option value="MAINTENANCE">Manutenção</option>
          </select>

          <input
            type="date"
            value={absenceForm.startDate || ''}
            onChange={e => setAbsenceForm(prev => ({ ...prev, startDate: e.target.value }))}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          />
          <input
            type="date"
            value={absenceForm.endDate || ''}
            onChange={e => setAbsenceForm(prev => ({ ...prev, endDate: e.target.value }))}
            className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          />
        </div>

        <button
          onClick={addAbsence}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
        >
          Adicionar Ausência
        </button>

        <div className="space-y-2">
          {settings.absences.map(a => (
            <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {a.type === 'EQUIPMENT' ? 'Equipamento' : 'Usuário'} | {a.reason} | {a.startDate} até {a.endDate}
              </div>
              <button className="text-red-500" onClick={() => removeAbsence(a.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {user?.role === 'MANAGER' && (
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-5">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <Users size={18} className="text-emerald-500" /> Colaboradores
          </h3>

          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" placeholder="Nome" />
            <input value={newUser.username} onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value }))} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" placeholder="Usuário" />
            <input type="password" value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" placeholder="Senha" />
            <input value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" placeholder="E-mail" />
            <select value={newUser.role} onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as Role }))} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
              <option value="OPERATOR">Operador</option>
              <option value="MANAGER">Gestor</option>
            </select>
            <select value={newUser.area} onChange={e => setNewUser(prev => ({ ...prev, area: e.target.value }))} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
              {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
            <button type="submit" className="md:col-span-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all">
              Criar Usuário
            </button>
          </form>

          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{u.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{u.username} - {u.role} - {u.area || '-'}</p>
                </div>
                <button onClick={() => removeUser(u.id)} className="text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {user?.area === 'QUALIDADE' && user?.role === 'MANAGER' && (
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-5">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <Wrench size={18} className="text-emerald-500" /> Brasiltec
          </h3>

          <form onSubmit={addBrasiltec} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={newBrasiltec.name}
              onChange={e => setNewBrasiltec(prev => ({ ...prev, name: e.target.value }))}
              className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              placeholder="Nome"
            />
            <input
              type="password"
              value={newBrasiltec.password}
              onChange={e => setNewBrasiltec(prev => ({ ...prev, password: e.target.value }))}
              className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              placeholder="Senha"
            />
            <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> Adicionar
            </button>
          </form>

          <div className="space-y-2">
            {brasiltecUsers.map((b: any) => (
              <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">{b.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">ID: {b.id}</p>
                </div>
                <button onClick={() => removeBrasiltec(b.id)} className="text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsView;
