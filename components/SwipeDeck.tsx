import React, { useState, useEffect } from 'react';
import { User, UserType } from '../types';
import { ProfileCard } from './ProfileCard';
import { Button } from './Button';
import { X, Heart, Search, Briefcase, GraduationCap } from 'lucide-react';
import { dataService } from '../services/dataService';
import { FOCUS_AREAS } from '../constants';

interface SwipeDeckProps {
  onMatch: (match: any) => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({ onMatch }) => {
  const currentUser = dataService.getCurrentUser();
  const [candidates, setCandidates] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [filter, setFilter] = useState<string>('');
  
  const [targetType, setTargetType] = useState<UserType>(UserType.COMPANY);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const data = await dataService.getPotentials(filter || undefined, targetType);
      setCandidates(data);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [filter, targetType]); 

  const handleSwipe = async (action: 'like' | 'pass') => {
    const targetUser = candidates[currentIndex];
    if (!targetUser) return;

    setDirection(action === 'like' ? 'right' : 'left');

    // Optimistic UI update
    setTimeout(async () => {
      setDirection(null);
      setCurrentIndex(prev => prev + 1);

      try {
        const match = await dataService.swipe(targetUser.id, action);
        if (match) {
          onMatch(match);
        }
      } catch (e) {
        console.error("Swipe failed", e);
      }
    }, 200); 
  };

  const currentProfile = candidates[currentIndex];
  const isFinished = currentIndex >= candidates.length;

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto pt-4 pb-20 px-4">
      {/* Controls Container */}
      <div className="flex flex-col gap-4 mb-6">
        
        {/* Type Toggle for Researchers */}
        {currentUser?.type === UserType.RESEARCHER && (
           <div className="bg-slate-200 p-1 rounded-xl flex self-center shadow-inner">
              <button 
                 onClick={() => setTargetType(UserType.COMPANY)}
                 className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                   targetType === UserType.COMPANY 
                     ? 'bg-white text-indigo-600 shadow-sm transform scale-105' 
                     : 'text-slate-500 hover:text-slate-700'
                 }`}
              >
                 <Briefcase className="w-4 h-4" /> Find Companies
              </button>
              <button 
                 onClick={() => setTargetType(UserType.RESEARCHER)}
                 className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                   targetType === UserType.RESEARCHER 
                     ? 'bg-white text-emerald-600 shadow-sm transform scale-105' 
                     : 'text-slate-500 hover:text-slate-700'
                 }`}
              >
                 <GraduationCap className="w-4 h-4" /> Find Researchers
              </button>
           </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="w-full p-2 bg-transparent text-slate-700 outline-none cursor-pointer"
          >
            <option value="">All Focus Areas</option>
            {FOCUS_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center">
        {loading ? (
            <div className="flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p>Finding potential partners...</p>
            </div>
        ) : isFinished ? (
          <div className="text-center p-8 bg-white rounded-3xl shadow-lg border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No more profiles!</h3>
            <p className="text-slate-500 mb-6">Check back later or change your settings.</p>
            <Button onClick={() => setFilter('')}>Clear Filters</Button>
          </div>
        ) : (
          <div className={`relative w-full flex justify-center transition-all duration-300 transform ${
            direction === 'left' ? '-translate-x-full opacity-0 rotate-[-20deg]' : 
            direction === 'right' ? 'translate-x-full opacity-0 rotate-[20deg]' : ''
          }`}>
            <ProfileCard user={currentProfile} />
          </div>
        )}
      </div>

      {!isFinished && !loading && (
        <div className="flex items-center justify-center gap-8 mt-8">
          <button 
            onClick={() => handleSwipe('pass')}
            className="w-16 h-16 rounded-full bg-white shadow-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-200 hover:scale-110 active:scale-95"
          >
            <X className="w-8 h-8" />
          </button>
          <button 
            onClick={() => handleSwipe('like')}
            className="w-16 h-16 rounded-full bg-white shadow-lg text-indigo-400 hover:text-green-500 hover:bg-green-50 transition-all flex items-center justify-center border border-slate-200 hover:scale-110 active:scale-95"
          >
            <Heart className="w-8 h-8 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
};
