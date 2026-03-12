'use client';

import { useEffect, useState } from 'react';
import { fetchAnalytics } from '@/lib/services';
import { AnalyticsPayload } from '@/lib/types';
import { motion } from 'framer-motion';

export default function ManagerDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    fetchAnalytics().then(setAnalytics).catch(console.error);
  }, []);

  if (!analytics) return <div className="text-white/40">Loading analytics...</div>;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Today's Reservations", value: analytics.todays_reservations, icon: "fas fa-calendar", color: "text-blue-400" },
          { label: "Total Revenue", value: `MK ${Number(analytics.total_revenue).toLocaleString()}`, icon: "fas fa-money-bill-wave", color: "text-emerald-400" },
          { label: "Top Dish", value: analytics.top_dishes[0]?.name || 'N/A', icon: "fas fa-star", color: "text-amber-400" },
          { label: "Active Orders", value: analytics.todays_reservations > 0 ? 'High' : 'Normal', icon: "fas fa-fire", color: "text-rose-400" }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-[#140d09] border border-white/5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{stat.label}</span>
              <i className={`${stat.icon} ${stat.color}`}></i>
            </div>
            <p className="text-2xl font-heading font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Dishes */}
        <div className="p-8 rounded-3xl bg-[#140d09] border border-white/5 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Popular Menu Items</h3>
          <div className="space-y-4">
            {analytics.top_dishes.map((dish, idx) => (
              <div key={dish.menu_item_id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <span className="text-xs font-bold text-white/20">0{idx + 1}</span>
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors">{dish.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500" 
                      style={{ width: `${(dish.quantity / analytics.top_dishes[0].quantity) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white/40">{dish.quantity} sold</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Mini-List */}
        <div className="p-8 rounded-3xl bg-[#140d09] border border-white/5 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Reservation Volume</h3>
          <div className="h-48 flex items-end justify-between px-2 gap-1">
             {analytics.reservation_volume.slice(-14).map((pt, i) => (
               <div key={pt.date} className="flex-1 flex flex-col items-center group">
                  <div 
                    className="w-full bg-amber-900/40 group-hover:bg-amber-600 transition-colors rounded-t-sm"
                    style={{ height: `${(pt.count / (Math.max(...analytics.reservation_volume.map(p => p.count)) || 1)) * 100}%` }}
                  />
                  <div className="mt-2 text-[8px] text-white/20 uppercase tracking-tighter transform -rotate-45">{new Date(pt.date).toLocaleDateString(undefined, { weekday: 'short' })}</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
