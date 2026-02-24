import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Check, X, Clock, ArrowRightLeft } from 'lucide-react';

const TukarShiftAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tukar_shift')
      .select(`
        *,
        pengaju:karyawan!tukar_shift_pengaju_id_fkey(nama_lengkap),
        penerima:karyawan!tukar_shift_penerima_id_fkey(nama_lengkap)
      `)
      .eq('status_penerima', 'Accepted')
      .eq('status_admin', 'Pending')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setRequests(data);
    setLoading(false);
  };

  const handleAction = async (id, status) => {
    const confirmMsg = status === 'Approved' ? "Setujui pertukaran ini?" : "Tolak pertukaran ini?";
    if (!window.confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('tukar_shift')
      .update({ status_admin: status })
      .eq('id', id);

    if (error) alert("Gagal memperbarui status");
    else fetchRequests();
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Memproses data...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total Menunggu Approval</p>
          <h3 className="text-2xl font-bold text-slate-800">{requests.length} Permintaan</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Detail Pertukaran</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Alasan</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status Rekan</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Aksi Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center">
                    <Clock size={40} className="mb-2 opacity-20" />
                    <p>Semua permintaan sudah diproses.</p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <ArrowRightLeft size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{req.tanggal_tukar}</div>
                        <div className="text-xs text-slate-500">
                          {req.pengaju?.nama_lengkap} ➔ {req.penerima?.nama_lengkap}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 max-w-xs truncate" title={req.keterangan}>
                      {req.keterangan}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                      Disetujui Rekan
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleAction(req.id, 'Approved')}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-shadow shadow-sm text-sm"
                      >
                        <Check size={14} /> <span>Setujui</span>
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'Rejected')}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-white text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors text-sm"
                      >
                        <X size={14} /> <span>Tolak</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TukarShiftAdmin;