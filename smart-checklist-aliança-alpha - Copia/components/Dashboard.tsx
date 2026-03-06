
import React, { useRef } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { ChecklistEntry, User, AppSettings, AppView } from '../types';
import { AlertCircle, ClipboardList, ShieldAlert, Activity, AlertTriangle, ArrowRight, Layers, Box, Users, UserX, CheckCircle2, Truck, Scale } from 'lucide-react';
import { backend } from '../services/backend';

interface Props {
  checklists: ChecklistEntry[];
  settings: AppSettings;
  user: User | null;
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<Props> = ({ checklists, settings, user, onNavigate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const usersRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];
  const todayChecklists = checklists.filter(c => c.date.startsWith(today));

  // EQUIPAMENTOS
  const allEquipments = settings.equipment;
  const activeUsage = allEquipments.filter(e => e.type === 'PRIMARY' && e.active);
  const activeBackup = allEquipments.filter(e => e.type === 'BACKUP' && e.active);

  // Equipamentos em manutenção hoje
  const inMaintenance = allEquipments.filter(e => backend.isEntityInAbsence(e.id, today));

  // PENDENTES DE INSPEÇÃO: Equipamentos de Uso (Primary) que não estão em manutenção e não tem check hoje
  const missingChecklists = activeUsage.filter(eq =>
    !backend.isEntityInAbsence(eq.id, today) &&
    !todayChecklists.some(c => c.equipmentNo === eq.code)
  );

  // USUÁRIOS (OPERADORES)
  const managerId = user ? (user.role === 'MANAGER' ? user.id : user.managerId) : null;
  const operators = managerId ? backend.getUsers(managerId).filter(u => u.role === 'OPERATOR') : [];

  // Ativos hoje (não estão de férias/licença)
  const activeOperatorsToday = operators.filter(u => !backend.isEntityInAbsence(u.id, today));
  // PENDENTES: Operadores ativos que não enviaram check-list hoje
  const missingOperators = activeOperatorsToday.filter(u =>
    !todayChecklists.some(c => c.userId === u.id)
  );

  // MÉTRICAS
  const nonConformantToday = todayChecklists.filter(c => c.items.some(i => i.status === 'NC')).length;
  const pendingValidation = checklists.filter(c => c.approvalStatus === 'PENDING').length;
  const totalChecks = checklists.length;

  const pieData = [
    { name: 'Autorizados', value: checklists.filter(c => c.approvalStatus === 'APPROVED').length },
    { name: 'Bloqueados', value: checklists.filter(c => c.approvalStatus === 'REJECTED').length },
    { name: 'Em Análise', value: pendingValidation },
  ];

  return (
    <div className="space-y-8 lg:space-y-12 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest">Aliança Smart Equipment Control</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter uppercase leading-none italic">Dashboard <span className="text-emerald-500">Analytics</span></h2>
        </div>

        {/* Botão removido daqui conforme solicitado - agora exclusivo em Configurações */}
      </div>

      {/* Grid de Métricas Principais */}
      {/* Grid de Métricas Principais */}
      {user?.area === 'QUALIDADE' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard
            icon={<CheckCircle2 size={24} />}
            label="Checklists Realizados no Dia"
            value={todayChecklists.length}
            subValue="Total de inspeções hoje"
            color="emerald"
          />
          <StatCard
            icon={<AlertCircle size={24} />}
            label="Pendentes de Aprovação"
            value={pendingValidation}
            subValue="Aguardando retorno"
            color="amber"
            onClick={() => onNavigate(AppView.VALIDATION)}
          />
        </div>
      ) : user?.area === 'SUCATA' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<Truck size={24} />}
            label="Caçambas Expedidas"
            value={todayChecklists.length}
            subValue="Saídas Registradas Hoje"
            color="amber"
          />
          <StatCard
            icon={<Scale size={24} />}
            label="Toneladas Expedidas"
            value={todayChecklists.reduce((acc, c) => acc + (Number(c.customData.netWeight) || 0), 0) / 1000}
            subValue="Peso Líquido Total (t)"
            color="emerald"
          />
          <StatCard
            icon={<Users size={24} />}
            label="Motoristas Atendidos"
            value={new Set(todayChecklists.map(c => c.customData.driverName)).size}
            subValue="Total Único Hoje"
            color="slate"
            onClick={() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatCard
            icon={<Box size={20} />}
            label="Total Ativos"
            value={allEquipments.length}
            subValue={`${activeUsage.length} Uso | ${activeBackup.length} Backup`}
            color="slate"
          />
          <StatCard
            icon={<AlertTriangle size={20} />}
            label="Inspeção Pendente"
            value={missingChecklists.length}
            subValue="Itens sem check hoje"
            color="amber"
            onClick={() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />
          <StatCard
            icon={<UserX size={20} />}
            label="Ops. Pendentes"
            value={missingOperators.length}
            subValue="Colaboradores s/ envio"
            color="amber"
            onClick={() => usersRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />
          <StatCard
            icon={<AlertCircle size={20} />}
            label="Não Conformes"
            value={nonConformantToday}
            subValue="Falhas técnicas hoje"
            color="red"
          />
          <StatCard
            icon={<ShieldAlert size={20} />}
            label="Validação"
            value={pendingValidation}
            subValue="Aguardando aprovação"
            color="emerald"
            onClick={() => onNavigate(AppView.VALIDATION)}
          />
          <StatCard
            icon={<Activity size={20} />}
            label="Em Manutenção"
            value={inMaintenance.length}
            subValue="Ativos indisponíveis"
            color="slate"
          />
        </div>
      )}

      {user?.area === 'SUCATA' ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none" ref={scrollRef}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-2">
              <Truck size={20} className="text-amber-500" /> Registro de Saídas (Hoje)
            </h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-3 py-1 rounded-full text-[10px]">{todayChecklists.length} Tickets</span>
          </div>

          <div className="space-y-2">
            {todayChecklists.length === 0 && <p className="text-center text-slate-400 text-xs py-10">Nenhuma saída registrada hoje.</p>}
            {todayChecklists.map(c => (
              <div key={c.id} className="grid grid-cols-2 md:grid-cols-5 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl gap-4">
                <div className="col-span-2 md:col-span-2">
                  <p className="font-black text-slate-800 dark:text-slate-100 text-xs">{c.customData.client}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Ticket: {c.customData.ticketNumber}</p>
                </div>
                <div className="hidden md:block">
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-xs">{c.customData.bucketNumber}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{c.customData.bucketType}</p>
                </div>
                <div>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{(Number(c.customData.netWeight) / 1000).toFixed(3)} ton</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Líquido</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-500 text-[10px]">{new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Listagem de Equipamentos Pendentes */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none" ref={scrollRef}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest">Equipamentos em Uso sem Inspeção (Hoje)</h3>
                </div>
                <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-black px-4 py-1.5 rounded-full uppercase">Pendente</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missingChecklists.map(eq => (
                  <div key={eq.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="font-black text-slate-800 dark:text-slate-100 text-sm">{eq.code}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{eq.description}</span>
                  </div>
                ))}
                {missingChecklists.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={32} />
                    <p className="text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">Equipamentos 100% Inspecionados</p>
                  </div>
                )}
              </div>
            </div>

            {/* Listagem de Colaboradores Pendentes */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none" ref={usersRef}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl">
                    <Users size={20} />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest">Colaboradores Pendentes de Checklist</h3>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-black px-4 py-1.5 rounded-full uppercase">Aguardando Envio</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missingOperators.map(u => (
                  <div key={u.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-[12px] font-black text-slate-400 dark:text-slate-300 shadow-sm">{u.name[0]}</div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800 dark:text-slate-100 text-xs">{u.name}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">ID: {u.username}</p>
                    </div>
                  </div>
                ))}
                {missingOperators.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/30">
                    <Users className="mx-auto mb-3 text-emerald-500" size={32} />
                    <p className="text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">Todos colaboradores conformes</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status de Validação e Gráfico */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
              <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
                <ShieldAlert size={16} className="text-emerald-500" /> Validação de Risco
              </h3>

              <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalChecks}</p>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registros</p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <LegendItem color="bg-emerald-500" label="Autorizados" count={pieData[0].value} />
                <LegendItem color="bg-red-500" label="Bloqueados" count={pieData[1].value} />
                <LegendItem color="bg-amber-500" label="Pendente Análise" count={pieData[2].value} />
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl dark:shadow-none border dark:border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <Layers className="text-emerald-400" size={20} />
                <h3 className="font-black uppercase text-[10px] tracking-widest">Gestão de Backup</h3>
              </div>
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-white/5 dark:border-white/10 pb-5">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Uso de Backup (Hoje)</p>
                  <p className="text-4xl font-black text-emerald-400">{todayChecklists.filter(c => allEquipments.find(e => e.code === c.equipmentNo)?.type === 'BACKUP').length}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Em Manutenção</p>
                  <p className="text-4xl font-black text-amber-400">{inMaintenance.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, subValue, color, onClick }: any) => {
  const themes: any = {
    slate: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
    red: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/40',
    amber: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/40',
    emerald: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/40'
  };

  const iconThemes: any = {
    slate: 'bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-300',
    red: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
  };

  return (
    <div
      onClick={onClick}
      className={`${themes[color]} p-6 rounded-[2rem] border shadow-xl shadow-slate-200/20 dark:shadow-none transition-all text-left flex flex-col group ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className={`${iconThemes[color]} w-10 h-10 rounded-xl flex items-center justify-center mb-6 shadow-sm`}>
        {icon}
      </div>
      <p className="text-3xl font-black mb-1 text-slate-900 dark:text-slate-100 tracking-tighter">{value}</p>
      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{label}</p>
      <div className="h-[1px] w-full bg-slate-50 dark:bg-slate-800 mb-3" />
      <p className="text-[8px] font-bold text-slate-300 dark:text-slate-500 uppercase truncate">{subValue}</p>
    </div>
  );
};

const LegendItem = ({ color, label, count }: { color: string, label: string, count: number }) => (
  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">{label}</span>
    </div>
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{count}</span>
  </div>
);

export default Dashboard;
