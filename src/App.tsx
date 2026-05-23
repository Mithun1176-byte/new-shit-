import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TreePine, X, Home, Trees, TrendingUp, User,
  Sprout, Leaf, Gift, Volume2, Plus, Minus,
  Trophy, Flame, Brain, Clock, AlertTriangle, Star, ChevronUp,
} from 'lucide-react';

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
  } catch {
    return fallback;
  }
}

const ALPHA = 0.35;

function learnFromSession(
  model: HourModel[],
  hour: number,
  completed: boolean,
  durationMins: number,
  goalMins: number
): HourModel[] {
  const next = model.map((h) => ({ ...h }));

  const signal = completed
    ? Math.min(durationMins / goalMins, 1)
    : (durationMins / goalMins) * 0.3;

  if (next[hour].count === 0) {
    next[hour].score = signal;
  } else {
    next[hour].score =
      (1 - ALPHA) * next[hour].score + ALPHA * signal;
  }

  next[hour].count += 1;

  return next;
}

function getPeakHour(model: HourModel[]): number | null {
  const trained = model.filter((h) => h.count > 0);

  if (trained.length < 2) return null;

  return model.reduce((best, h, i) =>
    h.score > model[best].score ? i : best,
  0);
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

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

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
  { name: 'Ancient Oak', rarity: 'Rare', minMins: 60 },
  { name: 'Whispering Willow', rarity: 'Epic', minMins: 120 },
  { name: 'Lone Pine', rarity: 'Legendary', minMins: 240 },
];

function getSpecies(totalMins: number) {
  for (let i = TREE_SPECIES.length - 1; i >= 0; i--) {
    if (totalMins >= TREE_SPECIES[i].minMins) {
      return TREE_SPECIES[i];
    }
  }

  return TREE_SPECIES[0];
}

/* =========================================================
   COMPONENTS
========================================================= */

