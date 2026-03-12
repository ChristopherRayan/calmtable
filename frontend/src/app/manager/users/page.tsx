'use client';

import { useEffect, useState } from 'react';
import { fetchStaff, toggleStaffActive } from '@/lib/services';
import { AuthUser } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ManagerUsersPage() {
  const [staff, setStaff] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff().then(setStaff).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleToggle(userId: number) {
    try {
      const result = await toggleStaffActive(userId);
      setStaff(staff.map(s => s.id === userId ? { ...s, is_active: result.is_active } : s));
      toast.success(`Staff member ${result.is_active ? 'activated' : 'deactivated'}.`);
    } catch (error) {
      toast.error('Failed to toggle status.');
    }
  }

  if (loading) return <div className="text-white/40">Loading staff...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="p-6 rounded-3xl bg-[#140d09] border border-white/5 shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-[#5C4033] flex items-center justify-center text-xl font-bold text-white mb-4">
              {member.first_name[0]}{member.last_name?.[0]}
            </div>
            <h3 className="text-sm font-bold text-white">{member.first_name} {member.last_name}</h3>
            <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mt-1">{member.role}</p>
            <p className="text-xs text-white/40 mt-2">{member.email}</p>
            
            <div className="mt-6 w-full pt-6 border-t border-white/5 flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${member.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => handleToggle(member.id)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  member.is_active 
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' 
                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                }`}
              >
                {member.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
