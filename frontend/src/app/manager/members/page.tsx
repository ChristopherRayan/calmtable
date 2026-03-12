'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StaffMember } from '@/lib/types';
import toast from 'react-hot-toast';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';

const staffMemberSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required.').max(150, 'Name is too long.'),
  role: z.string().min(1, 'Role is required.'),
  email: z.string().trim().email('Please enter a valid email.').or(z.literal('')),
  phone: z.string().trim().max(30, 'Phone is too long.').or(z.literal('')),
  bio: z.string().trim().max(500, 'Bio is too long.').or(z.literal('')),
});

type StaffMemberForm = z.infer<typeof staffMemberSchema>;

export default function ManagerMembersPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  const roles = [
    { value: 'manager', label: 'Manager' },
    { value: 'chef', label: 'Chef' },
    { value: 'waiter', label: 'Waiter / Waitress' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'cleaner', label: 'Cleaning Staff' },
    { value: 'security', label: 'Security' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await api.get<StaffMember[]>('/staff/members/');
      setMembers(res.data);
    } catch (error) {
      toast.error('Failed to load members.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(member: StaffMember) {
    try {
      await api.patch(`/staff/members/${member.id}/`, { is_active: !member.is_active });
      setMembers(members.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m));
      toast.success(`Member ${!member.is_active ? 'activated' : 'deactivated'}.`);
    } catch (error) {
      toast.error('Operation failed.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
      await api.delete(`/staff/members/${id}/`);
      setMembers(members.filter(m => m.id !== id));
      toast.success('Member deleted.');
    } catch (error) {
      toast.error('Delete failed.');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    // Validate with Zod
    const validated = staffMemberSchema.safeParse(payload);
    if (!validated.error) {
      // Also validate required fields
      if (!validated.data.full_name || !validated.data.role) {
        toast.error('Name and role are required.');
        return;
      }
    }

    // Additional check for required fields
    const fullName = formData.get('full_name');
    const role = formData.get('role');

    if (!fullName || String(fullName).trim().length < 2) {
      toast.error('Full name is required and must be at least 2 characters.');
      return;
    }
    if (!role) {
      toast.error('Role is required.');
      return;
    }

    try {
      if (editingMember) {
        await api.patch(`/staff/members/${editingMember.id}/`, payload);
        toast.success('Member updated.');
      } else {
        await api.post('/staff/members/', payload);
        toast.success('Member added.');
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (error) {
      toast.error('Save failed. Please check all fields.');
    }
  }

  if (loading) return <div className="text-gray-400 dark:text-white/40">Loading team...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-gray-900 dark:text-white">Public Team Management</h2>
        <Button onClick={() => { setEditingMember(null); setIsModalOpen(true); }}>
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id} className={`border-gray-200 dark:border-white/10 ${!member.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-amber-500/20 bg-gray-100 dark:bg-white/5">
                {member.photo ? (
                  <img src={member.photo} alt={member.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-amber-500/40">
                    <i className="fas fa-user text-2xl"></i>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="truncate font-bold text-gray-900 dark:text-white">{member.full_name}</h3>
                <p className="text-xs text-amber-600 dark:text-amber-500">{member.role_display}</p>
                <p className="mt-1 truncate text-[10px] text-gray-500 dark:text-white/40">{member.email || 'No email'}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
              <button
                onClick={() => { setEditingMember(member); setIsModalOpen(true); }}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleActive(member)}
                className={`text-[10px] font-bold uppercase tracking-widest ${member.is_active ? 'text-rose-500/60 hover:text-rose-500' : 'text-emerald-500/60 hover:text-emerald-500'}`}
              >
                {member.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDelete(member.id)}
                className="ml-auto text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-rose-500"
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#140d09] p-6 shadow-2xl"
            >
              <h3 className="mb-6 font-heading text-xl text-gray-900 dark:text-white">
                {editingMember ? 'Edit Team Member' : 'Add Team Member'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Full Name</label>
                  <input
                    name="full_name"
                    defaultValue={editingMember?.full_name}
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Role</label>
                  <select
                    name="role"
                    defaultValue={editingMember?.role}
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                  >
                    {roles.map(r => <option key={r.value} value={r.value} className="bg-white dark:bg-[#140d09]">{r.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Email</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingMember?.email}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Phone</label>
                    <input
                      name="phone"
                      defaultValue={editingMember?.phone}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Bio</label>
                  <textarea
                    name="bio"
                    defaultValue={editingMember?.bio}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingMember ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
