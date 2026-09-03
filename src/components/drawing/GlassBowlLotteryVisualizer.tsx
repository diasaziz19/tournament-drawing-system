'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Trophy,
  Star,
  RotateCcw,
  XCircle
} from 'lucide-react';
import { Team } from '../../types/tournament';

interface GlassBowlLotteryVisualizerProps {
  undrawnTeams: Team[];
  isDrawing: boolean;
  isRevealed: boolean;
  currentTeam: Team | null;
  currentSlotLabel: string;
  isAdmin: boolean;
  onConfirmSlot: () => void;
  onCancelDraw?: () => void;
  statusMessage?: string;
}

// Preset color palettes for the glossy lottery balls
const BALL_PALETTES = [
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #38bdf8 35%, #0284c7 70%, #0369a1 100%)', text: '#ffffff', ring: '#0284c7' }, // Cyan
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #fbbf24 35%, #d97706 70%, #b45309 100%)', text: '#ffffff', ring: '#d97706' }, // Gold
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #34d399 35%, #059669 70%, #047857 100%)', text: '#ffffff', ring: '#059669' }, // Emerald
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f472b6 35%, #db2777 70%, #be185d 100%)', text: '#ffffff', ring: '#db2777' }, // Rose
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #a78bfa 35%, #7c3aed 70%, #6d28d9 100%)', text: '#ffffff', ring: '#7c3aed' }, // Violet
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #fb923c 35%, #ea580c 70%, #c2410c 100%)', text: '#ffffff', ring: '#ea580c' }, // Orange
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #818cf8 35%, #4f46e5 70%, #4338ca 100%)', text: '#ffffff', ring: '#4f46e5' }, // Indigo
  { bg: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 35%, #94a3b8 70%, #64748b 100%)', text: '#0f172a', ring: '#94a3b8' }, // Silver
];

// Confetti particle configuration
const CONFETTI_PARTICLES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: (Math.sin(i * 0.4) * 220),
  y: (Math.cos(i * 0.4) * -220 - 40),
  rotation: (i * 45) % 360,
  scale: 0.6 + ((i % 4) * 0.2),
  color: ['#f59e0b', '#38bdf8', '#10b981', '#ec4899', '#8b5cf6', '#eab308'][i % 6]
}));

