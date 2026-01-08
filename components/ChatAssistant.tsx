import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';
import { ChatMessage, Prediction, Calamity } from '../types';

interface ChatAssistantProps {
  lat: number;
  lon: number;
  predictions: Prediction[];
  calamities: Calamity[];
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ lat, lon, predictions, calamities }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Interface connected. Secure satellite bridge established. How can I assist with your climate analysis?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userQuery = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsTyping(true);

    try {
      const responseText = await sendChatMessage(userQuery, { lat, lon, predictions, calamities });
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Signal interruption. Check uplink status." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-400 text-black p-4 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.5)] z-50 transition-all">
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[90vw] md:w-96 h-[500px] glass-panel rounded-xl flex flex-col shadow-2xl z-50 border border-cyan-500/30 overflow-hidden">
          <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-cyan-950/40">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Bot size={20} />
              <span className="font-orbitron text-[11px] font-bold tracking-wider">SECURE LINK</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-lg text-xs max-w-[85%] ${msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-100 border border-cyan-800' : 'bg-white/5 text-gray-300 border border-white/10'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-cyan-500"><Loader2 size={12} className="animate-spin" /></div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/60 border-t border-cyan-900/50 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="ENCRYPTED QUERY..."
              className="flex-1 bg-black/40 border border-cyan-900 rounded px-3 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button onClick={handleSend} className="bg-cyan-600 p-2 rounded text-black hover:bg-cyan-500"><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;