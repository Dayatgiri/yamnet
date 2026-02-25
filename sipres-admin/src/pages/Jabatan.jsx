import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Briefcase, Plus, Save, Trash2, Edit2, X, 
  DollarSign, Landmark, Users, Clock, AlertCircle, CheckCircle2,
  Calendar
} from 'lucide-react';

const Jabatan = () => {
  const [activeTab, setActiveTab] = useState('MASTER'); // MASTER atau REKAP
  const [jabatans, setJabatans] = useState([]);
  const [rekapGaji, setRekapGaji] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));
  
  const [formData, setFormData] = useState({ 
    id: null, nama_jabatan: '', departemen: '', gaji_pokok: '' 
  });

  useEffect(() => {
    if (activeTab === 'MASTER') fetchJabatan();
    else fetchRekapGaji();
  }, [activeTab, filterMonth]);

  // --- LOGIKA MASTER JABATAN ---
  const fetchJabatan = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('jabatan').select('*').order('created_at', { ascending: false });
      if (data) setJabatans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA REKAP GAJI & JAM KERJA ---
  const fetchRekapGaji = async () => {
    setLoading(true);
    try {
      // 1. Ambil target jam dari kantor
      const { data: kantorData } = await supabase.from('kantor').select('min_jam_bulanan').limit(1).single();
      const targetJam = kantorData?.min_jam_bulanan || 112;

      // 2. Ambil data karyawan beserta relasi jabatan & shift

const { data: emps, error: errEmp } = await supabase
  .from('karyawan')
  .select(`
    id, 
    nama_lengkap, 
    departemen, 
    jabatan_id,
    jabatan!inner (nama_jabatan, gaji_pokok), 
    master_shift:shift_id (jam_masuk, jam_pulang)
  `);

      if (errEmp) throw errEmp;

      // 3. LOGIKA TANGGAL AMAN (Inclusive Start, Exclusive End)
      const year = parseInt(filterMonth.split('-')[0]);
      const month = parseInt(filterMonth.split('-')[1]);
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
      const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

      const { data: attendance, error: errAtt } = await supabase
        .from('absensi')
        .select('*')
        .gte('waktu_absen', startDate)
        .lt('waktu_absen', endDate);

      if (errAtt) throw errAtt;

      // 4. Proses Akumulasi Jam Kerja Efektif
      const processed = emps.map(emp => {
        const empLogs = attendance?.filter(a => a.karyawan_id === emp.id) || [];
        let totalMinutes = 0;

        const uniqueDates = [...new Set(empLogs.map(l => 
          new Date(l.waktu_absen).toLocaleDateString('en-CA')
        ))];
        
        uniqueDates.forEach(dateStr => {
          const dayLogs = empLogs.filter(l => 
            new Date(l.waktu_absen).toLocaleDateString('en-CA') === dateStr
          );

          const inLog = dayLogs.find(l => l.jenis_absen?.toLowerCase().trim() === 'masuk');
          const outLog = dayLogs.find(l => l.jenis_absen?.toLowerCase().trim() === 'pulang');

          if (inLog && outLog) {
            const getLocalTime = (isoStr) => {
                const d = new Date(isoStr);
                return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
            };

            totalMinutes += calculateEffectiveMinutes(
              getLocalTime(inLog.waktu_absen), 
              getLocalTime(outLog.waktu_absen), 
              emp.master_shift?.jam_masuk || "08:00", 
              emp.master_shift?.jam_pulang || "17:00"
            );
          }
        });

        const totalHours = Math.floor(totalMinutes / 60);
        return {
          ...emp,
          totalJam: totalHours,
          targetJam,
          isMemenuhi: totalHours >= targetJam
        };
      });

      setRekapGaji(processed);
    } catch (err) {
      console.error("Gagal Rekap:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateEffectiveMinutes = (jamM, jamP, targetM, targetP) => {
    const toMin = (s) => { 
        if (!s) return 0;
        const parts = s.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]); 
    };
    let startA = toMin(jamM), endA = toMin(jamP), startJ = toMin(targetM), endJ = toMin(targetP);
    if (endA < startA) endA += 1440; 
    if (endJ < startJ) endJ += 1440; 
    const durasi = Math.min(endA, endJ) - Math.max(startA, startJ);
    return durasi > 0 ? durasi : 0;
  };

  const handleSave = async () => {
    const payload = { 
      nama_jabatan: formData.nama_jabatan, 
      departemen: formData.departemen, 
      gaji_pokok: parseFloat(formData.gaji_pokok) 
    };
    try {
      if (formData.id) await supabase.from('jabatan').update(payload).eq('id', formData.id);
      else await supabase.from('jabatan').insert([payload]);
      setIsModalOpen(false);
      fetchJabatan();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex space-x-4 bg-white p-2 rounded-3xl shadow-sm border border-slate-100 w-fit">
        <button onClick={() => setActiveTab('MASTER')} className={`px-8 py-3 rounded-2xl font-black text-xs transition-all ${activeTab === 'MASTER' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>MASTER JABATAN</button>
        <button onClick={() => setActiveTab('REKAP')} className={`px-8 py-3 rounded-2xl font-black text-xs transition-all ${activeTab === 'REKAP' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>REKAP GAJI BULANAN</button>
      </div>

      {activeTab === 'MASTER' ? (
        <>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Briefcase /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Master Data Jabatan</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Konfigurasi Salary Base</p>
              </div>
            </div>
            <button onClick={() => { setFormData({id: null, nama_jabatan:'', departemen:'', gaji_pokok:''}); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest tracking-tight">Tambah Jabatan</button>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="px-10 py-7">Nama Jabatan</th>
                  <th className="px-6 py-7">Departemen</th>
                  <th className="px-6 py-7">Gaji Pokok</th>
                  <th className="px-10 py-7 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-sm">
                {loading ? (
                    <tr><td colSpan="4" className="text-center py-10 text-slate-400 font-bold animate-pulse uppercase">Memuat data...</td></tr>
                ) : jabatans.map(j => (
                  <tr key={j.id} className="hover:bg-slate-50/50">
                    <td className="px-10 py-6 text-slate-800 uppercase tracking-tighter">{j.nama_jabatan}</td>
                    <td className="px-6 py-6 text-slate-400 font-medium italic">{j.departemen}</td>
                    <td className="px-6 py-6 text-emerald-600 font-black tracking-tight">Rp {parseFloat(j.gaji_pokok).toLocaleString('id-ID')}</td>
                    <td className="px-10 py-6 text-right space-x-2">
                      <button onClick={() => {setFormData(j); setIsModalOpen(true);}} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16}/></button>
                      <button onClick={async () => { if(window.confirm('Hapus Jabatan?')) { await supabase.from('jabatan').delete().eq('id', j.id); fetchJabatan(); } }} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-100"><Users /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Laporan Rekapitulasi Gaji</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">Berdasarkan Akumulasi Jam Kerja Efektif</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                <Calendar size={18} className="text-slate-400"/>
                <input type="month" className="bg-transparent border-none font-black text-sm outline-none text-slate-700 cursor-pointer" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden font-sans">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="px-10 py-7">Karyawan</th>
                  <th className="px-6 py-7">Struktur</th>
                  <th className="px-6 py-7">Gaji Pokok</th>
                  <th className="px-6 py-7 text-center">Total Jam</th>
                  <th className="px-10 py-7 text-center">Hasil Performa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-xs uppercase">
                {loading ? (
                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-bold animate-pulse uppercase tracking-widest">Menghitung rekapitulasi...</td></tr>
                ) : rekapGaji.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest">Tidak ada data absensi untuk bulan ini</td></tr>
                ) : rekapGaji.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-6 font-black text-slate-800 leading-tight">{r.nama_lengkap}</td>
                    <td className="px-6 py-6">
                      <p className="text-slate-600 font-bold">{r.jabatan?.nama_jabatan || '-'}</p>
                      <p className="text-[9px] text-indigo-500 font-black tracking-widest leading-none mt-1">{r.departemen}</p>
                    </td>
                    <td className="px-6 py-6 text-slate-700 font-mono text-sm tracking-tighter">
                      {r.jabatan ? `Rp ${parseFloat(r.jabatan.gaji_pokok || 0).toLocaleString('id-ID')}` : <span className="text-rose-400 italic text-[10px]">Belum Diatur</span>}
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center px-4 py-2 bg-slate-100 rounded-xl font-black text-indigo-600">
                        <Clock size={12} className="mr-2"/> {r.totalJam} / {r.targetJam} Jam
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      {r.isMemenuhi ? (
                        <div className="flex items-center justify-center text-emerald-600 gap-1 bg-emerald-50 py-2 rounded-xl border border-emerald-100 font-black tracking-tighter shadow-sm">
                          <CheckCircle2 size={14}/> GAJI PENUH
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-rose-600 gap-1 bg-rose-50 py-2 rounded-xl border border-rose-100 font-black tracking-tighter shadow-sm">
                          <AlertCircle size={14}/> KURANG JAM
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL MASTER JABATAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200 text-left border-4 border-indigo-600">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-black text-2xl text-slate-800 tracking-tight uppercase tracking-tight">{formData.id ? 'Edit' : 'Entry'} Jabatan</h4>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X /></button>
            </div>
            <div className="space-y-5">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nama Jabatan</label>
                 <input placeholder="Senior Manager" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-600 transition-all shadow-inner" value={formData.nama_jabatan} onChange={e => setFormData({...formData, nama_jabatan: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Departemen</label>
                 <input placeholder="Produksi / IT" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-600 transition-all shadow-inner" value={formData.departemen} onChange={e => setFormData({...formData, departemen: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Gaji Pokok (Nominal)</label>
                 <input type="number" placeholder="5000000" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-emerald-600 outline-none focus:border-indigo-600 transition-all shadow-inner" value={formData.gaji_pokok} onChange={e => setFormData({...formData, gaji_pokok: e.target.value})} />
               </div>
               <button onClick={handleSave} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center uppercase tracking-[0.2em] text-xs">
                 <Save className="mr-3" size={16}/> Simpan Data Jabatan
               </button>
            </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Jabatan;