import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MapPin, Clock, Save, Building2, Target, 
  Fingerprint, ScanFace, MousePointer2, Settings2,
  AlertCircle, Zap, X, Edit2, Trash2, Plus, ListOrdered
} from 'lucide-react';

const ManajemenKantor = () => {
  const [loading, setLoading] = useState(false);
  const [kantorList, setKantorList] = useState([]);
  const [shiftList, setShiftList] = useState([]); // State baru untuk Shift
  const [activeTab, setActiveTab] = useState('KANTOR'); // KANTOR atau SHIFT
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Data Gabungan (Menyesuaikan Tab yang Aktif)
  const [formData, setFormData] = useState({
    // Fields Kantor
    nama_kantor: '', alamat: '', latitude: '', longitude: '', radius: 50, tipe_absensi: 'FACE',
    // Fields Shift
    nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: kantor } = await supabase.from('kantor').select('*').order('created_at', { ascending: false });
    const { data: shift } = await supabase.from('master_shift').select('*').order('nama_shift', { ascending: true });
    if (kantor) setKantorList(kantor);
    if (shift) setShiftList(shift);
    setLoading(false);
  }

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ ...item });
    } else {
      setEditingId(null);
      setFormData({
        nama_kantor: '', alamat: '', latitude: '', longitude: '', radius: 50, tipe_absensi: 'FACE',
        nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const table = activeTab === 'KANTOR' ? 'kantor' : 'master_shift';
    
    // Validasi & Payload
    const dataPayload = activeTab === 'KANTOR' ? {
      nama_kantor: formData.nama_kantor,
      alamat: formData.alamat,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius: parseInt(formData.radius),
      tipe_absensi: formData.tipe_absensi
    } : {
      nama_shift: formData.nama_shift,
      jam_masuk: formData.jam_masuk,
      jam_pulang: formData.jam_pulang
    };

    try {
      const { error } = editingId 
        ? await supabase.from(table).update(dataPayload).eq('id', editingId)
        : await supabase.from(table).insert([dataPayload]);

      if (error) throw error;
      alert(`🎉 Data ${activeTab} Berhasil Disimpan!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, table) => {
    if (window.confirm(`Hapus data ini dari ${table}?`)) {
      await supabase.from(table).delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 animate-in fade-in duration-500">
      {/* HEADER & TAB NAVIGATION */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-5">
                <div className="p-4 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200">
                    <Settings2 className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Sipres<span className="text-blue-500">.</span> Admin</h3>
                    <p className="text-slate-400 font-medium italic">Manajemen Lokasi & Shift Kerja</p>
                </div>
            </div>
            <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center shadow-lg transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2" /> Tambah {activeTab === 'KANTOR' ? 'Kantor' : 'Shift'}
            </button>
        </div>

        <div className="flex space-x-4 bg-slate-50 p-2 rounded-2xl w-fit">
            <button onClick={() => setActiveTab('KANTOR')} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${activeTab === 'KANTOR' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>UNIT KANTOR</button>
            <button onClick={() => setActiveTab('SHIFT')} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${activeTab === 'SHIFT' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>SHIFT KERJA</button>
        </div>
      </div>

      {/* RENDER LIST BERDASARKAN TAB */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeTab === 'KANTOR' ? kantorList.map((k) => (
          <div key={k.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 group hover:shadow-2xl transition-all duration-500">
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner"><Building2 /></div>
                    <div>
                        <h4 className="font-black text-slate-800 text-xl uppercase">{k.nama_kantor}</h4>
                        <span className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase mt-1">
                            <Target className="w-3 h-3 mr-1"/> {k.radius}m Radius
                        </span>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => handleOpenModal(k)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(k.id, 'kantor')} className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl"><Trash2 className="w-4 h-4"/></button>
                </div>
             </div>
             <div className="bg-slate-50 p-5 rounded-[2rem] space-y-3">
                <div className="flex items-center text-slate-500"><MapPin className="w-4 h-4 mr-2" /><p className="text-xs font-bold truncate">{k.alamat}</p></div>
                <div className="flex items-center text-blue-500 font-bold text-[10px]"><ScanFace className="w-4 h-4 mr-2"/> METODE: {k.tipe_absensi}</div>
             </div>
          </div>
        )) : shiftList.map((s) => (
            <div key={s.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 group hover:shadow-2xl transition-all duration-500">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner"><Clock /></div>
                        <div>
                            <h4 className="font-black text-slate-800 text-xl uppercase">{s.nama_shift}</h4>
                            <p className="text-[10px] font-bold text-slate-400">ID SHIFT: #00{s.id}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => handleOpenModal(s)} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(s.id, 'master_shift')} className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-400 uppercase">Jam Masuk</p>
                        <p className="font-black text-emerald-700 text-xl">{s.jam_masuk.substring(0,5)}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-[9px] font-black text-rose-400 uppercase">Jam Pulang</p>
                        <p className="font-black text-rose-700 text-xl">{s.jam_pulang.substring(0,5)}</p>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* MODAL GABUNGAN (DINAMIS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl my-auto animate-in zoom-in duration-300">
            <form onSubmit={handleSubmit} className="p-10 md:p-14 space-y-10">
                <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">
                        {editingId ? 'Edit' : 'Tambah'} {activeTab}
                    </h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400"/></button>
                </div>

                <div className="space-y-6">
                    {activeTab === 'KANTOR' ? (
                        <>
                            <input required placeholder="Nama Kantor" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold" value={formData.nama_kantor} onChange={e => setFormData({...formData, nama_kantor: e.target.value})} />
                            <textarea required placeholder="Alamat Lengkap" rows="2" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm" value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input required type="number" step="any" placeholder="Lat" className="bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                                <input required type="number" step="any" placeholder="Lng" className="bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                            </div>
                        </>
                    ) : (
                        <>
                            <input required placeholder="Nama Shift (e.g. Shift Pagi)" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold" value={formData.nama_shift} onChange={e => setFormData({...formData, nama_shift: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">Jam Masuk</label>
                                    <input type="time" required className="w-full bg-transparent border-none p-0 font-black text-xl mt-1" value={formData.jam_masuk} onChange={e => setFormData({...formData, jam_masuk: e.target.value})} />
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">Jam Pulang</label>
                                    <input type="time" required className="w-full bg-transparent border-none p-0 font-black text-xl mt-1" value={formData.jam_pulang} onChange={e => setFormData({...formData, jam_pulang: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-6 border-t flex justify-end">
                    <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all">
                        <Save className="w-5 h-5 mr-3" /> {loading ? 'Menyimpan...' : 'Simpan Data'}
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