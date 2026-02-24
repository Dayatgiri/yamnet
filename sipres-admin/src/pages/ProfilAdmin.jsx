import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, Camera, Save, ShieldCheck, 
  KeyRound, Loader2, MapPin, Phone 
} from 'lucide-react';

const ProfilAdmin = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Ambil data detail dari tabel public.profiles
        let { data, error } = await supabase
          .from('profiles')
          .select(`full_name, avatar_url, phone_number, address`)
          .eq('id', user.id)
          .single();

        if (data) {
          setAvatarUrl(data.avatar_url);
          setFormData(prev => ({
            ...prev,
            email: user.email,
            fullName: data.full_name || '',
            phoneNumber: data.phone_number || '',
            address: data.address || ''
          }));
        }
      }
    } catch (error) {
      console.error("Error load profil:", error.message);
    }
  }

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadAvatar = async (event) => {
    try {
      if (!user?.id) return alert("Sesi belum siap.");
      const file = event.target.files[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `admin_avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

      setAvatarUrl(publicUrl);
      alert("Foto profil berhasil diperbarui!");
    } catch (error) {
      alert("Gagal mengunggah foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

const handleUpdateProfile = async (e) => {
  e.preventDefault();
  
  // PERBAIKAN: Cek apakah user ada sebelum lanjut
  if (!user?.id) {
    alert("Gagal menyimpan: Sesi pengguna tidak ditemukan. Silakan refresh halaman.");
    return;
  }

  setLoading(true);
  try {
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ 
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        address: formData.address,
        updated_at: new Date()
      })
      .eq('id', user.id); // Sekarang aman karena sudah dicek di atas

    if (dbError) throw dbError;
    alert("Profil berhasil diperbarui!");
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    setLoading(false);
  }
};

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) return alert("Password tidak cocok!");
    if (formData.newPassword.length < 6) return alert("Minimal 6 karakter!");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;
      alert("Password berhasil diperbarui!");
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border-4 border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-10">
          <div className="relative">
            <div className="w-44 h-44 bg-slate-800 rounded-[2.5rem] overflow-hidden border-4 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.5)] flex items-center justify-center relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-20 h-20 text-slate-600" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            
            <button 
              type="button"
              onClick={handleTriggerUpload}
              className="absolute -bottom-2 -right-2 p-4 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-500 transition-all border-4 border-slate-900 z-50 active:scale-90"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={uploadAvatar} 
            />
          </div>

          <div className="text-center md:text-left space-y-4 pt-4">
            <h2 className="text-4xl font-black tracking-tight">{formData.fullName || 'Administrator'}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-5 py-2 bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                Super Admin System
              </span>
              <span className="px-5 py-2 bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-700">
                <Mail className="w-3 h-3 inline mr-2" /> {formData.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DATA PROFIL - BORDER BIRU TEBAL */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-xl border-4 border-blue-600 space-y-8">
          <h4 className="font-black text-2xl text-slate-800 uppercase border-b-4 border-blue-600 pb-4">Update Data Pengelola</h4>
          
          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="md:col-span-2 text-left">
              <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-2 block text-left">Nama Lengkap Admin</label>
              <input 
                type="text" 
                className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-blue-600 focus:bg-white outline-none" 
                value={formData.fullName} 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-2 block text-left">WhatsApp</label>
              <input 
                type="text" 
                className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-blue-600 outline-none" 
                value={formData.phoneNumber} 
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-2 block text-left">Alamat</label>
              <input 
                type="text" 
                className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-blue-600 outline-none" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2 pt-4">
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-900 shadow-xl transition-all">
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

        {/* KEAMANAN - BORDER MERAH TEBAL */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-4 border-rose-600 space-y-8">
          <h4 className="font-black text-2xl text-slate-800 uppercase border-b-4 border-rose-600 pb-4 text-left">Keamanan</h4>
          <form onSubmit={handleChangePassword} className="space-y-6 text-left">
            <div className="text-left">
              <label className="text-[11px] font-black text-rose-600 uppercase tracking-widest ml-1 mb-2 block text-left">Password Baru</label>
              <input 
                type="password" 
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-2xl px-6 py-4 font-bold focus:border-rose-600 outline-none" 
                value={formData.newPassword}
                onChange={e => setFormData({...formData, newPassword: e.target.value})}
              />
            </div>
            <div className="text-left">
              <label className="text-[11px] font-black text-rose-600 uppercase tracking-widest ml-1 mb-2 block text-left">Ulangi Password</label>
              <input 
                type="password" 
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-2xl px-6 py-4 font-bold focus:border-rose-600 outline-none" 
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-900 shadow-xl transition-all">
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilAdmin;