import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Search, Edit2, Trash2, X, Save, 
  ArrowRightLeft, Clock, Calendar, Filter, ChevronLeft, ChevronRight, User, Download
} from 'lucide-react';
// Import library tambahan untuk Export (Pastikan sudah npm install xlsx jspdf jspdf-autotable)
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Report = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [formData, setFormData] = useState({ masuk: '', pulang: '' });

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [startDate, endDate]);

  // --- FITUR EXPORT EXCEL ---
  const exportToExcel = () => {
    const dataToExport = filteredData.map(row => ({
      'Nama Karyawan': row.nama,
      'NIK': row.nik,
      'Shift': row.namaShift,
      'Jadwal': `${row.targetM} - ${row.targetP}`,
      'Masuk': row.jamMasuk,
      'Metode M': row.metodeM,
      'Pulang': row.jamPulang,
      'Metode P': row.metodeP,
      'Total Kerja': row.totalKerja
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `Laporan_Presensi_${startDate}.xlsx`);
  };

  // --- FITUR EXPORT PDF ---
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(`Laporan Presensi (${startDate} s/d ${endDate})`, 14, 15);
    const tableRows = filteredData.map(row => [
      row.nama, row.nik, row.namaShift, row.jamMasuk, row.jamPulang, row.totalKerja
    ]);
    doc.autoTable({
      head: [['Nama', 'NIK', 'Shift', 'Masuk', 'Pulang', 'Total']],
      body: tableRows,
      startY: 20
    });
    doc.save(`Laporan_Presensi_${startDate}.pdf`);
  };

  // --- FITUR SIMPAN KOREKSI ---
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const start = `${startDate}T00:00:00Z`;
      const end = `${endDate}T23:59:59Z`;

      // Update Jam Masuk
      if (formData.masuk !== editingData.jamMasuk) {
        const fullDateM = `${startDate}T${formData.masuk}:00Z`;
        await supabase.from('absensi').update({ waktu_absen: fullDateM, metode: 'ADMIN_EDIT' })
          .eq('karyawan_id', editingData.idKaryawan).eq('jenis_absen', 'Masuk')
          .gte('waktu_absen', start).lte('waktu_absen', end);
      }

      // Update Jam Pulang
      if (formData.pulang !== editingData.jamPulang) {
        const fullDateP = `${startDate}T${formData.pulang}:00Z`;
        await supabase.from('absensi').update({ waktu_absen: fullDateP, metode: 'ADMIN_EDIT' })
          .eq('karyawan_id', editingData.idKaryawan).eq('jenis_absen', 'Pulang')
          .gte('waktu_absen', start).lte('waktu_absen', end);
      }

      alert("Koreksi Berhasil!");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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
    return durasiMenit <= 0 ? "0j 0m" : `${Math.floor(durasiMenit / 60)}j ${durasiMenit % 60}m`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase.from('karyawan').select('*, master_shift(nama_shift, jam_masuk, jam_pulang)');
      const start = `${startDate}T00:00:00Z`;
      const end = `${endDate}T23:59:59Z`;
      const { data: attendanceRaw } = await supabase.from('absensi').select('*').gte('waktu_absen', start).lte('waktu_absen', end);

      const processedData = emps.map(emp => {
        const empLogs = attendanceRaw?.filter(a => a.karyawan_id === emp.id) || [];
        const hasLog = empLogs.length > 0;
        const inData = empLogs.find(a => a.jenis_absen?.toLowerCase().trim() === 'masuk');
        const outData = [...empLogs].reverse().find(a => a.jenis_absen?.toLowerCase().trim() === 'pulang');

        let tM = emp.master_shift?.jam_masuk || "08:00:00";
        let tP = emp.master_shift?.jam_pulang || "17:00:00";
        const cleanTM = tM.split(':').slice(0, 2).join(':');
        const cleanTP = tP.split(':').slice(0, 2).join(':');

        const extractToWIB = (data) => {
          if (!data) return "-";
          const date = new Date(data.waktu_absen);
          return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        };

        const getStatus = (jam, type) => {
          if (jam === "-") return { txt: "BELUM ABSEN", col: "text-slate-400" };
          const [hA, mAbs] = jam.split(':').map(Number);
          const [hT, mT] = (type === 'in' ? cleanTM : cleanTP).split(':').map(Number);
          let diff = (hA * 60 + mAbs) - (hT * 60 + mT);
          if (diff < -600) diff += 1440; if (diff > 600) diff -= 1440;
          const fmtS = (m) => `${Math.floor(Math.abs(m) / 60)}j ${Math.abs(m) % 60}m`;
          if (type === 'in') return diff > 0 ? { txt: `TERLAMBAT (${fmtS(diff)})`, col: "text-rose-500" } : { txt: "TEPAT WAKTU", col: "text-emerald-500" };
          return diff < 0 ? { txt: `PULANG AWAL (${fmtS(diff)})`, col: "text-rose-500" } : { txt: "HADIR", col: "text-emerald-500" };
        };

        const jamM = extractToWIB(inData);
        const jamP = extractToWIB(outData);
        const photoUrl = supabase.storage.from('avatars').getPublicUrl(`face_${emp.id}.jpg`).data.publicUrl;

        return {
          idKaryawan: emp.id,
          nama: emp.nama_lengkap, nik: emp.nik || '-', photo: photoUrl,
          namaShift: emp.master_shift?.nama_shift || 'Reguler',
          jamMasuk: jamM, jamPulang: jamP, targetM: cleanTM, targetP: cleanTP,
          statM: getStatus(jamM, 'in'), statP: getStatus(jamP, 'out'),
          metodeM: inData?.metode || 'FACE', metodeP: outData?.metode || 'FACE',
          totalKerja: calculateWorkHours(jamM, jamP, cleanTM, cleanTP), hasLog
        };
      });
      setReports(processedData.filter(row => row.hasLog));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDelete = async (empId, nama) => {
    const confirmDelete = window.confirm(`Hapus seluruh log presensi ${nama} pada rentang ${startDate} s/d ${endDate}?`);
    if (!confirmDelete) return;
    try {
      const start = `${startDate}T00:00:00Z`;
      const end = `${endDate}T23:59:59Z`;
      const { error } = await supabase.from('absensi').delete().eq('karyawan_id', empId).gte('waktu_absen', start).lte('waktu_absen', end);
      if (error) throw error;
      alert("🎉 Terhapus!"); fetchData();
    } catch (e) { alert(e.message); }
  };

  const filteredData = reports.filter(row => row.nama.toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><Filter /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Monitoring Presensi</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Pilih Rentang Laporan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center bg-slate-100 p-2 rounded-3xl border border-slate-200 gap-3">
              <div className="flex items-center px-4 py-2 bg-white rounded-2xl shadow-sm">
                <Calendar size={14} className="text-blue-600 mr-2" />
                <input type="date" className="bg-transparent border-none text-xs font-black outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <ArrowRightLeft size={16} className="text-slate-400" />
              <div className="flex items-center px-4 py-2 bg-white rounded-2xl shadow-sm">
                <Calendar size={14} className="text-blue-600 mr-2" />
                <input type="date" className="bg-transparent border-none text-xs font-black outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-emerald-600"><Download size={14}/> Excel</button>
              <button onClick={exportToPDF} className="flex items-center gap-2 bg-rose-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-rose-600"><FileText size={14}/> PDF</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari nama karyawan..." className="w-full bg-slate-50 border-none rounded-2xl pl-12 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase">Show:</span>
              <select className="bg-transparent border-none text-xs font-black outline-none text-blue-600 cursor-pointer" value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={10}>10</option><option value={50}>50</option><option value={100}>100</option>
              </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
            <tr>
              <th className="px-10 py-7 text-left">Karyawan & Shift</th>
              <th className="px-6 py-7 text-center">Masuk</th>
              <th className="px-6 py-7 text-center">Pulang</th>
              <th className="px-6 py-7 text-center">Total Kerja</th>
              <th className="px-10 py-7 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold text-sm">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-20 text-slate-400 animate-pulse font-black uppercase tracking-widest">Sinkronisasi Data...</td></tr>
            ) : currentEntries.length > 0 ? (
              currentEntries.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                        <img src={row.photo} alt={row.nama} className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=" + row.nama + "&background=f1f5f9&color=64748b&bold=true"; }} />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 uppercase mb-1 leading-none">{row.nama}</p>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{row.nik}</span>
                          <span className="text-[9px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 uppercase font-black italic">{row.namaShift}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-600">
                          <Clock size={10} strokeWidth={3} />
                          <span className="text-[9px] font-black tracking-tighter uppercase italic">{row.targetM} - {row.targetP}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <p className="font-mono font-black text-slate-600 text-lg">{row.jamMasuk}</p>
                  <div className="flex flex-col items-center gap-1">
                    <p className={`text-[9px] font-black uppercase ${row.statM.col}`}>{row.statM.txt}</p>
                    {row.metodeM === 'ADMIN_BYPASS' && (
                      <span className="text-[7px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black border border-amber-200">BY ADMIN</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <p className="font-mono font-black text-slate-600 text-lg">{row.jamPulang}</p>
                  <div className="flex flex-col items-center gap-1">
                    <p className={`text-[9px] font-black uppercase ${row.statP.col}`}>{row.statP.txt}</p>
                    {row.metodeP === 'ADMIN_BYPASS' && (
                      <span className="text-[7px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black border border-amber-200">BY ADMIN</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-6 text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl ${row.totalKerja === "0j 0m" ? 'bg-slate-50' : 'bg-emerald-50'}`}>
                    <Clock size={14} className={`mr-2 ${row.totalKerja === "0j 0m" ? 'text-slate-400' : 'text-emerald-500'}`} />
                    <p className={`font-black ${row.totalKerja === "0j 0m" ? 'text-slate-500' : 'text-emerald-700'}`}>{row.totalKerja}</p>
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setEditingData(row); setFormData({ masuk: row.jamMasuk, pulang: row.jamPulang }); setIsModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(row.idKaryawan, row.nama)} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="text-center py-20 text-slate-400 font-black uppercase text-xs tracking-widest">Data tidak ditemukan</td></tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION UI */}
        {!loading && filteredData.length > 0 && (
          <div className="bg-slate-50 px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Showing {indexOfFirstEntry + 1} - {Math.min(indexOfLastEntry, filteredData.length)} of {filteredData.length}</p>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><ChevronLeft size={16} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-black text-2xl text-slate-800 tracking-tight uppercase">Koreksi Log</h4>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Karyawan</label>
                <p className="font-black text-slate-700 text-lg uppercase">{editingData?.nama}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Masuk</label>
                  <input type="time" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 outline-none" value={formData.masuk} onChange={(e) => setFormData({...formData, masuk: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Pulang</label>
                  <input type="time" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 outline-none" value={formData.pulang} onChange={(e) => setFormData({...formData, pulang: e.target.value})} />
                </div>
              </div>
              <button onClick={handleSaveEdit} className="w-full bg-blue-600 hover:bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl transition-all flex items-center justify-center uppercase text-xs tracking-widest gap-2">
                <Save size={16}/> Simpan Koreksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;