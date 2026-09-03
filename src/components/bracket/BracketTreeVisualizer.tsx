'use client';

import React, { useState, useMemo } from 'react';
import { Match, MatchStage } from '../../types/tournament';
import { Trophy, Clock, Calendar, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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

    // Sort matches in each stage by matchNumber
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
              Bagan Turnamen Resmi (Knockout Bracket)
            </h2>
            <p className="text-xs text-slate-400">
              Sistem Gugur Tunggal dengan Integrasi Babak Playoff & Perebutan Juara 3
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

      {/* Champion Podium Banner (When Final match concludes) */}
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

      {/* Bracket Tree Container (Responsive Horizontal Scroll) */}
      <div 
        className="w-full overflow-x-auto overflow-y-hidden p-6 sm:p-10 transition-transform origin-top-left"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        <div className="inline-flex items-stretch space-x-8 sm:space-x-14 min-w-max pb-8">
          {/* Column 1: Playoff / Preliminary Round (If present) */}
          {hasPlayoffs && (
            <div className="flex flex-col justify-around w-64 space-y-6">
              <div className="text-center pb-2 border-b border-rose-500/40">
                <span className="text-xs font-bold text-rose-400 tracking-wider uppercase">
                  Playoff ({stagesMap.playoff.length} Laga)
                </span>
                <p className="text-[10px] text-slate-400">Penyaringan 16 Besar</p>
              </div>
              <div className="flex flex-col justify-around flex-1 space-y-8">
                {stagesMap.playoff.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => setSelectedMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Column 2: Round of 16 */}
          {hasR16 && (
            <div className="flex flex-col justify-around w-64 space-y-6">
              <div className="text-center pb-2 border-b border-indigo-500/40">
                <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                  Babak 16 Besar
                </span>
                <p className="text-[10px] text-slate-400">8 Pertandingan</p>
              </div>
              <div className="flex flex-col justify-around flex-1 space-y-6">
                {stagesMap.round_of_16.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => setSelectedMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Column 3: Quarterfinals */}
          {hasQF && (
            <div className="flex flex-col justify-around w-64 space-y-6">
              <div className="text-center pb-2 border-b border-cyan-500/40">
                <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                  Perempat Final
                </span>
                <p className="text-[10px] text-slate-400">8 Besar</p>
              </div>
              <div className="flex flex-col justify-around flex-1 space-y-12">
                {stagesMap.quarter_final.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => setSelectedMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Column 4: Semifinals */}
          {hasSF && (
            <div className="flex flex-col justify-around w-64 space-y-6">
              <div className="text-center pb-2 border-b border-purple-500/40">
                <span className="text-xs font-bold text-purple-400 tracking-wider uppercase">
                  Semifinal
                </span>
                <p className="text-[10px] text-slate-400">4 Besar</p>
              </div>
              <div className="flex flex-col justify-around flex-1 space-y-24">
                {stagesMap.semi_final.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => setSelectedMatch(match)}
                  />
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

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all duration-200 shadow-md ${
        isFinal
          ? 'bg-gradient-to-b from-slate-900 to-amber-950/40 border-amber-500/60 hover:border-amber-400 hover:shadow-amber-500/20 hover:shadow-lg'
          : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/60 hover:shadow-indigo-500/10 hover:shadow-md'
      }`}
    >
      {/* Match Header Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2 mb-2.5">
        <span className="font-bold text-slate-300">
          M#{match.matchNumber}
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
        hasHomeWon ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300'
      }`}>
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-600" />
          <span className="text-xs truncate font-medium" title={match.homeTeam.name}>
            {match.homeTeam.name}
          </span>
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
      <div className={`flex items-center justify-between py-1.5 px-2 rounded-lg mt-1 transition-colors ${
        hasAwayWon ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300'
      }`}>
        <div className="flex items-center space-x-2 overflow-hidden mr-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-600" />
          <span className="text-xs truncate font-medium" title={match.awayTeam.name}>
            {match.awayTeam.name}
          </span>
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
          <span>Detail</span>
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
};
