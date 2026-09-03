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
import { SuperAdminAuthModal } from '../components/admin/SuperAdminAuthModal';
import { SuperAdminConfigPanel } from '../components/admin/SuperAdminConfigPanel';
import { TextContentEditorModal } from '../components/admin/TextContentEditorModal';
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
  Settings,
  Layers,
  LogOut,
  Type,
  Megaphone
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

// Initial 19 teams preloaded for Dies Natalis UMS 2026 with 4 Patent Seeds
const INITIAL_19_TEAMS: Team[] = [
  { id: 't-1', tournamentId: DEFAULT_TOURNAMENT.id, name: 'SATPAM UNITED', officialName: 'Danang', departmentOrigin: 'Unit Keamanan UMS', potTier: 1, seedNumber: 1, drawnSlot: 3 },
  { id: 't-2', tournamentId: DEFAULT_TOURNAMENT.id, name: 'PARKIR UNITED', officialName: 'Agus', departmentOrigin: 'Unit Parkir UMS', potTier: 1, seedNumber: 2, drawnSlot: 19 },
  { id: 't-3', tournamentId: DEFAULT_TOURNAMENT.id, name: 'CAKAP FC', officialName: 'Prof. Sutrisno', departmentOrigin: 'FKIP UMS', potTier: 1, seedNumber: 3, drawnSlot: 11 },
  { id: 't-4', tournamentId: DEFAULT_TOURNAMENT.id, name: 'DASP + Outsourcing', officialName: 'Slamet', departmentOrigin: 'Sarana Prasarana', potTier: 1, seedNumber: 4, drawnSlot: 8 },
  { id: 't-5', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Kedokteran FC', officialName: 'dr. Budi', departmentOrigin: 'Fakultas Kedokteran', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-6', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Teknik Mesin', officialName: 'Ir. Joko', departmentOrigin: 'Fakultas Teknik', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-7', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Farmasi Hebat', officialName: 'apt. Dian', departmentOrigin: 'Fakultas Farmasi', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-8', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FEB United', officialName: 'Dr. Rahman', departmentOrigin: 'Fakultas Ekonomi Bisnis', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-9', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Psikologi FC', officialName: 'M. Ridwan M.Psi', departmentOrigin: 'Fakultas Psikologi', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-10', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Hukum Perkasa', officialName: 'Dr. Hartono S.H', departmentOrigin: 'Fakultas Hukum', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-11', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FIK All-Star', officialName: 'Nurul M.Kes', departmentOrigin: 'Fak. Ilmu Kesehatan', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-12', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FAI Soccer', officialName: 'Drs. Abdullah', departmentOrigin: 'Fak. Agama Islam', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-13', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Geografi FC', officialName: 'Tri Wahyuni M.Sc', departmentOrigin: 'Fakultas Geografi', potTier: 2, seedNumber: null, drawnSlot: null },
  { id: 't-14', tournamentId: DEFAULT_TOURNAMENT.id, name: 'FKI Cyber', officialName: 'Gunawan M.Kom', departmentOrigin: 'Fak. Komunikasi & Informatika', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-15', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Pascasarjana FC', officialName: 'Dr. Anwar', departmentOrigin: 'Sekolah Pascasarjana', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-16', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Biro Rektorat', officialName: 'Bambang S.Sos', departmentOrigin: 'Biro Rektorat', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-17', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Biro Keuangan', officialName: 'Supardi S.E', departmentOrigin: 'Biro Administrasi Umum', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-18', tournamentId: DEFAULT_TOURNAMENT.id, name: 'Perpustakaan FC', officialName: 'Sri Lestari S.I.Pust', departmentOrigin: 'Perpustakaan', potTier: 3, seedNumber: null, drawnSlot: null },
  { id: 't-19', tournamentId: DEFAULT_TOURNAMENT.id, name: 'EDUTORIUM', officialName: 'Edutorium', departmentOrigin: 'Unit Edutorium UMS', potTier: 3, seedNumber: null, drawnSlot: null }
];

export default function TournamentDashboard() {
  const [tournament, setTournament] = useState<Tournament>(DEFAULT_TOURNAMENT);
  const [teams, setTeams] = useState<Team[]>(INITIAL_19_TEAMS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [drawingSession, setDrawingSession] = useState<DrawingSession | null>(null);
  
  const [activeTab, setActiveTab] = useState<'drawing' | 'bracket' | 'schedule' | 'teams' | 'groups' | 'admin'>('drawing');
  
  // Super Admin Authentication State
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState<boolean>(false);
  
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('Menghubungkan ke Cloud Firestore...');

  // Check stored session storage for super admin authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('superadmin_auth');
      if (auth === 'true') {
        setIsSuperAdmin(true);
      }
    }
  }, []);

  // Initialize initial knockout bracket if none exists
  useEffect(() => {
    if (matches.length === 0 && tournament.format === 'knockout') {
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
    let unsubGroups: (() => void) | undefined;
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
          // Auto-sanitize EDUTORIUM: ensure debutant is strictly Pot 3 and not seeded
          const sanitized = cloudTeams.map(t => {
            if (t.name.toUpperCase().includes('EDUTORIUM') && (t.potTier !== 3 || t.seedNumber !== null)) {
              return { ...t, potTier: 3 as const, seedNumber: null, drawnSlot: null };
            }
            return t;
          });
          setTeams(sanitized);
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

      // 4. Listen to Groups sub-collection
      const groupsRef = collections.groups(tournament.id);
      unsubGroups = onSnapshot(groupsRef, snap => {
        if (!snap.empty) {
          const cloudGroups = snap.docs.map(d => d.data());
          setGroups(cloudGroups);
        }
      }, () => {});

      // 5. Listen to Drawing Session
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
      if (unsubGroups) unsubGroups();
      if (unsubSession) unsubSession();
    };
  }, [tournament.id]);

  // Handle Logout Super Admin
  const handleLogoutSuperAdmin = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('superadmin_auth');
    }
    setIsSuperAdmin(false);
    if (activeTab === 'admin') {
      setActiveTab('drawing');
    }
  };

  // Assign drawn slot to team
  const handleSlotAssigned = async (teamId: string, slotNumber: number) => {
    const updated = teams.map(t => t.id === teamId ? { ...t, drawnSlot: slotNumber } : t);
    setTeams(updated);

    if (tournament.format === 'knockout') {
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

      try {
        await tournamentService.batchSaveTeams(tournament.id, updated);
        await tournamentService.batchSaveMatches(tournament.id, regeneratedMatches);
      } catch (e) {}
    } else {
      try {
        await tournamentService.batchSaveTeams(tournament.id, updated);
      } catch (e) {}
    }
  };

  // Dedicated Reset Draw Handler - Clears random drawn slots while preserving seeded teams
  const handleResetDrawSession = async () => {
    // Preserve seedNumber 1..4, clear all other drawnSlot
    const resetTeams = teams.map(t => {
      const isSeeded = t.seedNumber && [1, 2, 3, 4].includes(t.seedNumber);
      return isSeeded ? t : { ...t, drawnSlot: null };
    });
    setTeams(resetTeams);

    if (tournament.format === 'knockout') {
      const regeneratedMatches = generateKnockoutBracket({
        tournamentId: tournament.id,
        teams: resetTeams,
        startDate: tournament.startDate,
        dailyStartTime: tournament.dailyStartTime,
        matchDurationMinutes: tournament.matchDurationMinutes,
        breakMinutes: tournament.breakMinutes,
        pitches: tournament.pitches,
        hasThirdPlacePlayoff: tournament.hasThirdPlacePlayoff,
        maxMatchesPerDayPerTeam: tournament.maxMatchesPerDayPerTeam
      });
      setMatches(regeneratedMatches);

      try {
        await tournamentService.batchSaveTeams(tournament.id, resetTeams);
        await tournamentService.batchSaveMatches(tournament.id, regeneratedMatches);
        await tournamentService.updateDrawingSession(tournament.id, {
          status: 'idle',
          currentTeam: null,
          currentSlot: null,
          isRevealed: false,
          revealedTeamIds: resetTeams.filter(t => t.drawnSlot !== null).map(t => t.id),
          message: 'Hasil Undian Berhasil Direset'
        });
      } catch (err) {
        console.error('Failed to reset draw in Firestore:', err);
      }
    } else {
      try {
        await tournamentService.batchSaveTeams(tournament.id, resetTeams);
        await tournamentService.updateDrawingSession(tournament.id, {
          status: 'idle',
          currentTeam: null,
          currentSlot: null,
          isRevealed: false,
          revealedTeamIds: [],
          message: 'Hasil Undian Berhasil Direset'
        });
      } catch (err) {}
    }
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
    if (tournament.format === 'knockout') {
      const { updatedMatches } = advanceKnockoutWinner(matches, matchId, scores);
      setMatches(updatedMatches);

      try {
        await tournamentService.batchSaveMatches(tournament.id, updatedMatches);
      } catch (e) {}
    } else {
      // Group match update
      const updatedMatches = matches.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            homeTeam: { ...m.homeTeam, score: scores.homeScore, penaltyScore: scores.homePenalty ?? null },
            awayTeam: { ...m.awayTeam, score: scores.awayScore, penaltyScore: scores.awayPenalty ?? null },
            status: 'completed' as const
          };
        }
        return m;
      });
      setMatches(updatedMatches);

      // Re-calculate group standings
      const updatedGroups = groups.map(g => {
        const gMatches = updatedMatches.filter(m => m.groupName === g.groupName);
        const gTeams = teams.filter(t => g.teamIds.includes(t.id));
        const newStandings = calculateGroupStandings(gTeams, gMatches);
        return { ...g, standings: newStandings };
      });
      setGroups(updatedGroups);

      try {
        await tournamentService.batchSaveMatches(tournament.id, updatedMatches);
        await tournamentService.batchSaveGroups(tournament.id, updatedGroups);
      } catch (e) {}
    }
  };

  // Re-generate bracket handler
  const handleGenerateBracket = async () => {
    if (tournament.format !== 'knockout') return;
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
    if (tournament.format === 'knockout') {
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
    } else {
      try {
        await tournamentService.batchSaveTeams(tournament.id, newTeams);
      } catch (e) {}
    }
  };

  // Callback when SuperAdmin applies master configuration
  const handleMasterConfigSaved = (updatedTournament: Tournament, updatedTeams: Team[]) => {
    setTournament(updatedTournament);
    setTeams(updatedTeams);

    if (updatedTournament.format === 'knockout') {
      const newMatches = generateKnockoutBracket({
        tournamentId: updatedTournament.id,
        teams: updatedTeams,
        startDate: updatedTournament.startDate,
        dailyStartTime: updatedTournament.dailyStartTime,
        matchDurationMinutes: updatedTournament.matchDurationMinutes,
        breakMinutes: updatedTournament.breakMinutes,
        pitches: updatedTournament.pitches,
        hasThirdPlacePlayoff: updatedTournament.hasThirdPlacePlayoff,
        maxMatchesPerDayPerTeam: updatedTournament.maxMatchesPerDayPerTeam
      });
      setMatches(newMatches);
    }
  };

  // Determine active tab navigation items based on tournament format
  const isKnockout = tournament.format === 'knockout';
  const isGroupFormat = tournament.format === 'group_single' || tournament.format === 'group_double' || tournament.format === 'group_knockout';

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
                {tournament.headerBadge || 'Tournament Studio'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center space-x-1">
                <Wifi className="w-2.5 h-2.5" />
                <span>{cloudSynced ? 'Cloud Online' : 'Active'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                {tournament.format.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
              {tournament.title}
            </h1>
            {Boolean(tournament.subtitle?.trim()) && (
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {tournament.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Edit Teks & Banner Button for Super Admin */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsTextEditorOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Edit judul turnamen, banner pengumuman, dan teks lainnya"
            >
              <Type className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">✏️ Edit Teks & Banner</span>
              <span className="sm:hidden">✏️ Teks</span>
            </button>
          )}

          {/* Super Admin Status & Auth Button */}
          {isSuperAdmin ? (
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Super Admin Aktif</span>
              </span>
              <button
                onClick={handleLogoutSuperAdmin}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 text-xs"
                title="Keluar Mode Super Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition-colors flex items-center space-x-1.5 shadow-sm"
              title="Masuk sebagai Super Admin untuk mengatur turnamen"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Super Admin</span>
            </button>
          )}

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

      {/* Announcement Running Banner (if configured) */}
      {Boolean(tournament.announcementText?.trim()) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-indigo-500/20 to-amber-500/15 border-b border-amber-500/30 px-4 sm:px-8 py-2 text-xs font-semibold text-amber-300 flex items-center justify-between no-print shadow-sm">
          <div className="flex items-center space-x-2 truncate">
            <Megaphone className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">{tournament.announcementText}</span>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setIsTextEditorOpen(true)}
              className="text-[10px] text-amber-400 hover:text-amber-200 underline ml-3 flex-shrink-0 font-bold"
            >
              Edit Pengumuman
            </button>
          )}
        </div>
      )}

      {/* Main Tab Navigation */}
      <nav className="bg-slate-900/40 border-b border-slate-800/80 px-4 sm:px-8 py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar no-print">
        {/* Live Drawing */}
        <button
          onClick={() => setActiveTab('drawing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'drawing'
              ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>🎯 Live Drawing</span>
        </button>

        {/* Bagan Knockout (if Knockout or Multi-stage) */}
        {(isKnockout || tournament.format === 'group_knockout') && (
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'bracket'
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>🏆 Bagan Pertandingan</span>
          </button>
        )}

        {/* Babak Grup (if Group-based format) */}
        {isGroupFormat && (
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'groups'
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>📊 Babak Grup</span>
          </button>
        )}

        {/* Schedule Matrix */}
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>📅 Matriks Jadwal</span>
        </button>

        {/* Team Roster */}
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'teams'
              ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Roster Tim ({teams.length})</span>
        </button>

        {/* Super Admin Control Panel Tab */}
        {isSuperAdmin ? (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap border ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>⚙️ Master Setup (Super Admin)</span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 flex items-center space-x-1.5 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>⚙️ Master Setup</span>
          </button>
        )}

        {isSuperAdmin && isKnockout && (
          <button
            onClick={handleGenerateBracket}
            className="ml-auto px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap"
            title="Hitung Ulang Bagan & Jadwal Rest Time"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Ulang Bagan</span>
          </button>
        )}
      </nav>

      {/* Main Dynamic View Area */}
      <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {activeTab === 'admin' && isSuperAdmin && (
          <SuperAdminConfigPanel
            tournament={tournament}
            teams={teams}
            onConfigSaved={handleMasterConfigSaved}
            onLogout={handleLogoutSuperAdmin}
          />
        )}

        {activeTab === 'drawing' && (
          <LiveDrawingPresenter
            tournamentTitle={tournament.title}
            tournamentId={tournament.id}
            teams={teams}
            session={drawingSession}
            isAdmin={isSuperAdmin}
            onSlotAssigned={handleSlotAssigned}
            onResetDraw={handleResetDrawSession}
          />
        )}

        {activeTab === 'bracket' && (
          <BracketTreeVisualizer
            matches={matches}
            isAdmin={isSuperAdmin}
            tournament={tournament}
            onOpenTextEditor={() => setIsTextEditorOpen(true)}
            onSaveScore={handleSaveScore}
          />
        )}

        {activeTab === 'groups' && (
          <GroupStageVisualizer
            groups={groups}
            matches={matches}
            onMatchClick={() => {}}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleMatrix
            matches={matches}
            onMatchClick={() => {
              if (isKnockout) setActiveTab('bracket');
              else setActiveTab('groups');
            }}
          />
        )}

        {activeTab === 'teams' && (
          <div className="space-y-8">
            {isSuperAdmin && (
              <TeamBatchImporter
                tournamentId={tournament.id}
                existingTeams={teams}
                onImportTeams={handleImportTeams}
              />
            )}

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
                      {t.groupName && (
                        <div className="text-[10px] text-indigo-400 font-bold mt-1">
                          {t.groupName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Super Admin Auth Modal */}
      <SuperAdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={() => {
          setIsSuperAdmin(true);
          setActiveTab('admin');
        }}
      />

      {/* Super Admin Text Content & Banner Editor Modal */}
      {isTextEditorOpen && (
        <TextContentEditorModal
          isOpen={isTextEditorOpen}
          onClose={() => setIsTextEditorOpen(false)}
          tournament={tournament}
          onTournamentUpdated={(updated) => setTournament(updated)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 sm:px-8 py-4 text-xs text-slate-500 no-print flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{tournament.footerText || 'Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js'}</span>
        {isSuperAdmin && (
          <button
            onClick={() => setIsTextEditorOpen(true)}
            className="text-[11px] text-slate-500 hover:text-amber-400 flex items-center space-x-1 transition-colors"
            title="Edit teks footer dan branding"
          >
            <Type className="w-3 h-3" />
            <span>Edit Teks Website</span>
          </button>
        )}
      </footer>
    </main>
  );
}
