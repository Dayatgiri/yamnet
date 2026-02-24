import React from 'react';
import { LogOut } from 'lucide-react';

const Sidebar = ({ menuItems, activeTab, setActiveTab, onLogout }) => {
  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl shrink-0">
      <div className="p-8 flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-black text-xl">S</span>
        </div>
        <span className="text-xl font-black tracking-tight text-white uppercase">
          Sipres<span className="text-blue-500">.</span>
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Main Menu</p>
        
        {menuItems.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center w-full px-4 py-3.5 rounded-2xl transition-all group relative ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'hover:bg-slate-800'
            }`}
          >
            {/* Icon */}
            <item.icon className={`mr-3 w-5 h-5 transition-colors ${
              activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
            }`} />
            
            {/* Label */}
            <span className="text-sm font-semibold flex-1 text-left">{item.label}</span>

            {/* NOTIFIKASI BADGE */}
            {item.badge > 0 && (
              <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black rounded-full animate-bounce shadow-sm ${
                activeTab === item.id 
                  ? 'bg-white text-blue-600' 
                  : 'bg-rose-500 text-white'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 text-slate-500 hover:text-rose-400 font-semibold text-sm transition-colors group"
        >
          <LogOut className="mr-3 w-5 h-5 group-hover:animate-pulse transition-transform group-hover:-translate-x-1" /> 
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;