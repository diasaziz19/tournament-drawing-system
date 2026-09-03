'use client';

import React, { useState, useMemo } from 'react';
import { Match, MatchStage } from '../../types/tournament';
import { Trophy, Clock, ZoomIn, ZoomOut, RotateCcw, ArrowRight, Zap } from 'lucide-react';
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

  // Group matches by stages
  const stagesMap = useMemo(() => {
    const map: Record<string, Match[]> = {
      playoff: [],
      round_of_32: [],
      round_of_16: [],
      quarter_final: [],
      semi_final: [],
      final: [],
      third_place: []
    };

    matches.forEach(m => {
      if (map[m.stage]) {
        map[m.stage].push(m);
      }
    });

    Object.keys(map).forEach(stage => {
      map[stage].sort((a, b) => a.matchNumber - b.matchNumber);
    });

    return map;
  }, [matches]);

  const hasPlayoffs = stagesMap.playoff.length > 0;
  const hasR16 = stagesMap.round_of_16.length > 0;
  const hasQF = stagesMap.quarter_final.length > 0;
  const hasSF = stagesMap.semi_final.length > 0;
  const finalMatch = stagesMap.final[0] || null;
  const thirdPlaceMatch = stagesMap.third_place[0] || null;

  // Map playoff matches to their exact R16 row targets:
  // Playoff 1 -> Row 0 (Match 1 R16)
  // Playoff 2 -> Row 3 (Match 4 R16)
  // Playoff 3 -> Row 7 (Match 8 R16)
  const playoffByR16Row = useMemo(() => {
    const map: Record<number, { match: Match; pNum: number }> = {};
    if (stagesMap.playoff[0]) map[0] = { match: stagesMap.playoff[0], pNum: 1 };
    if (stagesMap.playoff[1]) map[3] = { match: stagesMap.playoff[1], pNum: 2 };
    if (stagesMap.playoff[2]) map[7] = { match: stagesMap.playoff[2], pNum: 3 };
    return map;
  }, [stagesMap.playoff]);

  // Find Tournament Champion if final is completed
  const championName = useMemo(() => {
    if (finalMatch && finalMatch.status === 'completed' && finalMatch.winnerTeamId) {
      return finalMatch.winnerTeamId === finalMatch.homeTeam.id
        ? finalMatch.homeTeam.name
        : finalMatch.awayTeam.name;
    }
    return null;
  }, [finalMatch]);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(1.4, Math.max(0.7, Number((prev + delta).toFixed(1)))));
  };

  const resetZoom = () => setZoomLevel(1);

  return (
    <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-white flex flex-col">
      {/* Top Controls & Stage Summary */}
      <div className="flex flex-wrap items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-100">
              Bagan Pertandingan Resmi (Simetris & Terhubung)
            </h2>
            <p className="text-xs text-slate-400">
              {hasPlayoffs ? `Format 19 Tim: Playoff 1 ➔ Match 1 | Playoff 2 ➔ Match 4 | Playoff 3 ➔ Match 8 (Langsung Berdampingan)` : `Sistem Gugur Tunggal`}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
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

      {/* Champion Podium Banner */}
      {championName && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border-b border-amber-400/40 p-4 text-center animate-pulse">
          <div className="inline-flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span className="text-sm uppercase tracking-wider font-extrabold text-amber-300">
              Juara 1 Turnamen:
            </span>
            <span className="text-lg font-black text-white px-3 py-0.5 rounded-lg bg-amber-500/30 border border-amber-400">
              {championName}
            </span>
          </div>
        </div>
      )}

      {/* Bracket Tree Container */}
      <div 
        className="w-full overflow-x-auto overflow-y-hidden p-6 sm:p-10 transition-transform origin-top-left"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        <div className="inline-flex items-start space-x-8 sm:space-x-12 min-w-max pb-8">
          
          {/* Column 1: Playoff Round (Aligned exactly row-by-row to R16 matches) */}
          {hasPlayoffs && (
            <div className="flex flex-col w-80 space-y-6">
              <div className="text-center pb-2 border-b border-rose-500/40">
                <span className="text-xs font-black text-rose-400 tracking-wider uppercase">
                  Babak Playoff (3 Laga)
                </span>
                <p className="text-[10px] text-slate-400">Berdampingan Langsung Menuju 16 Besar</p>
              </div>

              {/* 8 Row slots matching the 8 R16 matches */}
              <div className="flex flex-col space-y-6">
                {Array.from({ length: 8 }).map((_, rowIdx) => {
                  const playoffItem = playoffByR16Row[rowIdx];
                  if (playoffItem) {
                    return (
                      <div key={`playoff-row-${rowIdx}`} className="relative flex items-center min-h-[148px]">
                        <div className="w-full">
                          <MatchCard
                            match={playoffItem.match}
                            onClick={() => setSelectedMatch(playoffItem.match)}
                          />
                        </div>
                        {/* Connecting line to R16 with arrow */}
                        <div className="hidden sm:flex items-center absolute -right-6 top-1/2 -translate-y-1/2 z-10 text-rose-400 font-bold">
                          <ArrowRight className="w-5 h-5 drop-shadow animate-pulse" />
                        </div>
                      </div>
                    );
                  }

                  // Non-playoff row: Direct Bye
                  return (
                    <div 
                      key={`direct-bye-row-${rowIdx}`} 
                      className="min-h-[148px] flex items-center justify-center p-3 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40"
                    >
                      <div className="text-center space-y-1">
                        <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Direct Bye</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Lolos Langsung ke 16 Besar
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Column 2: Round of 16 (8 Matches) */}
          {hasR16 && (
            <div className="flex flex-col w-72 space-y-6">
              <div className="text-center pb-2 border-b border-indigo-500/40">
                <span className="text-xs font-black text-indigo-400 tracking-wider uppercase">
                  Babak 16 Besar (8 Laga)
                </span>
                <p className="text-[10px] text-slate-400">4 Unggulan + 9 Bye + 3 Playoff</p>
              </div>
              <div className="flex flex-col space-y-6">
                {stagesMap.round_of_16.map((match, idx) => (
                  <div key={match.id} className="min-h-[148px] flex flex-col justify-center">
                    <MatchCard
                      match={match}
                      onClick={() => setSelectedMatch(match)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column 3: Quarterfinals (4 Matches - Centered between R16 pairs) */}
          {hasQF && (
            <div className="flex flex-col w-64 space-y-6">
              <div className="text-center pb-2 border-b border-cyan-500/40">
                <span className="text-xs font-black text-cyan-400 tracking-wider uppercase">
                  Perempat Final (8 Besar)
                </span>
                <p className="text-[10px] text-slate-400">4 Pertandingan</p>
              </div>
              <div className="flex flex-col justify-around flex-1 py-4">
                {stagesMap.quarter_final.map(match => (
                  <div key={match.id} className="my-14 first:mt-6 last:mb-6">
                    <MatchCard
                      match={match}
                      onClick={() => setSelectedMatch(match)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column 4: Semifinals (2 Matches - Centered between QF pairs) */}
          {hasSF && (
            <div className="flex flex-col w-64 space-y-6">
              <div className="text-center pb-2 border-b border-purple-500/40">
                <span className="text-xs font-black text-purple-400 tracking-wider uppercase">
                  Semifinal (4 Besar)
                </span>
                <p className="text-[10px] text-slate-400">2 Pertandingan</p>
              </div>
              <div className="flex flex-col justify-around flex-1 py-12">
                {stagesMap.semi_final.map(match => (
                  <div key={match.id} className="my-36 first:mt-16 last:mb-16">
                    <MatchCard
                      match={match}
                      onClick={() => setSelectedMatch(match)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column 5: Finals & 3rd Place Match */}
          <div className="flex flex-col justify-around w-72 space-y-6">
            {/* Grand Final Section */}
            <div>
              <div className="text-center pb-2 border-b border-amber-500/50">
                <span className="text-xs font-black text-amber-400 tracking-wider uppercase flex items-center justify-center space-x-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Grand Final</span>
                </span>
                <p className="text-[10px] text-slate-400">Perebutan Juara 1 & 2</p>
              </div>
              <div className="mt-4">
                {finalMatch ? (
                  <MatchCard
                    match={finalMatch}
                    isFinal={true}
                    onClick={() => setSelectedMatch(finalMatch)}
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
                    Grand Final Belum Terbentuk
                  </div>
                )}
              </div>
            </div>

            {/* 3rd Place Playoff Section */}
            {thirdPlaceMatch && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="text-center pb-2 border-b border-emerald-500/40">
                  <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                    Perebutan Juara 3
                  </span>
                  <p className="text-[10px] text-slate-400">Runner-up Semifinal</p>
                </div>
                <div className="mt-4">
                  <MatchCard
                    match={thirdPlaceMatch}
                    onClick={() => setSelectedMatch(thirdPlaceMatch)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
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

// Sub-component: Individual Match Card with Interactive States
interface MatchCardProps {
  match: Match;
  isFinal?: boolean;
  onClick: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, isFinal = false, onClick }) => {
  const isCompleted = match.status === 'completed';
  const hasHomeWon = isCompleted && match.winnerTeamId === match.homeTeam.id;
  const hasAwayWon = isCompleted && match.winnerTeamId === match.awayTeam.id;

  const isHomePlaceholder = !match.homeTeam.id;
  const isAwayPlaceholder = !match.awayTeam.id;

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all duration-200 shadow-md ${
        isFinal
          ? 'bg-gradient-to-b from-slate-900 to-amber-950/40 border-amber-500/60 hover:border-amber-400 hover:shadow-amber-500/20 hover:shadow-lg'
          : match.stage === 'playoff'
          ? 'bg-gradient-to-b from-slate-900 to-rose-950/30 border-rose-500/50 hover:border-rose-400 hover:shadow-rose-500/10'
          : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/60 hover:shadow-indigo-500/10 hover:shadow-md'
      }`}
    >
      {/* Match Header Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2 mb-2.5">
        <span className="font-bold text-slate-300">
          M#{match.matchNumber} • {match.stage === 'playoff' ? 'Playoff' : match.stage === 'round_of_16' ? '16 Besar' : match.stage === 'quarter_final' ? '8 Besar' : match.stage === 'semi_final' ? 'Semifinal' : match.stage === 'third_place' ? 'Juara 3' : 'Final'}
        </span>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{match.startTime || 'TBD'}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
            {match.pitch.replace('Lapangan ', 'Lap. ')}
          </span>
        </div>
      </div>

      {/* Home Team Row */}
      <div className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
        hasHomeWon ? 'bg-emerald-500/20 text-emerald-300 font-bold' : isHomePlaceholder ? 'border border-dashed border-slate-800 bg-slate-950/50 text-slate-500' : 'text-slate-300'
      }`}>
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isHomePlaceholder ? 'bg-slate-700' : 'bg-emerald-400'}`} />
          <div className="truncate">
            <div className={`text-xs truncate ${isHomePlaceholder ? 'italic text-slate-500 text-[11px]' : 'font-bold text-white'}`} title={match.homeTeam.name}>
              {match.homeTeam.name}
            </div>
            {match.homeTeam.departmentOrigin && (
              <div className="text-[10px] text-slate-400 truncate">
                {match.homeTeam.departmentOrigin}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {match.homeTeam.penaltyScore !== null && (
            <span className="text-[10px] text-amber-400">({match.homeTeam.penaltyScore})</span>
          )}
          <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
            hasHomeWon ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-300'
          }`}>
            {match.homeTeam.score !== null ? match.homeTeam.score : '-'}
          </span>
        </div>
      </div>

      {/* Away Team Row */}
      <div className={`flex items-center justify-between py-1.5 px-2 rounded-lg mt-1.5 transition-colors ${
        hasAwayWon ? 'bg-emerald-500/20 text-emerald-300 font-bold' : isAwayPlaceholder ? 'border border-dashed border-slate-800 bg-slate-950/50 text-slate-500' : 'text-slate-300'
      }`}>
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isAwayPlaceholder ? 'bg-slate-700' : 'bg-indigo-400'}`} />
          <div className="truncate">
            <div className={`text-xs truncate ${isAwayPlaceholder ? 'italic text-slate-500 text-[11px]' : 'font-bold text-white'}`} title={match.awayTeam.name}>
              {match.awayTeam.name}
            </div>
            {match.awayTeam.departmentOrigin && (
              <div className="text-[10px] text-slate-400 truncate">
                {match.awayTeam.departmentOrigin}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {match.awayTeam.penaltyScore !== null && (
            <span className="text-[10px] text-amber-400">({match.awayTeam.penaltyScore})</span>
          )}
          <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
            hasAwayWon ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-300'
          }`}>
            {match.awayTeam.score !== null ? match.awayTeam.score : '-'}
          </span>
        </div>
      </div>

      {/* Hover action hint */}
      <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-slate-400">
        <span>{isCompleted ? 'Selesai' : match.status === 'live' ? '🟢 Live' : 'Terjadwal'}</span>
        <span className="flex items-center text-indigo-400 group-hover:translate-x-0.5 transition-transform">
          <span>Detail / Skor</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
};
