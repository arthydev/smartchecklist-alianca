import React, { useMemo, useState } from 'react';
import { AppSettings, EquipmentType, User } from '../types';
import { AREAS, EQUIPMENT_CATEGORIES } from '../constants.tsx';
import { Box, CheckCircle, Plus, Trash2 } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  user: User | null;
}

const AssetsManagementView: React.FC<Props> = ({ settings, onUpdate, user }) => {
  const [newItem, setNewItem] = useState('');
  const [newItemArea, setNewItemArea] = useState(user?.area || AREAS[0]);
  const [itemEquipmentId, setItemEquipmentId] = useState('');

  const [newEqCode, setNewEqCode] = useState('');
  const [newEqDesc, setNewEqDesc] = useState(EQUIPMENT_CATEGORIES[0]);
  const [newEqManualDesc, setNewEqManualDesc] = useState('');
  const [newEqType, setNewEqType] = useState<EquipmentType>('PRIMARY');

  const managerId = user ? (user.role === 'MANAGER' ? user.id : user.managerId) : null;
  const activeEquipments = useMemo(
    () => settings.equipment.filter(e => e.active),
    [settings.equipment]
  );

  const addInspectionItem = () => {
    if (!newItem.trim()) {
      alert('Informe a pergunta de inspeção.');
      return;
    }
    if (!itemEquipmentId) {
      alert('Selecione o equipamento para vincular o item.');
      return;
    }

    const newEntry = {
      id: Date.now(),
      description: newItem.trim(),
      area: user?.area || newItemArea,
      equipmentId: itemEquipmentId,
    };

    onUpdate({
      ...settings,
      items: [...settings.items, newEntry],
    });
    setNewItem('');
  };

  const removeInspectionItem = (id: number) => {
    onUpdate({ ...settings, items: settings.items.filter(i => i.id !== id) });
  };

  const addEquipment = () => {
    if (!newEqCode.trim() || !managerId) {
      alert('Informe o código/patrimônio do equipamento.');
      return;
    }

    const newEq = {
      id: crypto.randomUUID(),
      code: newEqCode.trim(),
      category: newEqDesc,
      description: newEqManualDesc.trim(),
      active: true,
      type: newEqType,
      managerId: managerId
    };

    onUpdate({
      ...settings,
      equipment: [...settings.equipment, newEq]
    });

    setNewEqCode('');
    setNewEqDesc(EQUIPMENT_CATEGORIES[0]);
    setNewEqManualDesc('');
    setNewEqType('PRIMARY');
  };

  const removeEquipment = (id: string) => {
    const updatedEquipment = settings.equipment.filter(e => e.id !== id);
    const updatedItems = settings.items.filter(i => i.equipmentId !== id);
    onUpdate({ ...settings, equipment: updatedEquipment, items: updatedItems });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-500" /> Itens de Inspeção
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.2rem] text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
              placeholder="Nova pergunta..."
            />
            <button
              onClick={addInspectionItem}
              className="p-4 bg-emerald-600 text-white rounded-[1.2rem] shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
            >
              <Plus size={24} />
            </button>
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
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipamento Vinculado (obrigatório)</label>
            <select
              value={itemEquipmentId}
              onChange={e => setItemEquipmentId(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Selecione o equipamento...</option>
              {activeEquipments.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.code} - {eq.description}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto pr-2 custom-scrollbar">
            {settings.items.map(item => {
              const linkedEq = settings.equipment.find(e => e.id === item.equipmentId);
              return (
                <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 transition-all border-l-4 border-l-transparent hover:border-l-emerald-500">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.description}</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                      {item.area} • {linkedEq?.code || 'SEM EQUIPAMENTO'}
                    </span>
                  </div>
                  <button onClick={() => removeInspectionItem(item.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
        <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
          <Box size={20} className="text-emerald-500" /> Gerenciar Equipamentos
        </h3>

        <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código / Patrimônio</label>
              <input
                type="text"
                value={newEqCode}
                onChange={e => setNewEqCode(e.target.value)}
                className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ex: COL-01"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Uso</label>
              <select
                value={newEqType}
                onChange={e => setNewEqType(e.target.value as EquipmentType)}
                className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="PRIMARY">Uso Direto</option>
                <option value="BACKUP">Reserva / Backup</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Editável do Ativo</label>
            <input
              type="text"
              value={newEqManualDesc}
              onChange={e => setNewEqManualDesc(e.target.value)}
              className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ex: Coletor Zebra TC21"
            />
          </div>

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

          <button
            onClick={addEquipment}
            className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-black dark:hover:bg-emerald-700 transition-all active:scale-[0.98] mt-2"
          >
            Cadastrar Equipamento
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
              <button onClick={() => removeEquipment(eq.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssetsManagementView;
