
import React, { useState, useRef } from 'react';
import {
  Box, Clock, ArrowRight, Camera, Send, PlusCircle, AlertOctagon, Lock, Wrench, CheckCircle2, AlertTriangle, X
} from 'lucide-react';
import { ChecklistEntry, ChecklistItem, Status, User as UserType, AppSettings } from '../types';
import { SHIFTS, AREAS } from '../constants';
import { sendWhatsAppAlert } from '../services/whatsappService';
import { backend } from '../services/backend';
import EvidenceUploader from './EvidenceUploader';

interface Props {
  onSave: (entry: ChecklistEntry) => void;
  user: UserType;
  settings: AppSettings;
  checklists: ChecklistEntry[];
}

const ChecklistForm: React.FC<Props> = ({ onSave, user, settings }) => {
  const [step, setStep] = useState(1);
  const [evidences, setEvidences] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const areaItems = user.role === 'OPERATOR'
    ? settings.items.filter(item => item.area === user.area)
    : settings.items;

  const [formData, setFormData] = useState({
    equipmentNo: '',
    area: user.area || AREAS[0],
    shift: SHIFTS[0],
    observations: '',
    items: areaItems.map(item => ({ ...item, status: null as Status })),
  });

  const managerId = user.role === 'MANAGER' ? user.id : user.managerId!;
  const lockStatus = backend.isEquipmentLocked(formData.equipmentNo, managerId);
  const isShiftTaken = formData.equipmentNo ? backend.hasChecklistForShiftToday(formData.equipmentNo, formData.shift, managerId) : false;
  const hasNC = formData.items.some(i => i.status === 'NC');
  const allAnswered = formData.items.every(i => i.status !== null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setEvidences(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removeEvidence = (index: number) => {
    setEvidences(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockStatus.locked || isShiftTaken) {
      alert("Operação negada: Validação de segurança impediu o envio.");
      return;
    }

    if (!allAnswered) {
      alert("Por favor, responda todos os itens do check-list.");
      return;
    }

    const entry: ChecklistEntry = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      managerId: managerId,
      date: new Date().toISOString(),
      equipmentNo: formData.equipmentNo,
      area: formData.area,
      shift: formData.shift,
      items: formData.items as ChecklistItem[],
      observations: formData.observations,
      evidence: evidences,
      approvalStatus: hasNC ? 'PENDING' : 'APPROVED',
      supervisorName: !hasNC ? 'SISTEMA (AUTO)' : undefined,
      createdAt: Date.now()
    };

    onSave(entry);

    if (hasNC) {
      const managerPhone = backend.getManagerTargetPhone(managerId);
      sendWhatsAppAlert(entry, managerPhone);
      alert("Não conformidade detectada. O check-list foi enviado e o gestor notificado via WhatsApp para validação.");
    } else {
      alert("Check-list CONFORME enviado com sucesso! Equipamento liberado automaticamente.");
    }

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in transition-colors duration-300">
      <div className="bg-slate-900 dark:bg-slate-950 p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded tracking-widest shadow-lg shadow-emerald-900/20">Inspeção Técnica</span>
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Checklist de <span className="text-emerald-500">Equipamentos</span></h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mt-1 uppercase tracking-tight">Responsável: {user.name} • Área: {user.area}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-10 bg-white dark:bg-slate-900">
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Ativo para Inspeção</label>
                <div className="relative group">
                  <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <select
                    required
                    value={formData.equipmentNo}
                    onChange={e => setFormData({ ...formData, equipmentNo: e.target.value })}
                    className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    <option value="" className="dark:bg-slate-900">Selecione o coletor...</option>
                    {settings.equipment.filter(e => e.active).map(eq => (
                      <option key={eq.id} value={eq.code} className="dark:bg-slate-900">{eq.code} - {eq.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Turno de Operação</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <select
                    required
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm appearance-none cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    {SHIFTS.map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {lockStatus.locked && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-6 rounded-[1.5rem] flex gap-4 text-red-700 dark:text-red-400 animate-fade-in border-l-4 border-l-red-500 shadow-sm">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm self-start">
                  {lockStatus.reason === 'MAINTENANCE' ? <Wrench size={24} /> : <AlertOctagon size={24} />}
                </div>
                <div>
                  <p className="font-black uppercase text-xs tracking-widest mb-1">Ativo Bloqueado</p>
                  <p className="text-xs font-bold opacity-80 leading-relaxed">
                    {lockStatus.reason === 'PENDING' && 'Aguardando validação técnica do gestor via WhatsApp.'}
                    {lockStatus.reason === 'REJECTED' && 'O ativo foi recusado na última inspeção por falha grave.'}
                    {lockStatus.reason === 'MAINTENANCE' && 'Ativo em período de manutenção programada/afastamento.'}
                  </p>
                </div>
              </div>
            )}

            {isShiftTaken && !lockStatus.locked && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-6 rounded-[1.5rem] flex gap-4 text-amber-700 dark:text-amber-400 animate-fade-in border-l-4 border-l-amber-500 shadow-sm">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm self-start">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="font-black uppercase text-xs tracking-widest mb-1">Turno Já Realizado</p>
                  <p className="text-xs font-bold opacity-80 leading-relaxed">
                    Este equipamento já possui um checklist registrado para o <strong>{formData.shift}</strong> no dia de hoje. Selecione outro turno ou verifique o histórico.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!formData.equipmentNo || lockStatus.locked || isShiftTaken}
              onClick={() => setStep(2)}
              className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95"
            >
              {!formData.equipmentNo ? 'Selecione um Ativo' : (lockStatus.locked || isShiftTaken) ? <><Lock size={18} /> Acesso Negado</> : <>Iniciar Inspeção <ArrowRight size={18} /></>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-500" /> Verificação Técnica
              </h3>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{formData.items.filter(i => i.status !== null).length}/{formData.items.length}</span>
            </div>

            <div className="space-y-3">
              {formData.items.map((item) => (
                <div key={item.id} className={`p-5 flex items-center justify-between gap-6 bg-slate-50 dark:bg-slate-800/30 border rounded-[1.5rem] transition-all ${item.status === 'NC' ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10' : 'border-slate-100 dark:border-slate-800'}`}>
                  <span className="text-slate-700 dark:text-slate-300 font-bold text-xs flex-1">{item.description}</span>
                  <div className="flex bg-white dark:bg-slate-700 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, items: f.items.map(i => i.id === item.id ? { ...i, status: 'C' } : i) }))}
                      className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${item.status === 'C' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      C
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, items: f.items.map(i => i.id === item.id ? { ...i, status: 'NC' } : i) }))}
                      className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${item.status === 'NC' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      NC
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type={hasNC ? "button" : "submit"}
              disabled={!allAnswered}
              onClick={hasNC ? () => setStep(3) : undefined}
              className={`w-full py-6 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 ${hasNC ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {hasNC ? (
                <>Avançar para Evidências <ArrowRight size={18} /></>
              ) : (
                <>Finalizar e Sincronizar <Send size={18} /></>
              )}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
                <Camera size={18} className="text-emerald-500" /> Evidências Fotográficas
              </h3>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{evidences.length} fotos anexadas</span>
            </div>

            <EvidenceUploader evidences={evidences} onUpdate={setEvidences} />

            {/* Legacy input removed, now handled by EvidenceUploader */}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Observações Técnicas</label>
              <textarea
                value={formData.observations}
                onChange={e => setFormData({ ...formData, observations: e.target.value })}
                className="w-full p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] h-32 outline-none text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none text-slate-900 dark:text-slate-100 shadow-inner"
                placeholder="Descreva detalhes importantes da inspeção..."
              />
            </div>

            <button
              type="submit"
              disabled={evidences.length === 0 || !formData.observations.trim()}
              className="w-full py-6 bg-slate-900 dark:bg-emerald-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-emerald-700 transition-all shadow-2xl dark:shadow-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title={evidences.length === 0 || !formData.observations.trim() ? "Anexe fotos e adicione observações para finalizar" : ""}
            >
              <Send size={18} /> Finalizar e Sincronizar
            </button>
            {(evidences.length === 0 || !formData.observations.trim()) && (
              <p className="text-center text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">
                * Obrigatório: Anexar evidências e preencher observações
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default ChecklistForm;
