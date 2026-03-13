import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, LogIn, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('admin') 
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error("Email atau Password Admin salah!");
      }

      localStorage.setItem('admin_session', JSON.stringify(data));
      window.location.reload(); 

    } catch (error) {
      console.error("Login Error:", error);
      alert("Login Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-left">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border-4 border-blue-600 overflow-hidden animate-in zoom-in duration-500">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/50">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-white text-3xl font-black tracking-tight uppercase">Sipres<span className="text-blue-500">.</span></h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Admin Central Control</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Alamat Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                required
                type="email" 
                placeholder="admin@majalengka.go.id"
                className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                required
                type="password" 
                placeholder="••••••••"
                className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <LogIn className="w-6 h-6 mr-2" />
            )}
            {loading ? 'Memverifikasi...' : 'Masuk Ke Sistem'}
          </button>

          <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-tight">
            Sipres Majalengka &copy; 2026
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;