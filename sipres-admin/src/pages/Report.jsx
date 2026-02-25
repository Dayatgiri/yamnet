import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Search, Edit2, Trash2, X, Save, 
  ArrowRightLeft, Clock, Calendar, Filter 
} from 'lucide-react';

const Report = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE FILTER RENTANG TANGGAL ---
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [formData, setFormData] = useState({ masuk: '', pulang: '' });

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // --- LOGIKA PERHITUNGAN JAM KERJA EFEKTIF ---
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
    if (endAbsen < startAbsen) endAbsen += 1440;
    if (endJadwal < startJadwal) endJadwal += 1440;
    const mulaiEfektif = Math.max(startAbsen, startJadwal);
    const selesaiEfektif = Math.min(endAbsen, endJadwal);
    const durasiMenit = selesaiEfektif - mulaiEfektif;
    if (durasiMenit <= 0) return "0j 0m";
    return `${Math.floor(durasiMenit / 60)}j ${durasiMenit % 60}m`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase
        .from('karyawan')
        .select('*, master_shift(nama_shift, jam_masuk, jam_pulang)');

      // Menyesuaikan rentang waktu agar mencakup satu hari penuh (00:00 - 23:59)
      const start = `${startDate}T00:00:00Z`;
      const end = `${endDate}T23:59:59Z`;

      const { data: attendanceRaw } = await supabase
        .from('absensi')
        .select('*')
        .gte('waktu_absen', start)
        .lte('waktu_absen', end);

      const processedData = emps.map(emp => {
        const empLogs = attendanceRaw?.filter(a => a.karyawan_id === emp.id) || [];
        
        const inData = empLogs.find(a => a.jenis_absen?.toLowerCase().trim() === 'masuk');
        const outData = [...empLogs].reverse().find(a => a.jenis_absen?.toLowerCase().trim() === 'pulang');

        let targetMasuk = emp.master_shift?.jam_masuk || "08:00:00";
        let targetPulang = emp.master_shift?.jam_pulang || "17:00:00";

        const cleanTargetM = targetMasuk.split(':').slice(0, 2).join(':');
        const cleanTargetP = targetPulang.split(':').slice(0, 2).join(':');

        const extractToWIB = (data) => {
          if (!data) return "-";
          const date = new Date(data.waktu_absen);
          return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        };

        // --- FUNGSI STATUS TERLAMBAT / PULANG AWAL (DIKEMBALIKAN) ---
        const getStatus = (jamAbsenStr, type) => {
          if (jamAbsenStr === "-") return { id: 'none', txt: "BELUM ABSEN", col: "text-slate-400" };
          const [hAbsen, mAbsen] = jamAbsenStr.split(':').map(Number);
          const targetStr = type === 'in' ? cleanTargetM : cleanTargetP;
          const [hTarget, mTarget] = targetStr.split(':').map(Number);
          
          let totalMenitAbsen = hAbsen * 60 + mAbsen;
          let totalMenitTarget = hTarget * 60 + mTarget;
          
          let selisih = totalMenitAbsen - totalMenitTarget;
          if (selisih < -600) selisih += 1440; 
          if (selisih > 600) selisih -= 1440;

          const formatSelisih = (min) => {
            const absMin = Math.abs(min);
            return `${Math.floor(absMin / 60)}j ${absMin % 60}m`;
          };

          if (type === 'in') {
            return selisih > 0 
              ? { id: 'late', txt: `TERLAMBAT (${formatSelisih(selisih)})`, col: "text-rose-500" } 
              : { id: 'ontime', txt: "TEPAT WAKTU", col: "text-emerald-500" };
          }
          return selisih < 0 
            ? { id: 'early', txt: `PULANG AWAL (${formatSelisih(selisih)})`, col: "text-rose-500" } 
            : { id: 'ontime', txt: "HADIR", col: "text-emerald-500" };
        };

        const jamM = extractToWIB(inData);
        const jamP = extractToWIB(outData);

        return {
          nama: emp.nama_lengkap,
          nik: emp.nik || '-',
          namaShift: emp.master_shift?.nama_shift || 'Reguler',
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
    <div className="space-y-6 text-left">
      {/* FILTER RENTANG TANGGAL */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><Filter /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Monitoring Presensi</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Pilih Rentang Laporan</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-2 rounded-3xl border border-slate-200 gap-3">
            <div className="flex items-center px-4 py-2 bg-white rounded-2xl shadow-sm">
              <Calendar size={14} className="text-blue-600 mr-2" />
              <input type="date" className="bg-transparent border-none text-xs font-black outline-none text-slate-700 cursor-pointer" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <ArrowRightLeft size={16} className="text-slate-400" />
            <div className="flex items-center px-4 py-2 bg-white rounded-2xl shadow-sm">
              <Calendar size={14} className="text-blue-600 mr-2" />
              <input type="date" className="bg-transparent border-none text-xs font-black outline-none text-slate-700 cursor-pointer" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari nama karyawan..." className="w-full bg-slate-50 border-none rounded-2xl pl-12 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-10 py-7">Karyawan & Shift</th>
              <th className="px-4 py-7 text-center">Jadwal</th>
              <th className="px-6 py-7 text-center">Absen Masuk</th>
              <th className="px-6 py-7 text-center">Absen Pulang</th>
              <th className="px-6 py-7 text-center">Total Kerja</th>
              <th className="px-10 py-7 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold text-sm">
            {loading ? (
              <tr><td colSpan="6" className="text-center py-10 text-slate-400 animate-pulse uppercase font-black">Menyinkronkan data...</td></tr>
            ) : currentEntries.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-6">
                  <p className="font-black text-slate-700 uppercase">{row.nama}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">NIK: {row.nik}</span>
                    <span className="text-[9px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 uppercase italic font-black">{row.namaShift}</span>
                  </div>
                </td>
                <td className="px-4 py-6 text-center">
                  <div className="bg-slate-50 rounded-xl py-2 px-3 border border-slate-100 inline-block">
                    <p className="font-mono font-bold text-slate-700 text-xs">{row.targetM} - {row.targetP}</p>
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <p className="font-mono font-black text-slate-600 text-lg">{row.jamMasuk}</p>
                  <p className={`text-[9px] font-black uppercase ${row.statM.col}`}>{row.statM.txt}</p>
                </td>
                <td className="px-6 py-6 text-center">
                  <p className="font-mono font-black text-slate-600 text-lg">{row.jamPulang}</p>
                  <p className={`text-[9px] font-black uppercase ${row.statP.col}`}>{row.statP.txt}</p>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl ${row.totalKerja === "0j 0m" ? 'bg-slate-50' : 'bg-emerald-50'}`}>
                    <Clock size={14} className={`mr-2 ${row.totalKerja === "0j 0m" ? 'text-slate-400' : 'text-emerald-500'}`} />
                    <p className={`font-black ${row.totalKerja === "0j 0m" ? 'text-slate-500' : 'text-emerald-700'}`}>{row.totalKerja}</p>
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  <button onClick={() => { setEditingData(row); setFormData({ masuk: row.jamMasuk, pulang: row.jamPulang }); setIsModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDIT (DIKEMBALIKAN) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 text-left">
              <h4 className="font-black text-2xl text-slate-800 tracking-tight uppercase">Koreksi Log</h4>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="space-y-6 text-left">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Karyawan</label>
                <p className="font-black text-slate-700 text-lg uppercase">{editingData?.nama}</p>
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
              <button className="w-full bg-blue-600 hover:bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl transition-all flex items-center justify-center uppercase text-xs tracking-widest">
                <Save className="mr-3" size={16}/> Simpan Koreksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;