const CompletionCelebration = ({
  onDismiss,
  species,
}: {
  onDismiss: () => void;
  species: string;
}) => (
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
        animate={{
          rotate: [0, -10, 10, -5, 5, 0],
          scale: [1, 1.2, 1],
        }}
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
          A{' '}
          <span className="text-[#3d5a2d] dark:text-emerald-400 font-bold">
            {species}
          </span>{' '}
          has been added to your forest
        </p>
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
  <header className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-[#07160f]/80 backdrop-blur-xl">
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

const BottomNav = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'forest', label: 'Forest', icon: Trees },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 bg-white/90 dark:bg-[#07160f]/90 backdrop-blur-2xl rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center w-full px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center px-4 py-2 transition-all rounded-full relative ${
                isActive
                  ? 'text-[#1a1a1a] dark:text-emerald-50'
                  : 'text-[#1a1a1a]/40 dark:text-emerald-400/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#d9e8b5] dark:bg-emerald-900/40 rounded-full -z-10"
                />
              )}

              <Icon
                className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`}
              />

              <span className="font-body text-[10px] font-bold tracking-wide uppercase mt-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const [duration, setDuration] = useState(() =>
    load('duration', 25)
  );

  const [timeLeft, setTimeLeft] = useState(
    load('duration', 25) * 60
  );

  const [isActive, setIsActive] = useState(false);

  const [showCelebration, setShowCelebration] =
    useState(false);

  const [deviceId] = useState(getDeviceId);

  const [isCloudSyncing, setIsCloudSyncing] =
    useState(true);

  const [totalFocusSeconds, setTotalFocusSeconds] =
    useState<number>(() => load('totalFocusSeconds', 0));

  const [sessions, setSessions] = useState<Session[]>(
    () => load('sessions', [])
  );

  const [giveupCount, setGiveupCount] =
    useState<number>(() => load('giveupCount', 0));

  const [hourModel, setHourModel] = useState<
    HourModel[]
  >(() =>
    load(
      'hourModel',
      Array(24)
        .fill(null)
        .map(() => ({
          score: 0.5,
          count: 0,
        }))
    )
  );

  const [displayName, setDisplayName] =
    useState<string>(() =>
      load('displayName', 'Forest Keeper')
    );

  const [profilePic, setProfilePic] =
    useState<string>(() =>
      load(
        'profilePic',
        'https://picsum.photos/seed/keeper/200'
      )
    );

  const sessionIdRef = useRef<number>(
    load('sessionIdRef', 0)
  );

  const [sessionStartTime, setSessionStartTime] =
    useState<Date | null>(null);

  // =====================================================
  // NEW TIMER FIX
  // =====================================================

  const sessionStartRef = useRef<number | null>(null);

  const totalTime = duration * 60;

  const progress = (timeLeft / totalTime) * 100;

  const strokeDashoffset =
    880 - (880 * progress) / 100;

  const growthProgress =
    (totalTime - timeLeft) / totalTime;

  const species = getSpecies(
    Math.floor(totalFocusSeconds / 60)
  );

  /* =====================================================
     SAVE LOCAL
  ===================================================== */

  useEffect(() => {
    save('sessions', sessions);
  }, [sessions]);

  useEffect(() => {
    save('hourModel', hourModel);
  }, [hourModel]);

  useEffect(() => {
    save('totalFocusSeconds', totalFocusSeconds);
  }, [totalFocusSeconds]);

  useEffect(() => {
    save('giveupCount', giveupCount);
  }, [giveupCount]);

  useEffect(() => {
    save('duration', duration);
  }, [duration]);

  useEffect(() => {
    save('displayName', displayName);
  }, [displayName]);

  useEffect(() => {
    save('profilePic', profilePic);
  }, [profilePic]);

  /* =====================================================
     CLOUD SYNC
  ===================================================== */

  useEffect(() => {
    async function syncCloud() {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', deviceId)
          .maybeSingle();

        if (profile) {
          if (profile.total_focus_seconds) {
            setTotalFocusSeconds(
              profile.total_focus_seconds
            );
          }

          if (profile.giveup_count) {
            setGiveupCount(profile.giveup_count);
          }

          if (profile.hour_model) {
            setHourModel(profile.hour_model);
          }

          if (profile.display_name) {
            setDisplayName(profile.display_name);
          }

          if (profile.profile_pic) {
            setProfilePic(profile.profile_pic);
          }
        } else {
          await supabase
            .from('user_profiles')
            .insert({ id: deviceId });
        }
      } catch (err) {
        console.warn('Cloud sync failed:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }

    syncCloud();
  }, [deviceId]);

  /* =====================================================
     RESET TIMER WHEN DURATION CHANGES
  ===================================================== */

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isActive]);

  /* =====================================================
     NEW ACCURATE TIMER
  ===================================================== */

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive) {
      if (!sessionStartRef.current) {
        sessionStartRef.current =
          Date.now() -
          ((totalTime - timeLeft) * 1000);
      }

      interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() -
            sessionStartRef.current!) /
            1000
        );

        const remaining = Math.max(
          totalTime - elapsed,
          0
        );

        setTimeLeft(remaining);

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

  /* =====================================================
     START SESSION
  ===================================================== */

  const startSession = () => {
    // Notification permission
    if (
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }

    setSessionStartTime(new Date());

    setIsActive(true);
  };

  /* =====================================================
     COMPLETE SESSION
  ===================================================== */

  const handleComplete = async () => {
    setIsActive(false);

    // Desktop notification
    if (
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('🌲 Session Complete!', {
        body:
          'Your tree has been planted. Great work!',
      });
    }

    const now = new Date();

    const hour = (
      sessionStartTime || now
    ).getHours();

    const finalTotalSeconds =
      totalFocusSeconds + totalTime;

    setTotalFocusSeconds(finalTotalSeconds);

    const newSession: Session = {
      id: ++sessionIdRef.current,
      durationMins: duration,
      goalMins: duration,
      completed: true,
      hour,
      date: today(),
      dayOfWeek: now.getDay(),
    };

    save('sessionIdRef', sessionIdRef.current);

    setSessions((p) => [...p, newSession]);

    const nextModel = learnFromSession(
      hourModel,
      hour,
      true,
      duration,
      duration
    );

    setHourModel(nextModel);

    setTimeLeft(totalTime);

    setSessionStartTime(null);

    setShowCelebration(true);

    try {
      await supabase.from('sessions').insert({
        user_id: deviceId,
        duration_mins: duration,
        goal_mins: duration,
        completed: true,
        hour,
        date: today(),
        day_of_week: now.getDay(),
      });

      await supabase
        .from('user_profiles')
        .update({
          total_focus_seconds:
            finalTotalSeconds,
          hour_model: nextModel,
        })
        .eq('id', deviceId);
    } catch (e) {
      console.error(
        'Supabase save failed:',
        e
      );
    }
  };

  /* =====================================================
     GIVE UP
  ===================================================== */

  const giveUp = async () => {
    setIsActive(false);

    const now = new Date();

    const hour = (
      sessionStartTime || now
    ).getHours();

    const elapsed = Math.round(
      (totalTime - timeLeft) / 60
    );

    const newSession: Session = {
      id: ++sessionIdRef.current,
      durationMins: Math.max(elapsed, 1),
      goalMins: duration,
      completed: false,
      hour,
      date: today(),
      dayOfWeek: now.getDay(),
    };

    save('sessionIdRef', sessionIdRef.current);

    setSessions((p) => [...p, newSession]);

    const nextModel = learnFromSession(
      hourModel,
      hour,
      false,
      Math.max(elapsed, 1),
      duration
    );

    setHourModel(nextModel);

    const newGiveups = giveupCount + 1;

    setGiveupCount(newGiveups);

    setTimeLeft(totalTime);

    setSessionStartTime(null);

    try {
      await supabase.from('sessions').insert({
        user_id: deviceId,
        duration_mins: Math.max(elapsed, 1),
        goal_mins: duration,
        completed: false,
        hour,
        date: today(),
        day_of_week: now.getDay(),
      });

      await supabase
        .from('user_profiles')
        .update({
          giveup_count: newGiveups,
          hour_model: nextModel,
          total_focus_seconds:
            totalFocusSeconds,
        })
        .eq('id', deviceId);
    } catch (e) {
      console.error(
        'Supabase save failed:',
        e
      );
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen transition-colors duration-500 dark bg-[#0f1f17]">
      <div className="min-h-screen text-emerald-900 dark:text-[#d4e7da] flex flex-col items-center selection:bg-emerald-500/30">
        <TopBar />

        <AnimatePresence>
          {showCelebration && (
            <CompletionCelebration
              onDismiss={() =>
                setShowCelebration(false)
              }
              species={species.name}
            />
          )}
        </AnimatePresence>

        <main className="flex-grow w-full max-w-lg px-6 pt-32 pb-40 flex flex-col items-center relative overflow-hidden">
          <div className="w-full mb-12 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/40 dark:text-[#c3c8c2]/40 mb-2">
              {getGreeting()}, {displayName}
            </p>

            <h2 className="font-body font-bold text-4xl text-[#1a1a1a] dark:text-[#d4e7da] leading-tight mb-4">
              Tend to your <br />
              inner forest.
            </h2>
          </div>

          <div className="relative w-72 h-72 flex items-center justify-center mb-6">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                className="text-[#d9e8b5]/20 dark:text-[#28382f]"
                cx="144"
                cy="144"
                fill="transparent"
                r="140"
                stroke="currentColor"
                strokeWidth="2"
              />

              <motion.circle
                className="text-[#d9e8b5] dark:text-[#accebc]"
                cx="144"
                cy="144"
                fill="transparent"
                r="140"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="880"
                animate={{
                  strokeDashoffset,
                }}
                transition={{
                  duration: 1,
                  ease: 'linear',
                }}
                strokeLinecap="round"
              />
            </svg>

            <motion.button
              onClick={
                isActive
                  ? undefined
                  : startSession
              }
              whileHover={
                isActive
                  ? {}
                  : { scale: 1.02 }
              }
              whileTap={
                isActive
                  ? {}
                  : { scale: 0.98 }
              }
              className={`relative w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/10 overflow-hidden group ${
                isActive
                  ? 'cursor-default'
                  : 'cursor-pointer'
              }`}
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={`https://picsum.photos/seed/${
                    isActive
                      ? 'lush-plant'
                      : 'forest-seed'
                  }/400`}
                  alt="Growing Plant"
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${
                      1 +
                      growthProgress * 0.4
                    })`,
                  }}
                />

                <div className="absolute inset-0 bg-emerald-950/40 group-hover:bg-emerald-950/30 transition-colors" />
              </div>

              <div className="relative z-10 flex flex-col items-center gap-1">
                <span className="font-newsreader text-3xl italic text-white drop-shadow-lg">
                  {isActive
                    ? 'Growing...'
                    : 'Plant'}
                </span>

                {isActive && (
                  <div className="font-body text-sm text-[#d9e8b5] font-bold tracking-widest uppercase drop-shadow-md">
                    {Math.floor(
                      timeLeft / 60
                    )}
                    :
                    {(timeLeft % 60)
                      .toString()
                      .padStart(2, '0')}
                  </div>
                )}
              </div>
            </motion.button>
          </div>

          {!isActive && (
            <div className="flex items-center gap-6 px-3 py-3 bg-[#13231a]/60 backdrop-blur-xl rounded-full border border-[#accebc]/10 shadow-lg">
              <button
                onClick={() =>
                  setDuration(
                    Math.max(
                      5,
                      (duration || 0) - 5
                    )
                  )
                }
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0a1610] text-[#accebc]"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center justify-center min-w-[72px]">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={duration || ''}
                  onChange={(e) => {
                    const val =
                      e.target.value.replace(
                        /\D/g,
                        ''
                      );

                    setDuration(
                      val === ''
                        ? 0
                        : Math.min(
                            360,
                            parseInt(val, 10)
                          )
                    );
                  }}
                  onBlur={() => {
                    if (
                      !duration ||
                      duration < 5
                    ) {
                      setDuration(5);
                    }
                  }}
                  className="bg-transparent text-center font-newsreader text-4xl text-white tracking-tight outline-none w-20"
                />

                <span className="text-[9px] font-bold text-[#a5baad] uppercase tracking-[0.25em] mt-1">
                  Mins
                </span>
              </div>

              <button
                onClick={() =>
                  setDuration(
                    Math.min(
                      360,
                      (duration || 0) + 5
                    )
                  )
                }
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0a1610] text-[#accebc]"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          {isActive && (
            <div className="mt-4 w-full max-w-[240px] flex flex-col items-center gap-5">
              <button
                onClick={giveUp}
                className="group w-full py-4 px-6 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold text-sm"
              >
                Give Up
              </button>
            </div>
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
    </div>
  );
}
