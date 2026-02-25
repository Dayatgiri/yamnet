import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Briefcase, Plus, Save, Trash2, Edit2, X, 
  DollarSign, Landmark 
} from 'lucide-react';

const Jabatan = () => {
  const [jabatans, setJabatans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ 
    id: null, 
    nama_jabatan: '', 
    departemen: '', 
    gaji_pokok: '' 
  });

  useEffect(() => {
    fetchJabatan();
  }, []);

  const fetchJabatan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jabatan')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setJabatans(data || []);
    } catch (error) {
      console.error("Error fetching jabatan:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama_jabatan || !formData.departemen || !formData.gaji_pokok) {
      alert("Mohon isi semua bidang!");
      return;
    }

    const payload = { 
      nama_jabatan: formData.nama_jabatan, 
      departemen: formData.departemen, 
      gaji_pokok: parseFloat(formData.gaji_pokok) 
    };

    try {
      if (formData.id) {
        const { error } = await supabase.from('jabatan').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jabatan').insert([payload]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchJabatan();
    } catch (error) {
      alert("Gagal menyimpan data: " + error.message);
    }
  };

  const deleteJabatan = async (id) => {
    if (window.confirm("Hapus jabatan ini? Karyawan yang terhubung mungkin akan terdampak.")) {
      try {
        const { error } = await supabase.from('jabatan').delete().eq('id', id);
        if (error) throw error;
        fetchJabatan();
      } catch (error) {
        alert("Gagal menghapus: " + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({ id: null, nama_jabatan: '', departemen: '', gaji_pokok: '' });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Briefcase />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Manajemen Jabatan</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Data & Penggajian</p>
          </div>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          <Plus className="mr-2" size={18} /> TAMBAH JABATAN
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-10 py-7">Nama Jabatan</th>
              <th className="px-6 py-7">Departemen</th>
              <th className="px-6 py-7">Gaji Pokok</th>
              <th className="px-10 py-7 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-bold animate-pulse">Memproses data...</td></tr>
            ) : jabatans.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-bold text-sm uppercase">Belum ada data jabatan</td></tr>
            ) : jabatans.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-10 py-6 font-black text-slate-700 text-sm tracking-tight">{item.nama_jabatan}</td>
                <td className="px-6 py-6 font-bold text-slate-500 text-xs">
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg">{item.departemen}</span>
                </td>
                <td className="px-6 py-6 font-mono font-black text-emerald-600 text-base">
                  Rp {parseFloat(item.gaji_pokok).toLocaleString('id-ID')}
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => { setFormData(item); setIsModalOpen(true); }}
                      className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      <Edit2 size={16}/>
                    </button>
                    <button 
                      onClick={() => deleteJabatan(item.id)}
                      className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL SECTION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-black text-2xl text-slate-800 tracking-tight">
                {formData.id ? 'Edit Jabatan' : 'Tambah Jabatan'}
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              ><X /></button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Nama Jabatan</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <input 
                    placeholder="Contoh: Senior Developer"
                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.nama_jabatan}
                    onChange={(e) => setFormData({...formData, nama_jabatan: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Departemen</label>
                <div className="relative">
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <input 
                    placeholder="Contoh: Operasional"
                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.departemen}
                    onChange={(e) => setFormData({...formData, departemen: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Gaji Pokok (IDR)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <input 
                    type="number"
                    placeholder="Contoh: 5000000"
                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-black text-emerald-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.gaji_pokok}
                    onChange={(e) => setFormData({...formData, gaji_pokok: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center mt-4 active:scale-95"
              >
                <Save className="mr-3" size={20}/> SIMPAN DATA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jabatan;