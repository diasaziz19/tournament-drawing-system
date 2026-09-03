'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tournament, 
  Team, 
  Match, 
  Group, 
  DrawingSession 
} from '../types/tournament';
import { 
  generateKnockoutBracket, 
  advanceKnockoutWinner 
} from '../lib/engines/knockout-engine';
import { 
  generateGroupMatches, 
  calculateGroupStandings 
} from '../lib/engines/round-robin-engine';
import { 
  collections, 
  tournamentService 
} from '../lib/firestore-converters';
import { onSnapshot, doc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LiveDrawingPresenter } from '../components/drawing/LiveDrawingPresenter';
import { BracketTreeVisualizer } from '../components/bracket/BracketTreeVisualizer';
import { ScheduleMatrix } from '../components/schedule/ScheduleMatrix';
import { TeamBatchImporter } from '../components/setup/TeamBatchImporter';
import { GroupStageVisualizer } from '../components/groups/GroupStageVisualizer';
import { exportFixturesToCSV, exportTeamsToCSV, triggerPrintReport } from '../lib/export-utils';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Table, 
  Sparkles, 
  Download, 
  Printer, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Wifi, 
  ShieldCheck, 
  PlayCircle 
} from 'lucide-react';

// Default initial tournament data for 18 teams
const DEFAULT_TOURNAMENT: Tournament = {
  id: 'dies-natalis-ums-2026-draw',
  title: 'Turnamen Minisoccer Dies Natalis UMS 2026',
  slug: 'dies-natalis-ums-2026',
  sportType: 'futsal',
  format: 'knockout',
  matchDurationMinutes: 30,
  breakMinutes: 10,
  startDate: '2026-09-05',
  endDate: '2026-09-08',
  dailyStartTime: '07:30',
  maxMatchesPerDayPerTeam: 1,
  hasThirdPlacePlayoff: true,
  status: 'drawing',
  ownerUid: 'admin-ums-committee',
  pitches: ['Lapangan A (Utama)', 'Lapangan B'],
  createdAt: Date.now()
};

