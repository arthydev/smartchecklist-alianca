
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'dark' }) => {
  const sizes = {
    sm: { height: 'h-8', font: 'text-sm', sub: 'text-[7px]' },
    md: { height: 'h-12', font: 'text-xl', sub: 'text-[9px]' },
    lg: { height: 'h-20', font: 'text-3xl', sub: 'text-[12px]' },
  };

  const primaryColor = variant === 'light' ? 'text-white' : 'text-slate-900';
  const accentColor = 'text-emerald-500';
  const iconBg = variant === 'light' ? 'fill-emerald-400' : 'fill-emerald-600';

  return (
    <div className={`flex items-center gap-3 select-none font-sans ${primaryColor}`}>
      <div className={`${sizes[size].height} aspect-square relative flex items-center justify-center shrink-0`}>
        {/* Ícone Hexagonal Industrial Tech */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* Hexágono (Escudo de Aço) */}
          <path 
            d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z" 
            className={variant === 'light' ? 'fill-white/10' : 'fill-slate-900'} 
          />
          <path 
            d="M50 10 L84.5 30 L84.5 70 L50 90 L15.5 70 L15.5 30 Z" 
            fill="none" 
            strokeWidth="4"
            className={variant === 'light' ? 'stroke-white/20' : 'stroke-slate-200'}
          />
          {/* Trilha de Circuito e Checkmark */}
          <path 
            d="M35 50 L45 60 L65 40" 
            fill="none" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={iconBg.replace('fill', 'stroke')}
          />
          <circle cx="35" cy="50" r="4" className={iconBg} />
          <circle cx="65" cy="40" r="4" className={iconBg} />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className={`${accentColor} italic font-black uppercase tracking-tighter ${sizes[size].font}`}>
            Smart
          </span>
          <span className={`font-black uppercase tracking-tight ${sizes[size].font}`}>
            Checklist
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className={`h-[1px] flex-1 ${variant === 'light' ? 'bg-white/20' : 'bg-slate-200'}`} />
          <span className={`${sizes[size].sub} font-bold tracking-[0.3em] uppercase opacity-60`}>
            Aliança
          </span>
          <div className={`h-[1px] flex-1 ${variant === 'light' ? 'bg-white/20' : 'bg-slate-200'}`} />
        </div>
      </div>
    </div>
  );
};

export default Logo;
