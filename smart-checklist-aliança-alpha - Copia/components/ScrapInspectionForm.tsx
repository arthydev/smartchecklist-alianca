import React, { useState, useRef } from 'react';
import { Camera, Send, FileText, Truck, Scale, AlertTriangle, Download, Mail, Image as ImageIcon, X } from 'lucide-react';
import { ChecklistEntry, User, AppSettings } from '../types';
import { backend } from '../services/backend';

interface Props {
    onSave: (entry: ChecklistEntry) => void;
    user: User;
    settings: AppSettings;
}

const ScrapInspectionForm: React.FC<Props> = ({ onSave, user, settings }) => {
    // Specific Evidence State
    const [evidences, setEvidences] = useState({
        superior: '',
        lateral: '',
        frontal: '',
        rear: ''
    });

    const [formData, setFormData] = useState({
        secondWeightTime: '',
        client: '',
        bucketNumber: '',
        bucketType: 'BAIXA', // BAIXA or ALTA
        bucketTare: '',
        ticketNumber: '',
        truckPlate: '',
        driverName: '',
        driverCpf: '',
        truckTare: '',
        netWeight: '',
        obs: ''
    });

    // Camera/File Refs for each slot
    const fileInputRefs = {
        superior: useRef<HTMLInputElement>(null),
        superiorFile: useRef<HTMLInputElement>(null),
        lateral: useRef<HTMLInputElement>(null),
        lateralFile: useRef<HTMLInputElement>(null),
        frontal: useRef<HTMLInputElement>(null),
        frontalFile: useRef<HTMLInputElement>(null),
        rear: useRef<HTMLInputElement>(null),
        rearFile: useRef<HTMLInputElement>(null)
    };

    // Webcam State
    const [showWebcam, setShowWebcam] = useState(false);
    const [activeSlot, setActiveSlot] = useState<keyof typeof evidences | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startWebcam = async (slot: keyof typeof evidences) => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            setActiveSlot(slot);
            setShowWebcam(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = mediaStream;
            }, 100);
        } catch (err) {
            console.error("Webcam error:", err);
            alert("Erro ao acessar a câmera. Certifique-se de que deu permissão.");
        }
    };

    const stopWebcam = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowWebcam(false);
        setActiveSlot(null);
    };

    const capturePhoto = () => {
        if (videoRef.current && activeSlot) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setEvidences(prev => ({ ...prev, [activeSlot]: dataUrl }));
                stopWebcam();
            }
        }
    };

    const handleFileSelect = (slot: keyof typeof evidences, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEvidences(prev => ({ ...prev, [slot]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
        // Clear input to allow re-selecting same file
        e.target.value = '';
    };

    const handleEmail = (entry: ChecklistEntry) => {
        const recipients = settings.scrapRecipients ? settings.scrapRecipients.join(';') : '';
        const subject = `RES: Saldo de sucata ${new Date().toLocaleDateString('pt-BR')}`;

        const body = `Bom dia !!!

Segue a ficha de saída de sucata devidamente preenchido e ticket de pesagem veículo aguardando a nota fiscal para sua devida liberação.

• 1 caçamba ${formData.bucketType} de Nº ${formData.bucketNumber} com ${(Number(formData.netWeight) / 1000).toFixed(3)} ton. (à faturar no CT ${formData.ticketNumber}).

Segue abaixo dados do motorista em operação na planta Aços Aliança.
• - ${formData.driverName} (${formData.driverCpf})
• - Caminhão placa (${formData.truckPlate})

Atenciosamente,
${user.name}`;

        window.open(`mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all 4 photos
        if (!evidences.superior || !evidences.lateral || !evidences.frontal || !evidences.rear) {
            alert("É obrigatório anexar as 4 fotos exigidas (Superior, Lateral, Frontal e Traseira).");
            return;
        }

        const entry: ChecklistEntry = {
            id: crypto.randomUUID(),
            userId: user.id,
            userName: user.name,
            managerId: user.managerId || user.id,
            date: new Date().toISOString(),
            equipmentNo: formData.bucketNumber || 'S/N',
            area: 'SUCATA',
            shift: 'Administrativo',
            items: [],
            customData: { ...formData },
            observations: formData.obs,
            // Store specific evidences in the array in a known order or metadata if needed
            // For now, flattening them into the array
            evidence: [evidences.superior, evidences.lateral, evidences.frontal, evidences.rear],
            approvalStatus: 'APPROVED',
            createdAt: Date.now()
        };

        handleEmail(entry);
        onSave(entry);

        // Reset Form
        setEvidences({ superior: '', lateral: '', frontal: '', rear: '' });
        setFormData({
            secondWeightTime: '',
            client: '',
            bucketNumber: '',
            bucketType: 'BAIXA',
            bucketTare: '',
            ticketNumber: '',
            truckPlate: '',
            driverName: '',
            driverCpf: '',
            truckTare: '',
            netWeight: '',
            obs: ''
        });
        alert('Solicitação de faturamento enviada com sucesso!');
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            {/* Webcam Modal Overlay */}
            {showWebcam && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-auto object-cover" />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 z-10">
                            <button onClick={stopWebcam} className="p-4 rounded-full bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-md">
                                <X size={24} />
                            </button>
                            <button onClick={capturePhoto} className="p-6 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:scale-110 transition-all active:scale-95">
                                <Camera size={32} />
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs mt-4 font-bold uppercase tracking-widest text-center px-4">Ajuste o enquadramento da {activeSlot === 'superior' ? 'Vista Superior' : activeSlot === 'lateral' ? 'Vista Lateral' : activeSlot === 'frontal' ? 'Vista Frontal' : 'Vista Traseira'}</p>
                </div>
            )}
            <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <span className="bg-amber-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded tracking-widest">Controle de Saída</span>
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic mt-2">Gestão de <span className="text-amber-500">Sucata</span></h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest border-b pb-2"><Truck size={16} /> Dados da Caçamba</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <input placeholder="Nº Caçamba" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.bucketNumber} onChange={e => setFormData({ ...formData, bucketNumber: e.target.value.toUpperCase() })} required />
                            <select className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none" value={formData.bucketType} onChange={e => setFormData({ ...formData, bucketType: e.target.value })}>
                                <option value="BAIXA">Caçamba TIPO BAIXA</option>
                                <option value="ALTA">Caçamba TIPO ALTA</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest border-b pb-2"><Scale size={16} /> Dados do Transporte</h3>
                        <input placeholder="Nº Ticket Balança" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.ticketNumber} onChange={e => setFormData({ ...formData, ticketNumber: e.target.value.toUpperCase() })} required />

                        <div className="grid grid-cols-2 gap-3">
                            <input placeholder="Placa Veículo" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.truckPlate} onChange={e => setFormData({ ...formData, truckPlate: e.target.value.toUpperCase() })} required />
                            <input placeholder="CPF Motorista" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.driverCpf} onChange={e => setFormData({ ...formData, driverCpf: e.target.value.toUpperCase() })} required />
                        </div>
                        <input placeholder="Nome do Motorista" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value.toUpperCase() })} required />

                        <div className="space-y-1 mt-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora de Segunda Pesagem</label>
                            <input type="time" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.secondWeightTime} onChange={e => setFormData({ ...formData, secondWeightTime: e.target.value })} required />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <input placeholder="Tara Caminhão (kg)" type="number" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.truckTare} onChange={e => setFormData({ ...formData, truckTare: e.target.value })} required />
                            <input placeholder="Tara Caçamba (kg)" type="number" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.bucketTare} onChange={e => setFormData({ ...formData, bucketTare: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-3">
                                <span className="text-[10px] uppercase whitespace-nowrap">Peso Líquido:</span>
                                <input
                                    placeholder="0"
                                    type="number"
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-emerald-700 placeholder:text-emerald-300"
                                    value={formData.netWeight}
                                    onChange={e => setFormData({ ...formData, netWeight: e.target.value })}
                                    required
                                />
                                <span className="text-[10px] uppercase">kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Destino</label>
                    <select
                        className="w-full p-4 bg-slate-50 rounded-xl text-lg font-bold border-none outline-none"
                        value={formData.client}
                        onChange={e => setFormData({ ...formData, client: e.target.value })}
                        required
                    >
                        <option value="">Selecione o Cliente...</option>
                        {settings.scrapClients && settings.scrapClients.length > 0 ? (
                            settings.scrapClients.map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))
                        ) : (
                            <option value="" disabled>NENHUM CLIENTE CADASTRADO</option>
                        )}
                    </select>
                </div>

                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest border-b pb-2"><Camera size={16} /> Evidências Obrigatórias (4 Fotos)</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { key: 'superior', label: '1º Visão Superior (Caçamba)', camRef: 'superior', fileRef: 'superiorFile' },
                            { key: 'lateral', label: '2º Visão Lateral (Nº Caçamba)', camRef: 'lateral', fileRef: 'lateralFile' },
                            { key: 'frontal', label: '3º Visão Frontal (Placa)', camRef: 'frontal', fileRef: 'frontalFile' },
                            { key: 'rear', label: '4º Visão Traseira (Placa)', camRef: 'rear', fileRef: 'rearFile' }
                        ].map((slot) => (
                            <div key={slot.key} className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-500 ml-1">{slot.label}</p>

                                <div className="relative aspect-video bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden group">
                                    {evidences[slot.key as keyof typeof evidences] ? (
                                        <>
                                            <img src={evidences[slot.key as keyof typeof evidences]} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setEvidences(prev => ({ ...prev, [slot.key]: '' }))}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <ImageIcon className="mx-auto text-slate-200 mb-2" size={32} />
                                            <span className="text-[10px] font-bold text-slate-300 uppercase">Nenhuma foto</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => startWebcam(slot.key as keyof typeof evidences)}
                                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Camera size={14} /> Tirar Foto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRefs[slot.fileRef as keyof typeof fileInputRefs].current?.click()}
                                        className="flex-1 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <ImageIcon size={14} /> Arquivo
                                    </button>
                                </div>

                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRefs[slot.camRef as keyof typeof fileInputRefs]}
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handleFileSelect(slot.key as keyof typeof evidences, e)}
                                />
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRefs[slot.fileRef as keyof typeof fileInputRefs]}
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(slot.key as keyof typeof evidences, e)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit" className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200">
                    SALVAR E SOLICITAR FATURAMENTO
                </button>
            </form>
        </div>
    );
};

export default ScrapInspectionForm;
