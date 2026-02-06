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
      alert('AI image generation failed. If you are an admin, configure GEMINI_API_KEY (Vercel) or select a project key in AI Studio.');
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
      <div className="lg:col-span-1 gi-card p-6 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold gi-serif">AI Visualizer</h2>
            <p className="mt-1 text-xs gi-muted2">Generate, edit, or analyze real estate imagery.</p>
          </div>
          <span className="gi-pill text-[11px]">Gemini</span>
        </div>
        
        <div className="gi-seg mt-5">
          {(['generate', 'edit', 'analyze'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setResultImage(null); setAnalysisResult(''); }}
              className={`gi-segBtn capitalize ${activeTab === tab ? 'gi-segBtn--active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4 flex-1">
          {activeTab === 'generate' && (
            <>
               <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full gi-input px-3 py-2 text-sm">
                  {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Resolution</label>
                <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="w-full gi-input px-3 py-2 text-sm">
                  {['1K', '2K', '4K'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}

          {(activeTab === 'edit' || activeTab === 'analyze') && (
            <div className="gi-dropzone p-6 text-center cursor-pointer relative">
               <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
               {previewUrl ? (
                 <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded shadow-sm" />
               ) : (
                 <div className="flex flex-col items-center gi-muted">
                   <Upload className="w-8 h-8 mb-2" />
                   <span className="text-sm">Upload Image</span>
                 </div>
               )}
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-white/90 mb-2">Prompt</label>
             <textarea 
               className="w-full gi-input px-3 py-3 text-sm h-32"
                  placeholder={
                  activeTab === 'generate' ? "A modern minimalist house with a pool…" : 
                  activeTab === 'edit' ? "Add a swimming pool to the backyard…" :
                  "Describe the condition of this property…"
                  }
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
             />
          </div>

          <button
            onClick={activeTab === 'generate' ? handleGenerate : activeTab === 'edit' ? handleEdit : handleAnalyze}
            disabled={loading || (activeTab !== 'generate' && !selectedFile)}
            className="w-full gi-btn gi-btn-primary font-semibold py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 w-5 h-5" />}
            {activeTab === 'generate' ? 'Generate' : activeTab === 'edit' ? 'Edit Image' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="lg:col-span-2 gi-card p-6 relative overflow-hidden">
         {loading ? (
           <div className="text-white flex flex-col items-center">
             <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: 'rgba(216,181,109,0.85)' }} />
             <p className="gi-muted">Processing with Gemini…</p>
           </div>
         ) : resultImage ? (
           <div className="relative w-full h-full flex items-center justify-center">
             <img src={resultImage} alt="Result" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
             <a
               href={resultImage}
               download="garza-visualizer.png"
               aria-label="Download result image"
               className="absolute top-4 right-4 gi-btn gi-btn-secondary gi-iconBtn backdrop-blur-sm"
             >
                <Maximize2 size={20} />
             </a>
           </div>
         ) : analysisResult ? (
            <div className="w-full h-full gi-card-flat p-6 overflow-y-auto">
                <h3 className="text-xl font-bold gi-serif mb-4">Analysis Result</h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                  {analysisResult}
                </div>
            </div>
         ) : (
           <div className="gi-muted flex flex-col items-center text-center">
             <ImageIcon className="w-20 h-20 mb-4 opacity-20" />
             <p className="gi-muted">Result will appear here</p>
             <p className="mt-1 text-xs gi-muted2">Tip: be specific about style, materials, and neighborhood vibe.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Visualizer;
