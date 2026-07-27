import React from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Users } from 'lucide-react';

export function DemographicsTab({ realData }) {
  if (realData.demographics.gender.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-3xl shadow-sm px-6">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Users size={40} className="text-gray-200" />
        </div>
        <h3 className="text-xl font-bold text-[#0A0A0A]">No Demographics Data Yet</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">Google is processing your audience data. This usually takes 2-3 days for new connections.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Gender</h3>
          <div className="h-[250px] flex flex-col items-center justify-center">
              <div className="w-40 h-40 rounded-full border-[15px] border-[#F472B6] border-l-[#818CF8] rotate-45 mb-8" />
              <div className="flex gap-4">
                  {realData.demographics.gender.map(g => (
                    <div key={g.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{g.name} {g.value}%</span>
                    </div>
                  ))}
              </div>
          </div>
        </div>

        {/* Age Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Age</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={realData.demographics.age}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 600 }} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 12, border: "none" }} />
              <Bar dataKey="value" fill="#818CF8" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Viewers by Country */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Viewers by Country</h3>
            <div className="space-y-4">
              {realData.demographics.countries.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-sm font-bold text-[#0A0A0A]">{c.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-500">{c.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D9F99D] rounded-full" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
        </div>

        {/* Traffic Source */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Traffic Source</h3>
            <div className="space-y-4">
              {realData.demographics.trafficSource.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-bold text-[#0A0A0A]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-[#0A0A0A]">{s.value.toLocaleString()}</span>
                    <span className="text-xs font-bold text-gray-400 w-16 text-right">{s.percentage}</span>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
}
