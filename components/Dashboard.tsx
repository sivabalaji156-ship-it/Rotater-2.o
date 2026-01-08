
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Bell, Download, Activity, Cpu, MapPin, Newspaper, ExternalLink, XCircle, RefreshCw, CheckCircle2, Loader2, AlertTriangle, X, Crosshair, Navigation, Radio, ShieldAlert, Zap, RadioTower, FileSpreadsheet, Calendar, LocateFixed } from 'lucide-react';
import MapViz from './MapViz';
import ClimateCharts from './ClimateCharts';
import ChatAssistant from './ChatAssistant';
import MajorAlerts from './MajorAlerts';
import { fetchClimateData, fetchCalamityHistory } from '../services/nasaService';
import { getClimateInsights, resolveGeospatialQuery } from '../services/geminiService';
import { ClimateStats, Calamity, Prediction, NewsResult, MapResult, BoundingBox } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [lat, setLat] = useState<number>(20.5937);
  const [lon, setLon] = useState<number>(78.9629);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  
  // Epoch State - Default 5 years duration
  const [startYear, setStartYear] = useState<number>(currentYear - 5);
  const [startMonth, setStartMonth] = useState<string>("01");
  const [endYear, setEndYear] = useState<number>(currentYear);
  const [endMonth, setEndMonth] = useState<string>(currentMonth.toString().padStart(2, '0'));
  
  const [data, setData] = useState<ClimateStats[]>([]);
  const [calamities, setCalamities] = useState<Calamity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('System Ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const [prediction, setPrediction] = useState<{ summary: string, predictions: Prediction[] } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<any | null>(null);

  const playAlertSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.2;
      audio.play();
    } catch (e) { console.warn("Audio play failed"); }
  };

  const loadData = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setAnalyzing(true);
    setErrorMessage(null);
    
    try {
      setStatusMessage('Syncing with Orbital Array...');
      const stats = await fetchClimateData(lat, lon, startYear, endYear);
      const events = fetchCalamityHistory(lat, lon);
      
      // Filter stats by selected months
      const filteredStats = stats.filter(s => {
        const [y, m] = s.date.split('-').map(Number);
        const startTotal = startYear * 100 + parseInt(startMonth);
        const endTotal = endYear * 100 + parseInt(endMonth);
        const currentTotal = y * 100 + m;
        return currentTotal >= startTotal && currentTotal <= endTotal;
      });

      setData(filteredStats);
      setCalamities(events);

      setStatusMessage('Initializing Gemini 3 Pro...');
      const insights = await getClimateInsights(filteredStats, lat, lon);
      setPrediction(insights);
      
      // Notification Logic
      const criticalRisks = insights.predictions.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Critical');
      if (criticalRisks.length > 0) {
        const newNotifs = criticalRisks.map(r => ({
          id: Date.now() + Math.random(),
          title: `CRITICAL RISK: ${r.month}`,
          description: r.description,
          severity: r.riskLevel,
          timestamp: new Date().toLocaleTimeString()
        }));
        
        setNotifications(prev => [...newNotifs, ...prev]);
        setUnreadCount(prev => prev + newNotifs.length);
        setActiveToast(newNotifs[0]);
        playAlertSound();
        setTimeout(() => setActiveToast(null), 8000);
      }

      setStatusMessage('Analysis Complete');
    } catch (error) {
      setErrorMessage('Critical Link Failure: Unable to synchronize with satellite data arrays.');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, [lat, lon, startYear, endYear, startMonth, endMonth, loading]);

  useEffect(() => {
    loadData();
  }, [lat, lon]);

  const handleLocationSelect = (newLat: number, newLon: number, newBbox: BoundingBox | null) => {
    setLat(newLat);
    setLon(newLon);
    setBbox(newBbox);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsResolving(true);
    try {
      const result = await resolveGeospatialQuery(searchQuery);
      setLat(result.lat);
      setLon(result.lon);
      setBbox(result.bbox);
      setSearchQuery('');
    } catch (e) {
      setErrorMessage("Address resolution failed.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsResolving(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setBbox(null);
          setIsResolving(false);
        },
        (error) => {
          let msg = "Access to geolocation denied.";
          if (error.code === 2) msg = "Position unavailable.";
          if (error.code === 3) msg = "Location request timed out.";
          setErrorMessage(msg);
          setIsResolving(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setErrorMessage("Geolocation is not supported by this browser.");
    }
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return;
    const headers = ['Date', 'Temperature (Celsius)', 'Rainfall (mm)', 'Vegetation Index (NDVI)', 'Anomaly'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => `${row.date},${row.temperature.toFixed(2)},${row.rainfall.toFixed(2)},${row.ndvi.toFixed(2)},${row.anomaly.toFixed(2)}`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ROTATER_Climate_Analysis_${lat.toFixed(2)}_${lon.toFixed(2)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) setUnreadCount(0);
  };

  const months = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"
  ];

  const majorEventsCount = calamities.filter(c => c.intensity === 'Severe').length + 
                        (prediction?.predictions.filter(p => p.riskLevel === 'High' || p.riskLevel === 'Critical').length || 0);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 flex flex-col gap-6 font-exo">
      
      {/* Satellite Warning Toast */}
      <AnimatePresence>
        {activeToast && (
          <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-6 right-6 z-[200] w-full max-w-sm">
            <div className="bg-red-950 border-l-4 border-red-500 p-4 shadow-[0_0_30px_rgba(239,68,68,0.4)] relative overflow-hidden">
               <div className="flex items-start gap-4">
                  <div className="bg-red-500/20 p-2 rounded animate-pulse"><ShieldAlert className="text-red-500" size={24} /></div>
                  <div className="flex-1">
                    <h4 className="text-[10px] font-orbitron font-bold text-red-400 tracking-widest uppercase mb-1">Early Warning</h4>
                    <p className="text-[11px] text-red-100 font-mono mb-1">{activeToast.title}</p>
                    <p className="text-[9px] text-red-200/60 leading-tight line-clamp-2">{activeToast.description}</p>
                  </div>
                  <button onClick={() => setActiveToast(null)} className="text-red-400 hover:text-red-200"><X size={14} /></button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-cyan-900/50 pb-4 relative">
        <div className="flex items-center">
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">ROTATER</h2>
          <span className="ml-4 px-2 py-1 bg-cyan-900/30 text-cyan-400 text-[10px] font-mono rounded border border-cyan-800 tracking-widest">SATELLITE INTERFACE</span>
        </div>
        
        <div className="flex items-center space-x-4 relative">
          <button onClick={toggleNotifications} className={`p-2 glass-panel rounded-full transition-all border relative ${unreadCount > 0 ? 'bg-red-900/20 border-red-500/50 text-red-400 animate-pulse' : 'hover:bg-cyan-900/40 text-cyan-400 border-cyan-500/20'}`}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-black">{unreadCount}</span>}
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="absolute top-12 right-0 w-80 max-h-[500px] glass-panel rounded-lg border border-cyan-500/30 shadow-2xl z-50 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-cyan-900 bg-cyan-950/40 flex justify-between items-center"><span className="text-[10px] font-orbitron font-bold tracking-widest text-cyan-400">MISSION BRIEFING</span></div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {notifications.length === 0 ? <div className="p-8 text-center text-gray-600 text-[10px] uppercase font-mono tracking-widest">No active threats</div> : 
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${notif.severity === 'Critical' ? 'bg-red-500 text-black' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>{notif.severity?.toUpperCase()}</span>
                        </div>
                        <h5 className="text-[11px] font-bold text-white mb-1">{notif.title}</h5>
                        <p className="text-[9px] text-gray-500 leading-tight">{notif.description}</p>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-8 space-y-6">
          
          {/* EPOCH Controls */}
          <div className="glass-panel p-5 rounded-lg border border-cyan-500/20 relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-cyan-500" />
                <span className="text-[10px] font-orbitron text-cyan-500 tracking-widest">EPOCH START</span>
                <div className="flex gap-2">
                  <select value={startMonth} onChange={e => setStartMonth(e.target.value)} className="bg-black border border-cyan-900 rounded px-2 py-1 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500">
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="number" value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="bg-black border border-cyan-900 rounded px-2 py-1 w-20 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-orbitron text-cyan-500 tracking-widest">EPOCH END</span>
                <div className="flex gap-2">
                  <select value={endMonth} onChange={e => setEndMonth(e.target.value)} className="bg-black border border-cyan-900 rounded px-2 py-1 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500">
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="number" value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="bg-black border border-cyan-900 rounded px-2 py-1 w-20 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <button onClick={loadData} disabled={loading} className="ml-auto flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-[10px] font-orbitron px-6 py-2 rounded transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] uppercase tracking-widest">
                {loading ? <Loader2 className="animate-spin" size={14} /> : 'Sync Satellite'}
              </button>
            </div>
          </div>

          {/* Map Section with Relocated Search */}
          <div className="h-[450px] w-full relative group">
             {/* RELOCATED SEARCH: Top Center Floating Command Bar */}
             <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
                <div className="glass-panel p-2 rounded-full border border-cyan-500/40 flex items-center gap-2 shadow-[0_0_30px_rgba(0,240,255,0.15)] bg-black/80">
                   <div className="flex-1 bg-black/40 rounded-full border border-cyan-900/50 flex items-center px-4 py-2">
                      <Search size={16} className="text-cyan-500 mr-2" />
                      <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                        placeholder="TRANSMIT COORDINATES OR SECTOR NAME..." 
                        className="bg-transparent border-none outline-none text-[11px] text-white w-full font-mono uppercase placeholder:text-gray-700" 
                      />
                   </div>
                   
                   {/* Present Location Button */}
                   <button 
                     onClick={handleCurrentLocation}
                     disabled={isResolving}
                     className="p-2.5 bg-cyan-900/30 hover:bg-cyan-500 text-cyan-400 hover:text-black rounded-full border border-cyan-500/30 transition-all group/loc"
                     title="Sync Present Location"
                   >
                     <LocateFixed size={18} className={`${isResolving ? 'animate-spin' : ''}`} />
                   </button>

                   <button 
                     onClick={handleSearch} 
                     disabled={isResolving || !searchQuery.trim()} 
                     className="bg-cyan-600 hover:bg-cyan-500 text-black px-4 py-2 rounded-full font-orbitron text-[10px] font-bold disabled:opacity-50 transition-all flex items-center gap-2"
                   >
                     {isResolving ? <Loader2 className="animate-spin" size={14} /> : <>LINK <Navigation size={12} /></>}
                   </button>
                </div>
                {isResolving && (
                  <div className="mt-2 text-center text-[8px] font-mono text-cyan-400 animate-pulse tracking-widest uppercase">Resolving Geospatial Vectors...</div>
                )}
             </div>

             <MapViz lat={lat} lon={lon} bbox={bbox} onLocationSelect={handleLocationSelect} />
          </div>
          <ClimateCharts data={data} calamities={calamities} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-5 rounded-lg border-l-2 border-red-500/50"><MajorAlerts calamities={calamities} predictions={prediction?.predictions || []} /></div>
          
          <div className="glass-panel p-6 rounded-lg flex-1 border-t-2 border-cyan-500 relative flex flex-col">
            <h3 className="text-sm font-orbitron font-bold text-white mb-6 flex items-center tracking-tighter"><Activity className="mr-2 text-cyan-400" size={16} /> CLIMATE INTELLIGENCE</h3>
            
            {prediction ? (
              <div className="space-y-6 flex-1 flex flex-col">
                <p className="text-gray-300 text-[11px] leading-relaxed italic border-l-2 border-cyan-500/30 pl-3">"{prediction.summary}"</p>
                
                <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-hide pr-1">
                  {prediction.predictions.map((pred, i) => (
                    <div key={i} className="p-2.5 bg-white/5 rounded border border-white/5 flex items-center justify-between">
                      <div className="max-w-[75%]">
                        <div className="text-[10px] font-bold text-white font-mono">{pred.month.toUpperCase()}</div>
                        <div className="text-[9px] text-gray-500 line-clamp-1">{pred.description}</div>
                      </div>
                      <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${pred.riskLevel === 'High' || pred.riskLevel === 'Critical' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}>{pred.riskLevel}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto space-y-2 pt-4 border-t border-cyan-900/50">
                  <button onClick={handleDownloadCSV} className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 text-black text-[10px] font-orbitron font-bold rounded transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                    <FileSpreadsheet size={14} /> EXPORT CLIMATE_ANALYSIS.CSV
                  </button>
                  <div className="text-[8px] text-center text-cyan-800 font-mono tracking-widest uppercase">Includes Temp, Rainfall & Vegetation (NDVI)</div>
                </div>
              </div>
            ) : <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30"><Activity size={48} className="mb-4 text-cyan-500" /><span className="text-[10px] font-mono tracking-widest">AWAITING SYSTEM SYNC...</span></div>}
          </div>
        </div>
      </div>
      
      <ChatAssistant lat={lat} lon={lon} predictions={prediction?.predictions || []} calamities={calamities} />
    </div>
  );
};

export default Dashboard;
