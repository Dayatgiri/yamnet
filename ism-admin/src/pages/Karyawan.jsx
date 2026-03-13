import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Camera, Pencil, Trash2, Plus, X, 
  Save, Lock, Loader2, Briefcase, Hash, 
  Phone, Mail, Search, AlertCircle, Clock
} from 'lucide-react';

const Karyawan = () => {
  // --- STATE MANAGEMENT ---
  const [karyawan, setKaryawan] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [jabatans, setJabatans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    nama_lengkap: '', 
    nik: '',
    jabatan_id: '',
    departemen: '',
    nomor_wa: '',
    email: '',
    alamat: '',
    password: '123456',
    shift_id: '' 
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // --- SIDE EFFECTS ---
  useEffect(() => {
    fetchKaryawan();
    fetchShifts();
    fetchJabatans();
  }, []);

  // --- DATABASE ACTIONS ---
  async function fetchShifts() {
    const { data } = await supabase.from('master_shift').select('*').order('nama_shift');
    if (data) setShifts(data);
  }

  async function fetchJabatans() {
    const { data } = await supabase.from('jabatan').select('*').order('nama_jabatan');
    if (data) setJabatans(data);
  }

  async function fetchKaryawan() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('karyawan')
        .select('*, master_shift(nama_shift, jam_masuk, jam_pulang), jabatan(nama_jabatan, departemen)')
        .or('role.eq.USER,role.eq.user,role.is.null') 
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setKaryawan(data || []); 
    } catch (err) {
      console.error("Gagal memuat data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const getAvatarUrl = (userId) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(`face_${userId}.jpg`);
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const openEditModal = (k) => {
    setEditingId(k.id);
    setFormData({
      nama_lengkap: k.nama_lengkap || '',
      nik: k.nik || '',
      jabatan_id: k.jabatan_id || '', 
      departemen: k.departemen || '',
      nomor_wa: k.nomor_wa || '',
      email: k.email || '',
      alamat: k.alamat || '',
      password: k.password || '123456',
      shift_id: k.shift_id || '' 
    });
    setPreviewUrl(getAvatarUrl(k.id));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_lengkap) return alert("Nama Lengkap wajib diisi!");
    
    setLoading(true);
    try {
      // Payload murni hanya kolom tabel karyawan
      const payload = { 
        nama_lengkap: formData.nama_lengkap,
        nik: formData.nik,
        jabatan_id: formData.jabatan_id || null,
        departemen: formData.departemen,
        nomor_wa: formData.nomor_wa,
        email: formData.email,
        alamat: formData.alamat,
        password: formData.password || '123456',
        shift_id: formData.shift_id || null,
        role: 'USER'
      };

      let userId = editingId;

      if (editingId) {
        const { error } = await supabase.from('karyawan').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('karyawan').insert([payload]).select();
        if (error) throw error;
        userId = data[0].id;
      }

      if (selectedFile && userId) {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`face_${userId}.jpg`, selectedFile, { upsert: true });
        if (uploadError) throw uploadError;
      }

      alert("Data Karyawan Berhasil Disimpan!");
      closeModal();
      fetchKaryawan();
    } catch (err) {
      alert("Terjadi Kesalahan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

const handleDelete = async (id, nama) => {
    // 1. Konfirmasi awal
    if (window.confirm(`Hapus data dan foto biometrik ${nama}?`)) {
      try {
        setLoading(true);
        
        // 2. Eksekusi hapus di tabel 'karyawan'
        const { error } = await supabase
          .from('karyawan')
          .delete()
          .eq('id', id);

        if (error) {
          // Cek jika error disebabkan oleh Foreign Key (Kode Error Postgrest: 23503)
          if (error.code === '23503') {
            alert(
              `TIDAK DAPAT MENGHAPUS:\n\n` +
              `Data "${nama}" masih terhubung dengan riwayat Presensi atau Absensi.\n\n` +
              `Silakan hapus terlebih dahulu data absensi karyawan ini di menu Laporan/Presensi sebelum menghapus profilnya.`
            );
            return; // Berhenti di sini
          }
          throw error;
        }

        // 3. Jika berhasil hapus data, baru hapus foto di storage
        // Gunakan try-catch terpisah agar jika foto tidak ada, data tetap terhapus
        try {
          await supabase.storage.from('avatars').remove([`face_${id}.jpg`]);
        } catch (storageErr) {
          console.error("Foto tidak ditemukan di storage, tapi data karyawan berhasil dihapus.");
        }

        alert(`Data ${nama} berhasil dihapus.`);
        fetchKaryawan();

      } catch (err) {
        alert("Terjadi kesalahan sistem: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
      nama_lengkap: '', nik: '', jabatan_id: '', departemen: '', 
      nomor_wa: '', email: '', alamat: '', password: '123456', shift_id: '' 
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 pb-24 text-left font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 gap-6">
        <div className="text-left">
          <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Database Karyawan</h3>
          <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-1 italic">Manajemen Profil, Akses & Shift</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama / nik..."
              className="pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-blue-600 w-full"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border-4 border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="px-10 py-7">Profil Karyawan</th>
                <th className="px-10 py-7">Shift & Posisi</th>
                <th className="px-10 py-7">Kontak & Akses</th>
                <th className="px-10 py-7 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y-8 divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" /></td></tr>
              ) : karyawan.length === 0 ? (
                <tr><td colSpan="4" className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest"><AlertCircle className="mx-auto mb-2 opacity-20" size={48} />Belum ada data</td></tr>
              ) : karyawan.filter(val => val.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase())).map((k) => (
                <tr key={k.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-6">
                      <img 
                        src={getAvatarUrl(k.id)} 
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${k.nama_lengkap}&background=0284c7&color=fff&bold=true`; }}
                        className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-lg" 
                        alt="Avatar"
                      />
                      <div className="text-left">
                        <p className="font-black text-slate-800 uppercase text-sm leading-tight">{k.nama_lengkap}</p>
                        <p className="text-[10px] font-black text-slate-400 mt-1">NIK: {k.nik || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-left">
                    <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase mb-2">
                      <Clock size={10} className="mr-1"/> {k.master_shift?.nama_shift || 'BELUM SET SHIFT'}
                    </div>
                    {k.master_shift && (
                      <p className="text-[9px] font-black text-slate-400 -mt-1 mb-2 tracking-tighter italic">
                        ⏰ {k.master_shift.jam_masuk?.substring(0,5)} - {k.master_shift.jam_pulang?.substring(0,5)}
                      </p>
                    )}
                    <p className="font-black text-slate-700 text-xs uppercase">{k.jabatan?.nama_jabatan || 'STAFF'}</p>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{k.jabatan?.departemen || 'UMUM'}</p>
                  </td>
                  <td className="px-10 py-6 text-left">
                    <p className="text-xs font-bold text-slate-600">{k.nomor_wa || k.email || '-'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Lock size={10} className="text-slate-300" />
                      <p className="text-[10px] font-black text-slate-400 tracking-tighter">PASS: {k.password}</p>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex justify-center space-x-3">
                      <button onClick={() => openEditModal(k)} className="p-4 bg-slate-50 text-slate-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-90"><Pencil size={18} /></button>
                      <button onClick={() => handleDelete(k.id, k.nama_lengkap)} className="p-4 bg-slate-50 text-slate-300 hover:bg-rose-600 hover:text-white rounded-2xl transition-all active:scale-90"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORMULIR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl p-10 border-4 border-blue-600 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-10">
              <div className="text-left">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{editingId ? 'Perbarui Profil' : 'Karyawan Baru'}</h3>
                <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest italic">Input Data Master Perusahaan</p>
              </div>
              <button onClick={closeModal} className="text-slate-300 hover:text-rose-600 transition-colors"><X size={36} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-10 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <img src={previewUrl || "https://ui-avatars.com/api/?name=User&background=f8fafc&color=cbd5e1"} className="w-52 h-52 rounded-[3.5rem] object-cover border-8 border-slate-50 shadow-2xl group-hover:border-blue-500 transition-all" alt="Preview"/>
                    <label className="absolute -bottom-2 -right-2 bg-blue-600 p-5 rounded-3xl text-white shadow-2xl cursor-pointer hover:bg-slate-900 transition-all active:scale-90">
                      <Camera size={24} /><input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Biometrik Wajah</p>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-3 flex items-center gap-2"><User size={12}/> Nama Lengkap *</label>
                    <input required className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none focus:border-blue-600" value={formData.nama_lengkap} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 flex items-center gap-2"><Hash size={12}/> NIK (No. Induk)</label>
                    <input className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none focus:border-blue-600" value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-3 flex items-center gap-2"><Clock size={12}/> Penempatan Shift Kerja</label>
                    <select 
                      required
                      className="w-full px-7 py-5 bg-emerald-50 border-2 border-emerald-100 rounded-3xl font-bold outline-none focus:border-emerald-600 text-slate-800"
                      value={formData.shift_id} 
                      onChange={e => setFormData({...formData, shift_id: e.target.value})}
                    >
                      <option value="">-- Pilih Jam Kerja --</option>
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.nama_shift} ({s.jam_masuk?.substring(0,5)} - {s.jam_pulang?.substring(0,5)})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-3 flex items-center gap-2"><Briefcase size={12}/> Jabatan & Departemen</label>
                    <select 
                      required
                      className="w-full px-7 py-5 bg-indigo-50 border-2 border-indigo-100 rounded-3xl font-bold outline-none focus:border-indigo-600 text-slate-800"
                      value={formData.jabatan_id} 
                      onChange={e => {
                        const sel = jabatans.find(j => j.id.toString() === e.target.value);
                        setFormData({
                          ...formData, 
                          jabatan_id: e.target.value,
                          departemen: sel ? sel.departemen : ''
                        });
                      }}
                    >
                      <option value="">-- Pilih Jabatan --</option>
                      {jabatans.map(j => (
                        <option key={j.id} value={j.id}>{j.nama_jabatan} ({j.departemen})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 flex items-center gap-2"><Phone size={12}/> No. WhatsApp</label>
                  <input className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none focus:border-blue-600" value={formData.nomor_wa} onChange={e => setFormData({...formData, nomor_wa: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 flex items-center gap-2"><Mail size={12}/> Email Pribadi</label>
                  <input type="email" className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none focus:border-blue-600" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-3 flex items-center gap-2"><Lock size={12}/> Password Login *</label>
                  <input className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-200 rounded-3xl font-black outline-none focus:border-blue-600 text-blue-600" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-7 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-slate-900 transition-all flex items-center justify-center disabled:bg-slate-200">
                {loading ? <Loader2 className="animate-spin mr-3" /> : <><Save className="mr-3" /> Simpan Database Karyawan</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Karyawan;