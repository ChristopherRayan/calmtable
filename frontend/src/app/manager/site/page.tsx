'use client';

import Link from 'next/link';

export default function ManagerSitePage() {
  const sections = [
    { title: 'Homepage Sections', desc: 'Edit hero text, story, and mission', icon: 'fas fa-home' },
    { title: 'Menu Categories', desc: 'Manage food and drink categories', icon: 'fas fa-utensils' },
    { title: 'Restaurant Tables', desc: 'Configure seating and capacity', icon: 'fas fa-chair' },
    { title: 'Bookings & Reservations', desc: 'Manage visitor schedules', icon: 'fas fa-calendar-check' },
  ];

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-3xl bg-amber-600/10 border border-amber-600/20 max-w-2xl">
        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-2">Notice</h3>
        <p className="text-sm text-white/70 leading-relaxed">
          Site content management is currently handled through our core administrative engine.
          Click the link below to access the operational settings.
        </p>
        <Link 
          href="/admin" 
          className="inline-block mt-6 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all"
        >
          Open Operational Admin
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {sections.map((section) => (
          <div key={section.title} className="p-6 rounded-2xl bg-[#140d09] border border-white/5 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                <i className={section.icon}></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{section.title}</h4>
                <p className="text-[10px] text-white/40 mt-1">{section.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
