import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MapPin, Clock, Save, Building2, Target, 
  Fingerprint, ScanFace, Settings2,
  X, Edit2, Trash2, Plus, ShieldCheck
} from 'lucide-react';

const ManajemenKantor = () => {
  const [loading, setLoading] = useState(false);
  const [kantorList, setKantorList] = useState([]);
  const [shiftList, setShiftList] = useState([]);
  const [activeTab, setActiveTab] = useState('KANTOR'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nama_kantor: '', alamat: '', latitude: '', longitude: '', radius: 50, tipe_absensi: 'FACE',
    min_jam_bulanan: 112,
    nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00',
    kantor_id: '' // State untuk UUID Kantor (Relasi)
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: kantor } = await supabase.from('kantor').select('*').order('created_at', { ascending: false });
      // JOIN untuk mengambil nama kantor pada daftar shift
      const { data: shift } = await supabase.from('master_shift').select('*, kantor(nama_kantor)').order('nama_shift', { ascending: true });
      
      if (kantor) setKantorList(kantor);
      if (shift) setShiftList(shift);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ ...item });
    } else {
      setEditingId(null);
      setFormData({
        nama_kantor: '', alamat: '', latitude: '', longitude: '', radius: 50, tipe_absensi: 'FACE',
        min_jam_bulanan: 112,
        nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00',
        kantor_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const table = activeTab === 'KANTOR' ? 'kantor' : 'master_shift';
    
    // Payload disesuaikan (UUID tidak menggunakan parseInt/parseFloat)
    const dataPayload = activeTab === 'KANTOR' ? {
      nama_kantor: formData.nama_kantor,
      alamat: formData.alamat,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius: parseInt(formData.radius),
      tipe_absensi: formData.tipe_absensi,
      min_jam_bulanan: parseInt(formData.min_jam_bulanan)
    } : {
      nama_shift: formData.nama_shift,
      jam_masuk: formData.jam_masuk,
      jam_pulang: formData.jam_pulang,
      kantor_id: formData.kantor_id || null // Kirim UUID sebagai string
    };

    try {
      // Hapus kolom join fiktif agar tidak error saat insert
      delete dataPayload.kantor;

      const { error } = editingId 
        ? await supabase.from(table).update(dataPayload).eq('id', editingId)
        : await supabase.from(table).insert([dataPayload]);

      if (error) throw error;
      alert(`🎉 Data ${activeTab} Berhasil Disimpan!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, table) => {
    if (window.confirm(`Hapus data ini?`)) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 text-left">
      {/* HEADER & TAB NAVIGATION */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 text-left">
            <div className="flex items-center space-x-5">
                <div className="p-4 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200">
                    <Settings2 className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Sipres<span className="text-blue-500">.</span> Admin</h3>
                    <p className="text-slate-400 font-medium italic">Pengaturan Unit & Jadwal</p>
                </div>
            </div>
            <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center shadow-lg transition-all active:scale-95 whitespace-nowrap">
                <Plus className="w-5 h-5 mr-2" /> Tambah {activeTab === 'KANTOR' ? 'Kantor' : 'Shift'}
            </button>
        </div>

        <div className="flex space-x-4 bg-slate-50 p-2 rounded-2xl w-fit">
            <button onClick={() => setActiveTab('KANTOR')} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${activeTab === 'KANTOR' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>UNIT KANTOR</button>
            <button onClick={() => setActiveTab('SHIFT')} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${activeTab === 'SHIFT' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>SHIFT KERJA</button>
        </div>
      </div>

      {/* RENDER LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeTab === 'KANTOR' ? kantorList.map((k) => (
          <div key={k.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 group hover:shadow-2xl transition-all duration-500 text-left">
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                      <Building2 />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 text-xl uppercase leading-tight">{k.nama_kantor}</h4>
                        <span className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase mt-1">
                            <Target className="w-3 h-3 mr-1"/> {k.radius}m Radius
                        </span>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => handleOpenModal(k)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(k.id, 'kantor')} className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
             </div>
             <div className="bg-slate-50 p-5 rounded-[2rem] space-y-3">
                <div className="flex items-center text-slate-500"><MapPin className="w-4 h-4 mr-2 shrink-0" /><p className="text-xs font-bold truncate">{k.alamat}</p></div>
                <div className="flex items-center text-amber-600 font-black text-[10px] uppercase tracking-widest pt-2 border-t border-slate-200">
                    <Clock className="w-4 h-4 mr-2" /> Target: {k.min_jam_bulanan || 112} Jam / Bulan
                </div>
             </div>
          </div>
        )) : shiftList.map((s) => (
            <div key={s.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 group hover:shadow-2xl transition-all duration-500">
                <div className="flex justify-between items-start mb-6 text-left">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner"><Clock /></div>
                        <div>
                            <h4 className="font-black text-slate-800 text-xl uppercase leading-tight">{s.nama_shift}</h4>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">📍 Unit: {s.kantor?.nama_kantor || 'Semua Unit'}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => handleOpenModal(s)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(s.id, 'master_shift')} className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-left">
                        <p className="text-[9px] font-black text-emerald-400 uppercase">Jam Masuk</p>
                        <p className="font-black text-emerald-700 text-xl">{s.jam_masuk?.substring(0,5)}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-left">
                        <p className="text-[9px] font-black text-rose-400 uppercase">Jam Pulang</p>
                        <p className="font-black text-rose-700 text-xl">{s.jam_pulang?.substring(0,5)}</p>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* MODAL GABUNGAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl my-auto animate-in zoom-in duration-300 overflow-hidden text-left">
            <form onSubmit={handleSubmit}>
                <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">
                          {editingId ? 'Koreksi' : 'Entry'} {activeTab}
                      </h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sipres Cloud System</p>
                    </div>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                </div>

                <div className="p-10 space-y-8">
                    {activeTab === 'KANTOR' ? (
                        <>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest">Nama & Lokasi Kantor</label>
                                <input required placeholder="Nama Kantor" className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl px-6 py-4 font-bold outline-none transition-all" value={formData.nama_kantor} onChange={e => setFormData({...formData, nama_kantor: e.target.value})} />
                              </div>
                              <textarea required placeholder="Alamat Lengkap" rows="2" className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl px-6 py-4 font-bold text-sm outline-none transition-all" value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-amber-600 ml-2 tracking-widest">Target Jam Kerja Bulanan (Syarat Gaji)</label>
                                <div className="relative">
                                    <input required type="number" className="w-full bg-slate-50 border-2 border-slate-100 focus:border-amber-600 rounded-2xl px-6 py-4 font-black outline-none transition-all" value={formData.min_jam_bulanan} onChange={e => setFormData({...formData, min_jam_bulanan: e.target.value})} />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">Jam / Bulan</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Latitude</label>
                                  <input required type="number" step="any" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold outline-none" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Longitude</label>
                                  <input required type="number" step="any" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold outline-none" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Radius (M)</label>
                                  <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold outline-none" value={formData.radius} onChange={e => setFormData({...formData, radius: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest">Metode Verifikasi</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['FACE', 'FINGERPRINT', 'PIN'].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setFormData({...formData, tipe_absensi: method})}
                                            className={`py-4 rounded-2xl font-black text-[10px] border-2 transition-all flex items-center justify-center gap-2 ${
                                                formData.tipe_absensi === method 
                                                ? 'border-blue-600 bg-blue-50 text-blue-600' 
                                                : 'border-slate-100 bg-slate-50 text-slate-400'
                                            }`}
                                        >
                                            {method === 'FACE' && <ScanFace size={14}/>}
                                            {method === 'FINGERPRINT' && <Fingerprint size={14}/>}
                                            {method === 'PIN' && <ShieldCheck size={14}/>}
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest">Pilih Unit Kantor Pemilik Shift</label>
                                <select 
                                    required 
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl px-6 py-4 font-bold outline-none appearance-none transition-all"
                                    value={formData.kantor_id}
                                    onChange={e => setFormData({...formData, kantor_id: e.target.value})}
                                >
                                    <option value="">-- Pilih Kantor --</option>
                                    {kantorList.map(k => (
                                        <option key={k.id} value={k.id}>{k.nama_kantor}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-blue-600 ml-2 tracking-widest">Nama Shift</label>
                                <input required placeholder="Contoh: Shift Pagi Unit Wonogiri" className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl px-6 py-4 font-bold outline-none transition-all" value={formData.nama_shift} onChange={e => setFormData({...formData, nama_shift: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus-within:border-emerald-500 transition-all">
                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Jam Masuk</label>
                                    <input type="time" required className="w-full bg-transparent border-none p-0 font-black text-3xl outline-none" value={formData.jam_masuk} onChange={e => setFormData({...formData, jam_masuk: e.target.value})} />
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus-within:border-rose-500 transition-all">
                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Jam Pulang</label>
                                    <input type="time" required className="w-full bg-transparent border-none p-0 font-black text-3xl outline-none" value={formData.jam_pulang} onChange={e => setFormData({...formData, jam_pulang: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-10 bg-slate-50 flex justify-end gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 font-bold text-slate-400 uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Batal</button>
                    <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-blue-600 text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center shadow-lg active:scale-95 disabled:bg-slate-300">
                        <Save className="w-4 h-4 mr-3" /> {loading ? 'Saving...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenKantor;