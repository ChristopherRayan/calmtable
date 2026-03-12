'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Reservation } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ManagerBookingsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We don't have a dedicated fetchManyReservations for staff yet in services.ts, 
    // but the backend admin and existing endpoints can be used or we use the generic list.
    // For now I'll use a direct api call to the reservations endpoint which staff can access.
    api.get<Reservation[]>('/reservations/').then(res => setReservations(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleStatus(id: number, status: string) {
    try {
      await api.patch(`/reservations/${id}/`, { status });
      setReservations(reservations.map(r => r.id === id ? { ...r, status: status as any } : r));
      toast.success(`Reservation ${status}.`);
    } catch (error) {
      toast.error('Failed to update status.');
    }
  }

  if (loading) return <div className="text-gray-400 dark:text-white/40">Loading reservations...</div>;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#140d09] shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/2">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Code</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Guest</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Date & Time</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Guests</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {reservations.map((res) => (
              <tr key={res.id} className="group hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase">{res.confirmation_code}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{res.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">{res.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-700 dark:text-white/80">{new Date(res.date).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">{res.time_slot}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-700 dark:text-white/80">{res.party_size} People</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${res.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                      res.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                    }`}>
                    {res.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {res.status !== 'confirmed' && (
                    <button onClick={() => handleStatus(res.id!, 'confirmed')} className="text-emerald-500 hover:text-emerald-400 text-xs">
                      <i className="fas fa-check"></i>
                    </button>
                  )}
                  {res.status !== 'cancelled' && (
                    <button onClick={() => handleStatus(res.id!, 'cancelled')} className="text-rose-500 hover:text-rose-400 text-xs">
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
