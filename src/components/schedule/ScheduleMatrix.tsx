'use client';

import React, { useState, useMemo } from 'react';
import { Match } from '../../types/tournament';
import { Calendar, Clock, MapPin, ShieldCheck, Filter } from 'lucide-react';

interface ScheduleMatrixProps {
  matches: Match[];
  onMatchClick?: (match: Match) => void;
}

export const ScheduleMatrix: React.FC<ScheduleMatrixProps> = ({ matches, onMatchClick }) => {
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedPitch, setSelectedPitch] = useState<string>('all');

  // Unique dates and pitches
  const { dates, pitches } = useMemo(() => {
    const dSet = new Set<string>();
    const pSet = new Set<string>();

    matches.forEach(m => {
      if (m.scheduledDate) dSet.add(m.scheduledDate);
      if (m.pitch) pSet.add(m.pitch);
    });

    return {
      dates: Array.from(dSet).sort(),
      pitches: Array.from(pSet).sort()
    };
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (selectedDate !== 'all' && m.scheduledDate !== selectedDate) return false;
      if (selectedPitch !== 'all' && m.pitch !== selectedPitch) return false;
      return true;
    }).sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.matchNumber - b.matchNumber;
    });
  }, [matches, selectedDate, selectedPitch]);

  // Group by date for matrix layout
  const matchesByDate = useMemo(() => {
    const map: Record<string, Match[]> = {};
    filteredMatches.forEach(m => {
      const d = m.scheduledDate || 'Belum Terjadwal';
      if (!map[d]) map[d] = [];
      map[d].push(m);
    });
    return map;
  }, [filteredMatches]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              Matriks Jadwal Pertandingan (Timetable)
            </h3>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Memenuhi Aturan Rest Time: Maksimal 1 Pertandingan / Hari per Tim</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">Semua Tanggal</option>
              {dates.map(d => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Pitch Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPitch}
              onChange={e => setSelectedPitch(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">Semua Lapangan</option>
              {pitches.map(p => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Table Matrix */}
      {Object.keys(matchesByDate).length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-sm">
          Belum ada jadwal pertandingan yang sesuai dengan filter.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(matchesByDate).map(([date, dateMatches]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-200">
                  {date}
                </h4>
                <span className="text-xs text-slate-500">
                  ({dateMatches.length} Pertandingan)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dateMatches.map(m => (
                  <div
                    key={m.id}
                    onClick={() => onMatchClick && onMatchClick(m)}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-bold text-amber-400">
                        Match #{m.matchNumber} • {m.stage.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {m.pitch}
                      </span>
                    </div>

                    <div className="space-y-1.5 my-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-slate-200">
                          {m.homeTeam.name}
                        </span>
                        <span className="font-black text-slate-300 ml-2">
                          {m.homeTeam.score !== null ? m.homeTeam.score : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-slate-200">
                          {m.awayTeam.name}
                        </span>
                        <span className="font-black text-slate-300 ml-2">
                          {m.awayTeam.score !== null ? m.awayTeam.score : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 mt-2">
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{m.startTime} - {m.endTime} WIB</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : m.status === 'live'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.status === 'completed' ? 'Selesai' : m.status === 'live' ? 'Live' : 'Terjadwal'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
