import React from 'react';

const Header = ({ title }) => {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md flex items-center justify-between px-10 border-b border-slate-100 shrink-0">
      <div>
        <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-slate-400 font-medium">Wonogiri Attendance System</p>
      </div>
    </header>
  );
};

export default Header;