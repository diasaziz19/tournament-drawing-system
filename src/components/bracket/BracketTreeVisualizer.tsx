'use client';

import React, { useState, useMemo } from 'react';
import { Match, TeamMatchSlot } from '../../types/tournament';
import { Trophy, Clock, ZoomIn, ZoomOut, RotateCcw, ArrowRight, Star, Shield, LayoutGrid, Award } from 'lucide-react';
import { MatchScoreModal } from './MatchScoreModal';

interface BracketTreeVisualizerProps {
  matches: Match[];
  isAdmin: boolean;
  onSaveScore: (matchId: string, scores: {
    homeScore: number;
    awayScore: number;
    homePenalty?: number | null;
    awayPenalty?: number | null;
  }) => Promise<void>;
}

export const BracketTreeVisualizer: React.FC<BracketTreeVisualizerProps> = ({
  matches,
  isAdmin,
  onSaveScore
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'excel_schema' | 'cards'>('excel_schema');

  // Quick lookup map of matches by matchNumber
  const matchMap = useMemo(() => {
    const map = new Map<number, Match>();
    matches.forEach(m => map.set(m.matchNumber, m));
    return map;
  }, [matches]);

  const m1 = matchMap.get(1);
  const m2 = matchMap.get(2);
  const m3 = matchMap.get(3);
  const m4 = matchMap.get(4);
  const m5 = matchMap.get(5);
  const m6 = matchMap.get(6);
  const m7 = matchMap.get(7);
  const m8 = matchMap.get(8);
  const m9 = matchMap.get(9);
  const m10 = matchMap.get(10);
  const m11 = matchMap.get(11);
  const m12 = matchMap.get(12);
  const m13 = matchMap.get(13);
  const m14 = matchMap.get(14);
  const m15 = matchMap.get(15);
  const m16 = matchMap.get(16);
  const m17 = matchMap.get(17);
  const m18 = matchMap.get(18); // Juara 3
  const m19 = matchMap.get(19); // Final

  // Champion Name
  const championName = useMemo(() => {
    if (m19 && m19.status === 'completed' && m19.winnerTeamId) {
      return m19.winnerTeamId === m19.homeTeam.id ? m19.homeTeam.name : m19.awayTeam.name;
    }
    return null;
  }, [m19]);

  // Helper to extract team slot from match
  const getSlot = (match: Match | undefined, side: 'home' | 'away') => {
    if (!match) return null;
    return side === 'home' ? match.homeTeam : match.awayTeam;
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(1.4, Math.max(0.65, Number((prev + delta).toFixed(1)))));
  };

  const resetZoom = () => setZoomLevel(1);

  return (
    <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-white flex flex-col">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-100 flex items-center space-x-2">
              <span>Bagan Resmi Turnamen Dies Natalis UMS 2026</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                19 Tim (5 Babak)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Skema resmi bagan gugur sesuai kesepakatan Technical Meeting.
            </p>
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('excel_schema')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'excel_schema'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Skema Bagan Resmi</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Bagan Kartu</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors border-l border-slate-700 ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Champion Banner */}
      {championName && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border-b border-amber-400/40 p-4 text-center animate-pulse">
          <div className="inline-flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span className="text-sm uppercase tracking-wider font-extrabold text-amber-300">
              Juara 1 Turnamen Dies Natalis:
            </span>
            <span className="text-lg font-black text-white px-3.5 py-0.5 rounded-lg bg-amber-500/30 border border-amber-400">
              {championName}
            </span>
          </div>
        </div>
      )}

      {/* Main Bracket Area */}
      <div 
        className="w-full overflow-x-auto overflow-y-hidden p-6 sm:p-8 transition-transform origin-top-left"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        {viewMode === 'excel_schema' ? (
          /* ============================================================ */
          /* 1. EXACT EXCEL SPREADSHEET BRACKET VIEW                      */
          /* ============================================================ */
          <div className="min-w-[1280px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4">
            {/* 5 Column Headers in Blue as shown in user spreadsheet */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-blue-700 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl text-center shadow-md">
                Play-off (28 Sep)
              </div>
              <div className="bg-blue-700 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl text-center shadow-md">
                Babak 16 Besar (28-29 Sep)
              </div>
              <div className="bg-blue-700 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl text-center shadow-md">
                Perempat Final (30 Sep)
              </div>
              <div className="bg-blue-700 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl text-center shadow-md">
                Semifinal (1 Okt)
              </div>
              <div className="bg-blue-700 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl text-center shadow-md">
                Grand Final (2 Okt)
              </div>
            </div>

            {/* Tree Rows Container */}
            <div className="space-y-4 text-xs">
              {/* ==================================================== */}
              {/* POOL ATAS (TOP HALF) -> FINALIS 1                    */}
              {/* ==================================================== */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="text-[11px] font-black text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-800">
                  <span>Pool Atas (Undian 1 s/d 10 ➔ Menuju Finalis 1)</span>
                </div>

                {/* Section 1A: M1 & M7 & M4 -> M12 */}
                <div className="grid grid-cols-5 gap-4 items-center">
                  {/* Col 1: Playoff M1 (Undian 1 vs 2) */}
                  <div className="space-y-2">
                    <SlotCell slotNum={1} slot={getSlot(m1, 'home')} />
                    <MatchButton match={m1} label="M#1 (Playoff)" onClick={() => setSelectedMatch(m1 || null)} />
                    <SlotCell slotNum={2} slot={getSlot(m1, 'away')} />
                  </div>

                  {/* Col 2: 16 Besar M7 (Menang M1 vs Undian 3) & M4 (Undian 4 vs 5) */}
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#7 (16 Besar)</div>
                      <div className="font-semibold text-white truncate text-[11px]">{m7?.homeTeam.name || 'Menang M1'}</div>
                      <div className="text-[10px] text-slate-500">vs</div>
                      <SlotCell slotNum={3} slot={getSlot(m7, 'away')} compact isSeed seedRank={1} />
                      <MatchScoreBadge match={m7} onClick={() => setSelectedMatch(m7 || null)} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#4 (16 Besar)</div>
                      <SlotCell slotNum={4} slot={getSlot(m4, 'home')} compact />
                      <div className="text-[10px] text-slate-500 my-0.5">vs</div>
                      <SlotCell slotNum={5} slot={getSlot(m4, 'away')} compact />
                      <MatchScoreBadge match={m4} onClick={() => setSelectedMatch(m4 || null)} />
                    </div>
                  </div>

                  {/* Col 3: Perempat Final M12 (Menang M7 vs Menang M4) */}
                  <div>
                    <div className="p-3 rounded-xl bg-slate-900 border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10">
                      <div className="text-[10px] font-bold text-cyan-400 mb-1">M#12 (8 Besar QF 1)</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m12?.homeTeam.name || 'Menang M7'}</div>
                      <div className="text-[10px] text-slate-500 my-1">vs</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m12?.awayTeam.name || 'Menang M4'}</div>
                      <MatchScoreBadge match={m12} onClick={() => setSelectedMatch(m12 || null)} />
                    </div>
                  </div>

                  {/* Col 4: Semifinal M16 -> FINALIS 1 Banner */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-500/20 border-2 border-amber-300">
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900">
                        Semifinal (M#16) ➔ FINALIS 1
                      </div>
                      <div className="text-sm font-black truncate mt-0.5">
                        {m16?.winnerTeamId ? (m16.winnerTeamId === m16.homeTeam.id ? m16.homeTeam.name : m16.awayTeam.name) : (m16 ? `${m16.homeTeam.name} vs ${m16.awayTeam.name}` : 'Menang M12 vs Menang M13')}
                      </div>
                      <button
                        onClick={() => setSelectedMatch(m16 || null)}
                        className="mt-2 px-2.5 py-1 bg-slate-950/90 text-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Skor / Detail Semifinal 1</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 1B: M2 & M8 & M5 -> M13 */}
                <div className="grid grid-cols-5 gap-4 items-center pt-3 border-t border-slate-800/60">
                  {/* Col 1: Playoff M2 (Undian 6 vs 7) */}
                  <div className="space-y-2">
                    <SlotCell slotNum={6} slot={getSlot(m2, 'home')} />
                    <MatchButton match={m2} label="M#2 (Playoff)" onClick={() => setSelectedMatch(m2 || null)} />
                    <SlotCell slotNum={7} slot={getSlot(m2, 'away')} />
                  </div>

                  {/* Col 2: 16 Besar M8 (Menang M2 vs Undian 8) & M5 (Undian 9 vs 10) */}
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#8 (16 Besar)</div>
                      <div className="font-semibold text-white truncate text-[11px]">{m8?.homeTeam.name || 'Menang M2'}</div>
                      <div className="text-[10px] text-slate-500">vs</div>
                      <SlotCell slotNum={8} slot={getSlot(m8, 'away')} compact isSeed seedRank={4} />
                      <MatchScoreBadge match={m8} onClick={() => setSelectedMatch(m8 || null)} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#5 (16 Besar)</div>
                      <SlotCell slotNum={9} slot={getSlot(m5, 'home')} compact />
                      <div className="text-[10px] text-slate-500 my-0.5">vs</div>
                      <SlotCell slotNum={10} slot={getSlot(m5, 'away')} compact />
                      <MatchScoreBadge match={m5} onClick={() => setSelectedMatch(m5 || null)} />
                    </div>
                  </div>

                  {/* Col 3: Perempat Final M13 (Menang M8 vs Menang M5) */}
                  <div>
                    <div className="p-3 rounded-xl bg-slate-900 border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10">
                      <div className="text-[10px] font-bold text-cyan-400 mb-1">M#13 (8 Besar QF 2)</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m13?.homeTeam.name || 'Menang M8'}</div>
                      <div className="text-[10px] text-slate-500 my-1">vs</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m13?.awayTeam.name || 'Menang M5'}</div>
                      <MatchScoreBadge match={m13} onClick={() => setSelectedMatch(m13 || null)} />
                    </div>
                  </div>

                  <div className="col-span-2 text-slate-500 italic text-[11px] pl-4">
                    ── Mengalir menuju Semifinal 1 (M#16)
                  </div>
                </div>
              </div>

              {/* ==================================================== */}
              {/* GRAND FINAL & JUARA 3 CENTER PODIUM                  */}
              {/* ==================================================== */}
              <div className="my-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/80 shadow-2xl flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 p-1 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Trophy className="w-8 h-8 text-slate-950 fill-slate-950" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                      Partai Puncak (2 Oktober)
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      M#19 • Grand Final Turnamen
                    </h3>
                    <p className="text-xs text-slate-300">
                      Finalis 1 (Menang M16) vs Finalis 2 (Menang M17)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {m19 && (
                    <button
                      onClick={() => setSelectedMatch(m19)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all"
                    >
                      <Trophy className="w-4 h-4 fill-slate-950" />
                      <span>{m19.status === 'completed' ? `Juara: ${championName}` : 'Input Skor Grand Final'}</span>
                    </button>
                  )}

                  {m18 && (
                    <button
                      onClick={() => setSelectedMatch(m18)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                    >
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>M#18 (Juara 3)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ==================================================== */}
              {/* POOL BAWAH (BOTTOM HALF) -> FINALIS 2                 */}
              {/* ==================================================== */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="text-[11px] font-black text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-800">
                  <span>Pool Bawah (Undian 11 s/d 19 ➔ Menuju Finalis 2)</span>
                </div>

                {/* Section 2A: M6 & M9 -> M14 */}
                <div className="grid grid-cols-5 gap-4 items-center">
                  {/* Col 1: No Playoff match here (Direct to 16 Besar) */}
                  <div className="h-full flex items-center justify-center p-3">
                    <div className="w-full border-t border-dashed border-slate-800/80 flex items-center justify-center">
                      <span className="text-[10px] text-slate-600 font-medium px-2 bg-slate-950">
                        Direct 16 Besar (Tanpa Playoff)
                      </span>
                    </div>
                  </div>

                  {/* Col 2: 16 Besar M6 & M9 */}
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#6 (16 Besar)</div>
                      <SlotCell slotNum={11} slot={getSlot(m6, 'home')} compact isSeed seedRank={3} />
                      <div className="text-[10px] text-slate-500 my-0.5">vs</div>
                      <SlotCell slotNum={12} slot={getSlot(m6, 'away')} compact />
                      <MatchScoreBadge match={m6} onClick={() => setSelectedMatch(m6 || null)} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#9 (16 Besar)</div>
                      <SlotCell slotNum={13} slot={getSlot(m9, 'home')} compact />
                      <div className="text-[10px] text-slate-500 my-0.5">vs</div>
                      <SlotCell slotNum={14} slot={getSlot(m9, 'away')} compact />
                      <MatchScoreBadge match={m9} onClick={() => setSelectedMatch(m9 || null)} />
                    </div>
                  </div>

                  {/* Col 3: Perempat Final M14 (Menang M6 vs Menang M9) */}
                  <div>
                    <div className="p-3 rounded-xl bg-slate-900 border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10">
                      <div className="text-[10px] font-bold text-cyan-400 mb-1">M#14 (8 Besar QF 3)</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m14?.homeTeam.name || 'Menang M6'}</div>
                      <div className="text-[10px] text-slate-500 my-1">vs</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m14?.awayTeam.name || 'Menang M9'}</div>
                      <MatchScoreBadge match={m14} onClick={() => setSelectedMatch(m14 || null)} />
                    </div>
                  </div>

                  {/* Col 4: Semifinal M17 -> FINALIS 2 Banner */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-500/20 border-2 border-amber-300">
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900">
                        Semifinal (M#17) ➔ FINALIS 2
                      </div>
                      <div className="text-sm font-black truncate mt-0.5">
                        {m17?.winnerTeamId ? (m17.winnerTeamId === m17.homeTeam.id ? m17.homeTeam.name : m17.awayTeam.name) : (m17 ? `${m17.homeTeam.name} vs ${m17.awayTeam.name}` : 'Menang M14 vs Menang M15')}
                      </div>
                      <button
                        onClick={() => setSelectedMatch(m17 || null)}
                        className="mt-2 px-2.5 py-1 bg-slate-950/90 text-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Skor / Detail Semifinal 2</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2B: M10 & M3 & M11 -> M15 */}
                <div className="grid grid-cols-5 gap-4 items-center pt-3 border-t border-slate-800/60">
                  {/* Col 1: Playoff M3 (Undian 17 vs 18) ONLY */}
                  <div className="space-y-2">
                    <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-800/60 mb-2">
                      <span className="text-[10px] text-slate-600 font-medium">
                        Direct 16 Besar (Tanpa Playoff)
                      </span>
                    </div>
                    <SlotCell slotNum={17} slot={getSlot(m3, 'home')} />
                    <MatchButton match={m3} label="M#3 (Playoff)" onClick={() => setSelectedMatch(m3 || null)} />
                    <SlotCell slotNum={18} slot={getSlot(m3, 'away')} />
                  </div>

                  {/* Col 2: 16 Besar M10 (Undian 15 vs 16) & M11 (Menang M3 vs Undian 19) */}
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#10 (16 Besar)</div>
                      <SlotCell slotNum={15} slot={getSlot(m10, 'home')} compact />
                      <div className="text-[10px] text-slate-500 my-0.5">vs</div>
                      <SlotCell slotNum={16} slot={getSlot(m10, 'away')} compact />
                      <MatchScoreBadge match={m10} onClick={() => setSelectedMatch(m10 || null)} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">M#11 (16 Besar)</div>
                      <div className="font-semibold text-white truncate text-[11px]">{m11?.homeTeam.name || 'Menang M3'}</div>
                      <div className="text-[10px] text-slate-500">vs</div>
                      <SlotCell slotNum={19} slot={getSlot(m11, 'away')} compact isSeed seedRank={2} />
                      <MatchScoreBadge match={m11} onClick={() => setSelectedMatch(m11 || null)} />
                    </div>
                  </div>

                  {/* Col 3: Perempat Final M15 (Menang M10 vs Menang M11) */}
                  <div>
                    <div className="p-3 rounded-xl bg-slate-900 border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10">
                      <div className="text-[10px] font-bold text-cyan-400 mb-1">M#15 (8 Besar QF 4)</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m15?.homeTeam.name || 'Menang M10'}</div>
                      <div className="text-[10px] text-slate-500 my-1">vs</div>
                      <div className="text-white font-semibold truncate text-[11px]">{m15?.awayTeam.name || 'Menang M11'}</div>
                      <MatchScoreBadge match={m15} onClick={() => setSelectedMatch(m15 || null)} />
                    </div>
                  </div>

                  <div className="col-span-2 text-slate-500 italic text-[11px] pl-4">
                    ── Mengalir menuju Semifinal 2 (M#17)
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* 2. CARD-BASED BRACKET VIEW                                   */
          /* ============================================================ */
          <div className="flex items-start space-x-8 min-w-max pb-8">
            {/* Playoff Column */}
            <div className="w-72 space-y-4">
              <div className="text-xs font-black text-rose-400 uppercase tracking-wider pb-2 border-b border-rose-500/40">
                Playoff (3 Laga)
              </div>
              {[m1, m2, m3].map(m => m && (
                <MatchCard key={m.id} match={m} onClick={() => setSelectedMatch(m)} />
              ))}
            </div>

            {/* 16 Besar Column */}
            <div className="w-72 space-y-4">
              <div className="text-xs font-black text-indigo-400 uppercase tracking-wider pb-2 border-b border-indigo-500/40">
                Babak 16 Besar (8 Laga)
              </div>
              {[m7, m4, m8, m5, m6, m9, m10, m11].map(m => m && (
                <MatchCard key={m.id} match={m} onClick={() => setSelectedMatch(m)} />
              ))}
            </div>

            {/* 8 Besar Column */}
            <div className="w-72 space-y-4">
              <div className="text-xs font-black text-cyan-400 uppercase tracking-wider pb-2 border-b border-cyan-500/40">
                8 Besar (4 Laga)
              </div>
              {[m12, m13, m14, m15].map(m => m && (
                <MatchCard key={m.id} match={m} onClick={() => setSelectedMatch(m)} />
              ))}
            </div>

            {/* Semifinal Column */}
            <div className="w-72 space-y-4">
              <div className="text-xs font-black text-purple-400 uppercase tracking-wider pb-2 border-b border-purple-500/40">
                Semifinal (2 Laga)
              </div>
              {[m16, m17].map(m => m && (
                <MatchCard key={m.id} match={m} onClick={() => setSelectedMatch(m)} />
              ))}
            </div>

            {/* Final Column */}
            <div className="w-72 space-y-4">
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider pb-2 border-b border-amber-500/40">
                Grand Final & Juara 3
              </div>
              {m19 && <MatchCard match={m19} isFinal onClick={() => setSelectedMatch(m19)} />}
              {m18 && <MatchCard match={m18} onClick={() => setSelectedMatch(m18)} />}
            </div>
          </div>
        )}
      </div>

      {/* Match Score & Detail Modal */}
      <MatchScoreModal
        match={selectedMatch}
        isAdmin={isAdmin}
        onClose={() => setSelectedMatch(null)}
        onSaveScore={onSaveScore}
      />
    </div>
  );
};

// Sub-component: Undian Slot Cell
interface SlotCellProps {
  slotNum: number;
  slot: TeamMatchSlot | null | undefined;
  compact?: boolean;
  isSeed?: boolean;
  seedRank?: number;
}

const SlotCell: React.FC<SlotCellProps> = ({ slotNum, slot, compact = false, isSeed = false, seedRank }) => {
  const isFilled = slot && slot.id !== null;
  const activeSeed = slot?.seedNumber ?? (isSeed ? seedRank : undefined);

  return (
    <div className={`rounded-xl border transition-all ${
      isFilled 
        ? 'bg-slate-900 border-indigo-500/40 text-white shadow-sm' 
        : 'bg-slate-950/60 border-dashed border-slate-800 text-slate-500'
    } ${compact ? 'p-1.5' : 'p-2'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold text-amber-400 mr-2 flex-shrink-0">
          #{slotNum}
        </span>
        <div className="flex-1 truncate">
          <div className={`truncate ${isFilled ? 'font-bold text-white text-xs' : 'italic text-[11px] text-slate-500'}`}>
            {isFilled ? slot.name : `[Undian ${slotNum}]`}
          </div>
          {isFilled && slot.departmentOrigin && (
            <div className="text-[9px] text-slate-400 truncate">
              {slot.departmentOrigin}
            </div>
          )}
        </div>
        {activeSeed && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex-shrink-0 ml-1">
            ★ U{activeSeed}
          </span>
        )}
      </div>
    </div>
  );
};

// Sub-component: Match Action Button
interface MatchButtonProps {
  match: Match | undefined;
  label: string;
  onClick: () => void;
}

const MatchButton: React.FC<MatchButtonProps> = ({ match, label, onClick }) => {
  const isCompleted = match?.status === 'completed';
  return (
    <div 
      onClick={onClick}
      className="my-1 py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 cursor-pointer border border-slate-700/60 flex items-center justify-between text-[10px] transition-colors"
    >
      <span className="font-bold text-slate-300">{label}</span>
      <span className="font-mono font-black text-amber-400">
        {isCompleted && match ? `${match.homeTeam.score ?? 0} - ${match.awayTeam.score ?? 0}` : 'Detail'}
      </span>
    </div>
  );
};

// Sub-component: Match Score Badge inside cell
interface MatchScoreBadgeProps {
  match: Match | undefined;
  onClick: () => void;
}

const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({ match, onClick }) => {
  if (!match) return null;
  const isCompleted = match.status === 'completed';

  return (
    <div 
      onClick={onClick}
      className="mt-1.5 pt-1 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400 hover:text-white cursor-pointer"
    >
      <span>Lap: {match.pitch.replace('Lapangan ', 'L')}</span>
      <span className="font-mono font-bold text-amber-400">
        {isCompleted ? `Skor: ${match.homeTeam.score ?? 0}-${match.awayTeam.score ?? 0}` : match.startTime || 'TBD'}
      </span>
    </div>
  );
};

// Sub-component: Standard Match Card
interface MatchCardProps {
  match: Match;
  isFinal?: boolean;
  onClick: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, isFinal = false, onClick }) => {
  const isCompleted = match.status === 'completed';
  const hasHomeWon = isCompleted && match.winnerTeamId === match.homeTeam.id;
  const hasAwayWon = isCompleted && match.winnerTeamId === match.awayTeam.id;

  return (
    <div
      onClick={onClick}
      className={`group rounded-xl border p-3 cursor-pointer transition-all ${
        isFinal
          ? 'bg-gradient-to-b from-slate-900 to-amber-950/40 border-amber-400 shadow-lg'
          : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800">
        <span className="font-bold text-slate-300">M#{match.matchNumber}</span>
        <span>{match.scheduledDate || 'TBD'} • {match.startTime || 'TBD'}</span>
      </div>
      <div className={`py-1 px-1.5 rounded flex items-center justify-between text-xs ${hasHomeWon ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300'}`}>
        <span className="truncate">{match.homeTeam.name}</span>
        <span className="font-mono font-bold">{match.homeTeam.score !== null ? match.homeTeam.score : '-'}</span>
      </div>
      <div className={`py-1 px-1.5 rounded flex items-center justify-between text-xs mt-1 ${hasAwayWon ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300'}`}>
        <span className="truncate">{match.awayTeam.name}</span>
        <span className="font-mono font-bold">{match.awayTeam.score !== null ? match.awayTeam.score : '-'}</span>
      </div>
    </div>
  );
};
