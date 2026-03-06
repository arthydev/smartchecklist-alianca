import React, { useState, useEffect } from 'react';
import { Database, Wifi, WifiOff } from 'lucide-react';
import { backend } from '../services/backend';

const DatabaseStatus: React.FC = () => {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    useEffect(() => {
        const checkStatus = async () => {
            const status = await backend.checkHealth();
            setIsConnected(status.isConnected);
            setErrorMessage(status.error);
        };

        // Check immediately
        checkStatus();

        // Poll every 30 seconds
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    if (isConnected === null) return null; // Initial state

    return (
        <div
            onClick={() => {
                if (isConnected === false && errorMessage) {
                    alert(`Falha de Conexão com Banco de Dados:\n\n${errorMessage}`);
                }
            }}
            className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300
            ${isConnected === false ? 'cursor-pointer hover:bg-red-200 dark:hover:bg-red-500/20' : ''}
            ${isConnected
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 animate-pulse'
                }
        `}
            title={isConnected ? "Banco de Dados Conectado" : "Falha na Conexão. Clique para ver detalhes."}
        >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:inline">
                {isConnected ? 'BD Conectado' : 'BD Desconectado'}
            </span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
    );
};

export default DatabaseStatus;
