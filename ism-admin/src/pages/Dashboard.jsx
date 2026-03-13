import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, Calendar, Clock, User, 
  TrendingUp, BarChart3, PieChart as PieIcon,
  MapPin, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalKaryawan: 0, hadirHariIni: 0, terlambat: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Profil Admin
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
      }

      // 2. Total Karyawan dari tabel 'karyawan'
      const { count: totalKaryawan } = await supabase
        .from('karyawan')
        .select('*', { count: 'exact', head: true });

      // --- LOGIKA WAKTU WIB (GMT+7) ---
      const now = new Date();
      // Awal hari ini jam 00:00:00 WIB
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      // Akhir hari ini jam 23:59:59 WIB
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      // Batas Terlambat jam 08:00:00 WIB
      const lateLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0).toISOString();

      // 3. Hitung Hadir Hari Ini (Gunakan 'waktu_absen' & 'Masuk')
      const { count: hadirHariIni } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('jenis_absen', 'Masuk') // Sesuai data: Masuk
        .gte('waktu_absen', startOfDay) // Sesuai kolom: waktu_absen
        .lte('waktu_absen', endOfDay);

      // 4. Hitung Terlambat (> 08:00 WIB)
      const { count: terlambat } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('jenis_absen', 'Masuk')
        .gt('waktu_absen', lateLimit)
        .lte('waktu_absen', endOfDay);

      setStats({
        totalKaryawan: totalKaryawan || 0,
        hadirHariIni: hadirHariIni || 0,
        terlambat: terlambat || 0
      });

      // 5. Tren Mingguan Riil
      const weekly = await fetchWeeklyData();
      setChartData(weekly);

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeeklyData() {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum'];
    const results = [];
    const now = new Date();
    
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      const dayDiff = now.getDay() === 0 ? 6 : now.getDay() - 1; 
      d.setDate(now.getDate() - dayDiff + i);
      
      const sDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
      const eDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();

      const { count } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .eq('jenis_absen', 'Masuk')
        .gte('waktu_absen', sDate)
        .lte('waktu_absen', eDate);
      
      results.push({ name: days[i], hadir: count || 0 });
    }
    return results;
  }

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 p-4">
      
      {/* HEADER: FOTO & NAMA ADMIN */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white border-4 border-blue-600 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-left">
        <div className="flex items-center gap-8 z-10">
          <div className="w-24 h-24 rounded-[2rem] border-4 border-blue-500 overflow-hidden bg-slate-800 shadow-2xl transition-transform hover:scale-105">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-700"><User size={40} className="text-slate-500"/></div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">
              {profile?.full_name || 'Administrator'}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Superadmin</span>
              <span className="text-slate-400 text-xs font-bold flex items-center italic tracking-wider"><MapPin size={14} className="mr-1 text-blue-500"/> GMT+7 | Majalengka</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2rem] border-2 border-white/20 z-10 min-w-[220px] text-center">
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mb-1">Status Sistem</p>
          <p className="text-2xl font-black tracking-tighter uppercase">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
      </div>

      {/* STATS: DATA RIIL DATABASE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <StatCard label="Total Karyawan" value={stats.totalKaryawan} icon={<Users/>} color="text-blue-600" borderColor="border-blue-600" bgColor="bg-blue-50" />
        <StatCard label="Hadir (Masuk)" value={stats.hadirHariIni} icon={<Calendar/>} color="text-emerald-600" borderColor="border-emerald-500" bgColor="bg-emerald-50" />
        <StatCard label="Terlambat (>08:00)" value={stats.terlambat} icon={<Clock/>} color="text-rose-600" borderColor="border-rose-500" bgColor="bg-rose-50" />
      </div>

      {/* INFOGRAFIS: CHART RIIL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border-4 border-slate-100 transition-all hover:border-blue-200">
          <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter flex items-center mb-10 text-left">
            <BarChart3 className="mr-3 text-blue-600" /> Analisis Kehadiran Mingguan
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold', fontSize: 12}} />
                <YAxis hide domain={[0, stats.totalKaryawan + 5]} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="hadir" fill="#2563eb" radius={[12, 12, 12, 12]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-xl border-4 border-slate-100 flex flex-col items-center">
          <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter flex items-center mb-10 self-start">
            <PieIcon className="mr-3 text-emerald-600" /> Rasio Absensi Hari Ini
          </h3>
          <div className="h-80 w-full flex flex-col md:flex-row items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hadir', value: stats.hadirHariIni },
                    { name: 'Belum Absen', value: Math.max(0, stats.totalKaryawan - stats.hadirHariIni) },
                  ]}
                  innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value"
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#f1f5f9" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full md:w-48 space-y-4 text-left">
               <div className="p-5 bg-blue-50 rounded-[1.5rem] border-2 border-blue-200">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-widest">Hadir</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.hadirHariIni}</p>
               </div>
               <div className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Belum Absen</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tighter">{Math.max(0, stats.totalKaryawan - stats.hadirHariIni)}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, borderColor, bgColor }) => (
  <div className={`bg-white p-10 rounded-[3rem] border-4 ${borderColor} shadow-2xl flex items-center justify-between transition-transform hover:-translate-y-1`}>
    <div className="text-left">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h2 className={`text-5xl font-black ${color} tracking-tighter`}>{value}</h2>
    </div>
    <div className={`w-16 h-16 ${bgColor} ${color} rounded-2xl flex items-center justify-center shadow-inner`}>
      {React.cloneElement(icon, { size: 32 })}
    </div>
  </div>
);

export default Dashboard;