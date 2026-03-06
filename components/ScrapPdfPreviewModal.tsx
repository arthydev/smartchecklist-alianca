import React from 'react';

interface Props {
  open: boolean;
  previewUrl: string | null;
  fileName: string;
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ScrapPdfPreviewModal: React.FC<Props> = ({
  open,
  previewUrl,
  fileName,
  isConfirming,
  onCancel,
  onConfirm,
}) => {
  if (!open || !previewUrl) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">Pré-visualização da Ficha de Sucata</h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Verifique o documento antes de confirmar o envio por e-mail.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{fileName}</span>
        </div>

        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-3">
          <iframe
            title="Preview PDF Sucata"
            src={previewUrl}
            className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white"
          />
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Após confirmar, o sistema salvará o checklist, fará o download do PDF e abrirá o e-mail pré-preenchido (anexo manual).
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isConfirming ? 'Processando...' : 'Confirmar e continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrapPdfPreviewModal;
