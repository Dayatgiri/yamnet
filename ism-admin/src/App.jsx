import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Import Halaman & Komponen
import Login from './pages/Login';
import Register from './pages/Register';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Karyawan from './pages/Karyawan';
import ManajemenKantor from './pages/ManajemenKantor'; 
import Report from './pages/Report';
import ProfilAdmin from './pages/ProfilAdmin';
import ManajemenAdmin from './pages/ManajemenAdmin';
import TukarShiftAdmin from './pages/TukarShiftAdmin';
import Jabatan from './pages/Jabatan';
import KeamananApp from './pages/KeamananApp';

// Import Icons
import { 
  LayoutDashboard, Users, MapPin, 
  UserCircle, FileText, Shield, ArrowLeftRight,
  Briefcase, Lock 
} from 'lucide-react';

function App() {
  // --- STATE MANAGEMENT ---
  const [adminSession, setAdminSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRegisterPath, setIsRegisterPath] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    // 1. Cek Routing Sederhana
    if (window.location.pathname === '/register') {
      setIsRegisterPath(true);
    }

    // 2. Cek Sesi Admin di LocalStorage (Login Manual)
    const checkSession = () => {
      const savedAdmin = localStorage.getItem('admin_session');
      if (savedAdmin) {
        setAdminSession(JSON.parse(savedAdmin));
      }
      setLoading(false);
    };

    checkSession();

    // 3. Ambil Data Notifikasi Realtime
    fetchNotifCount();

    // Jalankan realtime listener untuk tabel tukar_shift
    const channel = supabase
      .channel('realtime_tukar_shift')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tukar_shift' }, 
        () => fetchNotifCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tukar_shift')
        .select('*', { count: 'exact', head: true })
        .eq('status_penerima', 'Accepted')
        .eq('status_admin', 'Pending');
      
      if (!error) setNotifCount(count || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // --- HANDLER LOGOUT ---
  const handleLogout = () => {
    if (window.confirm("Yakin ingin keluar ?")) {
      localStorage.removeItem('admin_session');
      setAdminSession(null);
      window.location.href = "/";
    }
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-600 animate-pulse">Menyiapkan Dashboard Majalengka...</p>
      </div>
    );
  }

  if (isRegisterPath) return <Register />;
  
  // Jika tidak ada data di localStorage, tampilkan halaman Login
  if (!adminSession) return <Login />;

  // --- MENU ITEMS ---
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'karyawan', label: 'Database Karyawan', icon: Users },
    { id: 'jabatan', label: 'Jabatan & Gaji', icon: Briefcase },
    { id: 'tukar_shift', label: 'Tukar Shift', icon: ArrowLeftRight, badge: notifCount },
    { id: 'manajemen_kantor', label: 'Kelola Kantor', icon: MapPin }, 
    { id: 'keamanan', label: 'Keamanan App', icon: Lock }, 
    { id: 'manajemen_admin', label: 'Otoritas Admin', icon: Shield },
    { id: 'report', label: 'Laporan Log', icon: FileText },
    { id: 'profil', label: 'Profil Admin', icon: UserCircle },
  ];

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Ringkasan Sistem';
      case 'karyawan': return 'Database Karyawan';
      case 'jabatan': return 'Struktur Jabatan & Gaji';
      case 'tukar_shift': return 'Approval Pertukaran Shift';
      case 'manajemen_kantor': return 'Manajemen Unit & Operasional';
      case 'keamanan': return 'Keamanan & Proteksi App';
      case 'manajemen_admin': return 'Otoritas Administrator';
      case 'report': return 'Laporan Log Presensi';
      case 'profil': return 'Pengaturan Profil';
      default: return 'Sipres Majalengka';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 text-left">
      {/* Sidebar Komponen */}
      <Sidebar 
        menuItems={menuItems} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Komponen */}
        <Header title={getHeaderTitle()} />
        
        {/* Area Konten Utama */}
        <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'karyawan' && <Karyawan />}
            {activeTab === 'jabatan' && <Jabatan />}
            {activeTab === 'tukar_shift' && <TukarShiftAdmin refreshNotif={fetchNotifCount} />} 
            {activeTab === 'manajemen_kantor' && <ManajemenKantor />} 
            {activeTab === 'keamanan' && <KeamananApp />} 
            {activeTab === 'manajemen_admin' && <ManajemenAdmin />}
            {activeTab === 'report' && <Report />}
            {activeTab === 'profil' && <ProfilAdmin />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;