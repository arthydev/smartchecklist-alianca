import React, { useState } from 'react';
import { User, Lock, ArrowRight, Mail, ChevronLeft } from 'lucide-react';
import { User as UserType } from '../types';
import Logo from './Logo';
import { backend } from '../services/backend';

interface Props {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const foundUser = await backend.authenticate(username, password);
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Credenciais inválidas. Verifique seu ID ou senha.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!resetEmail.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Preencha e-mail, nova senha e confirmação.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    try {
      await backend.forgotPassword(resetEmail.trim(), newPassword.trim());
      setSuccessMessage('Senha redefinida com sucesso. Volte ao login para acessar o sistema.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err?.message === 'Email not found') {
        setError('E-mail não encontrado. Procure um administrador de sistema.');
        return;
      }
      setError('Não foi possível redefinir a senha. Procure um administrador de sistema.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-10 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-slate-800/20 blur-[100px] rounded-full"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-950/50 overflow-hidden relative z-10">
        <div className="p-10 md:p-16 flex flex-col justify-center">
          <div className="mb-12 flex justify-center">
            <Logo size="md" variant="dark" />
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ID de Colaborador</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value.toUpperCase())}
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="EX: OPERADOR_01"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Chave Digital</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[10px] font-black p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-shake">
                  <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>
                  {error.toUpperCase()}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-[0.98] group"
              >
                Autenticar Sistema <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setSuccessMessage('');
                }}
                className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Esqueci a senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="bg-amber-50 text-amber-700 text-[10px] font-black p-4 rounded-xl border border-amber-100">
                Para primeira troca procurar um administrador de sistema
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail vinculado</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value.toLowerCase())}
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="usuario@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nova senha</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirmar nova senha</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[10px] font-black p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-shake">
                  <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>
                  {error.toUpperCase()}
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <span className="w-1 h-1 bg-emerald-600 rounded-full animate-pulse"></span>
                  {successMessage.toUpperCase()}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-[0.98] group"
              >
                Redefinir senha <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMessage('');
                }}
                className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft size={14} /> Voltar ao login
              </button>
            </form>
          )}

          <p className="mt-12 text-center text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em] leading-relaxed">
            Desenvolvido por Aliança Smart Tech <br />
            © 2024 Todos os Direitos Reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

