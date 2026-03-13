
import React, { useState } from 'react';
import { ChecklistEntry, ApprovalStatus } from '../types';
import { ShieldCheck, CheckCircle, XCircle, Clock, Info, MessageCircle, Maximize2, Camera, Lock, Unlock, AlertOctagon } from 'lucide-react';

interface Props {
  checklists: ChecklistEntry[];
  onUpdate: (entry: ChecklistEntry) => Promise<void>;
  currentUser: { name?: string; username?: string } | null;
}

const ValidationView: React.FC<Props> = ({ checklists, onUpdate, currentUser }) => {
  const [selected, setSelected] = useState<ChecklistEntry | null>(null);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'BLOCKED'>('PENDING');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pending = checklists.filter(c => c.approvalStatus === 'PENDING');
  const blocked = checklists.filter(c => c.approvalStatus === 'REJECTED');

  const getDisplayedItems = () => activeTab === 'PENDING' ? pending : blocked;
  const displayedItems = getDisplayedItems();

  const handleAction = async (status: ApprovalStatus) => {
    if (!selected || isSubmitting) return;
    const supervisorName = currentUser?.name || currentUser?.username || 'Supervisor';

    const updatedEntry = {
      ...selected,
      approvalStatus: status,
      supervisorName
    };

    setIsSubmitting(true);
    try {
      await onUpdate(updatedEntry);
      const actionText = status === 'APPROVED' ? 'LIBERADO' : 'BLOQUEADO';
      alert(`Sincronizado: O equipamento ${selected.equipmentNo} foi ${actionText} no sistema.`);
      setSelected(null);
      setActiveTab(status === 'REJECTED' ? 'BLOCKED' : 'PENDING');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
      {/* Visualizador Fullscreen */}
      {fullscreenImg && (
        <div
          className="fixed inset-0 z-[200] bg-slate-950/95 flex items-center justify-center p-6 backdrop-blur-md animate-fade-in"
          onClick={() => setFullscreenImg(null)}
        >
          <img src={fullscreenImg} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
          <button className="absolute top-10 right-10 text-white p-4 hover:bg-white/10 rounded-full transition-colors">
            <XCircle size={32} />
          </button>
        </div>
      )}

      <div className="lg:col-span-1 space-y-4">
        {/* Tabs Header */}
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
          <button
            onClick={() => { setActiveTab('PENDING'); setSelected(null); }}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'PENDING' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Clock size={14} /> Fila de Decisão ({pending.length})
          </button>
          <button
            onClick={() => { setActiveTab('BLOCKED'); setSelected(null); }}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'BLOCKED' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Lock size={14} /> Bloqueados ({blocked.length})
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 uppercase tracking-tighter italic">
            {activeTab === 'PENDING' ? <Clock size={20} className="text-emerald-500" /> : <Lock size={20} className="text-red-500" />}
            {activeTab === 'PENDING' ? 'Validações Pendentes' : 'Ativos Bloqueados'}
          </h2>
        </div>

        <div className="space-y-4 max-h-[700px] overflow-auto pr-2 custom-scrollbar">
          {displayedItems.map(check => (
            <button
              key={check.id}
              onClick={() => setSelected(check)}
              className={`w-full p-6 text-left border-2 rounded-[2rem] transition-all relative group overflow-hidden ${selected?.id === check.id ? 'bg-emerald-50 dark:bg-emerald-900 border-emerald-500 shadow-xl translate-x-1' : 'bg-white dark:bg-slate-900 border-transparent dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Equipamento</p>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-2xl tracking-tighter">{check.equipmentNo}</p>
                </div>
                <div className={`p-2 rounded-xl shadow-sm border ${activeTab === 'BLOCKED' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-slate-100 text-emerald-500'}`}>
                  {activeTab === 'BLOCKED' ? <Lock size={18} /> : <MessageCircle size={18} />}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[9px] font-black text-slate-500 uppercase">{check.userName[0]}</div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">{check.userName} • {check.shift}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {check.items.filter(i => i.status === 'NC').map((i, idx) => (
                  <span key={idx} className="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter border border-red-200 dark:border-red-900/40">ID: {i.id}</span>
                ))}
              </div>
            </button>
          ))}
          {displayedItems.length === 0 && (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/10 p-6 rounded-full mb-4">
                <CheckCircle className="text-emerald-500" size={40} />
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Lista Vazia</p>
              <p className="text-slate-300 dark:text-slate-600 text-[10px] font-bold mt-2 uppercase">
                {activeTab === 'PENDING' ? 'Nenhuma validação pendente.' : 'Nenhum ativo bloqueado.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-none overflow-hidden sticky top-8 animate-fade-in transition-colors duration-300">
            <div className={`p-8 text-white relative ${selected.approvalStatus === 'REJECTED' ? 'bg-red-900' : 'bg-slate-900 dark:bg-slate-950'}`}>
              <div className="absolute top-0 right-0 p-8 opacity-10">
                {selected.approvalStatus === 'REJECTED' ? <Lock size={120} /> : <ShieldCheck size={120} />}
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black italic flex items-center gap-3 uppercase tracking-tighter">
                    {selected.approvalStatus === 'REJECTED' ? <Lock size={24} className="text-white" /> : <ShieldCheck size={24} className="text-emerald-500" />}
                    {selected.approvalStatus === 'REJECTED' ? 'Ativo Bloqueado' : 'Analítica de Campo'}
                  </h3>
                  <span className="text-[9px] font-black bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest">
                    {selected.approvalStatus === 'REJECTED' ? 'Acesso Negado' : 'Sincronização Ativa'}
                  </span>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Protocolo Técnico</p>
                  <p className="text-xs font-bold italic leading-relaxed text-slate-300">
                    {selected.approvalStatus === 'REJECTED'
                      ? "Este ativo foi bloqueado devido a não conformidades graves. Para liberar o uso, clique em 'Desbloquear Ativo'."
                      : "Consolide as informações colhidas via WhatsApp para registrar a decisão técnica final no sistema e atualizar o status do ativo."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[9px] tracking-widest mb-1">Identificação</p>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-xl">{selected.equipmentNo}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[9px] tracking-widest mb-1">Colaborador</p>
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm truncate">{selected.userName}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[9px] tracking-widest mb-1">Período</p>
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{selected.shift}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Camera size={14} className="text-emerald-500" /> Evidências do Check-list
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selected.evidence?.map((img, i) => (
                    <div
                      key={i}
                      className="group relative rounded-[1.5rem] overflow-hidden border-2 border-slate-100 dark:border-slate-800 aspect-video cursor-pointer shadow-sm hover:shadow-xl dark:shadow-none transition-all"
                      onClick={() => setFullscreenImg(img)}
                    >
                      <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Maximize2 className="text-white" size={32} />
                      </div>
                    </div>
                  ))}
                  {(!selected.evidence || selected.evidence.length === 0) && (
                    <div className="col-span-full py-10 text-center bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[1.5rem]">
                      <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">Nenhuma foto enviada</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Info size={14} className="text-red-500" /> Itens Reprovados
                </h4>
                <div className="space-y-3">
                  {selected.items.filter(i => i.status === 'NC').map(i => (
                    <div key={i.id} className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-4 border-l-4 border-l-red-500">
                      <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-red-500 shadow-sm">
                        <XCircle size={18} />
                      </div>
                      <span className="text-xs font-black text-red-900 dark:text-red-400 uppercase tracking-tight">{i.description}</span>
                    </div>
                  ))}
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 mt-4">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">Comentário do Operador</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 italic">
                      {selected.observations ? `"${selected.observations}"` : 'Sem observações adicionais relatadas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                {selected.approvalStatus === 'REJECTED' ? (
                  <button
                    onClick={() => void handleAction('APPROVED')}
                    disabled={isSubmitting}
                    className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none"
                  >
                    <Unlock size={20} /> Desbloquear Ativo
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => void handleAction('REJECTED')}
                      disabled={isSubmitting}
                      className="flex-1 py-6 bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all uppercase tracking-widest shadow-lg dark:shadow-none shadow-red-100"
                    >
                      <XCircle size={20} /> Manter Bloqueio
                    </button>
                    <button
                      onClick={() => void handleAction('APPROVED')}
                      disabled={isSubmitting}
                      className="flex-1 py-6 bg-slate-900 dark:bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-emerald-700 shadow-2xl dark:shadow-none shadow-slate-200 transition-all uppercase tracking-widest"
                    >
                      <CheckCircle size={20} className="text-emerald-400" /> Liberar Ativo
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[600px] border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 text-center p-16 bg-white/50 dark:bg-slate-900/50">
            <div className="bg-slate-50 dark:bg-slate-800 p-10 rounded-full mb-8 shadow-inner">
              <ShieldCheck size={72} className="opacity-20 text-slate-400 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 dark:text-slate-600 mb-4 uppercase tracking-tighter">Terminal de Validação</h3>
            <p className="max-w-xs text-xs font-bold uppercase leading-relaxed text-slate-400 dark:text-slate-600 opacity-60">Selecione uma inspeção pendente ou bloqueada para registrar o resultado técnico e gerenciar a disponibilidade do ativo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationView;
