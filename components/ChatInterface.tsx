import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataService';
import { User, Message, Match } from '../types';
import { Send, ArrowLeft } from 'lucide-react';

interface ChatInterfaceProps {
  onBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const [matches, setMatches] = useState<{ match: Match, otherUser: User }[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load matches on mount
  useEffect(() => {
    dataService.getMatches().then(setMatches);
  }, []);

  const activePartner = selectedMatchId 
    ? matches.find(m => m.otherUser.id === selectedMatchId)?.otherUser 
    : null;

  useEffect(() => {
    let interval: any;
    
    if (selectedMatchId) {
      // Initial fetch
      dataService.getConversation(selectedMatchId).then(setMessages);
      
      // Polling for new messages every 3 seconds
      interval = setInterval(() => {
         dataService.getConversation(selectedMatchId).then(setMessages);
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [selectedMatchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedMatchId) return;
    
    const content = input;
    setInput(''); // Optimistic clear

    await dataService.sendMessage(selectedMatchId, content);
    const updated = await dataService.getConversation(selectedMatchId);
    setMessages(updated);
  };

  return (
    <div className="h-[calc(100vh-80px)] max-w-6xl mx-auto flex bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mt-4">
      {/* Sidebar: Match List */}
      <div className={`${selectedMatchId ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-slate-100 bg-slate-50`}>
        <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-bold text-slate-800 text-lg">Matches</h2>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {matches.length === 0 ? (
            <p className="p-4 text-slate-400 text-sm text-center mt-10">No matches yet. Get swiping!</p>
          ) : (
            matches.map(({ match, otherUser }) => (
              <div 
                key={match.id}
                onClick={() => setSelectedMatchId(otherUser.id)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors ${selectedMatchId === otherUser.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''}`}
              >
                <img src={otherUser.imageUrl} className="w-12 h-12 rounded-full object-cover border border-slate-200" alt="" />
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{otherUser.name}</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[150px]">{otherUser.tagline}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedMatchId ? 'hidden md:flex' : 'flex'}`}>
        {selectedMatchId && activePartner ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white shadow-sm z-10">
              <button onClick={() => setSelectedMatchId(null)} className="md:hidden p-2 -ml-2 text-slate-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img src={activePartner.imageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
              <div>
                <h3 className="font-bold text-slate-800">{activePartner.name}</h3>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 mt-10">
                  <p>You matched with {activePartner.name}!</p>
                  <p className="text-sm">Start the conversation about {activePartner.type === 'COMPANY' ? 'projects' : 'research'}.</p>
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === dataService.getCurrentUser()?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-slate-100 border-0 rounded-full focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8" />
            </div>
            <p className="font-medium">Select a match to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};
