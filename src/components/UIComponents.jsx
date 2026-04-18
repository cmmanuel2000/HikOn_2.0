import React from 'react';
import { Cloud, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// HikOn Logo Component
export const HikOnLogo = ({ theme, className = "h-12" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="relative">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 drop-shadow-md">
        <circle cx="50" cy="50" r="48" stroke={theme === 'light' ? "#1e3a8a" : "#60a5fa"} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.2"/>
        <path d="M5 50C5 25.1472 25.1472 5 50 5C74.8528 5 95 25.1472 95 50C95 74.8528 74.8528 95 50 95" stroke="#84cc16" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M15 75L40 35L60 60L75 45L90 75H15Z" fill={theme === 'light' ? "#1e3a8a" : "#3b82f6"} />
        <path d="M40 35L55 60L70 40L85 75H50L40 35Z" fill="#84cc16" opacity="0.8" />
        <path d="M10 70H35L42 55L50 85L58 70H90" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 25C60 25 65 15 75 15C75 15 78 25 72 32C68 38 60 25 60 25Z" fill="#84cc16" />
        <path d="M72 28C72 28 80 20 88 25C88 25 85 35 78 38C72 41 72 28 72 28Z" fill="#0ea5e9" />
      </svg>
    </div>
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className={`text-2xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>Hik</span>
        <div className="bg-[#84cc16] p-1 rounded-full mx-0.5 shadow-sm">
          <Cloud size={12} className="text-white fill-white" />
        </div>
        <span className={`text-2xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>n</span>
      </div>
      <span className={`text-[7px] font-black uppercase tracking-[0.2em] -mt-1 ${theme === 'light' ? 'text-[#1e3a8a]/60' : 'text-slate-400'}`}>Asthma Monitor Pro</span>
    </div>
  </div>
);

// Risk Badge Component
export const RiskBadge = ({ level, label }) => {
  const styles = {
    safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  
  return (
    <div className={`px-4 py-1.5 rounded-xl border font-black uppercase text-[10px] tracking-widest ${styles[level] || styles.safe}`}>
      {label ? label : `${(level || 'safe').toUpperCase()} RISK`}
    </div>
  );
};

// Reading Display Component  
export const Reading = ({ label, value, unit, icon, smallValue, theme }) => (
  <div className="group cursor-default">
    <div className="flex items-center gap-2 mb-2 text-slate-400">
      <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`${smallValue ? 'text-xl' : 'text-3xl'} font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'} transition-colors duration-300`}>
        {value}
      </span>
      <span className="text-xs font-bold text-slate-500">{unit}</span>
    </div>
  </div>
);

// Action Card Component
export const ActionCard = ({ onClick, icon, title, desc, color, theme }) => (
  <button 
    onClick={onClick}
    className={`border rounded-[2rem] p-8 text-left transition-all hover:translate-y-[-4px] hover:shadow-xl active:scale-95 group ${theme === 'light' ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#1e293b] border-slate-700 shadow-black/20'}`}
  >
    <div className={`${color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h4 className={`text-lg font-black tracking-tight mb-2 uppercase text-sm tracking-widest ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-blue-400'}`}>
      {title}
    </h4>
    <p className={`text-xs font-medium leading-relaxed ${theme === 'light' ? 'text-slate-400' : 'text-slate-400'}`}>
      {desc}
    </p>
  </button>
);

// Stat Card Component
export const StatCard = ({ title, value, trend, icon, theme, themeClasses }) => (
  <div className={`border rounded-2xl p-6 shadow-sm ${themeClasses.card}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-900/20 text-blue-400'}`}>
        {icon}
      </div>
      <div className="flex items-center gap-1">
        {trend === 'up' ? (
          <TrendingUp size={16} className="text-emerald-500" />
        ) : trend === 'down' ? (
          <TrendingDown size={16} className="text-rose-500" />
        ) : (
          <Minus size={16} className="text-slate-400" />
        )}
      </div>
    </div>
    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>
      {title}
    </p>
    <p className={`text-2xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
      {value}
    </p>
  </div>
);
