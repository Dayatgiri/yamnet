import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  UserPlus, Mail, Lock, Loader2, 
  ShieldAlert, User, ShieldCheck, ArrowLeft 
} from 'lucide-react';

const Register = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isLoggedAsSuper, setIsLoggedAsSuper] = useState(false);
  
  const [role, setRole] = useState('admin');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      setChecking(true);
      
      // 1. Cek Sesi Aktif
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 2. Jika ada sesi, cek role-nya di tabel profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'superadmin') {
          setIsLoggedAsSuper(true);
          setIsLocked(false); // Pastikan TIDAK terkunci jika Superadmin login
          setChecking(false);
          return;
        }
      }

      // 3. Jika tidak ada sesi ATAU bukan superadmin, cek jumlah admin di database
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Kunci halaman HANYA jika sudah ada admin di database DAN tidak ada Superadmin yang login
      if (!error && count > 0) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.error("Error checking access:", err);
    } finally {
      setChecking(false);
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: role 
          }
        }
      });

      if (error) throw error;
      
      alert(`Registrasi ${role.toUpperCase()} Berhasil!`);
      window.location.href = "/"; 
    } catch (error) {
      alert("Gagal Registrasi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Memverifikasi Otoritas...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-left">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-rose-600 space-y-6">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Akses Terkunci</h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">
            Sistem Sipres sudah memiliki Superadmin. Pendaftaran mandiri dilarang demi keamanan data.
          </p>
          <button onClick={() => window.location.href = "/"} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-600 transition-all shadow-xl">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-left">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl border-4 border-emerald-500 overflow-hidden animate-in slide-in-from-bottom duration-700">
        
        <div className="bg-slate-900 p-12 relative overflow-hidden">
          <button 
            onClick={() => window.location.href = "/"}
            className="absolute top-8 left-8 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <div className="text-center mt-4">
            <h1 className="text-white text-3xl font-black uppercase tracking-tighter">
              {isLoggedAsSuper ? 'Tambah Admin' : 'Initial Setup'}
            </h1>
            <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mt-2 italic">
              {isLoggedAsSuper ? 'Mendaftarkan Operator Baru' : 'Daftarkan Superadmin Utama'}
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="p-12 space-y-6">
          {/* Pilihan Role - Hanya bisa diubah jika Superadmin login */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest ml-1">Level Otoritas</label>
            <div className="relative">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:border-emerald-500 outline-none appearance-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={!isLoggedAsSuper && !checking} // Kunci jadi superadmin jika ini pendaftaran pertama
              >
                {!isLoggedAsSuper ? (
                  <option value="superadmin">SUPERADMIN (UTAMA)</option>
                ) : (
                  <>
                    <option value="admin">OPERATOR / ADMIN</option>
                    <option value="superadmin">SUPERADMIN</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest ml-1">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="text" className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest ml-1">Email Akun</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="email" className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:border-emerald-500 outline-none"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required type="password" minLength="6" className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:border-emerald-500 outline-none"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center active:scale-[0.98]">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6 mr-2" />}
            {loading ? 'Memproses...' : 'Daftarkan Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;