export const GlassBowlLotteryVisualizer: React.FC<GlassBowlLotteryVisualizerProps> = ({
  undrawnTeams,
  isDrawing,
  isRevealed,
  currentTeam,
  currentSlotLabel,
  isAdmin,
  onConfirmSlot,
  onCancelDraw,
  statusMessage
}) => {
  // Generate representation balls inside the bowl for undrawn teams (up to 14)
  const lotteryBalls = useMemo(() => {
    const list = undrawnTeams.length > 0 ? undrawnTeams : [{ id: 'dummy', name: 'Turnamen', potTier: 1, departmentOrigin: '' } as Team];
    const displayCount = Math.min(list.length, 12);
    
    return list.slice(0, displayCount).map((team, idx) => {
      const palette = BALL_PALETTES[idx % BALL_PALETTES.length];
      // Distribute initial coordinates inside spherical bowl
      const angle = (idx / displayCount) * 2 * Math.PI;
      const radius = 35 + ((idx * 17) % 45); // distance from center
      const initX = Math.cos(angle) * radius;
      const initY = Math.sin(angle) * (radius * 0.65) + 20; // lower half bias due to gravity

      return {
        id: team.id,
        name: team.name,
        shortName: team.name.split(' ')[0].slice(0, 7),
        palette,
        initX,
        initY,
        seed: idx
      };
    });
  }, [undrawnTeams]);

  return (
    <div className="relative w-full max-w-xl flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {/* ==================================================================== */}
        {/* STATE 1: REVEALED - BOLA TERBUKA & MUNCUL KERTAS NAMA TIM           */}
        {/* ==================================================================== */}
        {isRevealed && currentTeam ? (
          <motion.div
            key="opened-ball-stage"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full flex flex-col items-center"
          >
            {/* Confetti Explosion Burst */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
              {CONFETTI_PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
                  animate={{ 
                    opacity: [1, 1, 0], 
                    x: p.x + (Math.random() * 60 - 30), 
                    y: p.y + (Math.random() * 60 - 30), 
                    scale: p.scale, 
                    rotate: p.rotation + 360 
                  }}
                  transition={{ duration: 1.4, ease: "easeOut", delay: p.id * 0.015 }}
                  className="absolute w-3 h-3 rounded-sm shadow-md"
                  style={{ backgroundColor: p.color }}
                />
              ))}
            </div>

            {/* Glowing Spotlight Behind Ball */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-400/25 rounded-full blur-[100px] pointer-events-none" />

            {/* THE OPENING CAPSULE BALL */}
            <div className="relative w-72 h-44 flex flex-col items-center justify-center mb-4 z-10">
              {/* TOP HEMISPHERE (Terangkat ke atas & miring) */}
              <motion.div
                initial={{ y: 0, rotate: 0 }}
                animate={{ y: -65, rotate: -18 }}
                transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.15 }}
                className="w-36 h-[72px] rounded-t-full shadow-2xl relative overflow-hidden border-t-2 border-amber-200"
                style={{
                  background: 'radial-gradient(circle at 50% 20%, #ffffff 0%, #fbbf24 40%, #b45309 85%, #78350f 100%)',
                  boxShadow: '0 -10px 25px rgba(251, 191, 36, 0.4), inset 0 3px 6px rgba(255,255,255,0.8)'
                }}
              >
                {/* Specular curved reflection */}
                <div className="absolute top-2 left-6 w-16 h-5 rounded-full bg-white/40 blur-[1px] rotate-[-10deg]" />
                {/* Metallic rim edge */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 border-t border-amber-400" />
              </motion.div>

              {/* RADIANT GLOW FROM INSIDE OPENED BALL */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.3, 1.1], opacity: [0.6, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-24 h-24 rounded-full bg-amber-300/40 blur-xl pointer-events-none"
              />

              {/* BOTTOM HEMISPHERE (Turun ke bawah) */}
              <motion.div
                initial={{ y: 0, rotate: 0 }}
                animate={{ y: 65, rotate: 12 }}
                transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.15 }}
                className="w-36 h-[72px] rounded-b-full shadow-2xl relative overflow-hidden border-b-2 border-amber-700"
                style={{
                  background: 'radial-gradient(circle at 50% 80%, #ffffff 0%, #fbbf24 30%, #b45309 80%, #451a03 100%)',
                  boxShadow: '0 15px 30px rgba(0, 0, 0, 0.6), inset 0 -3px 6px rgba(0,0,0,0.4)'
                }}
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 border-b border-amber-600" />
              </motion.div>
            </div>

            {/* UNROLLED TOURNAMENT DRAW SLIP / CERTIFICATE (MUNCUL DARI DALAM BOLA) */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.5, rotateX: 60 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.35 }}
              className="relative z-20 w-full max-w-md p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-white via-amber-50 to-amber-100 text-slate-950 border-4 border-amber-400 shadow-2xl shadow-amber-500/30 text-center flex flex-col items-center"
            >
              {/* Gold Official Tournament Ribbon Header */}
              <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-sm mb-3">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>Hasil Resmi Undian</span>
              </div>

              {/* Pot and Slot Badge */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-400 text-xs font-bold">
                  Pot {currentTeam.potTier}
                </span>
                <span className="text-slate-400">•</span>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-950 text-indigo-200 text-xs font-extrabold">
                  {currentSlotLabel}
                </span>
              </div>

              {/* Team Crest / Logo */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-600 p-0.5 shadow-lg mb-2">
                <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                  {currentTeam.logoUrl ? (
                    <img src={currentTeam.logoUrl} alt={currentTeam.name} className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-9 h-9 text-amber-400" />
                  )}
                </div>
              </div>

              {/* Team Name Announcement */}
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {currentTeam.name}
              </h2>
              <p className="text-slate-700 font-bold text-sm mt-0.5">
                {currentTeam.departmentOrigin}
              </p>
              {currentTeam.officialName && (
                <p className="text-xs text-slate-500 mt-0.5 italic">
                  Official: {currentTeam.officialName}
                </p>
              )}

              {/* Slot Destination Banner */}
              <div className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-950 text-white flex items-center justify-between text-xs border border-slate-800">
                <span className="text-slate-400">Masuk ke Slot:</span>
                <span className="font-extrabold text-amber-400 text-xs sm:text-sm flex items-center space-x-1">
                  <span>{currentSlotLabel}</span>
                  <ArrowRight className="w-4 h-4 ml-1 text-amber-400" />
                </span>
              </div>

              {/* Admin Action Buttons: Batal/Undi Ulang & Kunci */}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-5 w-full flex flex-col sm:flex-row items-center gap-2.5"
                >
                  <button
                    type="button"
                    onClick={onCancelDraw}
                    className="w-full sm:w-2/5 py-3.5 px-4 rounded-xl bg-slate-200 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                    title="Batalkan hasil undian ini dan kembali ke mangkuk bola kaca untuk diundi ulang"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>Batal / Undi Ulang</span>
                  </button>

                  <button
                    type="button"
                    onClick={onConfirmSlot}
                    className="w-full sm:w-3/5 py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kunci & Munculkan di Bagan</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          /* ==================================================================== */
          /* STATE 2: THE GLASS BOWL (BOLA KACA) WITH LOTTERY BALLS INSIDE        */
          /* ==================================================================== */
          <motion.div
            key="glass-bowl-stage"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center w-full"
          >
            {/* TOP TARGET SLOT BANNER */}
            <div className="mb-4 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Target Undian: {currentSlotLabel}</span>
            </div>

            {/* THE GLASS BOWL CONTAINER */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-2">
              {/* Backlight Ambient Glow */}
              <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
                isDrawing 
                  ? 'bg-gradient-to-tr from-amber-500/40 via-cyan-500/40 to-indigo-500/40 scale-110' 
                  : 'bg-cyan-500/15'
              }`} />

              {/* GLASS SPHERE (BOLA KACA) */}
              <div 
                className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full backdrop-blur-sm border-2 border-white/30 shadow-[inset_0_0_50px_rgba(255,255,255,0.18),0_20px_40px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(14,165,233,0.08) 70%, rgba(3,105,161,0.2) 100%)'
                }}
              >
                {/* Curved Specular Highlights on Glass Surface */}
                <div className="absolute top-4 left-10 w-28 h-12 rounded-full bg-white/25 blur-[2px] -rotate-45 pointer-events-none" />
                <div className="absolute bottom-6 right-10 w-20 h-8 rounded-full bg-cyan-400/20 blur-[3px] rotate-12 pointer-events-none" />
                <div className="absolute top-2 inset-x-8 h-4 rounded-full border-t-2 border-white/40 pointer-events-none" />

                {/* Swirling Vortex Glow during Drawing */}
                {isDrawing && (
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.15, 1] }}
                    transition={{ rotate: { duration: 1.2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}
                    className="absolute inset-4 rounded-full border-2 border-dashed border-amber-400/40 pointer-events-none"
                  />
                )}

                {/* THE LOTTERY BALLS INSIDE THE GLASS BOWL */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {lotteryBalls.map((ball) => (
                    <motion.div
                      key={ball.id}
                      animate={isDrawing ? {
                        // Rapid chaotic tumbling & bouncing during drawing
                        x: [
                          ball.initX,
                          -ball.initX * 1.3,
                          ball.initY * 1.2,
                          -ball.initY * 1.1,
                          ball.initX
                        ],
                        y: [
                          ball.initY,
                          -ball.initY * 1.2,
                          ball.initX * 1.1,
                          -ball.initX * 1.3,
                          ball.initY
                        ],
                        rotate: [0, 180, 360, 540, 720],
                        scale: [1, 1.1, 0.9, 1.15, 1]
                      } : {
                        // Gentle floating drift when idle
                        x: [ball.initX, ball.initX + (Math.sin(ball.seed) * 12), ball.initX],
                        y: [ball.initY, ball.initY + (Math.cos(ball.seed) * 8), ball.initY],
                        rotate: [0, Math.sin(ball.seed) * 15, 0]
                      }}
                      transition={isDrawing ? {
                        duration: 0.7 + (ball.seed % 3) * 0.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {
                        duration: 3 + (ball.seed % 3),
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center cursor-default select-none border border-white/40"
                      style={{
                        background: ball.palette.bg,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.7)'
                      }}
                      title={ball.name}
                    >
                      {/* Ball shine */}
                      <div className="absolute top-1.5 left-2 w-4 h-2 rounded-full bg-white/60 blur-[0.5px] -rotate-30" />
                      
                      {/* Ball label / team initial */}
                      <span 
                        className="text-[9px] sm:text-[10px] font-black tracking-tighter truncate px-1 text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ color: ball.palette.text }}
                      >
                        {ball.shortName}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* GLASS BOWL BASE / PEDESTAL (DUDUKAN MANGKUK KACA) */}
              <div className="absolute -bottom-3 inset-x-12 h-6 rounded-full bg-gradient-to-r from-slate-800 via-amber-500 to-slate-800 shadow-xl border-t border-amber-300/50 flex items-center justify-center">
                <div className="w-20 h-1 rounded-full bg-amber-200/60 blur-[1px]" />
              </div>
            </div>

            {/* STATUS & DRAWING CAPTION */}
            <div className="mt-4">
              <h3 className="text-xl sm:text-2xl font-black text-slate-100 mb-1">
                {isDrawing ? (statusMessage || 'Mengacak Bola Undian...') : 'Siap Melakukan Pengundian'}
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md">
                {isDrawing
                  ? 'Bola-bola undian sedang diacak di dalam mangkuk kaca resmi...'
                  : isAdmin 
                    ? 'Pilih slot target undian di bawah, lalu klik "Undi Slot" untuk mengacak bola kaca.' 
                    : `Menunggu Panitia mengundi tim untuk ${currentSlotLabel}...`}
              </p>

              <div className="mt-4 inline-flex items-center space-x-3 text-xs text-slate-300 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 shadow-inner">
                <span>Sisa di Mangkuk: <strong className="text-amber-400">{undrawnTeams.length} Bola</strong></span>
                <span>•</span>
                <span>Format: <strong className="text-cyan-400">UEFA Glass Bowl</strong></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
