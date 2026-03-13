import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Check, X, Clock, ArrowRightLeft, History, Edit2, Trash2, Save } from 'lucide-react';

const TukarShiftAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  setLoading(true);
  try {
    // 1. Ambil Antrean (Hanya yang siap dieksekusi Admin)
    const { data: activeData } = await supabase
      .from('tukar_shift')
      .select(`*, 
        pengaju:karyawan!tukar_shift_pengaju_id_fkey(nama_lengkap), 
        penerima:karyawan!tukar_shift_penerima_id_fkey(nama_lengkap)`)
      .eq('status_penerima', 'Accepted')
      .eq('status_admin', 'Pending')
      .order('created_at', { ascending: false });

    // 2. Ambil Riwayat Lengkap (Sinkron dengan Aplikasi Mobile)
    // Kita hapus filter .or() agar SEMUA data masuk ke tabel riwayat bawah
    const { data: historyData } = await supabase
      .from('tukar_shift')
      .select(`*, 
        pengaju:karyawan!tukar_shift_pengaju_id_fkey(nama_lengkap), 
        penerima:karyawan!tukar_shift_penerima_id_fkey(nama_lengkap)`)
      .order('created_at', { ascending: false }); // Mengurutkan dari yang terbaru diajukan

    setRequests(activeData || []);
    setHistory(historyData || []);
  } catch (error) {
    console.error("Fetch Error:", error);
  } finally {
    setLoading(false);
  }
};
  // --- FITUR DELETE (CRUD) ---
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus permanen data riwayat ini?")) return;
    const { error } = await supabase.from('tukar_shift').delete().eq('id', id);
    if (error) alert("Gagal menghapus"); else fetchData();
  };

  // --- FITUR UPDATE/EDIT (CRUD) ---
  const handleUpdate = async () => {
    const { error } = await supabase
      .from('tukar_shift')
      .update({ 
        tanggal_tukar: editingData.tanggal_tukar,
        keterangan: editingData.keterangan,
        status_admin: editingData.status_admin
      })
      .eq('id', editingData.id);
    
    if (error) alert("Gagal update");
    else {
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  if (loading) return <div className="p-10 text-center font-bold">Memuat Data...</div>;

  return (
    <div className="p-6 space-y-10">
      {/* TABEL PERMINTAAN AKTIF (Sama seperti sebelumnya) */}
      <section className="space-y-4">
        <h2 className="text-lg font-black flex items-center gap-2"><Clock /> MENUNGGU APPROVAL</h2>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map(req => (
                <tr key={req.id}>
                  <td className="px-6 py-4 font-bold text-sm">
                    {req.tanggal_tukar}<br/>
                    <span className="text-blue-600 text-[10px]">{req.pengaju?.nama_lengkap} ➔ {req.penerima?.nama_lengkap}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{req.keterangan}</td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => handleAction(req.id, 'Approved')} className="p-2 bg-emerald-500 text-white rounded-lg"><Check size={16}/></button>
                    <button onClick={() => handleAction(req.id, 'Rejected')} className="p-2 bg-rose-500 text-white rounded-lg"><X size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

{/* SECTION HISTORY DENGAN TIGA STATUS (Pengaaju, Penerima, Admin) */}
<section className="space-y-4">
  <h2 className="text-lg font-black flex items-center gap-2"><History /> RIWAYAT LENGKAP</h2>
  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
        <tr>
          <th className="px-6 py-4">Tanggal & Info Karyawan</th>
          <th className="px-6 py-4 text-center">Status Rekan</th>
          <th className="px-6 py-4 text-center">Keputusan Admin</th>
          <th className="px-6 py-4 text-right">Kelola</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {history.map(h => (
          <tr key={h.id} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4">
              <div className="font-bold text-slate-700">{h.tanggal_tukar}</div>
              <div className="text-[10px] text-slate-500 uppercase font-black">
                {h.pengaju?.nama_lengkap} <ArrowRightLeft size={10} className="inline mx-1"/> {h.penerima?.nama_lengkap}
              </div>
            </td>

            {/* STATUS PENERIMA (REKAN) */}
            <td className="px-6 py-4 text-center">
              <span className={`px-3 py-1 text-[9px] font-black rounded-full shadow-sm ${
                h.status_penerima === 'Accepted' ? 'bg-blue-100 text-blue-700' : 
                h.status_penerima === 'Rejected' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {h.status_penerima === 'Accepted' ? 'DISETUJUI REKAN' : 
                 h.status_penerima === 'Rejected' ? 'DITOLAK REKAN' : 'MENUNGGU REKAN'}
              </span>
            </td>

            {/* STATUS ADMIN */}
            <td className="px-6 py-4 text-center">
              <span className={`px-3 py-1 text-[9px] font-black rounded-full shadow-sm ${
                h.status_admin === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                h.status_admin === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {h.status_admin === 'Pending' ? '⏳ PENDING' : h.status_admin.toUpperCase()}
              </span>
            </td>

            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-2">
                <button onClick={() => { setEditingData(h); setIsEditModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={14}/></button>
                <button onClick={() => handleDelete(h.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>

      {/* MODAL EDIT (CRUD - UPDATE) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="font-black text-xl mb-6 uppercase">Edit Riwayat</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Tanggal Tukar</label>
                <input type="date" className="w-full p-3 bg-slate-100 rounded-xl border-none font-bold" value={editingData.tanggal_tukar} onChange={(e) => setEditingData({...editingData, tanggal_tukar: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Keterangan / Alasan</label>
                <textarea className="w-full p-3 bg-slate-100 rounded-xl border-none font-bold" rows="3" value={editingData.keterangan} onChange={(e) => setEditingData({...editingData, keterangan: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Status Admin</label>
                <select className="w-full p-3 bg-slate-100 rounded-xl border-none font-bold" value={editingData.status_admin} onChange={(e) => setEditingData({...editingData, status_admin: e.target.value})}>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400 uppercase text-xs">Batal</button>
                <button onClick={handleUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"><Save size={14}/> Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TukarShiftAdmin;