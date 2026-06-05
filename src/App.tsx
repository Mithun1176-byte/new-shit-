import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TreePine, X, Home, Trees, TrendingUp, User,
  Sprout, Leaf, Gift, Volume2, VolumeX, SkipForward, SkipBack, Plus, Minus,
  Trophy, Flame, Brain, Clock, AlertTriangle, Star, ChevronUp, ChevronLeft, ChevronRight, Search, Mountain, Sparkles, Timer, ChevronDown, Lock,
} from 'lucide-react';
// FIX 1: Added Minus to imports — was missing, caused build error
import { supabase } from './lib/supabase';

function getDeviceId(): string {
  let id = localStorage.getItem('arboretum_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('arboretum_device_id', id);
  }
  return id;
}

type Tab = 'home' | 'forest' | 'insights' | 'profile';

interface Session {
  id: number;
  durationMins: number;
  goalMins: number;
  completed: boolean;
  hour: number;
  date: string;
  dayOfWeek: number;
}

interface HourModel {
  score: number;
  count: number;
}

function save(key: string, value: any) {
  try {
    localStorage.setItem('arboretum_' + key, JSON.stringify(value));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem('arboretum_' + key);
    if (item === null) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    return fallback;
  }
}

const ALPHA = 0.35;

function learnFromSession(
  model: HourModel[], hour: number, completed: boolean,
  durationMins: number, goalMins: number
): HourModel[] {
  const next = model.map((h) => ({ ...h }));
  const signal = completed
    ? Math.min(durationMins / goalMins, 1)
    : (durationMins / goalMins) * 0.3;
  if (next[hour].count === 0) {
    next[hour].score = signal;
  } else {
    next[hour].score = (1 - ALPHA) * next[hour].score + ALPHA * signal;
  }
  next[hour].count += 1;
  return next;
}

function getPeakHour(model: HourModel[]): number | null {
  const trained = model.filter((h) => h.count > 0);
  if (trained.length < 2) return null;
  return model.reduce((best, h, i) => (h.score > model[best].score ? i : best), 0);
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekDates(weekOffset: number): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i) + weekOffset * 7);
    return d.toISOString().slice(0, 10);
  });
}

function formatWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === -1) return 'Last Week';
  const start = new Date();
  start.setDate(start.getDate() + weekOffset * 7 - 6);
  return start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' week';
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

// Kept their seed data — used as fallback if Supabase leaderboard is empty
const LEADERBOARD_SEED = [
  { name: 'Priya K.', initials: 'PK', color: '#5DCAA5', weeklyMins: 312 },
  { name: 'Arjun M.', initials: 'AM', color: '#378ADD', weeklyMins: 287 },
  { name: 'Neha S.', initials: 'NS', color: '#D85A30', weeklyMins: 194 },
  { name: 'Rahul T.', initials: 'RT', color: '#BA7517', weeklyMins: 181 },
  { name: 'Ananya R.', initials: 'AR', color: '#639922', weeklyMins: 143 },
  { name: 'Dev P.', initials: 'DP', color: '#7F77DD', weeklyMins: 98 },
];

const TREE_SPECIES = [
  { name: 'Silver Birch', rarity: 'Common', minMins: 0 },
  { name: 'Weeping Willow', rarity: 'Common', minMins: 1680 },
  { name: 'Cherry Blossom', rarity: 'Rare', minMins: 3360 },
  { name: 'Rowan', rarity: 'Rare', minMins: 6720 },
  { name: 'Scots Pine', rarity: 'Epic', minMins: 13440 },
  { name: 'Lebanese Cedar', rarity: 'Legendary', minMins: 26880 },
  { name: 'Ancient Oak', rarity: 'Mythic', minMins: 53760 },
];

function getSpecies(totalMins: number) {
  for (let i = TREE_SPECIES.length - 1; i >= 0; i--) {
    if (totalMins >= TREE_SPECIES[i].minMins) return TREE_SPECIES[i];
  }
  return TREE_SPECIES[0];
}

const CompletionCelebration = ({ onDismiss, species }: { onDismiss: () => void, species: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onClick={onDismiss}
  >
    <motion.div
      initial={{ scale: 0.5, y: 40 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.4 }}
      className="bg-white dark:bg-[#0f1f17] rounded-[2.5rem] p-10 flex flex-col items-center gap-6 mx-6 border border-[#d9e8b5]/30 dark:border-[#accebc]/10 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-24 h-24 rounded-full bg-[#d9e8b5] dark:bg-emerald-900/40 flex items-center justify-center"
      >
        <Trees className="w-12 h-12 text-[#3d5a2d] dark:text-emerald-400" />
      </motion.div>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#3d5a2d]/60 dark:text-emerald-400/60 font-bold mb-2">
          Tree Planted
        </p>
        <h2 className="font-newsreader italic text-4xl text-[#1a1a1a] dark:text-[#d4e7da] mb-2">
          Session Complete
        </h2>
        <p className="text-[#1a1a1a]/50 dark:text-[#c3c8c2]/60 text-sm">
          A <span className="text-[#3d5a2d] dark:text-emerald-400 font-bold">{species}</span> has been added to your forest
        </p>
      </div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: 80, x: Math.random() * 300 - 50, opacity: 1 }}
            animate={{ y: -100, opacity: 0 }}
            transition={{ duration: 1.5, delay: i * 0.1, ease: 'easeOut' }}
            className="absolute w-2 h-2 rounded-full bg-[#d9e8b5] dark:bg-emerald-500"
          />
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="w-full py-4 rounded-full bg-[#3d5a2d] dark:bg-emerald-700 text-white font-bold text-sm tracking-wider uppercase transition-all hover:bg-[#2d4520] active:scale-95"
      >
        Continue Growing
      </button>
    </motion.div>
  </motion.div>
);

