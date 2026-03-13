import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldCheck, ShieldAlert, Smartphone, HardDrive, MapPin, RefreshCw } from 'lucide-react';

const KeamananApp = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('id', { ascending: true });
    
    if (!error) setSettings(data);
    setLoading(false);
  };

const handleToggle = async (id, currentStatus) => {
    try {
      // Optimistic Update (Opsional: agar UI terasa instan)
      const { data, error } = await supabase
        .from('app_settings')
        .update({ 
          is_active: !currentStatus, 
          // Coba hapus updated_at jika error berlanjut, 
          // karena Supabase bisa mengisinya otomatis via trigger
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select(); // Tambahkan select() untuk memastikan data kembali

      if (error) {
        console.error("Supabase Error:", error);
        alert(`Gagal: ${error.message}`);
      } else {
        console.log("Update Berhasil:", data);
        // Langsung update state lokal agar cepat tanpa fetch ulang jika perlu
        setSettings(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      }
    } catch (err) {
      console.error("Exception:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Kontrol Keamanan Aplikasi</h2>
          <p className="text-slate-500 text-sm font-medium">Atur kebijakan proteksi perangkat untuk aplikasi Android secara real-time.</p>
        </div>
        <button onClick={fetchSettings} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settings.map((item) => (
          <div key={item.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="space-y-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {item.key === 'security_root' && <HardDrive size={24} />}
                {item.key === 'security_dev_mode' && <Smartphone size={24} />}
                {item.key === 'security_fake_gps' && <MapPin size={24} />}
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase text-lg">{item.label}</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed mt-1 italic">{item.description}</p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between p-2 bg-slate-50 rounded-2xl">
              <span className={`text-[10px] font-black uppercase ml-4 ${item.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                {item.is_active ? 'STATUS: AKTIF' : 'STATUS: NON-AKTIF'}
              </span>
              <button 
                onClick={() => handleToggle(item.id, item.is_active)}
                className={`relative inline-flex h-10 w-20 items-center rounded-xl transition-all duration-300 ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-lg bg-white transition-all duration-300 ${item.is_active ? 'translate-x-12' : 'translate-x-2'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeamananApp;