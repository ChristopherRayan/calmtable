'use client';

import { useEffect, useState } from 'react';
import { fetchTables, createTable, updateTable, deleteTable } from '@/lib/services';
import { Table } from '@/lib/types';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ManagerTablesPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    useEffect(() => {
        fetchTables().then(setTables).catch(console.error).finally(() => setLoading(false));
    }, []);

    async function handleToggleActive(table: Table) {
        try {
            await updateTable(table.id, { is_active: !table.is_active });
            setTables(tables.map(t => t.id === table.id ? { ...t, is_active: !t.is_active } : t));
            toast.success(`Table ${table.is_active ? 'deactivated' : 'activated'}.`);
        } catch (error) {
            toast.error('Operation failed.');
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this table?')) return;
        try {
            await deleteTable(id);
            setTables(tables.filter(t => t.id !== id));
            toast.success('Table deleted.');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Delete failed.');
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            table_number: String(formData.get('table_number')),
            capacity: Number(formData.get('capacity')),
            description: String(formData.get('description') || ''),
        };

        if (!data.table_number || !data.capacity) {
            toast.error('Table number and capacity are required.');
            return;
        }

        try {
            if (editingTable) {
                await updateTable(editingTable.id, data);
                toast.success('Table updated.');
            } else {
                await createTable(data);
                toast.success('Table created.');
            }
            setIsModalOpen(false);
            fetchTables().then(setTables);
        } catch (error) {
            toast.error('Save failed.');
        }
    }

    if (loading) return <div className="text-gray-400 dark:text-white/40">Loading tables...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl text-gray-900 dark:text-white">Table Management</h2>
                <Button onClick={() => { setEditingTable(null); setIsModalOpen(true); }}>
                    Add Table
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map((table) => (
                    <Card key={table.id} className={`border-gray-200 dark:border-white/10 ${!table.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-500">Table {table.table_number}</h3>
                                <p className="text-sm text-gray-600 dark:text-white/60">{table.seats} seats</p>
                                {table.description && (
                                    <p className="text-xs text-gray-500 dark:text-white/40 mt-1">{table.description}</p>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${table.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/10 text-white/40'
                                }`}>
                                {table.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-2">
                            <button
                                onClick={() => { setEditingTable(table); setIsModalOpen(true); }}
                                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleToggleActive(table)}
                                className={`text-[10px] font-bold uppercase tracking-widest ${table.is_active ? 'text-rose-500/60 hover:text-rose-500' : 'text-emerald-500/60 hover:text-emerald-500'}`}
                            >
                                {table.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                                onClick={() => handleDelete(table.id)}
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
                                {editingTable ? 'Edit Table' : 'Add New Table'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Table Number</label>
                                        <input
                                            name="table_number"
                                            defaultValue={editingTable?.table_number}
                                            required
                                            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Capacity</label>
                                        <input
                                            name="capacity"
                                            type="number"
                                            min="1"
                                            max="20"
                                            defaultValue={editingTable?.seats || 4}
                                            required
                                            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-white/40">Description (optional)</label>
                                    <input
                                        name="description"
                                        defaultValue={editingTable?.description}
                                        placeholder="e.g., Window Seat, VIP Corner"
                                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-amber-500/50 outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        {editingTable ? 'Update' : 'Create'}
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
