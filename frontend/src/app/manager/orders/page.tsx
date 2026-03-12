'use client';

import { useEffect, useState } from 'react';
import { fetchOrders, fetchChefs, assignOrderToChef, downloadOrderReceipt } from '@/lib/services';
import { Order, AuthUser } from '@/lib/types';
import { Button } from '@/components/button';
import toast from 'react-hot-toast';

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [chefs, setChefs] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, chefsData] = await Promise.all([fetchOrders(), fetchChefs()]);
        setOrders(ordersData);
        setChefs(chefsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleAssign(orderId: number, chefId: number, chefName: string, orderNumber: string) {
    const confirmed = window.confirm(`Assign order ${orderNumber} to ${chefName}?`);
    if (!confirmed) return;

    try {
      const updatedOrder = await assignOrderToChef(orderId, chefId);
      setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
      toast.success('Order assigned successfully.');
    } catch (error) {
      toast.error('Failed to assign order.');
    }
  }

  async function handleDownload(orderNumber: string) {
    try {
      const blob = await downloadOrderReceipt(orderNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download receipt.');
    }
  }

  if (loading) return <div className="text-gray-400 dark:text-white/40">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#140d09] shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/2">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Order #</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">Chef</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {orders.map((order) => (
              <tr key={order.id} className="group hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500">{order.order_number}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{order.customer_name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">{order.customer_email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    order.status === 'assigned' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    className="bg-gray-50 dark:bg-[#0a0604] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-[10px] text-gray-700 dark:text-white/80 outline-none focus:border-amber-500/50"
                    value={order.assigned_chef || ''}
                    onChange={(e) => {
                      const newChefId = Number(e.target.value);
                      const chef = chefs.find(c => c.id === newChefId);
                      const chefName = chef ? `${chef.first_name} ${chef.last_name}` : 'Unassigned';
                      handleAssign(order.id, newChefId, chefName, order.order_number);
                    }}
                  >
                    <option value="">Unassigned</option>
                    {chefs.map(chef => (
                      <option key={chef.id} value={chef.id}>{chef.first_name} {chef.last_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDownload(order.order_number)}
                    className="text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white transition-colors text-xs"
                    title="Download Receipt"
                  >
                    <i className="fas fa-file-pdf"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
