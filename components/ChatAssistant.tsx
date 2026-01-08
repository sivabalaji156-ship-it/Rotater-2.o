
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Volume2, Loader2, Info } from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";
import { createChatSession, generateSpeech } from '../services/geminiService';
import { ChatMessage, Prediction, Calamity } from '../types';

// Define the interface for component props
interface ChatAssistantProps {
  lat: number;
  lon: number;
  predictions: Prediction[];
  calamities: Calamity[];
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ lat, lon, predictions, calamities }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Interface connected. I am monitoring the climate vectors for this sector. How can I assist with your analysis?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createChatSession({ lat, lon, predictions, calamities });
  }, [lat, lon, predictions.length, calamities.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (forcedQuery?: string) => {
    const query = forcedQuery || input;
    if (!query.trim() || !chatSessionRef.current) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setIsTyping(true);
    
    // Placeholder for model response
    setMessages(prev => [...prev, { role: 'model', text: '' }]);
    
    try {
      const response = await chatSessionRef.current.sendMessageStream({ message: query });
      let fullText = '';
      
      for await (const chunk of response) {
        const c = chunk as GenerateContentResponse;
        fullText += (c.text || '');
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = fullText;
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Signal interference detected. Encryption failure or session timeout." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const playResponse = async (text: string, index: number) => {
    if (isSpeaking !== null) return;
    setIsSpeaking(index);
    try {
      const audioData = await generateSpeech(text);
      if (audioData) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decoded = decode(audioData);
        const buffer = await decodeAudioData(decoded, audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsSpeaking(null);
        source.start();
      } else {
        setIsSpeaking(null);
      }
    } catch (e) {
      setIsSpeaking(null);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-400 text-black p-4 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all z-50 flex items-center justify-center overflow-hidden"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[90vw] md:w-96 h-[600px] glass-panel rounded-xl flex flex-col shadow-2xl z-50 border border-cyan-500/30 overflow-hidden">
          <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-cyan-950/40 backdrop-blur-xl">
            <div className="flex items-center space-x-2">
              <Bot size={20} className="text-cyan-400" />
              <div className="flex flex-col">
                <span className="font-orbitron text-[11px] font-bold text-white tracking-wider">AI CORE</span>
                <span className="text-[8px] font-mono text-cyan-500 uppercase">Secure Link</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`relative max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
                  msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-100 rounded-tr-none border border-cyan-800/50' : 'bg-white/5 text-gray-300 rounded-tl-none border border-white/10'
                }`}>
                  {msg.text || (isTyping && idx === messages.length - 1 ? <Loader2 size={10} className="animate-spin" /> : '')}
                  {msg.role === 'model' && msg.text && (
                    <button onClick={() => playResponse(msg.text, idx)} className="mt-2 text-cyan-600 hover:text-cyan-400 flex items-center gap-1">
                      {isSpeaking === idx ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                      <span className="text-[8px] uppercase font-mono">Audio</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-cyan-500/20 bg-black/60">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="QUERY..."
                className="flex-1 bg-black/40 border border-cyan-900/50 rounded px-3 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button onClick={() => handleSend()} disabled={isTyping || !input.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-black p-2 rounded">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
