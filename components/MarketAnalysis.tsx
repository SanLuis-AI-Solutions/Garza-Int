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
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 text-slate-900">Market Intelligence</h2>
        
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-4 mb-6">
           <div className="flex rounded-md shadow-sm overflow-hidden border border-slate-300">
             <button
               onClick={() => { setMode('search'); setResult(null); }}
               className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${mode === 'search' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
             >
               <Search className="w-4 h-4 inline mr-2" /> Web Search
             </button>
             <div className="w-px bg-slate-300"></div>
             <button
                onClick={() => { setMode('trends'); setResult(null); }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${mode === 'trends' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
             >
                <TrendingUp className="w-4 h-4 inline mr-2" /> Market Trends
             </button>
             <div className="w-px bg-slate-300"></div>
             <button
               onClick={() => { setMode('maps'); setResult(null); }}
               className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${mode === 'maps' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
             >
               <MapPin className="w-4 h-4 inline mr-2" /> Nearby (Maps)
             </button>
             <div className="w-px bg-slate-300"></div>
             <button
               onClick={() => { setMode('compare'); setResult(null); }}
               className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${mode === 'compare' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
             >
               <Columns className="w-4 h-4 inline mr-2" /> Compare ({savedScenarios.length})
             </button>
           </div>
           
           {/* Controls Area */}
           {mode !== 'compare' && (
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             {mode === 'trends' ? (
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Location (City, Zip, Neighborhood)</label>
                        <input 
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Austin, TX 78704"
                            className="w-full rounded-md border-slate-300 border px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Property Type</label>
                        <select 
                            value={propertyType}
                            onChange={(e) => setPropertyType(e.target.value)}
                            className="w-full rounded-md border-slate-300 border px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
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
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center h-[42px]"
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
                    className="flex-1 rounded-md border-slate-300 border px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                    onClick={handleSearch}
                    disabled={loading || !query}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
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
                    <h3 className="text-lg font-semibold text-slate-800">Scenario Comparison</h3>
                    {savedScenarios.length === 0 && <span className="text-slate-400 text-sm">No scenarios saved yet.</span>}
                 </div>
                 
                 {savedScenarios.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-x-auto pb-4">
                         {savedScenarios.map((scenario) => (
                             <div key={scenario.id} className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-w-[300px]">
                                 <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-start rounded-t-lg">
                                     <div>
                                         <h4 className="font-bold text-slate-800">{scenario.location}</h4>
                                         <p className="text-xs text-slate-500">{scenario.propertyType}</p>
                                         <p className="text-[10px] text-slate-400 mt-1">{scenario.timestamp.toLocaleDateString()}</p>
                                     </div>
                                     <button onClick={() => removeScenario(scenario.id)} className="text-slate-400 hover:text-red-500 p-1">
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                                 <div className="p-4 flex-1 text-sm text-slate-600 overflow-y-auto max-h-[400px] whitespace-pre-wrap">
                                     {scenario.result.text}
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                         <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                         <p className="text-slate-500">Go to "Market Trends", analyze a location, and click "Save Comparison" to add it here.</p>
                     </div>
                 )}
             </div>
        ) : (
             result && (
              <div className="mt-8 prose prose-slate max-w-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
                   <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center">
                           <div className={`p-2 rounded-full mr-3 ${mode === 'trends' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                               {mode === 'trends' ? <TrendingUp size={20} /> : mode === 'maps' ? <MapPin size={20} /> : <Search size={20} />}
                           </div>
                           <h3 className="text-lg font-semibold text-slate-800 m-0">
                               {mode === 'trends' ? `Market Analysis: ${location}` : 'Search Results'}
                           </h3>
                       </div>
                       
                       {mode === 'trends' && (
                           <button 
                             onClick={handleSaveScenario}
                             className="flex items-center text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md border border-indigo-200 transition-colors"
                           >
                               <Plus size={16} className="mr-1" /> Save Comparison
                           </button>
                       )}
                   </div>
                   
                   <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{result.text}</div>
                   
                   {result.chunks && result.chunks.length > 0 && (
                     <div className="mt-6 pt-4 border-t border-slate-100">
                       <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sources & References</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {result.chunks.map((chunk: any, i: number) => {
                           const web = chunk.web;
                           const map = chunk.maps; 
                           const uri = web?.uri || map?.uri;
                           const title = web?.title || map?.title || "Source";
                           
                           if (!uri) return null;

                           return (
                             <a key={i} href={uri} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-slate-50 rounded border border-slate-200 hover:border-indigo-400 transition-colors group">
                               <ExternalLink className="w-4 h-4 text-slate-400 mr-2 group-hover:text-indigo-600" />
                               <span className="text-sm text-indigo-700 truncate">{title}</span>
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