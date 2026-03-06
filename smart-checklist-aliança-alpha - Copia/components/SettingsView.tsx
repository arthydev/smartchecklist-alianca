
import React, { useState, useEffect } from 'react';
import { AppSettings, User, Role, EquipmentType, Absence, AbsenceReason } from '../types';
import { Settings, Plus, Trash2, ShieldAlert, Phone, Smartphone, CheckCircle, Users, UserPlus, Shield, UserCircle, Layers, Box, Calendar, Clock, X, Wrench, Umbrella, Key, Edit2, Save, MessageSquare } from 'lucide-react';
import { backend } from '../services/backend';
import { EQUIPMENT_CATEGORIES, AREAS } from '../constants.tsx';

interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  user: User | null;
}

const SettingsView: React.FC<Props> = ({ settings, onUpdate, user }) => {
  const [newItem, setNewItem] = useState('');
  const [newEqCode, setNewEqCode] = useState('');
  const [newEqDesc, setNewEqDesc] = useState(EQUIPMENT_CATEGORIES[0]);
  const [newEqManualDesc, setNewEqManualDesc] = useState('');
  const [newEqType, setNewEqType] = useState<EquipmentType>('PRIMARY');

  const [newItemArea, setNewItemArea] = useState(AREAS[0]);

  // WhatsApp Config State
  const [waPhone, setWaPhone] = useState(settings.substitute?.phone || '');

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', email: '', role: 'OPERATOR' as Role, area: AREAS[0] });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Context-aware managerId
  const managerId = user ? (user.role === 'MANAGER' ? user.id : user.managerId) : null;

  // Absence State
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [newAbsence, setNewAbsence] = useState<Partial<Absence>>({
    type: 'USER',
    reason: 'VACATION',
    startDate: '',
    endDate: ''
  });

  // Brasiltec State
  const [brasiltecUsers, setBrasiltecUsers] = useState<any[]>([]);
  const [newBrasiltecUser, setNewBrasiltecUser] = useState({ name: '', password: '' });

  // Scrap Recipients Configuration
  const [scrapRecipients, setScrapRecipients] = useState<string>('');
  const [scrapClients, setScrapClients] = useState<string>('');

  useEffect(() => {
    if (settings.scrapRecipients) {
      setScrapRecipients(settings.scrapRecipients.join('; '));
    }
    if (settings.scrapClients) {
      setScrapClients(settings.scrapClients.join('; '));
    }
  }, [settings.scrapRecipients, settings.scrapClients]);

  const saveScrapRecipients = () => {
    const recipients = scrapRecipients.split(';').map(e => e.trim()).filter(e => e);
    onUpdate({ ...settings, scrapRecipients: recipients });
    alert("Destinatários atualizados com sucesso!");
  };

  const saveScrapClients = () => {
    const clients = scrapClients.split(';').map(e => e.trim()).filter(e => e);
    onUpdate({ ...settings, scrapClients: clients });
    alert("Clientes atualizados com sucesso!");
  };

  useEffect(() => {
    if (managerId) {
      setUsers(backend.getUsers(managerId));
      if (user?.area === 'QUALIDADE') {
        setBrasiltecUsers(backend.getBrasiltecUsers(managerId));
      }
    }
    // Update defaults if user loads later
    if (user?.area) {
      setNewItemArea(user.area);
      setNewUser(prev => ({ ...prev, area: user.area! }));
    }
  }, [managerId, user]);

  const refreshBrasiltec = () => {
    if (managerId) {
      setBrasiltecUsers(backend.getBrasiltecUsers(managerId));
    }
  };

  const handleAddBrasiltecUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrasiltecUser.name || !newBrasiltecUser.password || !managerId) return;

    backend.addBrasiltecUser({
      id: crypto.randomUUID(),
      name: newBrasiltecUser.name,
      password: newBrasiltecUser.password,
      managerId
    });
    setNewBrasiltecUser({ name: '', password: '' });
    refreshBrasiltec();
    alert("Colaborador Brasiltec adicionado com sucesso!");
  };

  const handleRemoveBrasiltecUser = (id: string) => {
    if (confirm('Remover este colaborador?')) {
      backend.removeBrasiltecUser(id);
      refreshBrasiltec();
    }
  };

  const refreshUsers = () => {
    if (managerId) {
      setUsers(backend.getUsers(managerId));
    }
  };

  const saveWaPhone = () => {
    onUpdate({
      ...settings,
      substitute: {
        ...settings.substitute,
        phone: waPhone,
        isActive: true
      }
    });
    alert("Número de WhatsApp atualizado com sucesso!");
  };

  const addItem = () => {
    if (!newItem) return;
    const items = [...settings.items, { id: Date.now(), description: newItem, area: newItemArea }];
    onUpdate({ ...settings, items });
    setNewItem('');
  };

  const addEquipment = () => {
    if (!newEqCode || !managerId) return;
    const newEq = {
      id: crypto.randomUUID(),
      code: newEqCode,
      category: newEqDesc,
      description: newEqManualDesc,
      active: true,
      type: newEqType,
      managerId: managerId
    };
    const equipment = [...settings.equipment, newEq];
    onUpdate({ ...settings, equipment });
    setNewEqCode('');
    setNewEqDesc(EQUIPMENT_CATEGORIES[0]);
    setNewEqManualDesc('');
    setNewEqType('PRIMARY');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username || !newUser.password || !managerId) {
      alert("Preencha todos os campos do usuário, inclusive a senha.");
      return;
    }
    const userToCreate: User = {
      ...newUser,
      id: crypto.randomUUID(),
      managerId: managerId
    };
    backend.addUser(userToCreate);
    refreshUsers();
    setNewUser(prev => ({
      name: '',
      username: '',
      password: '',
      email: '',
      role: 'OPERATOR',
      area: prev.area // Preserve the selected area
    }));
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    backend.updateUser(editingUser.id, {
      name: editingUser.name,
      username: editingUser.username,
      password: editingUser.password,
      email: (editingUser as any).email,
      role: editingUser.role,
      area: editingUser.area
    });
    refreshUsers();
    setEditingUser(null);
    alert("Colaborador atualizado com sucesso.");
  };

  const handleAddAbsence = () => {
    if (!newAbsence.entityId || !newAbsence.startDate || !newAbsence.endDate || !managerId) {
      alert("Selecione a entidade e as datas corretamente.");
      return;
    }
    const absence: Absence = {
      ...newAbsence as Absence,
      id: crypto.randomUUID(),
      managerId: managerId
    };
    backend.addAbsence(absence);
    onUpdate(backend.getManagerSettings(managerId));
    setShowAbsenceModal(false);
  };

  const handleRemoveAbsence = (id: string) => {
    if (!managerId) return;
    backend.removeAbsence(id);
    onUpdate(backend.getManagerSettings(managerId));
  };

  const handleRemoveUser = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Deseja realmente remover este usuário?')) {
      backend.removeUser(id);
      refreshUsers();
    }
  };

  const handleRemoveItem = (id: number) => {
    onUpdate({ ...settings, items: settings.items.filter(i => i.id !== id) });
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto relative transition-colors duration-300">
      <div className="flex items-center justify-between pb-6 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Settings className="text-slate-400 dark:text-slate-600" size={28} />
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Central de Controle</h2>
        </div>
        {user?.area !== 'QUALIDADE' && user?.area !== 'SUCATA' && (
          <button
            onClick={() => setShowAbsenceModal(true)}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Calendar size={18} /> Novo Afastamento / Manutenção
          </button>
        )}
      </div>

      {/* Seção WhatsApp */}
      {user?.area !== 'SUCATA' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <MessageSquare size={20} className="text-emerald-500" /> Integração WhatsApp (Alertas)
          </h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp do Gestor (Com DDD e 55)</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100"
                  placeholder="Ex: 5511988887777"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={saveWaPhone}
                className="w-full md:w-auto px-10 h-[58px] bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all shadow-xl dark:shadow-none"
              >
                Atualizar Telefone
              </button>
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
            💡 Este número receberá as notificações automáticas de não conformidade enviadas pelos operadores em campo.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
          <MessageSquare size={20} className="text-emerald-500" /> Destinatários de E-mail (Solicitação de Faturamento)
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mails (Separados por ponto e vírgula)</label>
            <textarea
              value={scrapRecipients}
              onChange={e => setScrapRecipients(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900 dark:text-slate-100 h-24"
              placeholder="Ex: faturamento@exemplo.com; gerente@exemplo.com"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={saveScrapRecipients}
              className="w-full md:w-auto px-10 h-[58px] bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all shadow-xl dark:shadow-none"
            >
              Salvar E-mails
            </button>
          </div>
        </div>
      </div>


      {user?.role === 'MANAGER' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <MessageSquare size={20} className="text-emerald-500" /> Clientes / Destinos
          </h3>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-[2rem] space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Novo Cliente (Ex: Usiminas)"
                className="flex-1 p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim().toUpperCase();
                    if (val) {
                      const current = settings.scrapClients || [];
                      if (!current.includes(val)) {
                        const updatedClients = [...current, val];
                        onUpdate({ ...settings, scrapClients: updatedClients });
                      }
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(settings.scrapClients || []).map(client => (
                <div key={client} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{client}</span>
                  <button
                    onClick={() => onUpdate({ ...settings, scrapClients: settings.scrapClients!.filter(c => c !== client) })}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!settings.scrapClients || settings.scrapClients.length === 0) && (
                <p className="text-xs text-slate-400 font-bold italic p-2">Nenhum cliente cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.area !== 'SUCATA' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Restante do componente SettingsView mantido conforme anterior */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-8 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
                <Clock size={20} className="text-emerald-500" /> Registros de Ausência / Manutenção
              </h3>
              <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400 uppercase">{settings.absences.length} Ativos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {settings.absences.map(a => {
                const entityName = a.type === 'USER'
                  ? users.find(u => u.id === a.entityId)?.name
                  : settings.equipment.find(e => e.id === a.entityId)?.code;

                return (
                  <div key={a.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {a.reason === 'VACATION' ? <Umbrella size={14} className="text-blue-500" /> : a.reason === 'LEAVE' ? <Clock size={14} className="text-amber-500" /> : <Wrench size={14} className="text-red-500" />}
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{a.reason === 'VACATION' ? 'Férias' : a.reason === 'LEAVE' ? 'Licença' : 'Manutenção'}</p>
                      </div>
                      <p className="font-black text-slate-900 dark:text-slate-100 text-sm truncate max-w-[140px]">{entityName || 'N/A'}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span>{a.startDate.split('-').reverse().join('/')}</span>
                        <span>→</span>
                        <span>{a.endDate.split('-').reverse().join('/')}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveAbsence(a.id)} className="p-3 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-white dark:bg-slate-800 rounded-xl shadow-sm opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
            <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-500" /> Itens de Inspeção
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.2rem] text-sm font-bold outline-none text-slate-900 dark:text-slate-100" placeholder="Nova pergunta..." />
                <button onClick={addItem} className="p-4 bg-emerald-600 text-white rounded-[1.2rem] shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"><Plus size={24} /></button>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Área Dedicada</label>
                {user?.area ? (
                  <div className="w-full p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed">
                    {user.area} (Automático)
                  </div>
                ) : (
                  <select
                    value={newItemArea}
                    onChange={e => setNewItemArea(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-2 max-h-72 overflow-auto pr-2 custom-scrollbar">
                {settings.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 transition-all border-l-4 border-l-transparent hover:border-l-emerald-500">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.description}</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">{item.area}</span>
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seção de Cadastro de Tipos de Veículos (Antigo Equipamentos) - Oculto para SUCATA */}
          {user?.area !== 'SUCATA' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
                <Box size={20} className="text-emerald-500" />
                {user?.area === 'QUALIDADE' ? 'Cadastrar Tipos de Veículos' : 'Gerenciar Equipamentos'}
              </h3>

              <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                {user?.area === 'QUALIDADE' && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <p className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Pré-definições Rápidas</p>
                    {['Truck', 'Sider', 'Toco', 'Rodotrem', 'Bitrem'].map(type => (
                      <button
                        key={type}
                        onClick={() => { setNewEqCode(type); setNewEqDesc('VEICULO'); }}
                        className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:border-emerald-500 transition-colors uppercase"
                      >
                        + {type}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {user?.area === 'QUALIDADE' ? 'Nome do Tipo (Ex: Sider)' : 'Código / Patrimônio'}
                    </label>
                    <input type="text" value={newEqCode} onChange={e => setNewEqCode(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder={user?.area === 'QUALIDADE' ? "Ex: Rodotrem" : "Ex: COL-01"} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Uso</label>
                    <select value={newEqType} onChange={e => setNewEqType(e.target.value as EquipmentType)} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20">
                      <option value="PRIMARY">Uso Direto</option>
                      <option value="BACKUP">Reserva / Backup</option>
                    </select>
                  </div>
                </div>

                {user?.area !== 'QUALIDADE' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Editável do Ativo</label>
                    <input
                      type="text"
                      value={newEqManualDesc}
                      onChange={e => setNewEqManualDesc(e.target.value)}
                      className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Ex: Coletor Zebra TC21 de Leonan"
                    />
                  </div>
                )}

                {user?.area !== 'QUALIDADE' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Patrimônio</label>
                    <select
                      value={newEqDesc}
                      onChange={e => setNewEqDesc(e.target.value)}
                      className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {EQUIPMENT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button onClick={addEquipment} className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-black dark:hover:bg-emerald-700 transition-all active:scale-[0.98] mt-2">
                  {user?.area === 'QUALIDADE' ? 'Cadastrar Veículo' : 'Cadastrar Equipamento'}
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-auto pr-2 custom-scrollbar">
                {settings.equipment.map(eq => (
                  <div key={eq.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${eq.type === 'PRIMARY' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'} rounded-full flex items-center justify-center text-[10px] font-black`}>
                        {eq.type === 'PRIMARY' ? 'USO' : 'RES'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{eq.code} <span className="text-[9px] text-emerald-500 ml-2">[{eq.category}]</span></p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{eq.description}</p>
                      </div>
                    </div>
                    <button onClick={() => onUpdate({ ...settings, equipment: settings.equipment.filter(e => e.id !== eq.id) })} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
          <Users size={20} className="text-emerald-500" /> Colaboradores
        </h3>
        <form onSubmit={handleAddUser} className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input type="text" placeholder="Ex: LEONAN OLIVEIRA" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value.toUpperCase() })} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ID de Login</label>
              <input type="text" placeholder="Ex: LEONAN" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value.toUpperCase() })} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave Digital</label>
              <input type="password" placeholder="••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value.toUpperCase() })} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail (Opcional)</label>
            <input type="email" placeholder="COLABORADOR@EXEMPLO.COM" value={newUser.email || ''} onChange={e => setNewUser({ ...newUser, email: e.target.value.toUpperCase() })} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Acesso</label>
            <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, role: 'OPERATOR', area: user?.area ? user.area : newUser.area })}
                className={`py-3 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${newUser.role === 'OPERATOR' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                Operador
              </button>
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, role: 'MANAGER' })}
                className={`py-3 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${newUser.role === 'MANAGER' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                Gestor
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Área de Atuação</label>
            {user?.area ? (
              <div className="w-full p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed">
                {user.area} (Automático)
              </div>
            ) : (
              <select
                value={newUser.area}
                onChange={e => setNewUser({ ...newUser, area: e.target.value })}
                className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
            )}
          </div>

          <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-black dark:hover:bg-emerald-700 transition-all active:scale-[0.98] mt-2">Autorizar Acesso</button>
        </form>
        <div className="space-y-2 max-h-72 overflow-auto pr-2 custom-scrollbar">
          {users.map(u => (
            <div key={u.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border rounded-2xl group hover:border-emerald-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-[12px] font-black">{u.name[0]}</div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{u.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {u.username} • {u.area}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingUser(u)} className="p-2 text-slate-400 hover:text-emerald-500"><Edit2 size={18} /></button>
                <button type="button" onClick={(e) => handleRemoveUser(e, u.id)} className="p-2 text-slate-400 hover:text-red-500 z-10 relative cursor-pointer"><Trash2 size={18} className="pointer-events-none" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Gestão Brasiltec (Apenas Qualidade e Gestores) */}
      {
        user?.area === 'QUALIDADE' && user?.role === 'MANAGER' && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6 lg:col-span-2">
            <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
              <Shield size={20} className="text-emerald-500" /> Gestão Brasiltec
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form onSubmit={handleAddBrasiltecUser} className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Colaborador</label>
                  <input type="text" value={newBrasiltecUser.name} onChange={e => setNewBrasiltecUser({ ...newBrasiltecUser, name: e.target.value })} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Ex: João da Silva" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Validação</label>
                  <input type="password" value={newBrasiltecUser.password} onChange={e => setNewBrasiltecUser({ ...newBrasiltecUser, password: e.target.value })} className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="••••" />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-black dark:hover:bg-emerald-700 transition-all active:scale-[0.98] mt-2">Cadastrar Brasiltec</button>
              </form>

              <div className="space-y-2 max-h-72 overflow-auto pr-2 custom-scrollbar">
                {brasiltecUsers.length === 0 && <p className="text-center text-slate-400 text-xs py-10">Nenhum colaborador cadastrado.</p>}
                {brasiltecUsers.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border rounded-2xl group hover:border-emerald-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-[12px] font-black">{u.name[0]}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Validação Ativa</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveBrasiltecUser(u.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Edição de Usuário */}
      {
        editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
                  <Edit2 size={18} className="text-emerald-500" /> Editar Colaborador
                </h3>
                <button onClick={() => setEditingUser(null)} className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ID de Login</label>
                    <input type="text" value={editingUser.username} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave Digital</label>
                    <input type="password" value={editingUser.password} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Acesso</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'OPERATOR' })}
                      className={`py-3 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${editingUser.role === 'OPERATOR' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}
                    >
                      Operador
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'MANAGER' })}
                      className={`py-3 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${editingUser.role === 'MANAGER' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}
                    >
                      Gestor
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Área de Atuação</label>
                  <select
                    value={editingUser.area}
                    onChange={e => setEditingUser({ ...editingUser, area: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-black uppercase tracking-widest transition-colors">Cancelar</button>
                  <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all active:scale-[0.98]">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default SettingsView;