const TopBar = () => (
  <header className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-[#07160f]/80 backdrop-blur-xl transition-colors duration-300">
    <div className="flex justify-between items-center px-6 py-4 w-full max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <TreePine className="text-[#3d5a2d] dark:text-emerald-100 w-6 h-6" />
        <h1 className="text-xl font-newsreader font-medium tracking-tight text-[#1a1a1a] dark:text-emerald-50">
          Arboretum
        </h1>
      </div>
    </div>
  </header>
);

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (t: Tab) => void }) => {
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'forest', label: 'Forest', icon: Trees },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ];
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 bg-white/90 dark:bg-[#07160f]/90 backdrop-blur-2xl rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-colors duration-300">
      <div className="flex justify-around items-center w-full px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center px-4 py-2 transition-all rounded-full relative ${
                isActive ? 'text-[#1a1a1a] dark:text-emerald-50' : 'text-[#1a1a1a]/40 dark:text-emerald-400/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#d9e8b5] dark:bg-emerald-900/40 rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
              <span className="font-body text-[10px] font-bold tracking-wide uppercase mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const ForestPage = ({ totalFocusSeconds }: { totalFocusSeconds: number }) => {
  const [showCollection, setShowCollection] = useState(false);
  const treesPlanted = Math.floor(totalFocusSeconds / (25 * 60));
  const remaining = totalFocusSeconds % (25 * 60);
  const progressToNext = (remaining / (25 * 60)) * 100;
  const totalMins = Math.floor(totalFocusSeconds / 60);
  const species = getSpecies(totalMins);

  return (
    <>
      <AnimatePresence>
        {showCollection && (
          <SpeciesCollectionPage onClose={() => setShowCollection(false)} totalFocusSeconds={totalFocusSeconds} />
        )}
      </AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center">
        <div className="mb-12 text-center">
          <h2 className="font-newsreader italic text-4xl mb-2 text-[#1a1a1a] dark:text-[#d4e7da] tracking-tight">Your Forest</h2>
          <p className="text-[#1a1a1a]/40 dark:text-[#c3c8c2]/60 text-[10px] uppercase tracking-[0.2em] font-bold">A testament to your focus</p>
        </div>
        <div className="w-full grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-[#0f1f17] p-8 rounded-[2.5rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#d9e8b5]/30 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
              <Trees className="w-10 h-10 text-[#3d5a2d] dark:text-emerald-400" />
            </div>
            <span className="text-4xl font-newsreader italic text-[#1a1a1a] dark:text-white mb-2">{treesPlanted}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/40 dark:text-[#c3c8c2]/60 font-bold">Trees Planted</span>
            <div className="w-full mt-8 bg-[#f0f4ea] dark:bg-emerald-900/20 h-2 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressToNext}%` }} className="h-full bg-[#3d5a2d] dark:bg-emerald-500" />
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40">
              {Math.round(25 - remaining / 60)} minutes until next tree
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#0f1f17] p-6 rounded-[2rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 shadow-sm">
              <TrendingUp className="w-5 h-5 text-[#3d5a2d] dark:text-emerald-400 mb-3" />
              <span className="text-[10px] uppercase tracking-widest text-[#1a1a1a]/40 dark:text-[#c3c8c2]/60 font-bold block mb-1">Total Focus</span>
              <span className="font-newsreader text-xl italic text-[#1a1a1a] dark:text-[#d4e7da]">{totalMins}m</span>
            </div>
            <div className="bg-white dark:bg-[#0f1f17] p-6 rounded-[2rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 shadow-sm">
              <Star className="w-5 h-5 text-[#3d5a2d] dark:text-emerald-400 mb-3" />
              <span className="text-[10px] uppercase tracking-widest text-[#1a1a1a]/40 dark:text-[#c3c8c2]/60 font-bold block mb-1">Rarity</span>
              <span className="font-newsreader text-xl italic text-[#1a1a1a] dark:text-[#d4e7da]">{species.rarity}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#0f1f17] p-6 rounded-[2rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-newsreader text-lg text-[#1a1a1a] dark:text-[#d4e7da]">Species Collection</h3>
              <button onClick={() => setShowCollection(true)} className="text-[10px] uppercase tracking-widest font-bold text-[#3d5a2d] dark:text-emerald-400 hover:opacity-80 transition-opacity">More</button>
            </div>
            <div className="flex flex-col gap-3">
            {TREE_SPECIES.map((s) => {
              const unlocked = totalMins >= s.minMins;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${unlocked ? 'bg-[#d9e8b5]' : 'bg-black/5 opacity-40'}`}>
                    <TreePine className={`w-4 h-4 ${unlocked ? 'text-[#3d5a2d]' : 'text-black/20'}`} />
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${unlocked ? 'text-[#1a1a1a] dark:text-[#d4e7da]' : 'text-black/20 dark:text-[#c3c8c2]/30'}`}>{s.name}</span>
                    <span className="text-[10px] text-black/40 ml-2 uppercase tracking-wider">{s.rarity}</span>
                  </div>
                  {unlocked
                    ? <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Unlocked</span>
                    : <span className="text-[10px] text-black/20 dark:text-[#c3c8c2]/30 uppercase font-bold tracking-wider">Yet to unlock</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
};

// ============================================================
// SPECIES COLLECTION PAGE (FULL SCREEN OVERLAY)
// ============================================================
const SpeciesCollectionPage = ({ onClose, totalFocusSeconds }: { onClose: () => void, totalFocusSeconds: number }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const treesPlanted = Math.floor(totalFocusSeconds / (25 * 60));
  const hours = Math.round(totalFocusSeconds / 3600);

  const matchSearch = (name: string) => name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#f0f4ea] dark:bg-[#07160f] text-[#1a1a1a] dark:text-[#d4e7da] overflow-y-auto">
      <header className="bg-[#f0f4ea]/90 dark:bg-[#07160f]/90 backdrop-blur-md flex justify-between items-center w-full px-6 py-4 sticky top-0 z-40 border-b border-[#d9e8b5]/50 dark:border-[#1d2d25]">
        <div className="flex items-center gap-3">
          <Leaf className="text-[#3d5a2d] dark:text-[#5DCAA5]" />
          <h1 className="text-xl font-bold font-newsreader tracking-tight">Nocturnal Sanctuary</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300">
            <X className="w-5 h-5 text-[#1a1a1a]/60 dark:text-[#c3c8c2]" />
          </button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 pt-10 pb-24">
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-md">
              <span className="text-[#3d5a2d] dark:text-[#5DCAA5] tracking-widest uppercase text-[10px] mb-2 block font-semibold">Your Midnight Grove</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1] font-newsreader">
                The Moonlit <br/><span className="text-[#3d5a2d] dark:text-[#5DCAA5] italic font-medium">Arboretum</span>
              </h2>
              <p className="mt-4 text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-sm leading-relaxed max-w-sm font-body">
                Every tree here represents a moment of deep focus and quiet intention under the stars. Witness the nocturnal grove you've nurtured.
              </p>
            </div>
            <div className="bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] p-5 rounded-[1.5rem] flex flex-col items-start gap-2 min-w-[180px] shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5">
              <span className="text-[#3d5a2d] dark:text-[#5DCAA5] text-3xl font-bold tracking-tighter font-newsreader">{treesPlanted}</span>
              <div className="space-y-0.5">
                <p className="font-semibold text-xs">Grown Trees</p>
                <p className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-[10px]">Total focus hours: {hours}h</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 w-4 h-4" />
            <input 
              className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-full focus:bg-black/5 dark:focus:bg-white/5 focus:ring-1 focus:ring-[#3d5a2d] dark:focus:ring-[#5DCAA5] focus:border-[#3d5a2d] dark:focus:border-[#5DCAA5] transition-all text-[#1a1a1a] dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none" 
              placeholder="Search species..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="px-5 py-3 bg-[#3d5a2d] dark:bg-[#b9ccb6] text-white dark:text-[#243425] rounded-full text-xs font-semibold hover:opacity-90 transition-opacity">All Species</button>
            <button className="px-5 py-3 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] text-[#1a1a1a]/60 dark:text-[#c3c8c2] rounded-full text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Recently Added</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {matchSearch('Ancient Oak') && (
            <div className={`md:col-span-8 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-[1.5rem] overflow-hidden flex flex-col md:flex-row shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 group ${hours >= 896 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale'}`}>
              <div className="md:w-1/2 h-48 md:h-auto overflow-hidden relative">
                <img className={`w-full h-full object-cover transition-transform duration-700 opacity-90 ${hours >= 896 ? 'group-hover:scale-105' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7374diRwRdEa1GJg_yLBot9oA19bhY_4_QbbsZb04qL2eFXY2a4HBESUdVB9yM85RkoD-aCUuk2XVOiwTfHL1e0PDouX7VhkayWzOyyK49UrRRuzrlI_-4uC7YAhvNh_RWBVDHJyRmq2i2Z1TII4jEWRboxdbxuYQqne8F-woPIShQWtQSUs8t2HRXTuFFDQhSg3IJZeQ2nTVYmat0c3hhFrBXZyyL9ZlDzLcOuqMP4CzFixS2hUrRUbMljEn_D9pEA2HBL1ZD_s" alt="Ancient Oak" />
                {hours < 896 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 mb-2 text-white/80" />
                    <span className="text-xs font-bold tracking-wider uppercase mb-1">Locked</span>
                    <span className="text-[10px]">Unlocks at 896 focus hours</span>
                  </div>
                )}
              </div>
              <div className="p-6 md:w-1/2 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-[#3d5a2d]/10 dark:bg-[#b9ccb6]/20 text-[#3d5a2d] dark:text-[#b9ccb6] border border-[#3d5a2d]/20 dark:border-[#b9ccb6]/30 rounded-full text-[9px] font-bold uppercase tracking-tighter">Legendary</span>
                  <span className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-[10px] font-medium">8 Sessions</span>
                </div>
                <h3 className="text-2xl font-bold mb-2 tracking-tight font-newsreader">Ancient Oak</h3>
                <p className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-xs leading-relaxed mb-5 font-body">The anchor of your clearing. This oak represents your longest focus periods, rooted in resilience and steady growth.</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="flex -space-x-1.5">
                    <div className="w-6 h-6 rounded-full border border-white dark:border-[#0f1f17] bg-[#3d5a2d] dark:bg-[#b9ccb6] text-white dark:text-[#243425] flex items-center justify-center text-[9px] font-bold">O</div>
                    <div className="w-6 h-6 rounded-full border border-white dark:border-[#0f1f17] bg-[#f0f4ea] dark:bg-white text-black flex items-center justify-center text-[9px] font-bold">K</div>
                  </div>
                  <span className="text-[10px] text-[#1a1a1a]/40 dark:text-[#8d928d] font-medium tracking-tight">32 hours concentrated</span>
                </div>
              </div>
            </div>
          )}

          {matchSearch('Silver Birch') && (
            <div className={`md:col-span-4 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-[1.5rem] p-5 flex flex-col shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 group ${hours >= 0 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale'}`}>
              <div className="aspect-[4/3] w-full mb-4 rounded-xl overflow-hidden bg-black/5 dark:bg-[#13231a] relative">
                <img className={`w-full h-full object-cover transition-transform duration-700 opacity-90 ${hours >= 0 ? 'group-hover:scale-110' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6XN5EzgI1tyLeuKL2fJ4PY0kN4hUyIfY60h2_6e88v1txrTsUfaGCsFVEQJaF0SaUdCZJnBZyBY2QTJ2Y9YoJZNGuTu0K0TW3Am7e8gmaAy34z3lSx__PTOm42bSlIT2HhsDEs8yxQcJhWmyqt42jjgAvjtZMV0ktd0HznarwjSjbBHeInVJZ33mcT7ENpWZObT1oB63XmNfRC3wZ8yUsbAOGQjaFWOBTuzUPdKGTj21SiwvZZKC3avXJzuMEQzC1ksmvBJoHFe0" alt="Silver Birch" />
                {hours < 0 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 mb-2 text-white/80" />
                    <span className="text-xs font-bold tracking-wider uppercase mb-1">Locked</span>
                    <span className="text-[10px]">Unlocks at 0 focus hours</span>
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold mb-1 font-newsreader">Silver Birch</h4>
              <p className="text-[#3d5a2d] dark:text-[#b9ccb6] text-[10px] mb-3 font-medium uppercase tracking-widest">Pioneer Species</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-xs italic">Focus: 45m sessions</span>
                <Leaf className="w-3.5 h-3.5 text-[#3d5a2d] dark:text-[#b9ccb6]" />
              </div>
            </div>
          )}

          {matchSearch('Weeping Willow') && (
            <div className={`md:col-span-4 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-[1.5rem] p-5 flex flex-col shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 group ${hours >= 28 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale'}`}>
              <div className="aspect-[4/3] w-full mb-4 rounded-xl overflow-hidden bg-black/5 dark:bg-[#13231a] relative">
                <img className={`w-full h-full object-cover transition-transform duration-700 opacity-90 ${hours >= 28 ? 'group-hover:scale-110' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjTYhNz02tDOxOKxhiy7OQW6wpeymg8tUF5TyNGNOleLBo41IywmVltUPzGbPdq1j76utYJpytprFC5948u_5wZtyMIgc5X964bsgr9da62SST_dFIiDCl_FQqySpm3Oc2cc3DoqEIhbG3nkKu9ws0ZSMLZHCS4gg1I-WxIyDnbtK5VEFpYU5_z-HWV8TIso87odLlZbTBvV2eUPhxk9iwpx5QasPBgJeq3cgrsBNpq4QNI9klyTOT4kEXWgudD8eLlgBBYuPBnds" alt="Weeping Willow" />
                {hours < 28 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 mb-2 text-white/80" />
                    <span className="text-xs font-bold tracking-wider uppercase mb-1">Locked</span>
                    <span className="text-[10px]">Unlocks at 28 focus hours</span>
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold mb-1 font-newsreader">Weeping Willow</h4>
              <p className="text-[#3d5a2d] dark:text-[#b9ccb6] text-[10px] mb-3 font-medium uppercase tracking-widest">Grace & Fluidity</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-xs italic">Grown on: Mar 12</span>
                <Timer className="w-3.5 h-3.5 text-[#3d5a2d] dark:text-[#b9ccb6]" />
              </div>
            </div>
          )}

          {matchSearch('Lebanese Cedar') && (
            <div className={`md:col-span-8 bg-[#f0f4ea] dark:bg-[#28382f] border border-[#d9e8b5]/80 dark:border-[#b9ccb6]/20 rounded-[1.5rem] p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 ${hours >= 448 ? '' : 'opacity-60 grayscale'}`}>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-3 tracking-tight font-newsreader">Lebanese Cedar</h3>
                <p className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-sm mb-6 leading-relaxed font-body">
                  A rare specimen achieved through a perfect week of 4-hour daily focus streaks under the night sky.
                </p>
                <button className={`bg-[#3d5a2d] dark:bg-[#b9ccb6] text-white dark:text-[#243425] px-6 py-2.5 rounded-full font-bold text-xs tracking-wide transition-colors ${hours >= 448 ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'}`} disabled={hours < 448}>
                  {hours >= 448 ? 'VIEW GROWTH JOURNEY' : 'UNLOCKS AT 448 HOURS'}
                </button>
              </div>
              <div className="w-40 h-40 md:w-56 md:h-56 bg-white dark:bg-[#0f1f17] rounded-full flex items-center justify-center relative border border-[#d9e8b5]/50 dark:border-[#1d2d25] overflow-hidden">
                <img className="w-32 md:w-44 h-auto drop-shadow-2xl opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvl3TeADo3_u4xi_FbXEqWDT3frmdBYdSWTlRuIC8v3HqOcirhSmNq_SWviqq1_L2bZDLFGaBS8Tzmq0PQDDNkQ3UN8QQB-xvwEKh9kd9L68e992yBjsGq7uEv5SHTAVone7FlWnls0FEVE91rXVm8zVgic2rbKOgurKOxO7MDiR-36yySPHwaLQFOW7pSDKmy6vAXI1MM5c0txmT5i8TgGSavsHqUUulklUlMNl4YZykFYxMfYJcLejhBq0FTph0wZfbjpnuG5-A" alt="Lebanese Cedar" />
                {hours >= 448 && <div className="absolute inset-0 border-2 border-dashed border-[#3d5a2d]/20 dark:border-[#b9ccb6]/20 rounded-full animate-spin-slow"></div>}
                {hours < 448 && (
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm rounded-full">
                    <Lock className="w-8 h-8 opacity-80" />
                  </div>
                )}
              </div>
            </div>
          )}

          {matchSearch('Scots Pine') && (
            <div className={`md:col-span-4 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-[1.5rem] p-5 flex flex-col shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 group ${hours >= 224 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale'}`}>
              <div className="aspect-[4/3] w-full mb-4 rounded-xl overflow-hidden bg-black/5 dark:bg-[#13231a] relative">
                <img className={`w-full h-full object-cover transition-transform duration-700 opacity-90 ${hours >= 224 ? 'group-hover:scale-110' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBh1s_PKoO059nT4QIHHSo9oV7xbEPpt7p2M-fJnU8upXRayDMyVSGd6UFVOy9YbcL7fnHDqkkIr_sgavYruuiDydZxpWjB2uSv_ibNRi6L37QqbpHcPG2GZM_IlyKB9_2Q8fEHbY5pHxjN-53Jf-Lx651AhDa-VjUI6GSpEKwx2yFyJjsGZfF7LO8qVnkEJbBnr-HOA4rcLqu833GcHJdifoRr4siy0LDZtkCPtIs6qfCK5EkKZY1CCDe3cjrGkn-p4sQ9gReQPS8" alt="Scots Pine" />
                {hours < 224 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 mb-2 text-white/80" />
                    <span className="text-xs font-bold tracking-wider uppercase mb-1">Locked</span>
                    <span className="text-[10px]">Unlocks at 224 focus hours</span>
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold mb-1 font-newsreader">Scots Pine</h4>
              <p className="text-[#3d5a2d] dark:text-[#b9ccb6] text-[10px] mb-3 font-medium uppercase tracking-widest">Endurance</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-xs italic">Count: 12 Trees</span>
                <Mountain className="w-3.5 h-3.5 text-[#3d5a2d] dark:text-[#b9ccb6]" />
              </div>
            </div>
          )}

          {matchSearch('Cherry Blossom') && (
            <div className={`md:col-span-4 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-[1.5rem] p-5 flex flex-col shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 group ${hours >= 56 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale'}`}>
              <div className="aspect-[4/3] w-full mb-4 rounded-xl overflow-hidden bg-black/5 dark:bg-[#13231a] relative">
                <img className={`w-full h-full object-cover transition-transform duration-700 opacity-90 ${hours >= 56 ? 'group-hover:scale-110' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuD94FxbtU4PkA5hdwoSHCQmffgF18eXq2JP49sGCFeUqYqlc2ukLi95glNEpks487ZCBgK_jhbJFHtOA7eXys3WPsINZgku1HtRRalOPKHIWxINFSOL4AnBglbOh7wmYAMoh255DlklyWDjMjd2RJvpEq9BTaHujll7nSbTQQHK37ICaZCJBEN3hK-X8oUOT-552KR7-vbv5G9M7OjON-n5RQzxVGj0teB-qbmRlUEl4jyzjxfStOXhQvuN1UsipSQeiydrCfZrCQ4" alt="Cherry Blossom" />
                {hours < 56 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 mb-2 text-white/80" />
                    <span className="text-xs font-bold tracking-wider uppercase mb-1">Locked</span>
                    <span className="text-[10px]">Unlocks at 56 focus hours</span>
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold mb-1 font-newsreader">Cherry Blossom</h4>
              <p className="text-[#3d5a2d] dark:text-[#b9ccb6] text-[10px] mb-3 font-medium uppercase tracking-widest">Ephemeral Focus</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-xs italic">Grown on: Apr 04</span>
                <Sparkles className="w-3.5 h-3.5 text-[#3d5a2d] dark:text-[#b9ccb6]" />
              </div>
            </div>
          )}

          {matchSearch('Rowan') && (
            <div className={`md:col-span-4 bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] rounded-[1.5rem] p-5 flex flex-col shadow-sm shadow-[#3d5a2d]/5 dark:shadow-[#b9ccb6]/5 transition-all duration-500 group ${hours >= 112 ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale'}`}>
              <div className="aspect-[4/3] w-full mb-4 rounded-xl overflow-hidden bg-black/5 dark:bg-[#13231a] relative">
                <img className={`w-full h-full object-cover transition-transform duration-700 opacity-90 ${hours >= 112 ? 'group-hover:scale-110' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDRJhLIrWWKqv744276qc7wkKnAXR4HYCV8M-CDwAbjVNFy5Z_ClT6g_kOvLk4ufFGBIdx2RFGIV-ACTm68vFzjL5eI2JEcntsQtO0jVK6qyrZa8Sve6vERfvM0i7FoAQuWDpUa7k1UINVyALqdB4akt1Kw8mEVzYAZT2nqf6WPKV1xMtSkAk_zo7jf4VkhW53ZwJyq-_n2vpqj1jUZPtQtlKIjwJt5sQiI9aJjoPziPMnYOqRUKdISKQop--EP03XKA3uQkgrAXM" alt="Rowan" />
                {hours < 112 && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-sm">
                    <Lock className="w-6 h-6 mb-2 text-white/80" />
                    <span className="text-xs font-bold tracking-wider uppercase mb-1">Locked</span>
                    <span className="text-[10px]">Unlocks at 112 focus hours</span>
                  </div>
                )}
              </div>
              <h4 className="text-lg font-bold mb-1 font-newsreader">Rowan</h4>
              <p className="text-[#3d5a2d] dark:text-[#b9ccb6] text-[10px] mb-3 font-medium uppercase tracking-widest">Protection</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[#1a1a1a]/60 dark:text-[#c3c8c2] text-xs italic">Unlocked: Level 4</span>
                <Star className="w-3.5 h-3.5 text-[#3d5a2d] dark:text-[#b9ccb6]" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center">
          <button className="group flex items-center gap-2 py-3 px-8 rounded-full bg-white dark:bg-[#0f1f17] border border-[#d9e8b5]/50 dark:border-[#1d2d25] text-[#3d5a2d] dark:text-[#b9ccb6] font-bold text-xs tracking-tight hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95">
            LOAD MORE SPECIES
            <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
          </button>
        </div>
      </main>
    </motion.div>
  );
};

// ============================================================
// ACTIVITY CHART — with week navigation and light green bars
// weekOffset: 0 = this week, -1 = last week, -2 = two weeks ago
// ============================================================
const ActivityChart = ({ sessions }: { sessions: Session[] }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weekDates = getWeekDates(weekOffset);

  // Map each date to total focused minutes that day
  const dayActivity = weekDates.map((dateStr) =>
    sessions
      .filter((s) => s.date === dateStr)
      .reduce((acc, s) => acc + s.durationMins, 0)
  );

  const maxActivity = Math.max(...dayActivity, 1);
  const weekTotal = dayActivity.reduce((a, b) => a + b, 0);
  const isCurrentWeek = weekOffset === 0;

  // Get day label: Mon=1...Sun=0, we want Mon first
  const getDayLabel = (dateStr: string) => {
    const day = new Date(dateStr + 'T12:00:00').getDay();
    return DAY_LABELS[day === 0 ? 6 : day - 1];
  };

  return (
    <div className="bg-white dark:[#0f1f17] rounded-[2rem] p-6 shadow-sm border border-[#d9e8b5]/30 dark:border-[#accebc]/5">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-newsreader text-2xl text-[#1a1a1a] dark:text-[#d4e7da]">Activity</h2>
          <p className="text-xs text-[#1a1a1a]/40 dark:text-[#c3c8c2]">
            {formatWeekLabel(weekOffset)} · {weekTotal}m focused
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f0f4ea] dark:bg-emerald-900/20 text-[#3d5a2d] dark:text-[#accebc] hover:bg-[#d9e8b5] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset((p) => Math.min(p + 1, 0))}
            disabled={isCurrentWeek}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isCurrentWeek
                ? 'bg-black/5 dark:bg-white/5 text-black/20 dark:text-white/20 cursor-not-allowed'
                : 'bg-[#f0f4ea] dark:bg-emerald-900/20 text-[#3d5a2d] dark:text-[#accebc] hover:bg-[#d9e8b5]'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 mb-3" style={{ height: '160px' }}>
        {dayActivity.map((val, i) => {
          const heightPct = val > 0 ? Math.max((val / maxActivity) * 100, 8) : 3;
          const isToday = weekDates[i] === today();
          return (
            <div key={weekDates[i]} className="flex-1 flex flex-col items-center gap-0 h-full justify-end">
              <div className="w-full relative group" style={{ height: `${heightPct}%` }}>
                {/* Tooltip on hover */}
                {val > 0 && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#3d5a2d] text-white text-[9px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {val}m
                  </div>
                )}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                  style={{ transformOrigin: 'bottom' }}
                  className={`w-full h-full rounded-t-lg ${
                    val === 0
                      ? 'bg-[#f0f4ea] dark:bg-[#1d2d25]'
                      : isToday
                      ? 'bg-[#5DCAA5]'
                      : 'bg-[#d9e8b5] dark:bg-[#5DCAA5]/70'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Day labels */}
      <div className="flex justify-between gap-2 mt-2">
        {weekDates.map((dateStr, i) => {
          const isToday = dateStr === today();
          return (
            <div key={dateStr} className="flex-1 flex justify-center">
              <span className={`text-[10px] font-bold uppercase ${
                isToday
                  ? 'text-[#3d5a2d] dark:text-emerald-400'
                  : 'text-[#1a1a1a]/40 dark:text-[#c3c8c2]'
              }`}>
                {getDayLabel(dateStr)}
              </span>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <p className="text-center text-xs text-black/20 dark:text-[#c3c8c2]/30 mt-4 uppercase tracking-widest">
          Complete sessions to see activity
        </p>
      )}
    </div>
  );
};

const InsightsPage = ({ sessions, hourModel, totalFocusSeconds, giveupCount }: {
  sessions: Session[]; hourModel: HourModel[]; totalFocusSeconds: number; giveupCount: number;
}) => {
  const totalMins = Math.floor(totalFocusSeconds / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const treesPlanted = Math.floor(totalFocusSeconds / (25 * 60));
  const completedSessions = sessions.filter((s) => s.completed);
  const completionRate = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;
  const peakHour = getPeakHour(hourModel);
  const trainedCount = hourModel.filter((h) => h.count > 0).length;
  const modelConfidence = Math.min(Math.round((trainedCount / 5) * 100), 100);
  const giveupByHour: Record<number, number> = {};
  sessions.filter((s) => !s.completed).forEach((s) => { giveupByHour[s.hour] = (giveupByHour[s.hour] || 0) + 1; });
  const worstHourEntry = Object.entries(giveupByHour).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const trainedHours = hourModel.map((h, i) => ({ ...h, hour: i })).filter((h) => h.count > 0).sort((a, b) => b.score - a.score);
  const maxScore = trainedHours.length > 0 ? trainedHours[0].score : 1;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col">
      <section className="mb-10 text-center relative">
        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/40 dark:text-[#a5baad] mb-2 font-bold">Weekly Summary</p>
        <h1 className="font-newsreader text-5xl font-medium text-[#1a1a1a] dark:text-[#d4e7da] mb-1">{hours}h {mins}m</h1>
        <p className="font-newsreader italic text-xl text-[#3d5a2d] dark:text-[#accebc]/80">Focused Stillness</p>
        <div className="flex justify-center gap-8 mt-8">
          {[
            { label: 'Trees Grown', value: treesPlanted, color: '' },
            { label: 'Goal Met', value: `${completionRate}%`, color: '' },
            { label: 'Give-ups', value: giveupCount, color: 'text-red-500' },
          ].map((item, i) => (
            <div key={item.label} className="flex flex-col items-center">
              {i > 0 && <div className="w-px h-8 bg-[#d9e8b5]/30 dark:bg-[#434844]/30 absolute" style={{ marginLeft: i === 1 ? '-4rem' : '-8rem' }} />}
              <span className={`text-2xl font-bold text-[#1a1a1a] dark:text-[#d4e7da] ${item.color}`}>{item.value}</span>
              <span className="text-[10px] uppercase tracking-widest text-[#1a1a1a]/40 dark:text-[#c3c8c2] font-bold">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <ActivityChart sessions={sessions} />
      </section>

      <section className="mb-8">
        <div className="bg-[#f0f4ea] dark:bg-[#001b11] p-6 rounded-[2rem] border border-[#d9e8b5]/20 dark:border-[#accebc]/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#d9e8b5]/50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-[#3d5a2d] dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-newsreader italic text-xl text-[#3d5a2d] dark:text-[#accebc]">ML Peak Focus Time</h4>
                <span className="text-[10px] bg-[#d9e8b5] dark:bg-emerald-900/50 text-[#3d5a2d] dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {modelConfidence}% confidence
                </span>
              </div>
              {peakHour !== null ? (
                <>
                  <p className="text-2xl font-newsreader font-medium text-[#1a1a1a] dark:text-[#d4e7da] mb-1">{formatHour(peakHour)}</p>
                  <p className="text-sm text-[#1a1a1a]/60 dark:text-[#678877] leading-relaxed">
                    You focus best around this time. Learned from {sessions.length} session{sessions.length !== 1 ? 's' : ''} using exponential moving average.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#1a1a1a]/40 dark:text-[#678877]">Log at least 2 sessions at different times to unlock your peak focus window.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {trainedHours.length > 0 && (
        <section className="mb-8">
          <div className="bg-white dark:bg-[#0f1f17] rounded-[2rem] p-6 border border-[#d9e8b5]/30 dark:border-[#accebc]/5">
            <h2 className="font-newsreader text-xl text-[#1a1a1a] dark:text-[#d4e7da] mb-4">Focus quality by hour</h2>
            <div className="flex flex-col gap-3">
              {trainedHours.slice(0, 6).map((h) => {
                const pct = Math.round((h.score / maxScore) * 100);
                const color = pct >= 70 ? '#3d5a2d' : pct >= 40 ? '#BA7517' : '#D85A30';
                return (
                  <div key={h.hour}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[#1a1a1a]/40 dark:text-[#c3c8c2]/70">{formatHour(h.hour)}</span>
                      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-black/5 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-black/20 dark:text-[#c3c8c2]/30 mt-4 uppercase tracking-wider">Model updates after every session</p>
          </div>
        </section>
      )}

      {giveupCount > 0 && (
        <section className="mb-8">
          <div className="bg-red-50 dark:bg-red-950/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/20 flex gap-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-newsreader italic text-lg text-red-700 dark:text-red-400 mb-1">Give-up pattern</h4>
              <p className="text-sm text-red-700/70 dark:text-red-400/60 leading-relaxed">
                {worstHourEntry
                  ? `You give up most at ${formatHour(Number(worstHourEntry[0]))} (${worstHourEntry[1]}×). Consider scheduling lighter tasks then.`
                  : `You've given up ${giveupCount} time${giveupCount > 1 ? 's' : ''} this week. The model is learning your patterns.`}
              </p>
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
};

// ============================================================
// FIX 2: REAL LEADERBOARD from Supabase
// Their version used hardcoded fake users.
// This fetches real users from your user_profiles table.
// Falls back to seed data if Supabase returns nothing yet.
// ============================================================
const LeaderboardSection = ({ deviceId, yourTotalSeconds }: { deviceId: string; yourTotalSeconds: number }) => {
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, display_name, total_focus_seconds')
          .order('total_focus_seconds', { ascending: false })
          .limit(20);
        if (!error && data && data.length > 0) {
          setRealUsers(data);
        }
      } catch (e) {
        console.error('Leaderboard fetch failed:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [yourTotalSeconds]); // refetch when your score updates

  // If real users loaded, use them. Otherwise fall back to seed data.
  const all = realUsers.length > 0
    ? realUsers.map((u) => ({
        name: u.id === deviceId ? 'You' : u.display_name,
        initials: u.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        color: u.id === deviceId ? '#3d5a2d' : '#5DCAA5',
        weeklyMins: Math.floor(u.total_focus_seconds / 60),
        isYou: u.id === deviceId,
      }))
    : [...LEADERBOARD_SEED, { name: 'You', initials: 'ME', color: '#3d5a2d', weeklyMins: Math.floor(yourTotalSeconds / 60), isYou: true }]
        .sort((a, b) => b.weeklyMins - a.weeklyMins);

  const sorted = [...all].sort((a, b) => b.weeklyMins - a.weeklyMins);
  const yourRank = sorted.findIndex((p) => p.isYou || p.name === 'You') + 1;
  const yourMins = Math.floor(yourTotalSeconds / 60);
  const above = yourRank > 1 ? sorted[yourRank - 2].weeklyMins - yourMins : 0;

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-black/20 dark:text-[#c3c8c2]/40 w-4 text-center">{rank}</span>;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Rank', value: yourRank > 0 ? `#${yourRank}` : '—' },
          { label: 'Mins', value: `${yourMins}m` },
          { label: 'To Next', value: above > 0 ? `${above}m` : '—' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-[#0f1f17] p-4 rounded-[1.5rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 text-center shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-black/40 dark:text-[#c3c8c2]/50 font-bold mb-1">{item.label}</p>
            <p className="font-newsreader text-2xl text-[#1a1a1a] dark:text-[#d4e7da]">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-[#0f1f17] rounded-[2rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 overflow-hidden shadow-sm">
        {loading ? (
          <p className="text-center py-8 font-newsreader italic text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40">Loading...</p>
        ) : (
          sorted.map((p, i) => {
            const isYou = p.isYou || p.name === 'You';
            return (
              <div key={p.name + i} className={`flex items-center gap-3 px-5 py-4 border-b border-black/5 dark:border-[#accebc]/5 last:border-0 ${isYou ? 'bg-[#f0f4ea] dark:bg-emerald-900/10' : 'hover:bg-black/5 dark:hover:bg-[#1d2d25]/30'}`}>
                <div className="w-6 flex justify-center">{rankIcon(i + 1)}</div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: p.color + '22', color: p.color }}>{p.initials}</div>
                <div className="flex-1">
                  <span className={`text-sm font-medium ${isYou ? 'text-[#3d5a2d] dark:text-emerald-300' : 'text-[#1a1a1a] dark:text-[#d4e7da]'}`}>{p.name}</span>
                  {isYou && <span className="ml-2 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">you</span>}
                </div>
                <span className="text-sm font-bold text-[#1a1a1a] dark:text-[#d4e7da]">{p.weeklyMins}m</span>
                <div className="w-5 flex justify-center">
                  {isYou && p.weeklyMins > 0 ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <Minus className="w-3 h-3 text-black/10 dark:text-[#c3c8c2]/20" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================
// FIX 3: ProfilePage now receives deviceId
// Needed to pass down to LeaderboardSection so it knows which
// row in the leaderboard is "you"
// ============================================================
const ProfilePage = ({ deviceId, sessions, totalFocusSeconds, giveupCount, displayName, setDisplayName, profilePic, setProfilePic }: {
  deviceId: string; sessions: Session[]; totalFocusSeconds: number; giveupCount: number;
  displayName: string; setDisplayName: (n: string) => void;
  profilePic: string; setProfilePic: (p: string) => void;
}) => {
  const [tab, setTab] = useState<'stats' | 'leaderboard' | 'settings'>('stats');
  const totalMins = Math.floor(totalFocusSeconds / 60);
  const species = getSpecies(totalMins);
  const completedSessions = sessions.filter((s) => s.completed);
  const completionRate = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;
  const avgSessionMins = completedSessions.length > 0 ? Math.round(completedSessions.reduce((a, s) => a + s.durationMins, 0) / completedSessions.length) : 0;
  const uniqueDays = [...new Set(sessions.map((s) => s.date))].sort();
  let streak = 0;
  if (uniqueDays.length > 0) {
    streak = 1;
    for (let i = uniqueDays.length - 1; i > 0; i--) {
      const diff = (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[#d9e8b5]/30 dark:bg-emerald-900/30 border-2 border-[#d9e8b5]/50 dark:border-emerald-700/30 flex items-center justify-center mb-4 shadow-sm overflow-hidden">
          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <h2 className="font-newsreader italic text-2xl text-[#1a1a1a] dark:text-[#d4e7da]">{displayName}</h2>
        <span className="mt-1 text-[11px] uppercase tracking-widest text-[#3d5a2d]/60 dark:text-emerald-400/70 font-bold">{species.rarity} · {species.name}</span>
      </div>
      <div className="flex gap-1 p-1 bg-[#f0f4ea] dark:bg-[#0f1f17] rounded-2xl mb-6 border border-[#d9e8b5]/30 dark:border-[#accebc]/5">
        {(['stats', 'leaderboard', 'settings'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all capitalize ${tab === t ? 'bg-white dark:bg-[#1a2e22] text-[#1a1a1a] dark:text-[#d4e7da] shadow-sm' : 'text-black/30 dark:text-[#c3c8c2]/40'}`}>{t}</button>
        ))}
      </div>

      {tab === 'stats' ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Focus', value: `${totalMins}m`, icon: Clock },
              { label: 'Sessions', value: completedSessions.length, icon: Trees },
              { label: 'Streak', value: `${streak}d`, icon: Flame },
              { label: 'Give-ups', value: giveupCount, icon: AlertTriangle },
              { label: 'Completion', value: `${completionRate}%`, icon: TrendingUp },
              { label: 'Avg Session', value: `${avgSessionMins}m`, icon: Sprout },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white dark:bg-[#0f1f17] p-5 rounded-[1.5rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 flex flex-col gap-2 shadow-sm">
                <Icon className="w-4 h-4 text-[#3d5a2d] dark:text-emerald-400" />
                <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-[#c3c8c2]/60 font-bold">{label}</span>
                <span className="font-newsreader text-xl italic text-[#1a1a1a] dark:text-[#d4e7da]">{value}</span>
              </div>
            ))}
          </div>
          {sessions.length > 0 && (
            <div className="bg-white dark:bg-[#0f1f17] rounded-[2rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-black/5 dark:border-[#accebc]/5">
                <h3 className="font-newsreader text-lg text-[#1a1a1a] dark:text-[#d4e7da]">Recent Sessions</h3>
              </div>
              {sessions.slice(-5).reverse().map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 border-b border-black/5 dark:border-[#accebc]/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.completed ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <span className="text-sm text-[#1a1a1a] dark:text-[#d4e7da] flex-1">
                    {s.durationMins}m · {formatHour(s.hour)} <span className="text-xs opacity-60 ml-1">· {new Date(s.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${s.completed ? 'text-emerald-500' : 'text-red-400'}`}>{s.completed ? 'Done' : 'Quit'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'leaderboard' ? (
        // FIX 3 continued: pass deviceId down so leaderboard knows which user is you
        <LeaderboardSection deviceId={deviceId} yourTotalSeconds={totalFocusSeconds} />
      ) : (
        <div className="flex flex-col gap-6 bg-white dark:bg-[#0f1f17] p-8 rounded-[2rem] border border-[#d9e8b5]/30 dark:border-[#accebc]/5 shadow-sm">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-[#c3c8c2]/60">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#f0f4ea] dark:bg-[#1d2d25] border-none rounded-xl px-4 py-3 text-[#1a1a1a] dark:text-[#d4e7da] focus:ring-2 focus:ring-[#3d5a2d] transition-all"
              placeholder="Enter your name" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-[#c3c8c2]/60">Profile Picture URL</label>
            <input type="text" value={profilePic} onChange={(e) => setProfilePic(e.target.value)}
              className="w-full bg-[#f0f4ea] dark:bg-[#1d2d25] border-none rounded-xl px-4 py-3 text-[#1a1a1a] dark:text-[#d4e7da] focus:ring-2 focus:ring-[#3d5a2d] transition-all"
              placeholder="Enter image URL" />
          </div>
          <p className="text-[10px] text-black/30 dark:text-[#c3c8c2]/40 italic">Changes are saved automatically.</p>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [duration, setDuration] = useState(() => load('duration', 25));
  const [timeLeft, setTimeLeft] = useState(load('duration', 25) * 60);
  const [isActive, setIsActive] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [deviceId] = useState(getDeviceId);
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState<number>(() => load('totalFocusSeconds', 0));
  const [sessions, setSessions] = useState<Session[]>(() => load('sessions', []));
  const [giveupCount, setGiveupCount] = useState<number>(() => load('giveupCount', 0));
  const [hourModel, setHourModel] = useState<HourModel[]>(() =>
    load('hourModel', Array(24).fill(null).map(() => ({ score: 0.5, count: 0 })))
  );
  const [displayName, setDisplayName] = useState<string>(() => load('displayName', 'Forest Keeper'));
  const [profilePic, setProfilePic] = useState<string>(() => load('profilePic', 'https://picsum.photos/seed/keeper/200'));
  const sessionIdRef = useRef<number>(load('sessionIdRef', 0));
  const sessionStartRef = useRef<number | null>(null);
  const lastElapsedRef = useRef<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaylist, setAudioPlaylist] = useState<{name: string, url: string}[]>([
   { name: 'Jungle Thunderstorm', url: '/mixkit-calm-thunderstorm-in-the-jungle-2415.wav' }
  ]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  const totalTime = duration * 60;
  const progress = (timeLeft / totalTime) * 100;
  const strokeDashoffset = 880 - (880 * progress) / 100;
  const growthProgress = (totalTime - timeLeft) / totalTime;
  const species = getSpecies(Math.floor(totalFocusSeconds / 60));

  useEffect(() => { save('sessions', sessions); }, [sessions]);
  useEffect(() => { save('hourModel', hourModel); }, [hourModel]);
  useEffect(() => { save('totalFocusSeconds', totalFocusSeconds); }, [totalFocusSeconds]);
  useEffect(() => { save('giveupCount', giveupCount); }, [giveupCount]);
  useEffect(() => { save('duration', duration); }, [duration]);
  useEffect(() => { save('displayName', displayName); }, [displayName]);
  useEffect(() => { save('profilePic', profilePic); }, [profilePic]);

  useEffect(() => {
    if (isCloudSyncing) return;
    const t = setTimeout(() => {
      supabase.from('user_profiles')
        .update({ display_name: displayName, profile_pic: profilePic })
        .eq('id', deviceId)
        .then(({ error }) => { if (error) console.error('Settings sync error:', error); });
    }, 1500);
    return () => clearTimeout(t);
  }, [displayName, profilePic, isCloudSyncing, deviceId]);

  useEffect(() => {
    async function syncCloud() {
      try {
        const { data: profile, error: profileError } = await supabase.from('user_profiles').select('*').eq('id', deviceId).maybeSingle();
        if (profileError) console.error('Error fetching profile:', profileError);
        if (profile) {
          if (profile.total_focus_seconds) setTotalFocusSeconds(profile.total_focus_seconds);
          if (profile.giveup_count) setGiveupCount(profile.giveup_count);
          if (profile.hour_model) setHourModel(profile.hour_model);
          if (profile.display_name) setDisplayName(profile.display_name);
          if (profile.profile_pic) setProfilePic(profile.profile_pic);
        } else {
          const { error: insertError } = await supabase.from('user_profiles').insert({ id: deviceId });
          if (insertError && insertError.code !== '23505') console.error('Error creating profile:', insertError);
        }
        const { data: dbSessions, error: sessionsError } = await supabase.from('sessions').select('*').eq('user_id', deviceId).order('id', { ascending: true });
        if (sessionsError) console.error('Error fetching sessions:', sessionsError);
        if (dbSessions && dbSessions.length > 0) {
          setSessions(dbSessions.map((s: any) => ({
            id: s.id, durationMins: s.duration_mins, goalMins: s.goal_mins,
            completed: s.completed, hour: s.hour, date: s.date, dayOfWeek: s.day_of_week,
          })));
        }
      } catch (err) {
        console.warn('Cloud sync failed:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }
    syncCloud();
  }, [deviceId]);

  useEffect(() => {
    if (!isActive) setTimeLeft(duration * 60);
  }, [duration, isActive]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    if (nextState) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioPlaylist[currentAudioIndex].url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
      } else {
        if (audioRef.current.src !== audioPlaylist[currentAudioIndex].url) {
          audioRef.current.src = audioPlaylist[currentAudioIndex].url;
          audioRef.current.load();
        }
      }
      audioRef.current.play().catch((e) => {
        console.log('Audio playback failed:', e);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const handleAudioUpload = (e: any) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const newItems = files.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      }));
      setAudioPlaylist(prev => [...prev, ...newItems]);
      const newIndex = audioPlaylist.length; // Will play the first newly added song
      setCurrentAudioIndex(newIndex);
      
      if (soundOn) {
        setSoundOn(false);
        if (audioRef.current) audioRef.current.pause();
      }
      
      if (audioRef.current) {
        audioRef.current.src = newItems[0].url;
        audioRef.current.load();
      }
    }
  };

  const playIndex = (index: number) => {
    if (audioPlaylist.length === 0) return;
    const safeIndex = (index + audioPlaylist.length) % audioPlaylist.length;
    setCurrentAudioIndex(safeIndex);
    
    if (audioRef.current) {
      audioRef.current.src = audioPlaylist[safeIndex].url;
      audioRef.current.load();
      if (soundOn) {
        audioRef.current.play().catch(e => console.log('Audio playback failed:', e));
      }
    }
  };

  const handleNextAudio = () => playIndex(currentAudioIndex + 1);
  const handlePrevAudio = () => playIndex(currentAudioIndex - 1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      if (!sessionStartRef.current) {
        const initialElapsed = totalTime - timeLeft;
        sessionStartRef.current = Date.now() - (initialElapsed * 1000);
        lastElapsedRef.current = initialElapsed;
      }
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartRef.current!) / 1000);
        const remaining = Math.max(totalTime - elapsed, 0);
        setTimeLeft(remaining);
        
        const delta = elapsed - lastElapsedRef.current;
        if (delta > 0) {
          setTotalFocusSeconds((p) => p + delta);
          lastElapsedRef.current = elapsed;
        }
        
        if (remaining === 0) {
          clearInterval(interval);
          handleComplete();
        }
      }, 1000);
    } else {
      sessionStartRef.current = null;
    }
    return () => clearInterval(interval);
  }, [isActive, totalTime]);

  const startSession = () => {
    // Ask for notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setSessionStartTime(new Date());
    setIsActive(true);
  };

  const handleComplete = async () => {
    if (soundOn) {
      setSoundOn(false);
      if (audioRef.current) audioRef.current.pause();
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🌲 Session Complete!', { 
        body: 'Your tree has been planted. Great work!' 
      });
    }
    setIsActive(false);
    const now = new Date();
    const hour = (sessionStartTime || now).getHours();
    // FIX 4: use totalTime not totalFocusSeconds for the completed session total
    // totalFocusSeconds was 1 tick behind — this is the correct final value
    const finalTotalSeconds = load('totalFocusSeconds', 0) + totalTime;
    const newSession: Session = {
      id: ++sessionIdRef.current,
      durationMins: duration, goalMins: duration,
      completed: true, hour, date: today(), dayOfWeek: now.getDay(),
    };
    save('sessionIdRef', sessionIdRef.current);
    setSessions((p) => [...p, newSession]);
    const nextModel = learnFromSession(hourModel, hour, true, duration, duration);
    setHourModel(nextModel);
    setTimeLeft(totalTime);
    setSessionStartTime(null);
    setShowCelebration(true);
    try {
      await supabase.from('sessions').insert({
        user_id: deviceId, duration_mins: duration, goal_mins: duration,
        completed: true, hour, date: today(), day_of_week: now.getDay(),
      });
      await supabase.from('user_profiles').update({
        total_focus_seconds: finalTotalSeconds,
        hour_model: nextModel,
      }).eq('id', deviceId);
    } catch (e) {
      console.error('Supabase save failed:', e);
    }
  };

  const giveUp = async () => {
    if (soundOn) {
      setSoundOn(false);
      if (audioRef.current) audioRef.current.pause();
    }
    setIsActive(false);
    const now = new Date();
    const hour = (sessionStartTime || now).getHours();
    const elapsed = Math.round((totalTime - timeLeft) / 60);
    const newSession: Session = {
      id: ++sessionIdRef.current,
      durationMins: Math.max(elapsed, 1), goalMins: duration,
      completed: false, hour, date: today(), dayOfWeek: now.getDay(),
    };
    save('sessionIdRef', sessionIdRef.current);
    setSessions((p) => [...p, newSession]);
    const nextModel = learnFromSession(hourModel, hour, false, Math.max(elapsed, 1), duration);
    setHourModel(nextModel);
    const newGiveups = giveupCount + 1;
    setGiveupCount(newGiveups);
    setTimeLeft(totalTime);
    setSessionStartTime(null);
    try {
      await supabase.from('sessions').insert({
        user_id: deviceId, duration_mins: Math.max(elapsed, 1), goal_mins: duration,
        completed: false, hour, date: today(), day_of_week: now.getDay(),
      });
      await supabase.from('user_profiles').update({
        giveup_count: newGiveups, hour_model: nextModel,
        total_focus_seconds: totalFocusSeconds,
      }).eq('id', deviceId);
    } catch (e) {
      console.error('Supabase save failed:', e);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-500 dark bg-[#0f1f17]">
      <div className="min-h-screen text-emerald-900 dark:text-[#d4e7da] flex flex-col items-center selection:bg-emerald-500/30">
        <TopBar />
        <AnimatePresence>
          {showCelebration && <CompletionCelebration onDismiss={() => setShowCelebration(false)} species={species.name} />}
        </AnimatePresence>
        <main className="flex-grow w-full max-w-lg px-6 pt-32 pb-40 flex flex-col items-center relative overflow-hidden">
          <motion.div
            animate={{ opacity: 0.3 + growthProgress * 0.4, scale: 1 + growthProgress * 0.2 }}
            className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#1a2e22_0%,_transparent_70%)] pointer-events-none"
          />
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full flex flex-col items-center">
                <div className="w-full mb-12 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40 mb-2">{getGreeting()}, {displayName}</p>
                  <h2 className="font-body font-bold text-4xl text-[#1a1a1a] dark:text-[#d4e7da] leading-tight mb-4">Tend to your <br /> inner forest.</h2>
                  <p className="font-newsreader text-lg text-[#1a1a1a]/60 dark:text-[#c3c8c2]/60 leading-relaxed max-w-[280px]">Each minute of deep work helps your ecosystem thrive.</p>
                </div>
                <div className="relative w-72 h-72 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 rounded-full border-[1px] border-[#d9e8b5]/20 dark:border-[#accebc]/10 bg-white/50 dark:bg-[#0f1f17]/50" />
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle className="text-[#d9e8b5]/20 dark:text-[#28382f]" cx="144" cy="144" fill="transparent" r="140" stroke="currentColor" strokeWidth="2" />
                    <motion.circle className="text-[#d9e8b5] dark:text-[#accebc]" cx="144" cy="144" fill="transparent" r="140" stroke="currentColor" strokeWidth="8" strokeDasharray="880"
                      animate={{ strokeDashoffset }} transition={{ duration: 1, ease: 'linear' }} strokeLinecap="round" />
                  </svg>
                  <motion.button onClick={isActive ? undefined : startSession} whileHover={isActive ? {} : { scale: 1.02 }} whileTap={isActive ? {} : { scale: 0.98 }}
                    className={`relative w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/10 overflow-hidden group ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="absolute inset-0 z-0">
                      <img src={`https://picsum.photos/seed/${isActive ? 'lush-plant' : 'forest-seed'}/400`} alt="Growing Plant"
                        className="w-full h-full object-cover" style={{ transform: `scale(${1 + growthProgress * 0.4})` }} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-emerald-950/40 group-hover:bg-emerald-950/30 transition-colors" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <span className="font-newsreader text-3xl italic text-white drop-shadow-lg">{isActive ? 'Growing...' : 'Plant'}</span>
                      {isActive && <div className="font-body text-sm text-[#d9e8b5] font-bold tracking-widest uppercase drop-shadow-md">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>}
                    </div>
                  </motion.button>
                </div>
                <AnimatePresence>
                  {!isActive && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full mb-12 flex flex-col items-center justify-center">
                      <div className="flex items-center gap-6 px-3 py-3 bg-[#13231a]/60 backdrop-blur-xl rounded-full border border-[#accebc]/10 shadow-lg">
                        <button onClick={() => setDuration(Math.max(5, (duration || 0) - 5))}
                          className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0a1610] text-[#accebc] hover:bg-emerald-900/40 hover:text-white transition-all active:scale-95 border border-[#accebc]/5 shadow-inner focus:outline-none">
                          <Minus className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col items-center justify-center min-w-[72px]">
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={duration || ''}
                            onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setDuration(val === '' ? 0 : Math.min(360, parseInt(val, 10))); }}
                            onBlur={() => { if (!duration || duration < 5) setDuration(5); }}
                            className="bg-transparent text-center font-newsreader text-4xl text-white tracking-tight outline-none w-20 p-0 m-0" />
                          <span className="text-[9px] font-bold text-[#a5baad] uppercase tracking-[0.25em] mt-1 -mr-1">Mins</span>
                        </div>
                        <button onClick={() => setDuration(Math.min(360, (duration || 0) + 5))}
                          className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0a1610] text-[#accebc] hover:bg-emerald-900/40 hover:text-white transition-all active:scale-95 border border-[#accebc]/5 shadow-inner focus:outline-none">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="w-full flex flex-col gap-4 mb-12">
                  <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-[#0f1f17] p-6 rounded-[2rem] flex flex-col gap-4 border border-[#d9e8b5]/20 dark:border-[#accebc]/5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-[#3d5a2d] dark:text-[#accebc]" />
                      <span className="font-newsreader text-xl italic text-[#1a1a1a] dark:text-[#d4e7da]">Current Canopy</span>
                    </div>
                    <div className="w-full h-32 rounded-2xl overflow-hidden relative">
                      <img src="https://picsum.photos/seed/lush-canopy/600/300" alt="Forest Canopy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div whileHover={{ y: -4 }} className="bg-[#d9e8b5] dark:bg-emerald-900/30 p-6 rounded-[2rem] flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#3d5a2d]/60 dark:text-[#accebc]/60">Species</span>
                      <span className="font-newsreader text-xl italic text-[#3d5a2d] dark:text-[#accebc]">{species.name}</span>
                    </motion.div>
                    <motion.div whileHover={{ y: -4 }} className="bg-[#e5e9e0] dark:bg-[#1d2d25] p-6 rounded-[2rem] flex flex-col gap-1 shadow-sm border border-[#d9e8b5]/20 dark:border-[#accebc]/5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40">Reward</span>
                      <div className="flex items-center gap-2">
                        <span className="font-newsreader text-lg italic text-[#1a1a1a] dark:text-[#d4e7da]">Clover Seed</span>
                        <Gift className="w-4 h-4 text-[#3d5a2d] dark:text-[#accebc]" />
                      </div>
                    </motion.div>
                  </div>
                  <div className="bg-[#f0f4ea] dark:bg-[#0f1f17] p-6 rounded-[2rem] flex flex-col gap-4 border border-[#d9e8b5]/20 dark:border-[#accebc]/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <button 
                          onClick={toggleSound}
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${soundOn ? 'bg-[#3d5a2d] text-white dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-[#d9e8b5]/50 text-[#3d5a2d] dark:bg-emerald-900/20 dark:text-[#accebc]'}`}
                        >
                          {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                        <div className="overflow-hidden min-w-0 pr-2">
                          <p className="font-body font-bold text-sm text-[#1a1a1a] dark:text-[#d4e7da]">Forest Ambient</p>
                          <p className="text-[10px] text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40 uppercase tracking-widest truncate">{audioPlaylist[currentAudioIndex]?.name || 'No audio'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={handlePrevAudio} className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-[#3d5a2d] dark:text-[#accebc] hover:bg-black/10 transition-colors">
                          <SkipBack className="w-4 h-4" />
                        </button>
                        <button onClick={handleNextAudio} className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-[#3d5a2d] dark:text-[#accebc] hover:bg-black/10 transition-colors">
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end border-t border-[#d9e8b5]/40 dark:border-[#accebc]/10 pt-3">
                      <label className="cursor-pointer">
                        <input type="file" multiple accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                        <span className="text-[10px] font-bold text-[#3d5a2d] dark:text-emerald-400 uppercase tracking-widest hover:underline opacity-80 hover:opacity-100 transition-opacity">Upload Files</span>
                      </label>
                    </div>
                  </div>
                </div>
                {isActive && (
                  <div className="mt-4 w-full max-w-[240px] flex flex-col items-center gap-5">
                    <button onClick={giveUp} className="group w-full py-4 px-6 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold text-sm transition-all hover:bg-red-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm">
                      <X className="w-4 h-4" />Give Up
                    </button>
                    <p className="text-[10px] text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40 font-medium uppercase tracking-[0.1em] text-center px-4">Quitting now will cause the sapling to wither</p>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'forest' && <ForestPage totalFocusSeconds={totalFocusSeconds} />}
            {activeTab === 'insights' && <InsightsPage sessions={sessions} hourModel={hourModel} totalFocusSeconds={totalFocusSeconds} giveupCount={giveupCount} />}
            {activeTab === 'profile' && (
              // FIX 3: deviceId now passed to ProfilePage
              <ProfilePage deviceId={deviceId} sessions={sessions} totalFocusSeconds={totalFocusSeconds} giveupCount={giveupCount}
                displayName={displayName} setDisplayName={setDisplayName} profilePic={profilePic} setProfilePic={setProfilePic} />
            )}
          </AnimatePresence>
        </main>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
