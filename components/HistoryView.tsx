
import React, { useState, useMemo } from 'react';
import { ChecklistEntry, User } from '../types';
import { Search, ExternalLink, AlertCircle, CheckCircle2, X, Calendar, User as UserIcon, Clock, MapPin, Camera, ShieldCheck, Box, Filter, Eye, ClipboardList } from 'lucide-react';
import { buildScrapPdf, type ScrapFormData } from '../services/scrapPdf';

interface Props {
  checklists: ChecklistEntry[];
  user: User;
}

const HistoryView: React.FC<Props> = ({ checklists, user }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Date & Time Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Manager Scope Toggle (Only for Managers)
  const [viewScope, setViewScope] = useState<'MINE' | 'TEAM'>('MINE'); // Default to MINE

  const [selectedEntry, setSelectedEntry] = useState<ChecklistEntry | null>(null);
  const [isRegeneratingPdf, setIsRegeneratingPdf] = useState(false);

  const toStr = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

  const extractScrapFormData = (entry: ChecklistEntry): ScrapFormData => {
    const data = (entry.customData && typeof entry.customData === 'object') ? entry.customData : {};
    return {
      secondWeightTime: toStr((data as any).secondWeightTime),
      client: toStr((data as any).client),
      bucketNumber: toStr((data as any).bucketNumber || entry.equipmentNo),
      bucketType: toStr((data as any).bucketType),
      bucketTare: toStr((data as any).bucketTare),
      ticketNumber: toStr((data as any).ticketNumber),
      truckPlate: toStr((data as any).truckPlate),
      driverName: toStr((data as any).driverName),
      driverCpf: toStr((data as any).driverCpf),
      truckTare: toStr((data as any).truckTare),
      netWeight: toStr((data as any).netWeight),
      obs: toStr((data as any).obs || entry.observations),
    };
  };

  const handleRegenerateScrapPdf = async (entry: ChecklistEntry) => {
    if (entry.area !== 'SUCATA') return;

    setIsRegeneratingPdf(true);
    try {
      const pdf = await buildScrapPdf({
        formData: extractScrapFormData(entry),
        evidences: entry.evidence || [],
        user,
        entryId: entry.id,
      });

      const url = URL.createObjectURL(pdf.pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = pdf.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      alert('Falha ao regenerar PDF deste checklist.');
    } finally {
      setIsRegeneratingPdf(false);
    }
  };

  // Filter Logic
  const filteredChecklists = useMemo(() => {
    return checklists.filter(check => {
      // 1. Scope Filter (Security)
      if (user.role === 'OPERATOR') {
        if (check.userId !== user.id) return false; // Strict: Only own records
      } else {
        // Manager Logic
        if (viewScope === 'MINE') {
          if (check.userId !== user.id) return false;
        }
        // If TEAM, show all (that belong to this manager's scope - already filtered by parent usually, but double check if needed)
      }

      // 2. Text Search
      const matchesSearch = check.equipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.userName.toLowerCase().includes(searchTerm.toLowerCase());

      const checkDate = new Date(check.createdAt);

      // 3. Date Range
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (checkDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (checkDate > end) return false;
      }

      // 4. Time Range (HH:mm)
      // Extract HH:mm from checkDate
      const checkTimeVal = checkDate.getHours() * 60 + checkDate.getMinutes();

      if (startTime) {
        const [h, m] = startTime.split(':').map(Number);
        const startVal = h * 60 + m;
        if (checkTimeVal < startVal) return false;
      }
      if (endTime) {
        const [h, m] = endTime.split(':').map(Number);
        const endVal = h * 60 + m;
        if (checkTimeVal > endVal) return false;
      }

      return matchesSearch;
    }).sort((a, b) => b.createdAt - a.createdAt); // Default Sort: Recent first
  }, [checklists, searchTerm, startDate, endDate, startTime, endTime, viewScope, user]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">Histórico Individual</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {user.role === 'MANAGER'
              ? "Gerencie seus registros e monitore a produtividade da equipe."
              : "Consulte seus registros antigos e evidências de inspeção."}
          </p>
        </div>

        {user.role === 'MANAGER' && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewScope('MINE')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewScope === 'MINE' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Meus Registros
            </button>
            <button
              onClick={() => setViewScope('TEAM')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewScope === 'TEAM' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Registros da Equipe
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-end">

        {/* Search */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Placa, Equipamento, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-600 dark:text-slate-300" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-600 dark:text-slate-300" />
          </div>
        </div>

        {/* Time Range */}
        <div className="flex gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início (Hora)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-600 dark:text-slate-300" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim (Hora)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-600 dark:text-slate-300" />
          </div>
        </div>

        {(searchTerm || startDate || endDate || startTime || endTime) && (
          <button onClick={clearFilters} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-6">ID / Data</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6">Veículo/Equipamento</th>
                <th className="px-6 py-6">Brasiltec</th>
                <th className="px-6 py-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredChecklists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum registro encontrado para os filtros atuais.</td>
                </tr>
              ) : filteredChecklists.map((check) => {
                const hasNC = check.items?.some(i => i.status === 'NC') ||
                  (check.customData && Object.values(check.customData).some(v => v === 'NC' || v === 'Não Conforme'));

                return (
                  <tr key={check.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase">#{check.id.split('-')[0]}</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {new Date(check.createdAt).toLocaleDateString('pt-BR')} <span className="text-slate-400">• {new Date(check.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      {hasNC ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black border border-red-100 dark:border-red-900/30 uppercase">
                          <AlertCircle size={12} /> Não Conforme
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-100 dark:border-emerald-900/30 uppercase">
                          <CheckCircle2 size={12} /> Conforme
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{check.equipmentNo}</span>
                    </td>
                    <td className="px-6 py-6">
                      {check.brasiltec?.present ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Presente</span>
                      ) : check.brasiltec?.justification ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Ausente (Justificado)</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button
                        onClick={() => setSelectedEntry(check)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 ml-auto"
                      >
                        <Eye size={14} /> Ver Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes (Read Only) */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-fade-in overflow-auto py-10">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl border border-white/20 dark:border-slate-800 relative animate-scale-up overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-20"
            >
              <X size={28} />
            </button>

            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 p-10 text-white relative shrink-0">
              <div className="relative z-10 space-y-4">
                <div className="flex gap-2">
                  <span className="bg-emerald-600 text-[9px] font-black uppercase px-2 py-1 rounded">Histórico Estático</span>
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Detalhes da Inspeção</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">ID</p>
                    <p className="font-bold text-sm">#{selectedEntry.id.split('-')[0]}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Responsável</p>
                    <p className="font-bold text-sm">{selectedEntry.userName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Veículo/Ativo</p>
                    <p className="font-bold text-sm">{selectedEntry.equipmentNo}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Data</p>
                    <p className="font-bold text-sm">{new Date(selectedEntry.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Scrollable */}
            <div className="p-10 overflow-auto custom-scrollbar space-y-8 bg-slate-50 dark:bg-slate-800/20 flex-1">

              {/* Evidence Gallery */}
              <div>
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">
                  <Camera size={16} /> Evidências Anexadas
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedEntry.evidence && selectedEntry.evidence.length > 0 ? selectedEntry.evidence.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group cursor-pointer shadow-sm bg-white">
                      <img src={img} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        Visualizar
                      </div>
                    </div>
                  )) : (
                    <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                      Sem evidências
                    </div>
                  )}
                </div>
              </div>

              {/* Justificativa Brasiltec se houver */}
              {selectedEntry.brasiltec?.justification && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Justificativa Ausência Brasiltec</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">"{selectedEntry.brasiltec.justification}"</p>


                </div>
              )}

              {/* Lista de Itens Inspecionados */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
                  <ClipboardList size={16} /> Itens Inspecionados
                </h4>
                <div className="space-y-2">
                  {selectedEntry.items.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border ${item.status === 'NC' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                      <span className={`text-xs font-bold ${item.status === 'NC' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>{item.description}</span>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${item.status === 'NC' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {item.status === 'NC' ? 'Não Conforme' : 'Conforme'}
                      </span>
                    </div>
                  ))}
                  {selectedEntry.customData && Object.entries(selectedEntry.customData).map(([key, value], idx) => (
                    <div key={`custom-${idx}`} className={`flex justify-between items-center p-3 rounded-xl border ${value === 'NC' || value === 'Não Conforme' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${value === 'NC' || value === 'Não Conforme' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {value === 'NC' || value === 'Não Conforme' ? 'Não Conforme' : 'Conforme'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              {selectedEntry.observations && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações Gerais</p>
                  <p className="text-sm italic text-slate-600 dark:text-slate-400">"{selectedEntry.observations}"</p>
                </div>
              )}

            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="flex items-center justify-center gap-3">
                {selectedEntry.area === 'SUCATA' && (
                  <button
                    onClick={() => handleRegenerateScrapPdf(selectedEntry)}
                    disabled={isRegeneratingPdf}
                    className="py-3 px-8 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {isRegeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF novamente'}
                  </button>
                )}
                <button onClick={() => setSelectedEntry(null)} className="py-3 px-8 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors">Fechar Visualiza��o</button>
              </div>
            </div>

          </div>
        </div>
      )
      }
    </div >
  );
};

export default HistoryView;

