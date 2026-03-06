import React, { useState } from 'react';
import {
    Clock, Truck, User, FileText, CheckCircle2, AlertTriangle, Send, Camera, X, PlusCircle, Calendar, MapPin, Scale, Layout, ShieldCheck
} from 'lucide-react';
import { ChecklistEntry, User as UserType, AppSettings } from '../types';
import { sendWhatsAppAlert } from '../services/whatsappService';
import { backend } from '../services/backend';
import EvidenceUploader from './EvidenceUploader';

interface Props {
    onSave: (entry: ChecklistEntry) => void;
    user: UserType;
    settings: AppSettings;
}

const LogisticChecklistForm: React.FC<Props> = ({ onSave, user, settings }) => {
    const [step, setStep] = useState(1);
    const [evidences, setEvidences] = useState<string[]>([]);
    const [problemEvidences, setProblemEvidences] = useState<Record<string, string[]>>({});

    // Brasiltec State
    const [brasiltecUsers, setBrasiltecUsers] = useState<any[]>([]);
    const [selectedBrasiltecUser, setSelectedBrasiltecUser] = useState('');
    const [brasiltecPassword, setBrasiltecPassword] = useState('');
    const [isBrasiltecAbsent, setIsBrasiltecAbsent] = useState(false);
    const [absenceJustification, setAbsenceJustification] = useState('');

    React.useEffect(() => {
        const managerId = user.role === 'MANAGER' ? user.id : user.managerId!;
        setBrasiltecUsers(backend.getBrasiltecUsers(managerId));
    }, [user]);

    // Form State
    const [formData, setFormData] = useState({
        // Header
        startTime: '',
        endTime: '',
        freightType: 'CIF', // CIF or FOB
        dtNumber: '',
        client: '',
        transporter: '',
        driverName: '',
        truckPlate: '',
        trailerPlate: '',

        // Truck Type & Loading Context
        truckType: '', // Sider, Truck, Bobineiro, Outros
        loadingMethod: '', // Ponte Rolante, Empilhadeira
        loadingLocation: '', // Baia, Pátio, Recebimento
        loadingPeriod: '', // Diurno, Noturno
        weather: '', // Ensolarado, Céu Limpo, Nublado, Chuvoso

        // Process
        weighed: null as boolean | null,
        weightDivergence: null as boolean | null,
        removedCargo: null as boolean | null,
        loadingType: '', // Bobina, Blank, Misto
        newDtNumber: '', // If removedCargo is yes

        // Structure & Safety Inspections (Conforme, Não Conforme, NA)
        tiresTruck: null as string | null,
        tiresTrailer: null as string | null,
        windshield: null as string | null,
        floorClean: null as string | null,
        floorDry: null as string | null,
        floorHoles: null as string | null,
        brakes: null as string | null,
        lights: null as string | null,
        reverseAlarm: null as string | null,

        // Lashing & Structure
        straps: null as string | null,
        fixers: null as string | null,
        shackles: null as string | null,

        // Environment
        blackSmoke: null as string | null,

        // Load Position & Packaging
        weightDistribution: null as string | null,
        loadAlignment: null as string | null,
        cabinDistance: null as string | null, // > 50cm
        materialDistance: null as string | null, // > 35cm
        coilLoading: null as string | null,
        wedges: null as string | null,
        cleanChannel: null as string | null,
        strapping: null as string | null,
        packaging: null as string | null,
        blankStacking: null as string | null,
        labels: null as string | null,
        palletIntegrity: null as string | null,
        coilHorizontal: null as string | null,
        blankLongitudinal: null as string | null,
        canvasCondition: null as string | null,
        tarpedExit: null as string | null,

        observations: ''
    });

    const isStep1Valid = () => {
        const required = ['dtNumber', 'client', 'transporter', 'driverName', 'truckPlate', 'trailerPlate', 'truckType', 'loadingMethod', 'loadingLocation', 'weather'];
        // Check if all required fields have a value (truthy string)
        return required.every(key => (formData as any)[key] && (formData as any)[key].trim() !== '');
    };

    const isStep2Valid = () => {
        // List of fields in step 2 (Structure & Safety + Load Position)
        // We need to check if they are != null (since they init as null)
        const fields = [
            'tiresTruck', 'tiresTrailer', 'windshield', 'floorClean', 'floorDry', 'floorHoles', 'brakes', 'lights', 'reverseAlarm',
            'weightDistribution', 'loadAlignment', 'cabinDistance', 'materialDistance', 'coilLoading', 'wedges', 'cleanChannel', 'strapping', 'packaging'
        ];

        // Check 1: All answered
        const allAnswered = fields.every(key => (formData as any)[key] !== null);
        if (!allAnswered) return { valid: false, msg: "Responda todos os itens da inspeção." };

        // Check 2: All NCs have evidence
        const missingEvidence = fields.some(key => {
            const val = (formData as any)[key];
            const hasEv = problemEvidences[key] && problemEvidences[key].length > 0;
            return (val === 'Não Conforme' || val === 'NC') && !hasEv;
        });

        if (missingEvidence) return { valid: false, msg: "Itens 'Não Conforme' exigem evidência fotográfica obrigatória." };

        return { valid: true };
    };

    const handleNextStep = (targetStep: number) => {
        if (targetStep === 2) {
            if (!isStep1Valid()) {
                alert("Por favor, preencha todos os dados da viagem e caracterização.");
                return;
            }
        }
        if (targetStep === 3) {
            const validation = isStep2Valid();
            if (!validation.valid) {
                alert(validation.msg);
                return;
            }
        }
        setStep(targetStep);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Brasiltec Validation Logic
        if (!isBrasiltecAbsent) {
            if (!selectedBrasiltecUser) {
                alert("Selecione o colaborador Brasiltec responsável ou marque como Ausente.");
                return;
            }
            if (!backend.validateBrasiltecUser(selectedBrasiltecUser, brasiltecPassword)) {
                alert("Senha do colaborador Brasiltec incorreta.");
                return;
            }
        } else {
            if (!absenceJustification.trim()) {
                alert("Ação bloqueada: É obrigatório justificar por que não houve a inspeção Brasiltec.");
                return;
            }
        }

        const hasNC = Object.values(formData).some(val => val === 'NC' || val === 'Não Conforme');
        const managerId = user.role === 'MANAGER' ? user.id : user.managerId!;

        // Collect all evidences (General + Problem Specific)
        const allEvidences = [...evidences];
        (Object.values(problemEvidences) as string[][]).forEach(evs => allEvidences.push(...evs));

        const entry: ChecklistEntry = {
            id: crypto.randomUUID(),
            userId: user.id,
            userName: user.name,
            managerId: managerId,
            date: new Date().toISOString(),
            equipmentNo: formData.truckPlate,
            area: 'QUALIDADE',
            shift: 'Logística',
            items: [],
            customData: { ...formData, problemEvidences }, // Store specific evidences map
            observations: formData.observations,
            evidence: allEvidences,
            approvalStatus: hasNC ? 'PENDING' : 'APPROVED',
            supervisorName: !hasNC ? 'SISTEMA (AUTO)' : undefined,
            createdAt: Date.now(),
            brasiltec: {
                present: !isBrasiltecAbsent,
                userId: selectedBrasiltecUser,
                justification: isBrasiltecAbsent ? absenceJustification : undefined
            }
        };

        onSave(entry);

        if (hasNC) {
            const managerPhone = backend.getManagerTargetPhone(managerId);
            sendWhatsAppAlert(entry, managerPhone);
            alert("Não conformidade detectada. O gestor foi notificado via WhatsApp.");
        } else {
            alert("Checklist Logístico salvo com sucesso!");
        }

        setTimeout(() => window.location.reload(), 500);
    };

    // Helper Components
    const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 mb-4 mt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Icon size={18} className="text-emerald-500" />
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest">{title}</h3>
        </div>
    );

    const RadioGroup = ({ label, value, onChange, options }: any) => (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt: string) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${value === opt
                            ? 'bg-slate-900 dark:bg-emerald-600 text-white border-transparent shadow-lg transform scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );

    const ComplianceRow = ({ label, field }: { label: string, field: keyof typeof formData }) => {
        const status = (formData as any)[field];
        const isNC = status === 'Não Conforme' || status === 'NC';
        const fieldEvidences = problemEvidences[field] || [];

        return (
            <div className={`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border transition-all ${isNC ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${isNC ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'} w-1/2`}>{label}</span>
                    <div className="flex gap-2">
                        {['Conforme', 'Não Conforme', 'NA'].map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, [field]: opt }))}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${status === opt
                                    ? opt === 'Conforme' ? 'bg-emerald-500 text-white' : opt === 'Não Conforme' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'
                                    : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600'
                                    }`}
                            >
                                {opt === 'Conforme' ? 'OK' : opt === 'Não Conforme' ? 'NOK' : 'NA'}
                            </button>
                        ))}
                    </div>
                </div>

                {isNC && (
                    <div className="mt-4 animate-fade-in pl-4 border-l-2 border-red-200 dark:border-red-900/50">
                        <label className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2 block">Evidência Obrigatória</label>
                        <EvidenceUploader
                            evidences={fieldEvidences}
                            onUpdate={(newEvs) => setProblemEvidences(prev => ({ ...prev, [field]: newEvs }))}
                            maxEvidences={3}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded tracking-widest">Qualidade</span>
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic mt-2">Checklist de Expedição <span className="text-emerald-500">Qualidade</span></h2>
                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase">Obrigatório para liberação de carregamento</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {step === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle icon={FileText} title="Dados da Viagem" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DT / Documento</label>
                                <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={formData.dtNumber} onChange={e => setFormData({ ...formData, dtNumber: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                                <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })} />
                            </div>
                            <RadioGroup label="Responsabilidade Frete" value={formData.freightType} onChange={(v: any) => setFormData({ ...formData, freightType: v })} options={['CIF', 'FOB']} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transportadora</label>
                                <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={formData.transporter} onChange={e => setFormData({ ...formData, transporter: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motorista</label>
                                <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Placa Cavalo</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={formData.truckPlate} onChange={e => setFormData({ ...formData, truckPlate: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Placa Carreta</label>
                                    <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={formData.trailerPlate} onChange={e => setFormData({ ...formData, trailerPlate: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <SectionTitle icon={Truck} title="Caracterização e Carregamento" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <RadioGroup label="Tipo de Veículo" value={formData.truckType} onChange={(v: any) => setFormData({ ...formData, truckType: v })} options={['Sider', 'Truck', 'Bobineiro', 'Outros']} />
                            <RadioGroup label="Método Carregamento" value={formData.loadingMethod} onChange={(v: any) => setFormData({ ...formData, loadingMethod: v })} options={['Ponte Rolante', 'Empilhadeira']} />
                            <RadioGroup label="Local Carregamento" value={formData.loadingLocation} onChange={(v: any) => setFormData({ ...formData, loadingLocation: v })} options={['Baia', 'Pátio', 'Recebimento']} />
                            <RadioGroup label="Condições Climáticas" value={formData.weather} onChange={(v: any) => setFormData({ ...formData, weather: v })} options={['Ensolarado', 'Nublado', 'Úmido', 'Chuvoso']} />
                        </div>

                        <button type="button" onClick={() => handleNextStep(2)} className="w-full py-5 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                            Próxima Etapa <Send size={16} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle icon={ShieldCheck} title="Inspeção Estrutural" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ComplianceRow label="Pneus (Cavalo)" field="tiresTruck" />
                            <ComplianceRow label="Pneus (Carreta)" field="tiresTrailer" />
                            <ComplianceRow label="Para-brisas (Trincas)" field="windshield" />
                            <ComplianceRow label="Assoalho Limpo" field="floorClean" />
                            <ComplianceRow label="Assoalho Seco" field="floorDry" />
                            <ComplianceRow label="Assoalho Furado" field="floorHoles" />
                            <ComplianceRow label="Sistema Freios" field="brakes" />
                            <ComplianceRow label="Setas/Iluminação" field="lights" />
                            <ComplianceRow label="Alarme de Ré" field="reverseAlarm" />
                        </div>

                        <SectionTitle icon={Layout} title="Inspeção da Carga" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ComplianceRow label="Distribuição Peso" field="weightDistribution" />
                            <ComplianceRow label="Alinhamento Carga" field="loadAlignment" />
                            <ComplianceRow label="Distância Cabine (>50cm)" field="cabinDistance" />
                            <ComplianceRow label="Distância Materiais (>35cm)" field="materialDistance" />
                            <ComplianceRow label="Carregamento Bobina" field="coilLoading" />
                            <ComplianceRow label="Cunhas Madeira/Metal" field="wedges" />
                            <ComplianceRow label="Canaleta Limpa" field="cleanChannel" />
                            <ComplianceRow label="Cintamento" field="strapping" />
                            <ComplianceRow label="Embalagem Stretch" field="packaging" />
                        </div>

                        <button type="button" onClick={() => handleNextStep(3)} className="w-full py-5 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                            Próxima Etapa <Send size={16} />
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in space-y-6">
                        <SectionTitle icon={Camera} title="Evidências e Finalização" />

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl mb-6 border border-emerald-100 dark:border-emerald-900/30">
                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4">
                                <ShieldCheck size={14} /> Validação Brasiltec
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="brasiltec-absent"
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={isBrasiltecAbsent}
                                        onChange={e => setIsBrasiltecAbsent(e.target.checked)}
                                    />
                                    <label htmlFor="brasiltec-absent" className="text-xs font-bold text-slate-700 dark:text-slate-300">Colaborador Brasiltec AUSENTE</label>
                                </div>

                                {!isBrasiltecAbsent ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <select
                                            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                            value={selectedBrasiltecUser}
                                            onChange={e => setSelectedBrasiltecUser(e.target.value)}
                                        >
                                            <option value="">Selecione o Colaborador...</option>
                                            {brasiltecUsers.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="password"
                                            placeholder="Senha de Validação"
                                            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                                            value={brasiltecPassword}
                                            onChange={e => setBrasiltecPassword(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-fade-in">
                                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
                                            ⚠️ Por que não houve a inspeção do colaborador Brasiltec?
                                        </label>
                                        <textarea
                                            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none h-24 focus:ring-2 focus:ring-amber-500/20"
                                            placeholder="Justificativa obrigatória..."
                                            value={absenceJustification}
                                            onChange={e => setAbsenceJustification(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidências Gerais (Opcional)</label>
                            <EvidenceUploader evidences={evidences} onUpdate={setEvidences} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Gerais</label>
                            <textarea
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 h-32"
                                placeholder="Observações adicionais..."
                                value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
                            Liberar para Carregamento
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default LogisticChecklistForm;
