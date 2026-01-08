import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { ClimateStats, Calamity } from '../types';

interface ClimateChartsProps {
  data: ClimateStats[];
  calamities: Calamity[];
}

const ClimateCharts: React.FC<ClimateChartsProps> = ({ data, calamities }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Temperature Trend */}
      <div className="glass-panel p-4 rounded-lg h-80">
        <h3 className="text-cyan-400 font-exo font-bold mb-4 flex items-center">
          <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2"></span>
          Temperature Analysis (°C)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff9900" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ff9900" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(str) => str.slice(2)} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} 
              itemStyle={{ color: '#ff9900' }}
            />
            <Area type="monotone" dataKey="temperature" stroke="#ff9900" fillOpacity={1} fill="url(#colorTemp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rainfall & NDVI */}
      <div className="glass-panel p-4 rounded-lg h-80">
        <h3 className="text-cyan-400 font-exo font-bold mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
          Rainfall & Vegetation (NDVI)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(str) => str.slice(2)} />
            <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} 
            />
            <Line yAxisId="left" type="monotone" dataKey="rainfall" stroke="#3b82f6" dot={false} strokeWidth={2} name="Rainfall (mm)" />
            <Line yAxisId="right" type="monotone" dataKey="ndvi" stroke="#22c55e" dot={false} strokeWidth={2} name="NDVI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Calamity History Timeline */}
      <div className="glass-panel p-4 rounded-lg h-60 lg:col-span-2">
        <h3 className="text-red-400 font-exo font-bold mb-4 flex items-center">
          <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
          Calamity Event Log
        </h3>
        <div className="flex items-center space-x-8 overflow-x-auto pb-4">
          {calamities.length === 0 ? (
            <div className="text-gray-500 italic">No significant events recorded in this range.</div>
          ) : (
            calamities.map((event, idx) => (
              <div key={idx} className="flex-shrink-0 relative group">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-black"></div>
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded hover:bg-red-900/40 transition-colors w-40 text-center">
                  <div className="text-lg font-bold text-red-300">{event.year}</div>
                  <div className="text-white font-exo">{event.type}</div>
                  <div className="text-xs text-red-200 mt-1">{event.intensity}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default ClimateCharts;