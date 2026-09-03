'use client';

import React, { useState } from 'react';
import { Group, Match } from '../../types/tournament';
import { Table, Trophy, Shield, Clock } from 'lucide-react';

interface GroupStageVisualizerProps {
  groups: Group[];
  matches: Match[];
  onMatchClick?: (match: Match) => void;
}

export const GroupStageVisualizer: React.FC<GroupStageVisualizerProps> = ({
  groups,
  matches,
  onMatchClick
}) => {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  if (groups.length === 0) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Belum ada grup yang dikonfigurasi untuk turnamen ini.
      </div>
    );
  }

  const activeGroup = groups[activeGroupIndex] || groups[0];
  const groupMatches = matches.filter(m => m.groupName === activeGroup.groupName);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
      {/* Header & Group Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Table className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              Klasemen & Jadwal Babak Grup
            </h3>
            <p className="text-xs text-slate-400">
              Sistem Setengah / Penuh Kompetisi (Berger Algorithm) dengan Tie-Breaker Head-to-Head
            </p>
          </div>
        </div>

        {/* Group Tabs */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {groups.map((grp, idx) => (
            <button
              key={grp.id}
              onClick={() => setActiveGroupIndex(idx)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeGroupIndex === idx
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {grp.groupName}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Standings Table */}
        <div className="lg:col-span-2 overflow-x-auto">
          <h4 className="font-bold text-sm text-slate-200 mb-3 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Klasemen Sementara: {activeGroup.groupName}</span>
          </h4>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-3">Tim</th>
                <th className="py-3 px-2 text-center" title="Main">Mn</th>
                <th className="py-3 px-2 text-center" title="Menang">M</th>
                <th className="py-3 px-2 text-center" title="Seri">S</th>
                <th className="py-3 px-2 text-center" title="Kalah">K</th>
                <th className="py-3 px-2 text-center" title="Gol Masuk">GM</th>
                <th className="py-3 px-2 text-center" title="Gol Kemasukan">GK</th>
                <th className="py-3 px-2 text-center" title="Selisih Gol">SG</th>
                <th className="py-3 px-3 text-center font-bold text-amber-400" title="Poin">Poin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activeGroup.standings.map((item, index) => {
                const isTopTwo = index < 2;
                return (
                  <tr
                    key={item.teamId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isTopTwo ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                        index === 0
                          ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-500/40'
                          : index === 1
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                          : 'text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{item.teamName}</div>
                      {item.departmentOrigin && (
                        <div className="text-[10px] text-slate-400">{item.departmentOrigin}</div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center text-slate-300">{item.played}</td>
                    <td className="py-3 px-2 text-center text-emerald-400 font-semibold">{item.won}</td>
                    <td className="py-3 px-2 text-center text-amber-300">{item.drawn}</td>
                    <td className="py-3 px-2 text-center text-rose-400">{item.lost}</td>
                    <td className="py-3 px-2 text-center text-slate-300">{item.gf}</td>
                    <td className="py-3 px-2 text-center text-slate-300">{item.ga}</td>
                    <td className="py-3 px-2 text-center font-semibold text-slate-200">
                      {item.gd > 0 ? `+${item.gd}` : item.gd}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-amber-400 text-sm">
                      {item.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Zona Lolos Knockout (Peringkat 1 & 2)</span>
            </span>
          </div>
        </div>

        {/* Right 1 Col: Group Match Fixtures */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-slate-200 mb-3 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Pertandingan {activeGroup.groupName}</span>
          </h4>

          {groupMatches.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
              Belum ada jadwal pertandingan
            </div>
          ) : (
            groupMatches.map(m => (
              <div
                key={m.id}
                onClick={() => onMatchClick && onMatchClick(m)}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>Match #{m.matchNumber}</span>
                  <span>{m.startTime} WIB • {m.pitch}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="truncate max-w-[100px]">{m.homeTeam.name}</span>
                  <span className="font-black px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                    {m.homeTeam.score !== null ? m.homeTeam.score : '-'} : {m.awayTeam.score !== null ? m.awayTeam.score : '-'}
                  </span>
                  <span className="truncate max-w-[100px] text-right">{m.awayTeam.name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
