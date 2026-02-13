
import React, { useState } from 'react';
import { Download, Share2, Sparkles, Wand2, Loader2, Image as ImageIcon } from 'lucide-react';
import { GeminiService } from '../services/geminiService';

interface ArtGenProps {
  onInteraction?: () => void;
}

const ArtGen: React.FC<ArtGenProps> = ({ onInteraction }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Fix: Add state for aspect ratio and style selection to match Gemini API capabilities
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">('1:1');
  const [style, setStyle] = useState('Cinematic');
  
  const gemini = GeminiService.getInstance();

  // Fix: handleGenerate now properly utilizes configuration state and passes it to the service
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const fullPrompt = `${style} style: ${prompt}`;
      const imgUrl = await gemini.generateImage(fullPrompt, aspectRatio);
      setImage(imgUrl);
      if (onInteraction) onInteraction();
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fix: Added functional image download handler for better UX
  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `hiki-art-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full bg-[#050505]">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-outfit font-bold">Studio</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl glass-effect text-sm flex items-center gap-2 hover:bg-white/10 transition-all">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button 
                onClick={handleDownload}
                disabled={!image}
                className="px-4 py-2 rounded-xl glass-effect text-sm flex items-center gap-2 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="aspect-square w-full max-w-2xl mx-auto relative rounded-3xl overflow-hidden glass-effect border border-white/10 shadow-2xl">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-10">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-white/60 font-medium animate-pulse">Painting your imagination...</p>
              </div>
            ) : null}
            
            {image ? (
              <img src={image} alt="Generated Art" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/20 p-12 text-center">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white/40 mb-2">No masterpiece yet</h3>
                <p className="text-sm">Enter a prompt below and let the neural networks work their magic.</p>
              </div>
            )}
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="glass-effect rounded-2xl p-4 space-y-4 border border-white/10">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create... (e.g., 'A cyberpunk street in Tokyo, rainy night, neon signs, cinematic lighting')"
                className="w-full h-32 bg-transparent border-none outline-none text-white resize-none text-sm placeholder:text-white/20"
              />
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] uppercase tracking-wider font-bold text-white/40 border border-white/5">{aspectRatio === '1:1' ? '1024 x 1024' : aspectRatio === '16:9' ? '1024 x 576' : '576 x 1024'}</span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] uppercase tracking-wider font-bold text-white/40 border border-white/5">{style}</span>
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 border-l border-white/10 p-6 bg-[#080808] hidden lg:block">
        <h3 className="text-sm font-bold text-white/40 mb-6 uppercase tracking-widest">Configuration</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs text-white/60">Style Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {['Cinematic', '3D Render', 'Analog', 'Anime'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setStyle(s)}
                  className={`p-3 rounded-xl glass-effect text-[10px] text-center font-bold hover:bg-white/10 transition-all border ${style === s ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 text-white/40'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-white/60">Aspect Ratio</label>
            <div className="flex gap-2">
              {['1:1', '16:9', '9:16'].map(ratio => (
                <button 
                  key={ratio} 
                  onClick={() => setAspectRatio(ratio as any)}
                  className={`flex-1 p-2 rounded-lg border text-xs transition-all ${aspectRatio === ratio ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/10 text-white/40'}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtGen;
