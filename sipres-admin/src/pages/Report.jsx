import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Search, Edit2, Trash2, X, Save, 
  ArrowRightLeft, Clock 
} from 'lucide-react';

const Report = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [formData, setFormData] = useState({ masuk: '', pulang: '' });

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  // --- LOGIKA PERHITUNGAN JAM KERJA EFEKTIF (FIXED FOR NIGHT SHIFTS) ---
  const calculateWorkHours = (jamM, jamP, targetM, targetP) => {
    if (jamM === "-" || jamP === "-") return "-";

    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    let startAbsen = toMinutes(jamM);
    let endAbsen = toMinutes(jamP);
    let startJadwal = toMinutes(targetM);
    let endJadwal = toMinutes(targetP);

    // Penanganan Lewat Tengah Malam (Jika jam pulang < jam masuk)
    if (endAbsen < startAbsen) endAbsen += 1440;
    if (endJadwal < startJadwal) endJadwal += 1440;

    // Logika Sesuai Permintaan:
    // 1. Datang awal tetap dihitung dari jadwal, terlambat dihitung dari absen.
    const mulaiEfektif = Math.max(startAbsen, startJadwal);
    
    // 2. Pulang awal dihitung dari absen, pulang telat tetap dihitung dari jadwal.
    const selesaiEfektif = Math.min(endAbsen, endJadwal);

    const durasiMenit = selesaiEfektif - mulaiEfektif;

    if (durasiMenit <= 0) return "0j 0m";

    const hours = Math.floor(durasiMenit / 60);
    const minutes = durasiMenit % 60;
    return `${hours}j ${minutes}m`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase
        .from('karyawan')
        .select('*, master_shift(nama_shift, jam_masuk, jam_pulang)');

      const { data: swaps } = await supabase
        .from('tukar_shift')
        .select('*')
        .eq('tanggal_tukar', filterDate)
        .eq('status_admin', 'Approved');

      const dateObj = new Date(filterDate);
      const yesterday = new Date(dateObj); yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(dateObj); tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: attendanceRaw } = await supabase
        .from('absensi')
        .select('*')
        .gte('waktu_absen', yesterday.toISOString().split('T')[0])
        .lte('waktu_absen', tomorrow.toISOString().split('T')[0]);

      const attendance = attendanceRaw?.filter(a => {
        const localDate = new Date(a.waktu_absen).toLocaleDateString('en-CA');
        return localDate === filterDate;
      });

      const processedData = emps.map(emp => {
        const inData = attendance?.find(a => 
          a.karyawan_id === emp.id && a.jenis_absen?.toLowerCase().trim() === 'masuk'
        );
        const outData = attendance?.find(a => 
          a.karyawan_id === emp.id && a.jenis_absen?.toLowerCase().trim() === 'pulang'
        );

        const swapEntry = swaps?.find(s => s.pengaju_id === emp.id || s.penerima_id === emp.id);

        let targetMasuk = emp.master_shift?.jam_masuk || "08:00:00";
        let targetPulang = emp.master_shift?.jam_pulang || "17:00:00";

        if (swapEntry) {
          if (swapEntry.pengaju_id === emp.id) {
            targetMasuk = swapEntry.shift_asli_penerima || targetMasuk;
            targetPulang = swapEntry.pulang_asli_penerima || targetPulang;
          } else {
            targetMasuk = swapEntry.shift_asli_pengaju || targetMasuk;
            targetPulang = swapEntry.pulang_asli_pengaju || targetPulang;
          }
        }

        const cleanTargetM = targetMasuk.split(':').slice(0, 2).join(':');
        const cleanTargetP = targetPulang.split(':').slice(0, 2).join(':');

        const extractToWIB = (data) => {
          if (!data) return "-";
          const date = new Date(data.waktu_absen);
          return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        };

        const getStatus = (jamAbsenStr, type) => {
          if (jamAbsenStr === "-") return { id: 'none', txt: "BELUM ABSEN", col: "text-slate-400" };
          const [hAbsen, mAbsen] = jamAbsenStr.split(':').map(Number);
          const targetStr = type === 'in' ? cleanTargetM : cleanTargetP;
          const [hTarget, mTarget] = targetStr.split(':').map(Number);
          const totalMenitAbsen = hAbsen * 60 + mAbsen;
          const totalMenitTarget = hTarget * 60 + mTarget;
          
          let selisih = totalMenitAbsen - totalMenitTarget;
          // Koreksi selisih untuk shift malam
          if (selisih < -600) selisih += 1440; 
          if (selisih > 600) selisih -= 1440;

          if (type === 'in') {
            return selisih > 0 ? { id: 'late', txt: "TERLAMBAT", col: "text-rose-500" } : { id: 'ontime', txt: "TEPAT WAKTU", col: "text-emerald-500" };
          }
          return selisih < 0 ? { id: 'early', txt: "PULANG CEPAT", col: "text-rose-500" } : { id: 'ontime', txt: "HADIR", col: "text-emerald-500" };
        };

        const jamM = extractToWIB(inData);
        const jamP = extractToWIB(outData);

        return {
          nama: emp.nama_lengkap,
          nik: emp.nik || '-',
          isSwapping: !!swapEntry,
          jamMasuk: jamM,
          jamPulang: jamP,
          targetM: cleanTargetM,
          targetP: cleanTargetP,
          statM: getStatus(jamM, 'in'),
          statP: getStatus(jamP, 'out'),
          totalKerja: calculateWorkHours(jamM, jamP, cleanTargetM, cleanTargetP)
        };
      });

      setReports(processedData);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = reports.filter(row => row.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentEntries = filteredData.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100"><FileText /></div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Laporan Presensi</h3>
          </div>
          <input 
            type="date" 
            className="bg-slate-50 border-none rounded-xl text-sm font-bold p-3 outline-none focus:ring-2 focus:ring-blue-500" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
          />
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama karyawan..." 
            className="w-full bg-slate-50 border-none rounded-2xl pl-12 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-500" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden text-left">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-10 py-7">Karyawan</th>
              <th className="px-4 py-7 text-center">Jadwal Kantor</th>
              <th className="px-6 py-7 text-center">Absen Masuk</th>
              <th className="px-6 py-7 text-center">Absen Pulang</th>
              <th className="px-6 py-7 text-center">Total Kerja</th>
              <th className="px-10 py-7 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="6" className="text-center py-10 text-slate-400 font-bold">Memuat data...</td></tr>
            ) : currentEntries.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-slate-400 font-bold">Tidak ada data absensi</td></tr>
            ) : currentEntries.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-6">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-slate-700">{row.nama}</p>
                      {row.isSwapping && <span className="bg-blue-600 text-white text-[8px] px-2 py-1 rounded-full font-black">TUKAR</span>}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">NIK: {row.nik}</p>
                  </div>
                </td>
                <td className="px-4 py-6 text-center">
                  <div className="bg-slate-50 rounded-xl py-2 px-3 border border-slate-100 inline-block">
                    <p className="font-mono font-bold text-slate-700 text-xs">{row.targetM} - {row.targetP}</p>
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <p className="font-mono font-black text-slate-600 text-lg">{row.jamMasuk}</p>
                  <p className={`text-[10px] font-black ${row.statM.col}`}>{row.statM.txt}</p>
                </td>
                <td className="px-6 py-6 text-center">
                  <p className="font-mono font-black text-slate-600 text-lg">{row.jamPulang}</p>
                  <p className={`text-[10px] font-black ${row.statP.col}`}>{row.statP.txt}</p>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl ${row.totalKerja === "0j 0m" ? 'bg-slate-50' : 'bg-emerald-50'}`}>
                    <Clock size={14} className={`mr-2 ${row.totalKerja === "0j 0m" ? 'text-slate-400' : 'text-emerald-500'}`} />
                    <p className={`font-black ${row.totalKerja === "0j 0m" ? 'text-slate-500' : 'text-emerald-700'}`}>{row.totalKerja}</p>
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => { setEditingData(row); setFormData({ masuk: row.jamMasuk, pulang: row.jamPulang }); setIsModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16}/></button>
                    <button className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 text-left">
              <h4 className="font-black text-2xl text-slate-800 tracking-tight">Koreksi Log</h4>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="space-y-6 text-left">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nama Karyawan</label>
                <p className="font-bold text-slate-700 text-lg">{editingData?.nama}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Jam Masuk</label>
                  <input type="time" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.masuk} onChange={(e) => setFormData({...formData, masuk: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Jam Pulang</label>
                  <input type="time" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.pulang} onChange={(e) => setFormData({...formData, pulang: e.target.value})} />
                </div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-blue-100 transition-all flex items-center justify-center active:scale-95">
                <Save className="mr-3" size={20}/> Simpan Koreksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;