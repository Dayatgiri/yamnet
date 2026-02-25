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
import Jabatan from './pages/Jabatan'; // IMPORT HALAMAN JABATAN BARU

// Import Icons
import { 
  LayoutDashboard, Users, MapPin, 
  UserCircle, FileText, Shield, ArrowLeftRight,
  Briefcase // Icon untuk Jabatan
} from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRegisterPath, setIsRegisterPath] = useState(false);
  
  // State untuk Notifikasi
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (window.location.pathname === '/register') {
      setIsRegisterPath(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchNotifCount();

    const channel = supabase
      .channel('realtime_tukar_shift')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tukar_shift' }, 
        () => fetchNotifCount()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifCount = async () => {
    const { count, error } = await supabase
      .from('tukar_shift')
      .select('*', { count: 'exact', head: true })
      .eq('status_penerima', 'Accepted')
      .eq('status_admin', 'Pending');
    
    if (!error) setNotifCount(count || 0);
  };

  if (isRegisterPath) return <Register />;
  if (!session) return <Login />;

  // --- INTEGRASI MENU JABATAN ---
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'karyawan', label: 'Database Karyawan', icon: Users },
    { id: 'jabatan', label: 'Jabatan & Gaji', icon: Briefcase }, // MENU BARU
    { id: 'tukar_shift', label: 'Tukar Shift', icon: ArrowLeftRight, badge: notifCount },
    { id: 'manajemen_kantor', label: 'Kelola Kantor', icon: MapPin }, 
    { id: 'manajemen_admin', label: 'Otoritas Admin', icon: Shield },
    { id: 'report', label: 'Laporan Log', icon: FileText },
    { id: 'profil', label: 'Profil Admin', icon: UserCircle },
  ];

  const handleLogout = async () => {
    if (window.confirm("Yakin ingin keluar dari sistem?")) {
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Ringkasan Sistem';
      case 'karyawan': return 'Database Karyawan';
      case 'jabatan': return 'Struktur Jabatan & Gaji'; // TITLE BARU
      case 'tukar_shift': return 'Approval Pertukaran Shift';
      case 'manajemen_kantor': return 'Manajemen Unit & Operasional';
      case 'manajemen_admin': return 'Otoritas Administrator';
      case 'report': return 'Laporan Log Presensi';
      case 'profil': return 'Pengaturan Profil';
      default: return 'Sipres Wonogiri';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 text-left">
      <Sidebar 
        menuItems={menuItems} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getHeaderTitle()} />
        
        <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'karyawan' && <Karyawan />}
            {activeTab === 'jabatan' && <Jabatan />} {/* RENDER HALAMAN JABATAN */}
            {activeTab === 'tukar_shift' && <TukarShiftAdmin refreshNotif={fetchNotifCount} />} 
            {activeTab === 'manajemen_kantor' && <ManajemenKantor />} 
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