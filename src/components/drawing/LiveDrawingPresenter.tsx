'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Sparkles, 
  Shield, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Maximize2,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
  Pin
} from 'lucide-react';
import { Team, DrawingSession } from '../../types/tournament';
import { tournamentService } from '../../lib/firestore-converters';
import { getAvailableBracketSlots } from '../../lib/engines/knockout-engine';

interface LiveDrawingPresenterProps {
  tournamentTitle: string;
  tournamentId: string;
  teams: Team[];
  session: DrawingSession | null;
  isAdmin?: boolean;
  onSlotAssigned?: (teamId: string, slotNumber: number) => void;
}

// Web Audio API sound generator for browser-native sound effects
function playSoundEffect(type: 'drumroll' | 'reveal' | 'fanfare' | 'click') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'reveal') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.65);
      });
    } else if (type === 'fanfare') {
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + 1.2);
      });
    }
  } catch (e) {}
}

export const LiveDrawingPresenter: React.FC<LiveDrawingPresenterProps> = ({
  tournamentTitle,
  tournamentId,
  teams,
  session,
  isAdmin = false,
  onSlotAssigned
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localPotFilter, setLocalPotFilter] = useState<number | 'all'>('all');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Available slots for the tournament (e.g. 19 teams)
  const allBracketSlots = getAvailableBracketSlots(teams.length);
  const assignedSlots = new Set(teams.map(t => t.drawnSlot).filter((s): s is number => s !== null));

  // Vacant slots to be drawn
  const vacantSlots = allBracketSlots.filter(s => !assignedSlots.has(s.slotId));

  // Teams that have not been drawn or seeded yet
  const undrawnTeams = teams.filter(t => t.drawnSlot === null);
  // Teams that are already plotted (seeded or drawn)
  const drawnTeams = teams.filter(t => t.drawnSlot !== null).sort((a, b) => (a.drawnSlot || 0) - (b.drawnSlot || 0));

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Sound effects
  useEffect(() => {
    if (!soundEnabled || !session) return;
    if (session.status === 'revealing' && session.isRevealed) {
      playSoundEffect('reveal');
    } else if (session.status === 'completed') {
      playSoundEffect('fanfare');
    }
  }, [session?.isRevealed, session?.status, soundEnabled]);

  // Next slot target label
  const targetSlotObj = vacantSlots[0] || null;
  const currentSlotLabel = targetSlotObj ? targetSlotObj.label : `Slot #${session?.currentSlot || ''}`;

  // Admin Controller Handlers
  const handleStartDraw = async () => {
    if (!isAdmin || undrawnTeams.length === 0 || !targetSlotObj) return;
    if (soundEnabled) playSoundEffect('click');

    let pool = undrawnTeams;
    if (localPotFilter !== 'all') {
      const potMatches = undrawnTeams.filter(t => t.potTier === localPotFilter);
      if (potMatches.length > 0) pool = potMatches;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedTeam = pool[randomIndex];
    const nextSlot = targetSlotObj.slotId;

    // Check department clash
    let warning: string | null = null;
    const opponentSlot = nextSlot % 2 === 1 ? nextSlot + 1 : nextSlot - 1;
    const existingOpponent = teams.find(t => t.drawnSlot === opponentSlot);
    if (existingOpponent && existingOpponent.departmentOrigin === selectedTeam.departmentOrigin) {
      warning = `⚠️ Proteksi Departemen: ${selectedTeam.name} dan ${existingOpponent.name} berasal dari instansi yang sama (${selectedTeam.departmentOrigin})!`;
    }
    setConflictWarning(warning);

    // Broadcast drawing state
    await tournamentService.updateDrawingSession(tournamentId, {
      status: 'drawing',
      currentTeam: selectedTeam,
      currentSlot: nextSlot,
      currentPot: selectedTeam.potTier,
      isRevealed: false,
      message: `Mengundi ${targetSlotObj.label}...`
    });

    // Auto reveal after 2.8s
    setTimeout(async () => {
      await tournamentService.updateDrawingSession(tournamentId, {
        status: 'revealing',
        isRevealed: true,
        message: `Terpilih: ${selectedTeam.name}!`
      });
    }, 2800);
  };

  const handleConfirmSlot = async () => {
    if (!isAdmin || !session?.currentTeam || !session?.currentSlot) return;
    const teamId = session.currentTeam.id;
    const slotNum = session.currentSlot;

    if (onSlotAssigned) {
      onSlotAssigned(teamId, slotNum);
    }

    const remainingCount = undrawnTeams.filter(t => t.id !== teamId).length;

    await tournamentService.updateDrawingSession(tournamentId, {
      status: remainingCount === 0 ? 'completed' : 'idle',
      currentTeam: null,
      currentSlot: null,
      isRevealed: false,
      revealedTeamIds: [...(session.revealedTeamIds || []), teamId],
      message: remainingCount === 0 ? '🎉 Seluruh Undian Selesai!' : undefined
    });

    setConflictWarning(null);
  };

  const handleResetDraw = async () => {
    if (!isAdmin || !window.confirm('Reset hasil undian slot (selain tim unggulan terplot)?')) return;
    // Clear drawn slots for non-seeded teams
    const resetTeams = teams.map(t => {
      if (t.seedNumber && [1, 2, 3, 4].includes(t.seedNumber)) return t; // Keep seeds
      return { ...t, drawnSlot: null };
    });

    if (onSlotAssigned) {
      resetTeams.forEach(t => {
        if (t.drawnSlot === null) onSlotAssigned(t.id, null as any);
      });
    }

    await tournamentService.updateDrawingSession(tournamentId, {
      status: 'idle',
      currentTeam: null,
      currentSlot: null,
      isRevealed: false,
      revealedTeamIds: resetTeams.filter(t => t.drawnSlot !== null).map(t => t.id),
      message: 'Sesi Undian Di-reset'
    });
  };

  const isDrawing = session?.status === 'drawing';
  const isRevealed = session?.isRevealed && session?.currentTeam !== null;
  const currentTeam = session?.currentTeam;
  const currentSlot = session?.currentSlot;

  return (
    <div 
      ref={containerRef}
      className="relative min-h-[700px] w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col justify-between p-6 sm:p-8"
    >
      {/* Background Stadium Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/30 rounded-full blur-[160px]" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              Official Tournament Live Drawing
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
              {tournamentTitle}
            </h1>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Layar Penuh (Projector / Zoom)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawing Stage Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-8">
        {conflictWarning && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 flex items-center space-x-2 text-sm max-w-lg text-center animate-bounce">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{conflictWarning}</span>
          </div>
        )}

        <div className="w-full max-w-xl flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!currentTeam && session?.status !== 'completed' && (
              <motion.div
                key="idle-stage"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center text-center p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl"
              >
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 p-1 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-5">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                </div>

                <div className="mb-2 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black uppercase tracking-wider">
                  Target: {currentSlotLabel}
                </div>

                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  Siap Melakukan Pengundian
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm max-w-md">
                  {isAdmin 
                    ? `Klik tombol "Ambil Undian Berikutnya" untuk mengacak tim yang mengisi ${currentSlotLabel}. Begitu dikonfirmasi, tim otomatis muncul di Bagan.` 
                    : `Menunggu Panitia mengundi tim yang akan menempati ${currentSlotLabel}...`}
                </p>

                <div className="mt-6 flex items-center space-x-4 text-xs text-slate-300 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
                  <span>Sisa Belum Diundi: <strong className="text-amber-400">{undrawnTeams.length}</strong></span>
                  <span>•</span>
                  <span>Sudah Terplot: <strong className="text-emerald-400">{drawnTeams.length}</strong></span>
                </div>
              </motion.div>
            )}

            {isDrawing && !isRevealed && (
              <motion.div
                key="drawing-animation"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center justify-center p-12 text-center"
              >
                <motion.div
                  animate={{
                    rotateY: [0, 360, 720, 1080],
                    rotateX: [0, 15, -15, 0],
                    scale: [1, 1.1, 0.95, 1.05, 1]
                  }}
                  transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity }}
                  className="w-44 h-44 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 p-1.5 shadow-2xl shadow-amber-500/30 flex items-center justify-center cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center border-4 border-amber-300/40">
                    <Shield className="w-16 h-16 text-amber-300 animate-pulse" />
                    <span className="text-xs font-bold text-amber-400 tracking-widest mt-1 uppercase">
                      Mengundi...
                    </span>
                  </div>
                </motion.div>

                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="mt-6 text-lg font-bold text-slate-200 tracking-wide"
                >
                  {session?.message || 'Mengacak Tim...'}
                </motion.p>
              </motion.div>
            )}

            {isRevealed && currentTeam && (
              <motion.div
                key="revealed-card"
                initial={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full max-w-md p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/90 border-2 border-amber-400/80 shadow-2xl shadow-amber-500/20 text-center flex flex-col items-center"
              >
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pot {currentTeam.potTier} • {currentSlotLabel}</span>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-1 mb-4 shadow-xl shadow-amber-500/20"
                >
                  <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                    {currentTeam.logoUrl ? (
                      <img src={currentTeam.logoUrl} alt={currentTeam.name} className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-12 h-12 text-amber-400" />
                    )}
                  </div>
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                  {currentTeam.name}
                </h2>
                <p className="text-slate-300 font-medium text-base mt-1">
                  {currentTeam.departmentOrigin}
                </p>
                {currentTeam.officialName && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official: {currentTeam.officialName}
                  </p>
                )}

                <div className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Penempatan Slot Bagan:</span>
                  <span className="font-extrabold text-amber-400 text-sm flex items-center space-x-1">
                    <span>{currentSlotLabel}</span>
                    <ArrowRight className="w-4 h-4 ml-1 text-amber-400" />
                  </span>
                </div>

                {isAdmin && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleConfirmSlot}
                    className="mt-6 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Kunci & Munculkan di Bagan</span>
                  </motion.button>
                )}
              </motion.div>
            )}

            {session?.status === 'completed' && (
              <motion.div
                key="completed-stage"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center p-10 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-emerald-500/50 shadow-2xl max-w-md"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-white">
                  Pengundian Selesai!
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm mt-2">
                  Seluruh slot turnamen telah terisi dan terplot ke dalam bagan pertandingan resmi.
                </p>
                {isAdmin && (
                  <button
                    onClick={handleResetDraw}
                    className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Hasil Undian Slot</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Admin Control Dock */}
      {isAdmin && session?.status !== 'completed' && (
        <div className="relative z-10 bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 mt-auto">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Filter Pot:
            </span>
            {(['all', 1, 2, 3] as const).map(p => (
              <button
                key={p}
                onClick={() => setLocalPotFilter(p)}
                disabled={isDrawing}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  localPotFilter === p
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {p === 'all' ? 'Semua Pot' : `Pot ${p}`}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetDraw}
              disabled={isDrawing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Undian</span>
            </button>

            <button
              onClick={handleStartDraw}
              disabled={isDrawing || isRevealed || undrawnTeams.length === 0 || !targetSlotObj}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Undi {targetSlotObj ? targetSlotObj.label : 'Slot Berikutnya'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Ticker */}
      <div className="relative z-10 border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between text-xs text-slate-400 overflow-hidden">
        <span className="font-semibold text-slate-300 flex-shrink-0 mr-4">
          Tim Terplot di Bagan ({drawnTeams.length}/{teams.length}):
        </span>
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          {drawnTeams.length === 0 ? (
            <span className="italic text-slate-500">Belum ada tim yang terplot</span>
          ) : (
            drawnTeams.map(t => (
              <span 
                key={t.id}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 flex-shrink-0"
              >
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                  #{t.drawnSlot}
                </span>
                <span className="font-medium">{t.name}</span>
                {t.seedNumber && [1, 2, 3, 4].includes(t.seedNumber) && (
                  <span className="text-[9px] text-amber-400 font-bold">★ Unggulan {t.seedNumber}</span>
                )}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
