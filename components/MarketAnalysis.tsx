import React, { useState } from 'react';
import { searchMarketData, findNearbyPlaces, fetchMarketTrends } from '../services/geminiService';
import { Search, MapPin, Loader2, ExternalLink, TrendingUp, Plus, Trash2, Columns } from 'lucide-react';

interface SavedScenario {
  id: string;
  location: string;
  propertyType: string;
  result: { text: string; chunks: any[] };
  timestamp: Date;
}

const MarketAnalysis: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'maps' | 'trends' | 'compare'>('search');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, chunks: any[] } | null>(null);

  // Trends inputs
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('Single Family Home');
  
  // Comparison Data
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    setResult(null);
    try {
      if (mode === 'search') {
        if (!query) return;
        const res = await searchMarketData(query);
        setResult(res);
      } else if (mode === 'maps') {
        if (!query) return;
        // Mock lat/lng for now, or use geolocation
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const res = await findNearbyPlaces(query, pos.coords.latitude, pos.coords.longitude);
            setResult(res);
        }, async (err) => {
             // Fallback to a default location (e.g. San Francisco) if permission denied or error
            const res = await findNearbyPlaces(query, 37.7749, -122.4194);
            setResult(res);
        });
      } else if (mode === 'trends') {
        if (!location) return;
        const res = await fetchMarketTrends(location, propertyType);
        setResult(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = () => {
    if (!result || mode !== 'trends') return;
    const newScenario: SavedScenario = {
        id: Date.now().toString(),
        location,
        propertyType,
        result: result,
        timestamp: new Date()
    };
    setSavedScenarios([...savedScenarios, newScenario]);
    setMode('compare');
    setResult(null);
  };

  const removeScenario = (id: string) => {
      setSavedScenarios(savedScenarios.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="gi-card p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold gi-serif">Market Intelligence</h2>
            <p className="mt-1 text-sm gi-muted">Fast research loops for deal context and local signals.</p>
          </div>
          <span className="gi-pill text-[11px]">AI</span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-4 mb-6">
           <div className="gi-seg">
             <button
               onClick={() => { setMode('search'); setResult(null); }}
               className={`gi-segBtn ${mode === 'search' ? 'gi-segBtn--active' : ''}`}
             >
               <Search className="w-4 h-4 inline mr-2" /> Web Search
             </button>
             <button
                onClick={() => { setMode('trends'); setResult(null); }}
                className={`gi-segBtn ${mode === 'trends' ? 'gi-segBtn--active' : ''}`}
             >
                <TrendingUp className="w-4 h-4 inline mr-2" /> Market Trends
             </button>
             <button
               onClick={() => { setMode('maps'); setResult(null); }}
               className={`gi-segBtn ${mode === 'maps' ? 'gi-segBtn--active' : ''}`}
             >
               <MapPin className="w-4 h-4 inline mr-2" /> Nearby (Maps)
             </button>
             <button
               onClick={() => { setMode('compare'); setResult(null); }}
               className={`gi-segBtn ${mode === 'compare' ? 'gi-segBtn--active' : ''}`}
             >
               <Columns className="w-4 h-4 inline mr-2" /> Compare ({savedScenarios.length})
             </button>
           </div>
           
           {/* Controls Area */}
           {mode !== 'compare' && (
             <div className="gi-card-flat p-4">
             {mode === 'trends' ? (
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-medium gi-muted2 mb-1">Location (City, Zip, Neighborhood)</label>
                        <input 
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Austin, TX 78704"
                            className="w-full gi-input px-4 py-2 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-medium gi-muted2 mb-1">Property Type</label>
                        <select 
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                            className="w-full gi-input px-4 py-2 text-sm"
                        >
                            <option>Single Family Home</option>
                            <option>Condo / Apartment</option>
                            <option>Multi-Family (2-4 Units)</option>
                            <option>Commercial</option>
                            <option>Land</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={handleSearch}
                            disabled={loading || !location}
                            className="gi-btn gi-btn-primary px-6 py-2.5 disabled:opacity-50 flex items-center h-[42px] font-semibold"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Analyze'}
                        </button>
                    </div>
                </div>
             ) : (
                <div className="flex gap-2">
                    <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={mode === 'search' ? "e.g. Current mortgage rates 30 year fixed" : "e.g. Hardware stores nearby"}
                    className="flex-1 gi-input px-4 py-2 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                    onClick={handleSearch}
                    disabled={loading || !query}
                    className="gi-btn gi-btn-primary px-6 py-2.5 disabled:opacity-50 flex items-center font-semibold"
                    >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Go'}
                    </button>
                </div>
             )}
           </div>
           )}
        </div>

        {/* Results / Compare Area */}
        {mode === 'compare' ? (
             <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold gi-serif">Scenario Comparison</h3>
                    {savedScenarios.length === 0 && <span className="gi-muted text-sm">No scenarios saved yet.</span>}
                 </div>
                 
                 {savedScenarios.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-x-auto pb-4">
                         {savedScenarios.map((scenario) => (
                             <div key={scenario.id} className="gi-card-flat flex flex-col min-w-[300px] overflow-hidden">
                                 <div className="p-4 border-b border-white/10 flex justify-between items-start bg-black/10">
                                     <div>
                                         <h4 className="font-bold text-white/95">{scenario.location}</h4>
                                         <p className="text-xs gi-muted">{scenario.propertyType}</p>
                                         <p className="text-[10px] gi-muted2 mt-1">{scenario.timestamp.toLocaleDateString()}</p>
                                     </div>
                                     <button
                                       onClick={() => removeScenario(scenario.id)}
                                       aria-label="Remove scenario"
                                       className="gi-btn gi-btn-ghost gi-iconBtn"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                                 <div className="p-4 flex-1 text-sm text-white/88 overflow-y-auto max-h-[400px] whitespace-pre-wrap leading-relaxed">
                                     {scenario.result.text}
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-center py-12 gi-dropzone">
                         <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
                         <p className="gi-muted">Go to “Market Trends”, analyze a location, and click “Save Comparison” to add it here.</p>
                     </div>
                 )}
             </div>
        ) : (
             result && (
              <div className="mt-8 max-w-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="gi-card-flat p-6 relative">
                   <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center">
                           <div className="gi-pill mr-3">
                             {mode === 'trends' ? <TrendingUp size={16} /> : mode === 'maps' ? <MapPin size={16} /> : <Search size={16} />}
                           </div>
                           <h3 className="text-lg font-semibold text-white/95 m-0">
                               {mode === 'trends' ? `Market Analysis: ${location}` : 'Search Results'}
                           </h3>
                       </div>
                       
                       {mode === 'trends' && (
                           <button 
                             onClick={handleSaveScenario}
                             className="flex items-center text-sm gi-btn gi-btn-secondary px-3 py-2"
                           >
                               <Plus size={16} className="mr-1" /> Save Comparison
                           </button>
                       )}
                   </div>
                   
                   <div className="whitespace-pre-wrap text-white/88 leading-relaxed text-sm">{result.text}</div>
                   
                   {result.chunks && result.chunks.length > 0 && (
                     <div className="mt-6 pt-4 border-t border-white/10">
                       <h4 className="text-xs font-semibold gi-muted2 uppercase tracking-wider mb-3">Sources & References</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {result.chunks.map((chunk: any, i: number) => {
                           const web = chunk.web;
                           const map = chunk.maps; 
                           const uri = web?.uri || map?.uri;
                           const title = web?.title || map?.title || "Source";
                           
                           if (!uri) return null;

                           return (
                             <a
                               key={i}
                               href={uri}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center p-3 gi-card-flat hover:border-white/20 transition-colors group"
                             >
                               <ExternalLink className="w-4 h-4 gi-muted2 mr-2" />
                               <span className="text-sm text-white/90 truncate">{title}</span>
                             </a>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default MarketAnalysis;
