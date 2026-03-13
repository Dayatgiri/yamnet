import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, Trash2, Edit3, User, Loader2, Search, X, Check } from 'lucide-react';

const ManajemenAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // State form disesuaikan dengan kolom database
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    role: 'admin'
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error("Gagal load data:", error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (selectedAdmin) {
        // UPDATE
        const { error } = await supabase
          .from('admin')
          .update({
            nama: formData.nama,
            role: formData.role
          })
          .eq('id', selectedAdmin.id);
        if (error) throw error;
      } else {
        // INSERT (UUID otomatis dibuat oleh Supabase)
        const { error } = await supabase
          .from('admin')
          .insert([formData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchAdmins();
      alert("Berhasil menyimpan data!");
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id, nama) => {
    if (window.confirm(`Hapus admin ${nama}?`)) {
      try {
        const { error } = await supabase.from('admin').delete().eq('id', id);
        if (error) throw error;
        fetchAdmins();
      } catch (error) {
        alert("Gagal hapus: " + error.message);
      }
    }
  };

  const openModal = (admin = null) => {
    if (admin) {
      setSelectedAdmin(admin);
      setFormData({ nama: admin.nama, email: admin.email, role: admin.role, password: admin.password });
    } else {
      setSelectedAdmin(null);
      setFormData({ nama: '', email: '', password: '', role: 'admin' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Manajemen Admin</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Source: Tabel admin (UUID)</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-slate-900 transition-all shadow-lg"
        >
          <UserPlus size={18} /> Tambah Admin
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Cari nama admin..."
          className="w-full bg-white border-4 border-slate-100 rounded-3xl pl-14 pr-6 py-4 font-bold outline-none focus:border-blue-600 shadow-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="px-8 py-5 text-left">Admin</th>
              <th className="px-8 py-5 text-center">Role</th>
              <th className="px-8 py-5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50">
            {loading ? (
              <tr><td colSpan="3" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan="3" className="py-20 text-center text-slate-400 italic">Database kosong.</td></tr>
            ) : (
              admins
                .filter(a => (a.nama || '').toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 uppercase text-sm">{item.nama}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase ${item.role === 'superadmin' ? 'bg-rose-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16} /></button>
                        <button onClick={() => handleDelete(item.id, item.nama)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-blue-600">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tight">{selectedAdmin ? 'Edit Admin' : 'Tambah Admin'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-blue-600">Nama Lengkap</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-600 outline-none" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
              </div>
              {!selectedAdmin && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-blue-600">Email Login</label>
                    <input required type="email" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-600 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-blue-600">Password</label>
                    <input required type="password" underline className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-600 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-blue-600">Level Role</label>
                <select className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-600 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="admin">ADMIN</option>
                  <option value="superadmin">SUPERADMIN</option>
                </select>
              </div>
              <button disabled={isProcessing} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs hover:bg-slate-900 transition-all flex justify-center gap-2 shadow-xl">
                {isProcessing ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                {selectedAdmin ? 'Simpan Perubahan' : 'Daftarkan Admin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenAdmin;