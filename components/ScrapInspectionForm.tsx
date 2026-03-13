import React, { useMemo, useRef, useState } from 'react';
import { Camera, Truck, Scale, Image as ImageIcon, X } from 'lucide-react';
import { ChecklistEntry, User, AppSettings } from '../types';
import { buildScrapPdf, renderPdfFirstPageAsImage, type ScrapFormData, type ScrapPdfResult } from '../services/scrapPdf';
import ScrapPdfPreviewModal from './ScrapPdfPreviewModal';

interface Props {
  onSave: (entry: ChecklistEntry) => void | Promise<void>;
  user: User;
  settings: AppSettings;
}

type EvidenceState = {
  superior: string;
  lateral: string;
  frontal: string;
  rear: string;
  ticketScale: string;
};

const EMPTY_EVIDENCES: EvidenceState = {
  superior: '',
  lateral: '',
  frontal: '',
  rear: '',
  ticketScale: '',
};

const EMPTY_FORM: ScrapFormData = {
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
  obs: '',
};

const isPdfDataUrl = (value: string): boolean => value.startsWith('data:application/pdf');

const compressImageDataUrl = (
  sourceDataUrl: string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.55
): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const targetW = Math.max(1, Math.round(img.width * ratio));
      const targetH = Math.max(1, Math.round(img.height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });

