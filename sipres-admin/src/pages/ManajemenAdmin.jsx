import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
// PERBAIKAN: Gunakan library utama agar createClient tersedia dengan benar
import { createClient } from '@supabase/supabase-js'; 
import { 
  UserPlus, Trash2, Edit3, ShieldCheck, Mail, 
  User, Loader2, Search, X, Check, Lock 
} from 'lucide-react';

const ManajemenAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    role: 'admin' 
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error("Gagal memuat admin:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 1. CREATE: Tambah Admin Baru (Anti Log-Out) ---
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // PERBAIKAN: Inisialisasi client kedua tanpa persistensi sesi
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { 
          persistSession: false,
          autoRefreshToken: false 
        }
      });

      const { data, error } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      });

      if (error) throw error;

      alert("Admin baru berhasil didaftarkan! Sesi Anda tetap aman.");
      setIsAddModalOpen(false);
      setFormData({ full_name: '', email: '', password: '', role: 'admin' });
      fetchAdmins(); 

    } catch (error) {
      alert("Gagal daftar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. UPDATE: Edit Data Admin ---
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role
        })
        .eq('id', selectedAdmin.id);

      if (error) throw error;

      alert("Data berhasil diperbarui!");
      setIsEditModalOpen(false);
      fetchAdmins();
    } catch (error) {
      alert("Update gagal: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 3. DELETE: Hapus Akses Admin ---
  const handleDelete = async (id, name) => {
    // Proteksi tambahan: Jangan hapus akun sendiri
    const { data: { user } } = await supabase.auth.getUser();
    if (user.id === id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    if (window.confirm(`Hapus akses admin untuk ${name}?`)) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        setAdmins(admins.filter(a => a.id !== id));
      } catch (error) {
        alert("Gagal menghapus: " + error.message);
      }
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({ full_name: admin.full_name, email: admin.email, role: admin.role });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter text-left">Manajemen Admin</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 italic text-left">Daftar Admin & Operator Terdaftar</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ full_name: '', email: '', password: '', role: 'admin' });
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl"
        >
          <UserPlus size={18} /> Tambah Admin Baru
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Cari admin..."
          className="w-full bg-white border-4 border-slate-100 rounded-[2.5rem] pl-16 pr-8 py-5 font-bold outline-none focus:border-blue-600 transition-all shadow-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-[0.2em] font-black">
            <tr>
              <th className="px-8 py-6">Admin</th>
              <th className="px-8 py-6 text-center">Otoritas</th>
              <th className="px-8 py-6 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-50">
            {loading ? (
              <tr><td colSpan="3" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
            ) : admins.filter(a => a.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl border-2 border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {admin.avatar_url ? <img src={admin.avatar_url} className="w-full h-full object-cover" alt="Profile" /> : <User className="text-slate-400" />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 text-sm uppercase leading-tight">{admin.full_name || 'Tanpa Nama'}</p>
                      <p className="text-[10px] font-bold text-slate-400 lowercase">{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${admin.role === 'superadmin' ? 'bg-rose-600 text-white shadow-lg' : 'bg-blue-100 text-blue-600'}`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEditModal(admin)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(admin.id, admin.full_name)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[999] flex items-center justify-center p-6 text-left">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] border-4 border-blue-600 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center text-left">
              <div>
                <h3 className="font-black uppercase tracking-tighter text-xl">{isAddModalOpen ? 'Daftar Admin Baru' : 'Edit Otoritas Admin'}</h3>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest italic text-left">GMT+7 | Sesi Tetap Aman</p>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-white transition-colors p-2"><X /></button>
            </div>

            <form onSubmit={isAddModalOpen ? handleAddAdmin : handleUpdate} className="p-10 space-y-6 text-left">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-600 outline-none text-slate-700 transition-all" 
                    value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
              </div>

              {isAddModalOpen && (
                <>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest text-left">Email Login</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input required type="email" className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-600 outline-none text-slate-700 transition-all" 
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest text-left">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input required type="password" minLength="6" className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-600 outline-none text-slate-700 transition-all" 
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest text-left block">Level Otoritas</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select className="w-full pl-14 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black focus:border-blue-600 outline-none appearance-none text-slate-800 transition-all cursor-pointer"
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="admin">ADMIN / OPERATOR</option>
                    <option value="superadmin">SUPERADMIN</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-blue-100">
                {isProcessing ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                {isProcessing ? 'Memproses...' : (isAddModalOpen ? 'Konfirmasi Pendaftaran' : 'Simpan Perubahan')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenAdmin;