import React, { useEffect, useMemo, useState } from 'react';
import { AppSettings, ScrapClientDirectoryEntry, User } from '../types';
import { ChevronDown, ChevronUp, Copy, Mail, Plus, Save, Trash2, Users } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  user: User | null;
}

const emptyClient = (): ScrapClientDirectoryEntry => ({
  id: `SCRAP-${Date.now()}`,
  client: '',
  recipients: [],
  active: true,
});

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizeClient = (value: string): string => value.trim().toUpperCase();

const ScrapDirectoryManagementView: React.FC<Props> = ({ settings, onUpdate, user }) => {
  const initialDirectory = useMemo(() => settings.scrapDirectory || [], [settings.scrapDirectory]);
  const [directory, setDirectory] = useState<ScrapClientDirectoryEntry[]>(initialDirectory);
  const [selectedId, setSelectedId] = useState<string | null>(initialDirectory[0]?.id || null);
  const [draftClient, setDraftClient] = useState<ScrapClientDirectoryEntry | null>(initialDirectory[0] || null);
  const [newRecipient, setNewRecipient] = useState('');
  const [copySourceClientId, setCopySourceClientId] = useState('');
  const [copyTargetClientId, setCopyTargetClientId] = useState('');
  const [isCopyBoxOpen, setIsCopyBoxOpen] = useState(false);

  useEffect(() => {
    setDirectory(initialDirectory);
    setSelectedId((currentSelected) => {
      const nextSelected = initialDirectory.find((entry) => entry.id === currentSelected)?.id || initialDirectory[0]?.id || null;
      setDraftClient(nextSelected ? initialDirectory.find((entry) => entry.id === nextSelected) || null : null);
      return nextSelected;
    });
  }, [initialDirectory]);

  const canEdit = user?.area === 'SUCATA';

  const selectClient = (id: string) => {
    const client = directory.find((entry) => entry.id === id) || null;
    setSelectedId(id);
    setDraftClient(client ? { ...client, recipients: [...client.recipients] } : null);
    setNewRecipient('');
  };

  const persistDirectory = (nextDirectory: ScrapClientDirectoryEntry[]) => {
    setDirectory(nextDirectory);
    onUpdate({
      ...settings,
      scrapDirectory: nextDirectory,
    });
  };

  const buildSanitizedClient = (client: ScrapClientDirectoryEntry): ScrapClientDirectoryEntry | null => {
    const normalizedName = normalizeClient(client.client);
    if (!normalizedName) {
      alert('Informe o nome do cliente.');
      return null;
    }

    const duplicated = directory.some((entry) => entry.id !== client.id && normalizeClient(entry.client) === normalizedName);
    if (duplicated) {
      alert('Ja existe um cliente com esse nome.');
      return null;
    }

    return {
      ...client,
      client: normalizedName,
      recipients: Array.from(new Set(client.recipients.map(normalizeEmail).filter(Boolean))),
    };
  };

  const persistClient = (client: ScrapClientDirectoryEntry, successMessage?: string): boolean => {
    const sanitized = buildSanitizedClient(client);
    if (!sanitized) {
      return false;
    }

    const exists = directory.some((entry) => entry.id === sanitized.id);
    const nextDirectory = exists
      ? directory.map((entry) => (entry.id === sanitized.id ? sanitized : entry))
      : [...directory, sanitized];

    persistDirectory(nextDirectory);
    setDraftClient(sanitized);
    setSelectedId(sanitized.id);

    if (successMessage) {
      alert(successMessage);
    }

    return true;
  };

  const createClient = () => {
    if (!canEdit) return;
    const created = emptyClient();
    const nextDirectory = [...directory, created];
    setDirectory(nextDirectory);
    setSelectedId(created.id);
    setDraftClient(created);
    setNewRecipient('');
  };

  const saveClient = () => {
    if (!canEdit || !draftClient) return;
    persistClient(draftClient, 'Cliente de sucata salvo.');
  };

  const removeClient = (id: string) => {
    if (!canEdit) return;
    if (!confirm('Remover este cliente de sucata?')) return;

    const nextDirectory = directory.filter((entry) => entry.id !== id);
    persistDirectory(nextDirectory);

    const nextSelected = nextDirectory[0] || null;
    setSelectedId(nextSelected?.id || null);
    setDraftClient(nextSelected ? { ...nextSelected, recipients: [...nextSelected.recipients] } : null);
    setNewRecipient('');
  };

  const addRecipient = () => {
    if (!canEdit || !draftClient) return;

    const normalized = normalizeEmail(newRecipient);
    if (!normalized) {
      alert('Informe um destinatario valido.');
      return;
    }

    if (!draftClient.client.trim()) {
      alert('Informe o nome do cliente antes de adicionar destinatarios.');
      return;
    }

    if (draftClient.recipients.some((recipient) => normalizeEmail(recipient) === normalized)) {
      setNewRecipient('');
      return;
    }

    const nextDraft = {
      ...draftClient,
      recipients: [...draftClient.recipients, normalized],
    };

    if (persistClient(nextDraft)) {
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    if (!canEdit || !draftClient) return;
    persistClient({
      ...draftClient,
      recipients: draftClient.recipients.filter((recipient) => recipient !== email),
    });
  };

  const copyRecipientsBetweenClients = () => {
    if (!canEdit) return;

    if (!copySourceClientId || !copyTargetClientId) {
      alert('Selecione o cliente de origem e o cliente de destino.');
      return;
    }

    if (copySourceClientId === copyTargetClientId) {
      alert('Origem e destino precisam ser diferentes.');
      return;
    }

    const sourceClient = directory.find((entry) => entry.id === copySourceClientId);
    const targetClient = directory.find((entry) => entry.id === copyTargetClientId);
    if (!sourceClient || !targetClient) {
      alert('Nao foi possivel localizar os clientes selecionados.');
      return;
    }

    const sourceRecipients = Array.from(new Set(sourceClient.recipients.map(normalizeEmail).filter(Boolean)));
    if (sourceRecipients.length === 0) {
      alert('O cliente de origem nao possui destinatarios para copiar.');
      return;
    }

    const targetRecipients = Array.from(new Set(targetClient.recipients.map(normalizeEmail).filter(Boolean)));
    const targetSet = new Set(targetRecipients);
    const recipientsToCopy = sourceRecipients.filter((email) => !targetSet.has(email));

    if (recipientsToCopy.length === 0) {
      alert('Nenhum destinatario novo foi copiado. O cliente de destino ja possui todos os e-mails da origem.');
      selectClient(targetClient.id);
      return;
    }

    const updatedTarget: ScrapClientDirectoryEntry = {
      ...targetClient,
      recipients: [...targetRecipients, ...recipientsToCopy],
    };

    const nextDirectory = directory.map((entry) => (entry.id === updatedTarget.id ? updatedTarget : entry));
    persistDirectory(nextDirectory);
    setSelectedId(updatedTarget.id);
    setDraftClient({ ...updatedTarget, recipients: [...updatedTarget.recipients] });
    setCopyTargetClientId(updatedTarget.id);

    const skippedCount = sourceRecipients.length - recipientsToCopy.length;
    alert(`Copiados ${recipientsToCopy.length} destinatario(s). ${skippedCount} destinatario(s) foram ignorados por ja existirem.`);
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto transition-colors duration-300">
      <div className="flex items-center justify-between pb-6 border-b-2 border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Gestao de Sucata</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-2">
            Clientes e destinatarios por operacao de sucata
          </p>
        </div>
        <button
          type="button"
          onClick={createClient}
          disabled={!canEdit}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-8">
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-4">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <Users size={18} className="text-emerald-500" /> Clientes cadastrados
          </h3>

          <div className="space-y-3">
            {directory.length === 0 && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500">
                Nenhum cliente de sucata cadastrado.
              </div>
            )}

            {directory.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectClient(entry.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedId === entry.id
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{entry.client}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {entry.recipients.length} destinatario(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeClient(entry.id);
                    }}
                    className="text-red-500"
                    disabled={!canEdit}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none space-y-6">
          <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs tracking-widest flex items-center gap-3">
            <Mail size={18} className="text-emerald-500" /> Destinatarios vinculados
          </h3>

          {!draftClient ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-400 dark:text-slate-500">
              Selecione ou crie um cliente para editar os destinatarios.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Nome do cliente
                </label>
                <input
                  value={draftClient.client}
                  onChange={(event) => setDraftClient({ ...draftClient, client: event.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
                  placeholder="Cliente / destino"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Destinatarios de e-mail
                </label>

                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    value={newRecipient}
                    onChange={(event) => setNewRecipient(event.target.value)}
                    className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
                    placeholder="email@empresa.com"
                    disabled={!canEdit}
                  />
                  <button
                    type="button"
                    onClick={addRecipient}
                    disabled={!canEdit}
                    className="px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    Adicionar e-mail
                  </button>
                </div>

                <div className="space-y-2">
                  {draftClient.recipients.length === 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-xs font-bold text-amber-700 dark:text-amber-400">
                      Cliente sem destinatarios configurados.
                    </div>
                  )}

                  {draftClient.recipients.map((recipient) => (
                    <div key={recipient} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">{recipient}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient)}
                        className="text-red-500"
                        disabled={!canEdit}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCopyBoxOpen((current) => !current)}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-white/70 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-emerald-600">
                      <Copy size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Copiar destinatarios entre clientes</p>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {isCopyBoxOpen ? 'Clique para recolher' : 'Clique para expandir'}
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500">
                    {isCopyBoxOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {isCopyBoxOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="pt-4">
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        Copie os e-mails de um cliente para outro sem duplicar destinatarios ja existentes.
                      </p>
                    </div>
                    <div className="space-y-1 pt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente de origem</label>
                      <select
                        value={copySourceClientId}
                        onChange={(event) => setCopySourceClientId(event.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Selecione o cliente de origem...</option>
                        {directory.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.client}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente de destino</label>
                      <select
                        value={copyTargetClientId}
                        onChange={(event) => setCopyTargetClientId(event.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Selecione o cliente de destino...</option>
                        {directory.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.client}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={copyRecipientsBetweenClients}
                      disabled={!copySourceClientId || !copyTargetClientId || copySourceClientId === copyTargetClientId}
                      className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-black dark:hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 dark:disabled:hover:bg-emerald-600 flex items-center justify-center gap-2"
                    >
                      <Copy size={16} /> Copiar destinatarios
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={saveClient}
                  disabled={!canEdit}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={14} /> Salvar cliente
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ScrapDirectoryManagementView;