const ScrapInspectionForm: React.FC<Props> = ({ onSave, user, settings }) => {
  const [evidences, setEvidences] = useState<EvidenceState>(EMPTY_EVIDENCES);
  const [formData, setFormData] = useState<ScrapFormData>(EMPTY_FORM);

  const fileInputRefs = {
    superior: useRef<HTMLInputElement>(null),
    superiorFile: useRef<HTMLInputElement>(null),
    lateral: useRef<HTMLInputElement>(null),
    lateralFile: useRef<HTMLInputElement>(null),
    frontal: useRef<HTMLInputElement>(null),
    frontalFile: useRef<HTMLInputElement>(null),
    rear: useRef<HTMLInputElement>(null),
    rearFile: useRef<HTMLInputElement>(null),
    ticketScale: useRef<HTMLInputElement>(null),
    ticketScaleFile: useRef<HTMLInputElement>(null),
  };

  const [showWebcam, setShowWebcam] = useState(false);
  const [activeSlot, setActiveSlot] = useState<keyof EvidenceState | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<ChecklistEntry | null>(null);
  const [pendingPdf, setPendingPdf] = useState<ScrapPdfResult | null>(null);

  const evidenceList = useMemo(
    () => [evidences.superior, evidences.lateral, evidences.frontal, evidences.rear, evidences.ticketScale],
    [evidences]
  );
  const availableClients = useMemo(
    () => (settings.scrapDirectory || []).filter((entry) => entry.active !== false),
    [settings.scrapDirectory]
  );

  const startWebcam = async (slot: keyof EvidenceState) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setActiveSlot(slot);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      console.error('Webcam error:', err);
      alert('Erro ao acessar a camera. Verifique as permissoes.');
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowWebcam(false);
    setActiveSlot(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && activeSlot) {
      const canvas = document.createElement('canvas');
      const sourceW = videoRef.current.videoWidth;
      const sourceH = videoRef.current.videoHeight;
      const ratio = Math.min(1000 / sourceW, 1000 / sourceH, 1);
      canvas.width = Math.max(1, Math.round(sourceW * ratio));
      canvas.height = Math.max(1, Math.round(sourceH * ratio));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        setEvidences((prev) => ({ ...prev, [activeSlot]: dataUrl }));
        stopWebcam();
      }
    }
  };

  const handleFileSelect = async (slot: keyof EvidenceState, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (slot === 'ticketScale' && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const pdfDataUrl = reader.result as string;
            const imageDataUrl = await renderPdfFirstPageAsImage(pdfDataUrl);
            const compressed = await compressImageDataUrl(imageDataUrl, 1000, 1400, 0.52);
            setEvidences((prev) => ({ ...prev, [slot]: compressed }));
          } catch (err) {
            console.error(err);
            alert('Falha ao processar PDF do ticket. Tente outro arquivo.');
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawDataUrl = reader.result as string;
          const compressed = await compressImageDataUrl(rawDataUrl);
          setEvidences((prev) => ({ ...prev, [slot]: compressed }));
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const validateFormAndEvidences = (): boolean => {
    if (!evidences.superior || !evidences.lateral || !evidences.frontal || !evidences.rear || !evidences.ticketScale) {
      alert('E obrigatorio anexar as 5 fotos exigidas (Superior, Lateral, Frontal, Traseira e Ticket da Balanca).');
      return false;
    }
    return true;
  };

  const buildChecklistEntryBase = (): ChecklistEntry => ({
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
    evidence: evidenceList,
    approvalStatus: 'APPROVED',
    createdAt: Date.now(),
  });

  const handleEmail = (entry: ChecklistEntry) => {
    const selectedClient = availableClients.find((item) => item.client === formData.client);
    const recipients = selectedClient?.recipients?.length ? selectedClient.recipients.join(';') : '';
    const subject = `RES: Saldo de sucata ${new Date().toLocaleDateString('pt-BR')}`;

    const body = `Bom dia !!!

Segue a ficha de saida de sucata devidamente preenchida e ticket de pesagem do veiculo aguardando a nota fiscal para liberacao.

- 1 cacamba ${formData.bucketType} de N ${formData.bucketNumber} com ${(Number(formData.netWeight) / 1000).toFixed(3)} ton. (Ticket da Balança: ${formData.ticketNumber}).

Segue abaixo dados do motorista em operacao na planta Acos Alianca.
- ${formData.driverName} (${formData.driverCpf})
- Caminhao placa (${formData.truckPlate})

Atenciosamente,
${entry.userName}`;

    if (!recipients) {
      alert(`O cliente ${formData.client || 'selecionado'} não possui destinatários configurados. O e-mail será aberto sem o campo "Para".`);
    }

    window.open(`mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const triggerPdfDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearPendingPdf = () => {
    if (pendingPdf?.previewUrl) {
      URL.revokeObjectURL(pendingPdf.previewUrl);
    }
    setPendingPdf(null);
    setPendingEntry(null);
  };

  const resetForm = () => {
    setEvidences(EMPTY_EVIDENCES);
    setFormData(EMPTY_FORM);
  };

  const generatePdfAndOpenPreview = async (entry: ChecklistEntry) => {
    setIsGeneratingPdf(true);
    try {
      const pdfResult = await buildScrapPdf({
        formData,
        evidences: evidenceList,
        user,
        entryId: entry.id,
      });
      setPendingEntry(entry);
      setPendingPdf(pdfResult);
    } catch (err) {
      console.error(err);
      alert('Falha ao gerar o PDF da ficha. O checklist nao foi salvo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const confirmAndPersist = async () => {
    if (!pendingEntry || !pendingPdf) return;

    setIsConfirming(true);
    try {
      const finalEntry: ChecklistEntry = {
        ...pendingEntry,
        customData: {
          ...(pendingEntry.customData || {}),
          pdfMeta: pendingPdf.pdfMeta,
        },
      };

      await Promise.resolve(onSave(finalEntry));
      triggerPdfDownload(pendingPdf.pdfBlob, pendingPdf.fileName);
      handleEmail(finalEntry);
      clearPendingPdf();
      resetForm();
      alert('Checklist salvo, PDF baixado e e-mail aberto para envio.');
    } catch (err) {
      console.error(err);
      alert('Falha ao salvar checklist. Nenhum dado foi confirmado no historico.');
    } finally {
      setIsConfirming(false);
    }
  };

  const cancelPdfPreview = () => {
    clearPendingPdf();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGeneratingPdf || isConfirming) return;
    if (!validateFormAndEvidences()) return;

    const entry = buildChecklistEntryBase();
    await generatePdfAndOpenPreview(entry);
  };

  return (
    <>
      <ScrapPdfPreviewModal
        open={Boolean(pendingPdf)}
        previewUrl={pendingPdf?.previewUrl || null}
        fileName={pendingPdf?.fileName || ''}
        isConfirming={isConfirming}
        onCancel={cancelPdfPreview}
        onConfirm={confirmAndPersist}
      />

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
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
            <p className="text-slate-400 text-xs mt-4 font-bold uppercase tracking-widest text-center px-4">
              Ajuste o enquadramento da {activeSlot === 'superior' ? 'Vista Superior' : activeSlot === 'lateral' ? 'Vista Lateral' : activeSlot === 'frontal' ? 'Vista Frontal' : activeSlot === 'ticketScale' ? 'Ticket da Balanca' : 'Vista Traseira'}
            </p>
          </div>
        )}

        <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <span className="bg-amber-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded tracking-widest">Controle de Saida</span>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic mt-2">Gestao de <span className="text-amber-500">Sucata</span></h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest border-b pb-2"><Truck size={16} /> Dados da Cacamba</h3>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="N Cacamba" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.bucketNumber} onChange={(e) => setFormData({ ...formData, bucketNumber: e.target.value.toUpperCase() })} required />
                <select className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none" value={formData.bucketType} onChange={(e) => setFormData({ ...formData, bucketType: e.target.value })}>
                  <option value="BAIXA">Cacamba TIPO BAIXA</option>
                  <option value="ALTA">Cacamba TIPO ALTA</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest border-b pb-2"><Scale size={16} /> Dados do Transporte</h3>
              <input placeholder="N Ticket Balanca" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.ticketNumber} onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value.toUpperCase() })} required />

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Placa Veiculo" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.truckPlate} onChange={(e) => setFormData({ ...formData, truckPlate: e.target.value.toUpperCase() })} required />
                <input placeholder="CPF Motorista" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.driverCpf} onChange={(e) => setFormData({ ...formData, driverCpf: e.target.value.toUpperCase() })} required />
              </div>
              <input placeholder="Nome do Motorista" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value.toUpperCase() })} required />

              <div className="space-y-1 mt-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora de Segunda Pesagem</label>
                <input type="time" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.secondWeightTime} onChange={(e) => setFormData({ ...formData, secondWeightTime: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <input placeholder="Peso Bruto Caminhao (kg)" type="number" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.truckTare} onChange={(e) => setFormData({ ...formData, truckTare: e.target.value })} required />
                <input placeholder="Tara Cacamba (kg)" type="number" className="p-3 bg-slate-50 rounded-xl text-sm font-bold border-none" value={formData.bucketTare} onChange={(e) => setFormData({ ...formData, bucketTare: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-3">
                  <span className="text-[10px] uppercase whitespace-nowrap">Peso Liquido:</span>
                  <input
                    placeholder="0"
                    type="number"
                    className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-emerald-700 placeholder:text-emerald-300"
                    value={formData.netWeight}
                    onChange={(e) => setFormData({ ...formData, netWeight: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              required
            >
              <option value="">Selecione o Cliente...</option>
              {availableClients.length > 0 ? (
                availableClients.map((client) => (
                  <option key={client.id} value={client.client}>{client.client}</option>
                ))
              ) : (
                <option value="" disabled>NENHUM CLIENTE CADASTRADO</option>
              )}
            </select>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest border-b pb-2"><Camera size={16} /> Evidencias Obrigatorias (5 Fotos)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'superior', label: '1 Visao Superior (Cacamba)', camRef: 'superior', fileRef: 'superiorFile' },
                { key: 'lateral', label: '2 Visao Lateral (N Cacamba)', camRef: 'lateral', fileRef: 'lateralFile' },
                { key: 'frontal', label: '3 Visao Frontal (Placa)', camRef: 'frontal', fileRef: 'frontalFile' },
                { key: 'rear', label: '4 Visao Traseira (Placa)', camRef: 'rear', fileRef: 'rearFile' },
                { key: 'ticketScale', label: '5 TICKET DA BALANCA', camRef: 'ticketScale', fileRef: 'ticketScaleFile' },
              ].map((slot) => (
                <div key={slot.key} className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-500 ml-1">{slot.label}</p>

                  <div className="relative aspect-video bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden group">
                    {evidences[slot.key as keyof EvidenceState] ? (
                      <>
                        {slot.key === 'ticketScale' && isPdfDataUrl(evidences[slot.key as keyof EvidenceState]) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 px-4 text-center">
                            <ImageIcon size={30} className="mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Ticket em PDF</span>
                            <span className="text-[10px] font-bold mt-1">Arquivo anexado com sucesso</span>
                          </div>
                        ) : (
                          <img src={evidences[slot.key as keyof EvidenceState]} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setEvidences((prev) => ({ ...prev, [slot.key]: '' }))}
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
                      onClick={() => startWebcam(slot.key as keyof EvidenceState)}
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
                    onChange={(e) => handleFileSelect(slot.key as keyof EvidenceState, e)}
                  />
                  <input
                    type="file"
                    hidden
                    ref={fileInputRefs[slot.fileRef as keyof typeof fileInputRefs]}
                    accept={slot.key === 'ticketScale' ? 'image/*,application/pdf' : 'image/*'}
                    onChange={(e) => handleFileSelect(slot.key as keyof EvidenceState, e)}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGeneratingPdf || isConfirming}
            className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 disabled:opacity-60"
          >
            {isGeneratingPdf ? 'GERANDO PDF...' : 'SALVAR E SOLICITAR FATURAMENTO'}
          </button>
        </form>
      </div>
    </>
  );
};

export default ScrapInspectionForm;
