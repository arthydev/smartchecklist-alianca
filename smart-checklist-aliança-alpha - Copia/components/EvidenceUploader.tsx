import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, PlusCircle, X, Trash2 } from 'lucide-react';

interface Props {
    evidences: string[];
    onUpdate: (newEvidences: string[]) => void;
    maxEvidences?: number;
}

const EvidenceUploader: React.FC<Props> = ({ evidences, onUpdate, maxEvidences = 10 }) => {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Webcam State
    const [showWebcam, setShowWebcam] = React.useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = React.useState<MediaStream | null>(null);

    const startWebcam = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            setShowWebcam(true);
            // Delay slightly to ensure modal is rendered and ref is attached
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Erro ao acessar a webcam. Verifique as permissões do navegador ou use a opção de Arquivo.");
        }
    };

    const stopWebcam = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowWebcam(false);
    };

    const captureWebcam = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onUpdate([...evidences, dataUrl]);
                stopWebcam();
            }
        }
    };

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFiles(files);
        }
        e.target.value = '';
    };

    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFiles(files);
        }
        e.target.value = '';
    };

    const processFiles = (files: FileList) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => onUpdate([...evidences, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const removeEvidence = (index: number) => {
        const updated = evidences.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                {/* Mobile Native Camera (Hidden on Desktop usually, but good to keep as fallback or strictly for mobile) */}
                <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={evidences.length >= maxEvidences}
                    className="flex-1 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed md:hidden"
                >
                    <Camera size={18} /> Câmera
                </button>

                {/* Desktop Webcam Button */}
                <button
                    type="button"
                    onClick={startWebcam}
                    disabled={evidences.length >= maxEvidences}
                    className="hidden md:flex flex-1 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Camera size={18} /> Abrir Webcam
                </button>

                <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={evidences.length >= maxEvidences}
                    className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ImageIcon size={18} /> Arquivo
                </button>
            </div>

            {/* Hidden Inputs */}
            <input
                type="file"
                hidden
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleCameraCapture}
            />
            <input
                type="file"
                hidden
                accept="image/*"
                ref={galleryInputRef}
                onChange={handleGallerySelect}
                multiple
            />

            {/* Webcam Modal */}
            {showWebcam && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-auto object-cover" />

                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 z-10">
                            <button
                                onClick={stopWebcam}
                                className="p-4 rounded-full bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white transition-all backdrop-blur-md"
                            >
                                <X size={24} />
                            </button>
                            <button
                                onClick={captureWebcam}
                                className="p-6 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-110 transition-all active:scale-95"
                            >
                                <Camera size={32} />
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs mt-4 font-bold uppercase tracking-widest">Ajuste o enquadramento e capture</p>
                </div>
            )}

            {evidences.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                    {evidences.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm group">
                            <img src={img} className="w-full h-full object-cover" alt={`Evidência ${idx + 1}`} />
                            <button
                                type="button"
                                onClick={() => removeEvidence(idx)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EvidenceUploader;
