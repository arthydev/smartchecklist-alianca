
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardCheck, History, ShieldCheck, Menu, X, Settings, LogOut, Moon, Sun, Box, Mail
} from 'lucide-react';
import { AppView, ChecklistEntry, User, AppSettings } from './types';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import LogisticChecklistForm from './components/LogisticChecklistForm';
import ScrapInspectionForm from './components/ScrapInspectionForm';
// ... (keep other imports)

// ... (keep other imports)
import HistoryView from './components/HistoryView';
import ValidationView from './components/ValidationView';
import SettingsView from './components/SettingsView';
import AssetsManagementView from './components/AssetsManagementView';
import ScrapDirectoryManagementView from './components/ScrapDirectoryManagementView';
import Login from './components/Login';
import Logo from './components/Logo';
import { backend } from './services/backend';
import DatabaseStatus from './components/DatabaseStatus';
import AppVersion from './components/AppVersion';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [checklists, setChecklists] = useState<ChecklistEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ items: [], equipment: [], substitute: { name: '', phone: '', isActive: false }, absences: [], scrapDirectory: [] });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('alianca_theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // Calculate the managerId context for the current session
  const managerContext = currentUser
    ? (currentUser.role === 'MANAGER' ? currentUser.id : currentUser.managerId)
    : null;

  useEffect(() => {
    let mounted = true;
    backend.getCurrentUser().then((user) => {
      if (!mounted) return;
      const normalized = normalizeUser(user);
      setCurrentUser(normalized);
      if (normalized) {
        setCurrentView(normalized.role === 'MANAGER' ? AppView.DASHBOARD : AppView.NEW_CHECK);
      } else {
        setCurrentView(AppView.LOGIN);
      }
      setAuthChecked(true);
    }).catch(() => {
      if (!mounted) return;
      setCurrentUser(null);
      setCurrentView(AppView.LOGIN);
      setAuthChecked(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (managerContext) {
      backend.getChecklists(managerContext).then(setChecklists);
      backend.getManagerSettings(managerContext).then(setSettings);
    }
  }, [managerContext]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('alianca_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const normalizeUser = (user: User | null): User | null => {
    if (!user) return null;
    return {
      ...user,
      name: user.name || user.username || 'USUARIO',
      area: user.area || ''
    };
  };

  const handleLogin = (user: User) => {
    const normalized = normalizeUser(user)!;
    setCurrentUser(normalized);
    setCurrentView(normalized.role === 'MANAGER' ? AppView.DASHBOARD : AppView.NEW_CHECK);
  };

  const handleLogout = async () => {
    await backend.logout();
    setCurrentUser(null);
    setCurrentView(AppView.LOGIN);
  };

  const handleAddChecklist = async (entry: ChecklistEntry): Promise<void> => {
    if (!managerContext) return;
    const entryWithManager = { ...entry, managerId: managerContext };
    try {
      await backend.addChecklist(entryWithManager);
      const latest = await backend.getChecklists(managerContext);
      setChecklists(latest);
    } catch (e: any) {
      alert(e?.message || 'Falha ao salvar checklist.');
      throw e;
    }
  };

  const handleUpdateChecklist = (updated: ChecklistEntry) => {
    if (!managerContext) return;
    backend.updateChecklist(updated.id, updated).then(() => {
      backend.getChecklists(managerContext).then(setChecklists);
    }).catch((e: any) => {
      alert(e?.message || 'Falha ao atualizar checklist.');
    });
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    if (!managerContext) return;
    if (!managerContext) return;
    backend.updateManagerSettings(managerContext, newSettings).then(() => {
      backend.getManagerSettings(managerContext).then(setSettings);
    }).catch((e: any) => {
      alert(e?.message || 'Falha ao atualizar configurações.');
    });
  };

  const NavItem = ({ view, icon: Icon, label, hidden = false }: { view: AppView, icon: any, label: string, hidden?: boolean }) => {
    if (hidden) return null;
    return (
      <button
        onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
        className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${currentView === view
          ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xl shadow-slate-200 dark:shadow-emerald-900/20 translate-x-1'
          : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
      >
        <Icon size={18} />
        <span className="font-black text-[11px] uppercase tracking-widest">{label}</span>
      </button>
    );
  };

  if (!authChecked) return null;
  if (currentView === AppView.LOGIN) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-950 font-sans transition-colors duration-300">
      <header className="md:hidden bg-slate-900 dark:bg-slate-950 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg shadow-slate-900/10 border-b dark:border-slate-800">
        <Logo size="sm" variant="light" />
        <div className="flex items-center gap-2">
          <div className="mr-2">
            <DatabaseStatus />
          </div>
          <div className="mr-2">
            <AppVersion />
          </div>
          <button onClick={toggleTheme} className="p-2 bg-white/10 rounded-xl">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 rounded-xl">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-50 transform transition-transform md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 hidden md:block border-b border-slate-50 dark:border-slate-800">
          <Logo size="md" variant={theme === 'dark' ? 'light' : 'dark'} />
        </div>

        <nav className="p-6 space-y-2 mt-4">
          <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Painel de Controle" hidden={currentUser?.role !== 'MANAGER'} />
          <NavItem view={AppView.NEW_CHECK} icon={ClipboardCheck} label="Nova Inspeção" hidden={(currentUser?.role === 'MANAGER' && currentUser?.area !== 'SUCATA') || (currentUser?.role === 'MANAGER' && currentUser?.area === 'SUCATA')} />
          <NavItem view={AppView.HISTORY} icon={History} label="Histórico" />
          <NavItem view={AppView.VALIDATION} icon={ShieldCheck} label="Validação Técnica" hidden={currentUser?.role !== 'MANAGER' || currentUser?.area === 'SUCATA'} />
          <NavItem view={AppView.ASSETS} icon={Box} label="Ativos e Itens" hidden={currentUser?.role !== 'MANAGER' || currentUser?.area === 'SUCATA'} />
          <NavItem view={AppView.SCRAP_DIRECTORY} icon={Mail} label="Clientes de Sucata" hidden={currentUser?.area !== 'SUCATA'} />
          <NavItem view={AppView.SETTINGS} icon={Settings} label="Configurações" hidden={currentUser?.role !== 'MANAGER'} />

          <div className="pt-4 mt-4 border-t border-slate-50 dark:border-slate-800">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className="font-black text-[11px] uppercase tracking-widest">{theme === 'dark' ? 'Modo Claro' : 'Modo Noturno'}</span>
            </button>
            <div className="mt-4 flex justify-center flex-col items-center gap-2">
              <DatabaseStatus />
              <AppVersion />
            </div>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-[1rem] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200 dark:shadow-emerald-950/40">
                {(currentUser?.name || currentUser?.username || '?')[0]}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate leading-none mb-1">{currentUser?.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
                    {currentUser?.role === 'MANAGER'
                      ? 'Gestor'
                      : currentUser?.area === 'QUALIDADE'
                        ? 'Inspetor'
                        : 'Apontador'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-4 text-[10px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all font-black uppercase tracking-[0.2em] group">
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-12 lg:p-16 bg-[#f8fafc] dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          {currentView === AppView.DASHBOARD && <Dashboard checklists={checklists} settings={settings} user={currentUser} onNavigate={setCurrentView} />}
          {currentView === AppView.NEW_CHECK && (
            currentUser?.area === 'QUALIDADE'
              ? <LogisticChecklistForm onSave={handleAddChecklist} user={currentUser!} settings={settings} />
              : currentUser?.area === 'SUCATA'
                ? <ScrapInspectionForm onSave={handleAddChecklist} user={currentUser!} settings={settings} />
                : <ChecklistForm onSave={handleAddChecklist} user={currentUser!} settings={settings} checklists={checklists} />
          )}
          {currentView === AppView.HISTORY && <HistoryView checklists={checklists} user={currentUser!} />}
          {currentView === AppView.VALIDATION && <ValidationView checklists={checklists} onUpdate={handleUpdateChecklist} currentUser={currentUser} />}
          {currentView === AppView.ASSETS && <AssetsManagementView settings={settings} onUpdate={handleUpdateSettings} user={currentUser} />}
          {currentView === AppView.SCRAP_DIRECTORY && <ScrapDirectoryManagementView settings={settings} onUpdate={handleUpdateSettings} user={currentUser} />}
          {currentView === AppView.SETTINGS && <SettingsView settings={settings} onUpdate={handleUpdateSettings} user={currentUser} />}
        </div>
      </main>
    </div>
  );
};


export default App;
