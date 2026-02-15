
import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, MessageCircle, AlertCircle, CheckCircle2, Package, Sparkles, Send, Loader2 } from 'lucide-react';
import { MOCK_ORDERS } from '../constants';
import { Order } from '../types';
import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  role: 'buyer' | 'supplier' | 'ai' | 'admin';
  text: string;
  senderName: string;
}

const OrderManagement: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DISPUTED'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiLoading]);

  // Load mock chat history when an order is selected
  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.status === 'DISPUTED') {
        setChatHistory([
          { role: 'buyer', senderName: 'Procurement (Tesla)', text: "The line is currently stopped. We expected the sensor 2 hours ago. Tracker shows the courier is stationary." },
          { role: 'supplier', senderName: 'Logistics (Global Parts)', text: "Unforeseen bridge closure on the primary route. Courier is recalculating, but estimated delay is now 45 minutes." }
        ]);
      } else {
        setChatHistory([]);
      }
    }
  }, [selectedOrder]);

  const handleConsultAI = async () => {
    if (!selectedOrder) return;
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = `
        Order ID: ${selectedOrder.id}
        Part: ${selectedOrder.partName}
        Buyer: ${selectedOrder.buyer}
        Supplier: ${selectedOrder.supplier}
        Current Status: ${selectedOrder.status}
        Dispute History: ${chatHistory.map(m => `${m.senderName}: ${m.text}`).join('\n')}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are the UrgentParts AI Arbitrator. Analyze this industrial supply dispute and provide a technical, fair, and concise resolution recommendation.
        Focus on factory uptime. If delay is the supplier's fault, suggest platform credits or expedited shipping reimbursement. 
        Context: ${context}`,
        config: {
          systemInstruction: "You are a professional industrial arbitrator. Be concise, technical, and mission-oriented. Start your message with 'SYSTEM AUDIT RECOMMENDATION:'.",
          temperature: 0.7,
        },
      });

      const aiText = response.text || "Unable to generate recommendation at this time.";
      setChatHistory(prev => [...prev, { role: 'ai', senderName: 'System Audit', text: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setChatHistory(prev => [...prev, { role: 'ai', senderName: 'System Error', text: "Fatal error in arbitration engine. Please manual override." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    setChatHistory(prev => [...prev, { role: 'admin', senderName: 'Admin (You)', text: inputText }]);
    setInputText('');
    
    // Auto-trigger AI if keywords are present
    if (inputText.toLowerCase().includes('audit') || inputText.toLowerCase().includes('recommend')) {
      handleConsultAI();
    }
  };

  const filteredOrders = MOCK_ORDERS.filter(o => 
    activeFilter === 'ALL' || o.status === activeFilter
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="text-[#FF6B00]" /> Mission Operations Control
          </h1>
          <p className="text-slate-400">Monitor all system-wide emergency orders and intervene in disputes.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter as any)}
            className={`px-6 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
              activeFilter === filter 
                ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20' 
                : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="surface-card rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity & Item</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrders.map(order => (
                  <tr 
                    key={order.id} 
                    className={`hover:bg-slate-800/30 transition-all cursor-pointer group ${selectedOrder?.id === order.id ? 'bg-orange-500/5 border-l-2 border-l-orange-500' : ''}`} 
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-6 py-5">
                      <span className="text-[#FF6B00] font-mono font-bold text-sm tracking-widest underline decoration-orange-500/30 group-hover:decoration-orange-500 transition-all">
                        #{order.id}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-white text-sm">{order.buyer}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                         <Package size={10} /> {order.partName}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        order.status === 'MATCHING' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        order.status === 'IN_TRANSIT' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        order.status === 'DISPUTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="surface-card rounded-2xl bg-slate-900/50 flex flex-col h-[650px] border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle size={20} className="text-[#007BFF]" /> Resolution Center
              </h2>
              {selectedOrder && (
                <button 
                  onClick={handleConsultAI}
                  disabled={isAiLoading}
                  className="p-2 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] rounded-lg transition-all border border-[#FF6B00]/30 flex items-center gap-2 text-[10px] font-bold disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  CONSULT AI
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedOrder ? (
                <>
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 mb-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Incident Report</p>
                    <p className="text-xs text-white">Order #{selectedOrder.id} - Late arrival risk detected on {selectedOrder.partName}.</p>
                  </div>

                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex flex-col gap-1 max-w-[85%] ${
                        msg.role === 'ai' ? 'self-center w-full max-w-full' : 
                        msg.role === 'admin' ? 'self-end' : 'self-start'
                      }`}
                    >
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        msg.role === 'ai' ? 'text-[#FF6B00] text-center' : 
                        msg.role === 'admin' ? 'text-blue-400 text-right' : 'text-slate-500'
                      }`}>
                        {msg.senderName}
                      </span>
                      <div className={`p-3 rounded-xl text-sm ${
                        msg.role === 'ai' ? 'bg-[#FF6B00]/5 border border-[#FF6B00]/30 text-slate-200' :
                        msg.role === 'admin' ? 'bg-[#007BFF] text-white rounded-tr-none' :
                        'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {isAiLoading && (
                    <div className="flex flex-col gap-1 self-center w-full">
                       <span className="text-[9px] font-bold uppercase text-[#FF6B00] animate-pulse text-center">AI Arbitrator Thinking...</span>
                       <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-center justify-center">
                          <Loader2 className="animate-spin text-[#FF6B00]" size={20} />
                       </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <AlertCircle size={48} className="text-slate-600 mb-4" />
                  <p className="text-slate-500 text-sm font-medium">Select an order to initialize the resolution console.</p>
                </div>
              )}
            </div>

            {selectedOrder && (
              <div className="p-6 border-t border-slate-800 bg-slate-900/80">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type official directive..." 
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                  <button 
                    type="submit"
                    className="bg-[#007BFF] p-3 rounded-lg text-white hover:bg-[#0069D9] transition-all"
                  >
                    <Send size={18} />
                  </button>
                </form>
                <div className="mt-4 flex gap-2">
                   <button className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold transition-all">
                      FORCE CANCEL
                   </button>
                   <button className="flex-1 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg text-[10px] font-bold transition-all">
                      APPROVE CREDIT
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;