// Initial 18 teams preloaded
const INITIAL_18_TEAMS: Team[] = [
  { id: 't-1', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Kedokteran FC', officialName: 'dr. Budi', departmentOrigin: 'Fakultas Kedokteran', potTier: 1, seedNumber: 1, drawnSlot: null },
  { id: 't-2', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FKIP Juara', officialName: 'Prof. Sutrisno', departmentOrigin: 'FKIP', potTier: 1, seedNumber: 2, drawnSlot: null },
  { id: 't-3', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Teknik Mesin', officialName: 'Ir. Joko', departmentOrigin: 'Fakultas Teknik', potTier: 1, seedNumber: 3, drawnSlot: null },
  { id: 't-4', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Farmasi Hebat', officialName: 'apt. Dian', departmentOrigin: 'Fakultas Farmasi', potTier: 1, seedNumber: 4, drawnSlot: null },
  { id: 't-5', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FEB United', officialName: 'Dr. Rahman', departmentOrigin: 'Fakultas Ekonomi Bisnis', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-6', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Psikologi FC', officialName: 'M. Ridwan M.Psi', departmentOrigin: 'Fakultas Psikologi', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-7', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Hukum Perkasa', officialName: 'Dr. Hartono S.H', departmentOrigin: 'Fakultas Hukum', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-8', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FIK All-Star', officialName: 'Nurul M.Kes', departmentOrigin: 'Fak. Ilmu Kesehatan', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-9', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FAI Soccer', officialName: 'Drs. Abdullah', departmentOrigin: 'Fak. Agama Islam', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-10', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Geografi FC', officialName: 'Tri Wahyuni M.Sc', departmentOrigin: 'Fakultas Geografi', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-11', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FKI Cyber', officialName: 'Gunawan M.Kom', departmentOrigin: 'Fak. Komunikasi & Informatika', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-12', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Pascasarjana FC', officialName: 'Dr. Anwar', departmentOrigin: 'Sekolah Pascasarjana', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-13', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Biro Rektorat', officialName: 'Bambang S.Sos', departmentOrigin: 'Biro Rektorat', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-14', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Biro Keuangan', officialName: 'Supardi S.E', departmentOrigin: 'Biro Administrasi Umum', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-15', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Perpustakaan FC', officialName: 'Sri Lestari S.I.Pust', departmentOrigin: 'Perpustakaan', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-16', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Pesma KH Mas Mansur', officialName: 'Ust. Farhan', departmentOrigin: 'Pesma', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-17', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Security UMS FC', officialName: 'Danang', departmentOrigin: 'Satpam Kampus', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-18', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Cleaning Service FC', officialName: 'Slamet', departmentOrigin: 'Sarana Prasarana', potTier: 3, seedNumber: null, drawnSlot: null }
];

export default function TournamentDashboard() {
  const [tournament, setTournament] = useState<Tournament>(DEFAULT_TOURNAMENT);
  const [teams, setTeams] = useState<Team[]>(INITIAL_18_TEAMS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [drawingSession, setDrawingSession] = useState<DrawingSession | null>(null);
  
  const [activeTab, setActiveTab] = useState<'drawing' | 'bracket' | 'schedule' | 'teams' | 'groups'>('drawing');
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('Menghubungkan ke Cloud Firestore...');

  // Initialize initial knockout bracket if none exists
  useEffect(() => {
    if (matches.length === 0) {
      const initialMatches = generateKnockoutBracket({
        tournamentId: tournament.id,
        teams: teams,
        startDate: tournament.startDate,
        dailyStartTime: tournament.dailyStartTime,
        matchDurationMinutes: tournament.matchDurationMinutes,
        breakMinutes: tournament.breakMinutes,
        pitches: tournament.pitches,
        hasThirdPlacePlayoff: tournament.hasThirdPlacePlayoff,
        maxMatchesPerDayPerTeam: tournament.maxMatchesPerDayPerTeam
      });
      setMatches(initialMatches);
    }
  }, [teams, tournament]);

  // Firestore Realtime Synchronization via onSnapshot
  useEffect(() => {
    if (!db) return;

    let unsubTournament: (() => void) | undefined;
    let unsubTeams: (() => void) | undefined;
    let unsubMatches: (() => void) | undefined;
    let unsubSession: (() => void) | undefined;

    try {
      // 1. Listen to Tournament document
      const tournRef = collections.tournamentDoc(tournament.id);
      unsubTournament = onSnapshot(tournRef, snap => {
        if (snap.exists()) {
          setTournament(snap.data());
          setCloudSynced(true);
          setSyncMessage('Terhubung Realtime');
        }
      }, err => {
        console.warn('Firestore stream fallback to local mode:', err.message);
        setSyncMessage('Modus Siap Online (Local Memory)');
      });

      // 2. Listen to Teams sub-collection
      const teamsRef = collections.teams(tournament.id);
      unsubTeams = onSnapshot(teamsRef, snap => {
        if (!snap.empty) {
          const cloudTeams = snap.docs.map(d => d.data());
          setTeams(cloudTeams);
        }
      }, () => {});

      // 3. Listen to Matches sub-collection
      const matchesRef = collections.matches(tournament.id);
      unsubMatches = onSnapshot(matchesRef, snap => {
        if (!snap.empty) {
          const cloudMatches = snap.docs.map(d => d.data());
          cloudMatches.sort((a, b) => a.matchNumber - b.matchNumber);
          setMatches(cloudMatches);
        }
      }, () => {});

      // 4. Listen to Drawing Session
      const sessionRef = collections.drawingSessionDoc(tournament.id, 'current');
      unsubSession = onSnapshot(sessionRef, snap => {
        if (snap.exists()) {
          setDrawingSession(snap.data());
        }
      }, () => {});

    } catch (e) {
      console.log('Firebase running in local demo mode');
    }

    return () => {
      if (unsubTournament) unsubTournament();
      if (unsubTeams) unsubTeams();
      if (unsubMatches) unsubMatches();
      if (unsubSession) unsubSession();
    };
  }, [tournament.id]);

  // Assign drawn slot to team
  const handleSlotAssigned = async (teamId: string, slotNumber: number) => {
    const updated = teams.map(t => t.id === teamId ? { ...t, drawnSlot: slotNumber } : t);
    setTeams(updated);

    // Re-generate knockout bracket with new slot assignments
    const regeneratedMatches = generateKnockoutBracket({
      tournamentId: tournament.id,
      teams: updated,
      startDate: tournament.startDate,
      dailyStartTime: tournament.dailyStartTime,
      matchDurationMinutes: tournament.matchDurationMinutes,
      breakMinutes: tournament.breakMinutes,
      pitches: tournament.pitches,
      hasThirdPlacePlayoff: tournament.hasThirdPlacePlayoff,
      maxMatchesPerDayPerTeam: tournament.maxMatchesPerDayPerTeam
    });
    setMatches(regeneratedMatches);

    // Persist to Firestore if available
    try {
      await tournamentService.batchSaveTeams(tournament.id, updated);
      await tournamentService.batchSaveMatches(tournament.id, regeneratedMatches);
    } catch (e) {}
  };

  // Score save handler with auto-advancement
  const handleSaveScore = async (
    matchId: string,
    scores: {
      homeScore: number;
      awayScore: number;
      homePenalty?: number | null;
      awayPenalty?: number | null;
    }
  ) => {
    const { updatedMatches } = advanceKnockoutWinner(matches, matchId, scores);
    setMatches(updatedMatches);

    // Persist to Cloud Firestore
    try {
      await tournamentService.batchSaveMatches(tournament.id, updatedMatches);
    } catch (e) {}
  };

  // Re-generate bracket handler
  const handleGenerateBracket = async () => {
    const newMatches = generateKnockoutBracket({
      tournamentId: tournament.id,
      teams: teams,
      startDate: tournament.startDate,
      dailyStartTime: tournament.dailyStartTime,
      matchDurationMinutes: tournament.matchDurationMinutes,
      breakMinutes: tournament.breakMinutes,
      pitches: tournament.pitches,
      hasThirdPlacePlayoff: tournament.hasThirdPlacePlayoff,
      maxMatchesPerDayPerTeam: tournament.maxMatchesPerDayPerTeam
    });
    setMatches(newMatches);
    try {
      await tournamentService.batchSaveMatches(tournament.id, newMatches);
    } catch (e) {}
  };

  // Team import handler
  const handleImportTeams = async (newTeams: Team[]) => {
    setTeams(newTeams);
    const newMatches = generateKnockoutBracket({
      tournamentId: tournament.id,
      teams: newTeams,
      startDate: tournament.startDate,
      dailyStartTime: tournament.dailyStartTime,
      matchDurationMinutes: tournament.matchDurationMinutes,
      breakMinutes: tournament.breakMinutes,
      pitches: tournament.pitches,
      hasThirdPlacePlayoff: tournament.hasThirdPlacePlayoff,
      maxMatchesPerDayPerTeam: tournament.maxMatchesPerDayPerTeam
    });
    setMatches(newMatches);
    try {
      await tournamentService.batchSaveTeams(tournament.id, newTeams);
      await tournamentService.batchSaveMatches(tournament.id, newMatches);
    } catch (e) {}
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-md">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Tournament Studio
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center space-x-1">
                <Wifi className="w-2.5 h-2.5" />
                <span>{cloudSynced ? 'Cloud Online' : 'Active'}</span>
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
              {tournament.title}
            </h1>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Admin / Spectator Switch */}
          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              isAdmin
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Ganti Mode Tampilan (Admin vs Spectator)"
          >
            {isAdmin ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isAdmin ? 'Mode Panitia (Admin)' : 'Mode Penonton'}</span>
          </button>

          {/* Export Options */}
          <button
            onClick={() => exportFixturesToCSV(tournament, matches)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 text-xs flex items-center space-x-1"
            title="Download Jadwal (Excel / CSV)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button
            onClick={triggerPrintReport}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 text-xs flex items-center space-x-1"
            title="Cetak PDF / Print A4"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Cetak PDF</span>
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav className="bg-slate-900/40 border-b border-slate-800/80 px-4 sm:px-8 py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar no-print">
        {[
          { id: 'drawing', label: '🎯 Live Drawing', icon: Sparkles },
          { id: 'bracket', label: '🏆 Bagan Pertandingan', icon: Trophy },
          { id: 'schedule', label: '📅 Matriks Jadwal', icon: Calendar },
          { id: 'teams', label: '👥 Roster & Impor Tim', icon: Users },
          { id: 'groups', label: '📊 Babak Grup', icon: Table }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={handleGenerateBracket}
            className="ml-auto px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap"
            title="Hitung Ulang Bagan & Jadwal Rest Time"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Bagan Otomatis</span>
          </button>
        )}
      </nav>

      {/* Main Dynamic View Area */}
      <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {activeTab === 'drawing' && (
          <LiveDrawingPresenter
            tournamentTitle={tournament.title}
            tournamentId={tournament.id}
            teams={teams}
            session={drawingSession}
            isAdmin={isAdmin}
            onSlotAssigned={handleSlotAssigned}
          />
        )}

        {activeTab === 'bracket' && (
          <BracketTreeVisualizer
            matches={matches}
            isAdmin={isAdmin}
            onSaveScore={handleSaveScore}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleMatrix
            matches={matches}
            onMatchClick={() => setActiveTab('bracket')}
          />
        )}

        {activeTab === 'teams' && (
          <div className="space-y-8">
            <TeamBatchImporter
              tournamentId={tournament.id}
              existingTeams={teams}
              onImportTeams={handleImportTeams}
            />

            {/* Current Teams Listing */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h4 className="font-bold text-sm text-slate-200">
                  Daftar Peserta Terdaftar ({teams.length} Tim)
                </h4>
                <button
                  onClick={() => exportTeamsToCSV(tournament, teams)}
                  className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Daftar Tim CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-200">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.departmentOrigin}</div>
                      <div className="text-[10px] text-slate-500">Official: {t.officialName}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                        Pot {t.potTier}
                      </span>
                      {t.drawnSlot !== null && (
                        <div className="text-[10px] text-emerald-400 font-bold mt-1">
                          Slot #{t.drawnSlot}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <GroupStageVisualizer
            groups={groups}
            matches={matches}
            onMatchClick={() => {}}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-8 py-4 text-center text-xs text-slate-500 no-print">
        Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js
      </footer>
    </main>
  );
}
