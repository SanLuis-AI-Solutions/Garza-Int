import React, { useState } from 'react';
import { generateImage, editImage, analyzeImage } from '../services/geminiService';
import { Image as ImageIcon, Wand2, Upload, Loader2, Maximize2 } from 'lucide-react';

const Visualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  
  // Options
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageSize, setImageSize] = useState('1K');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
         setPreviewUrl(ev.target?.result as string);
         setResultImage(null); // clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
          const str = reader.result as string;
          resolve(str.split(',')[1]); // remove data:image/png;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const img = await generateImage(prompt, aspectRatio, imageSize);
      setResultImage(img);
    } catch (e) {
      console.error(e);
      alert('Failed to generate image. Ensure you have selected a paid API key via the "Select API Key" button.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedFile || !prompt) return;
    setLoading(true);
    try {
      const base64 = await getBase64(selectedFile);
      const img = await editImage(base64, prompt);
      setResultImage(img);
    } catch (e) {
      console.error(e);
      alert('Failed to edit image.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
        const base64 = await getBase64(selectedFile);
        const text = await analyzeImage(base64, prompt || "Analyze this real estate property and estimate its condition and potential value.");
        setAnalysisResult(text);
    } catch (e) {
        console.error(e);
        alert("Failed to analyze image.");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 text-slate-900">AI Visualizer</h2>
        
        <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg">
          {(['generate', 'edit', 'analyze'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setResultImage(null); setAnalysisResult(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4 flex-1">
          {activeTab === 'generate' && (
            <>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full border-slate-300 rounded-md border p-2 text-sm">
                  {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resolution</label>
                <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="w-full border-slate-300 rounded-md border p-2 text-sm">
                  {['1K', '2K', '4K'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}

          {(activeTab === 'edit' || activeTab === 'analyze') && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 relative">
               <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
               {previewUrl ? (
                 <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded shadow-sm" />
               ) : (
                 <div className="flex flex-col items-center text-slate-500">
                   <Upload className="w-8 h-8 mb-2" />
                   <span className="text-sm">Upload Image</span>
                 </div>
               )}
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Prompt</label>
             <textarea 
               className="w-full border-slate-300 rounded-md border p-3 text-sm h-32 focus:ring-indigo-500 focus:border-indigo-500"
               placeholder={
                  activeTab === 'generate' ? "A modern minimalist house with a pool..." : 
                  activeTab === 'edit' ? "Add a swimming pool to the backyard..." :
                  "Describe the condition of this property..."
               }
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
             />
          </div>

          <button
            onClick={activeTab === 'generate' ? handleGenerate : activeTab === 'edit' ? handleEdit : handleAnalyze}
            disabled={loading || (activeTab !== 'generate' && !selectedFile)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 w-5 h-5" />}
            {activeTab === 'generate' ? 'Generate' : activeTab === 'edit' ? 'Edit Image' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="lg:col-span-2 bg-slate-900 rounded-xl flex items-center justify-center p-6 relative overflow-hidden">
         {loading ? (
           <div className="text-white flex flex-col items-center">
             <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-400" />
             <p className="text-indigo-200">Processing with Gemini...</p>
           </div>
         ) : resultImage ? (
           <div className="relative w-full h-full flex items-center justify-center">
             <img src={resultImage} alt="Result" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
             <a href={resultImage} download="propvision-gemini.png" className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm">
                <Maximize2 size={20} />
             </a>
           </div>
         ) : analysisResult ? (
            <div className="w-full h-full bg-slate-800 rounded-lg p-6 overflow-y-auto text-slate-200">
                <h3 className="text-xl font-bold text-white mb-4">Analysis Result</h3>
                <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                    {analysisResult}
                </div>
            </div>
         ) : (
           <div className="text-slate-600 flex flex-col items-center">
             <ImageIcon className="w-20 h-20 mb-4 opacity-20" />
             <p className="text-slate-500">Result will appear here</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Visualizer;