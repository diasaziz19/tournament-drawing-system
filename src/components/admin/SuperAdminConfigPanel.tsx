'use client';

import React, { useState } from 'react';
import { 
  Tournament, 
  TournamentFormat, 
  Team, 
  SportType 
} from '../../types/tournament';
import { 
  generateKnockoutBracket 
} from '../../lib/engines/knockout-engine';
import { 
  generateGroupMatches, 
  calculateGroupStandings 
} from '../../lib/engines/round-robin-engine';
import { 
  tournamentService 
} from '../../lib/firestore-converters';
import { 
  Settings, 
  Trophy, 
  RotateCw, 
  Layers, 
  Calendar, 
  Clock, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  Save,
  Users,
  Shield,
  Shuffle
} from 'lucide-react';

interface SuperAdminConfigPanelProps {
  tournament: Tournament;
  teams: Team[];
  onConfigSaved: (updatedTournament: Tournament, updatedTeams: Team[]) => void;
  onLogout: () => void;
}

const PRESET_COUNTS = [8, 12, 16, 18, 20, 24, 32];

// Preset 18 Tim Minisoccer Dies Natalis UMS
const UMS_18_TEAMS_PRESET: Omit<Team, 'id' | 'tournamentId' | 'drawnSlot'>[] = [
  { name: 'Kedokteran FC', officialName: 'dr. Budi', departmentOrigin: 'Fakultas Kedokteran', potTier: 1, seedNumber: 1 },
  { name: 'FKIP Juara', officialName: 'Prof. Sutrisno', departmentOrigin: 'FKIP', potTier: 1, seedNumber: 2 },
  { name: 'Teknik Mesin', officialName: 'Ir. Joko', departmentOrigin: 'Fakultas Teknik', potTier: 1, seedNumber: 3 },
  { name: 'Farmasi Hebat', officialName: 'apt. Dian', departmentOrigin: 'Fakultas Farmasi', potTier: 1, seedNumber: 4 },
  { name: 'FEB United', officialName: 'Dr. Rahman', departmentOrigin: 'Fakultas Ekonomi Bisnis', potTier: 2, seedNumber: null },
  { name: 'Psikologi FC', officialName: 'M. Ridwan M.Psi', departmentOrigin: 'Fakultas Psikologi', potTier: 2, seedNumber: null },
  { name: 'Hukum Perkasa', officialName: 'Dr. Hartono S.H', departmentOrigin: 'Fakultas Hukum', potTier: 2, seedNumber: null },
  { name: 'FIK All-Star', officialName: 'Nurul M.Kes', departmentOrigin: 'Fak. Ilmu Kesehatan', potTier: 2, seedNumber: null },
  { name: 'FAI Soccer', officialName: 'Drs. Abdullah', departmentOrigin: 'Fak. Agama Islam', potTier: 2, seedNumber: null },
  { name: 'Geografi FC', officialName: 'Tri Wahyuni M.Sc', departmentOrigin: 'Fakultas Geografi', potTier: 2, seedNumber: null },
  { name: 'FKI Cyber', officialName: 'Gunawan M.Kom', departmentOrigin: 'Fak. Komunikasi & Informatika', potTier: 3, seedNumber: null },
  { name: 'Pascasarjana FC', officialName: 'Dr. Anwar', departmentOrigin: 'Sekolah Pascasarjana', potTier: 3, seedNumber: null },
  { name: 'Biro Rektorat', officialName: 'Bambang S.Sos', departmentOrigin: 'Biro Rektorat', potTier: 3, seedNumber: null },
  { name: 'Biro Keuangan', officialName: 'Supardi S.E', departmentOrigin: 'Biro Administrasi Umum', potTier: 3, seedNumber: null },
  { name: 'Perpustakaan FC', officialName: 'Sri Lestari S.I.Pust', departmentOrigin: 'Perpustakaan', potTier: 3, seedNumber: null },
  { name: 'Pesma KH Mas Mansur', officialName: 'Ust. Farhan', departmentOrigin: 'Pesma', potTier: 3, seedNumber: null },
  { name: 'Security UMS FC', officialName: 'Danang', departmentOrigin: 'Satpam Kampus', potTier: 3, seedNumber: null },
  { name: 'Cleaning Service FC', officialName: 'Slamet', departmentOrigin: 'Sarana Prasarana', potTier: 3, seedNumber: null }
];

export const SuperAdminConfigPanel: React.FC<SuperAdminConfigPanelProps> = ({
  tournament,
  teams,
  onConfigSaved,
  onLogout
}) => {
  // Local editable state
  const [title, setTitle] = useState(tournament.title);
  const [sportType, setSportType] = useState<SportType>(tournament.sportType);
  const [format, setFormat] = useState<TournamentFormat>(tournament.format);
  const [targetTeamCount, setTargetTeamCount] = useState<number>(teams.length || 18);
  const [numGroups, setNumGroups] = useState<number>(4);
  const [hasThirdPlace, setHasThirdPlace] = useState<boolean>(tournament.hasThirdPlacePlayoff);
  const [duration, setDuration] = useState<number>(tournament.matchDurationMinutes);
  const [breakTime, setBreakTime] = useState<number>(tournament.breakMinutes);
  const [startDate, setStartDate] = useState<string>(tournament.startDate);
  const [dailyStart, setDailyStart] = useState<string>(tournament.dailyStartTime);
  const [pitchesText, setPitchesText] = useState<string>(tournament.pitches.join(', '));

  // Team roster draft
  const [roster, setRoster] = useState<Team[]>(teams);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate blank template teams based on target count
  const handleGenerateTemplateTeams = (count: number) => {
    setTargetTeamCount(count);
    const newRoster: Team[] = [];
    for (let i = 1; i <= count; i++) {
      // Determine pot tier: first 25% Pot 1, next 35% Pot 2, remainder Pot 3
      const pot: 1 | 2 | 3 = i <= Math.ceil(count * 0.25) ? 1 : i <= Math.ceil(count * 0.6) ? 2 : 3;
      newRoster.push({
        id: `team-${i}`,
        tournamentId: tournament.id,
        name: `Tim ${i}`,
        officialName: `Official Tim ${i}`,
        departmentOrigin: `Departemen/Fakultas ${i}`,
        potTier: pot,
        seedNumber: pot === 1 ? i : null,
        drawnSlot: null
      });
    }
    setRoster(newRoster);
  };

  // Reset to UMS 18 teams preset
  const handleLoadUmsPreset = () => {
    setTargetTeamCount(18);
    const loaded: Team[] = UMS_18_TEAMS_PRESET.map((t, idx) => ({
      ...t,
      id: `team-ums-${idx + 1}`,
      tournamentId: tournament.id,
      drawnSlot: null
    }));
    setRoster(loaded);
  };

  // Add individual team row
  const handleAddTeam = () => {
    const nextIdx = roster.length + 1;
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      tournamentId: tournament.id,
      name: `Tim Baru ${nextIdx}`,
      officialName: `Official`,
      departmentOrigin: `Umum`,
      potTier: 3,
      seedNumber: null,
      drawnSlot: null
    };
    setRoster([...roster, newTeam]);
    setTargetTeamCount(roster.length + 1);
  };

  // Remove individual team row
  const handleRemoveTeam = (teamId: string) => {
    if (roster.length <= 2) {
      alert('Minimal harus ada 2 tim dalam turnamen.');
      return;
    }
    const updated = roster.filter(t => t.id !== teamId);
    setRoster(updated);
    setTargetTeamCount(updated.length);
  };

  // Update specific team field
  const handleUpdateTeamField = (teamId: string, field: keyof Team, value: any) => {
    setRoster(roster.map(t => {
      if (t.id === teamId) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  // Save and build full tournament architecture in Firestore
  const handleSaveConfiguration = async () => {
    if (roster.length < 2) {
      setStatusMessage({ type: 'error', text: 'Minimal diperlukan 2 tim untuk membuat turnamen.' });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);

      const pitches = pitchesText.split(',').map(p => p.trim()).filter(Boolean);
      if (pitches.length === 0) pitches.push('Lapangan 1');

      const updatedTournament: Tournament = {
        ...tournament,
        title,
        sportType,
        format,
        hasThirdPlacePlayoff: hasThirdPlace,
        matchDurationMinutes: duration,
        breakMinutes: breakTime,
        startDate,
        dailyStartTime: dailyStart,
        pitches,
        status: 'drawing',
        updatedAt: Date.now()
      };

      // Reset drawnSlot on reconfigure
      const cleanTeams: Team[] = roster.map((t, idx) => ({
        ...t,
        tournamentId: tournament.id,
        drawnSlot: null,
        groupName: null,
        groupPosition: null
      }));

      // Generate Matches & Groups according to format
      let generatedMatches: any[] = [];
      let generatedGroups: any[] = [];

      if (format === 'knockout') {
        generatedMatches = generateKnockoutBracket({
          tournamentId: tournament.id,
          teams: cleanTeams,
          startDate,
          dailyStartTime: dailyStart,
          matchDurationMinutes: duration,
          breakMinutes: breakTime,
          pitches,
          hasThirdPlacePlayoff: hasThirdPlace,
          maxMatchesPerDayPerTeam: 1
        });
      } else if (format === 'group_single' || format === 'group_double') {
        // Divide teams into groups
        const k = Math.min(numGroups, Math.floor(cleanTeams.length / 2)) || 2;
        const groupNames = ['Grup A', 'Grup B', 'Grup C', 'Grup D', 'Grup E', 'Grup F', 'Grup G', 'Grup H'].slice(0, k);

        let matchCounter = 1;
        for (let gIdx = 0; gIdx < groupNames.length; gIdx++) {
          const gName = groupNames[gIdx];
          // Distribute teams evenly across groups
          const groupTeams = cleanTeams.filter((_, idx) => idx % k === gIdx);
          groupTeams.forEach((gt, pos) => {
            gt.groupName = gName;
            gt.groupPosition = pos + 1;
          });

          const { matches: gMatches, nextMatchNumber } = generateGroupMatches(
            tournament.id,
            gName,
            groupTeams,
            {
              startDate,
              dailyStartTime: dailyStart,
              matchDurationMinutes: duration,
              breakMinutes: breakTime,
              pitches,
              isDoubleRound: format === 'group_double',
              startMatchNumber: matchCounter
            }
          );

          matchCounter = nextMatchNumber;
          generatedMatches.push(...gMatches);

          const initialStandings = calculateGroupStandings(groupTeams, []);
          generatedGroups.push({
            id: `group-${gIdx + 1}`,
            tournamentId: tournament.id,
            groupName: gName,
            teamIds: groupTeams.map(t => t.id),
            standings: initialStandings
          });
        }
      } else if (format === 'group_knockout') {
        // Multi-stage: Group stage first
        const k = Math.min(numGroups, 4);
        const groupNames = ['Grup A', 'Grup B', 'Grup C', 'Grup D'].slice(0, k);
        let matchCounter = 1;

        for (let gIdx = 0; gIdx < groupNames.length; gIdx++) {
          const gName = groupNames[gIdx];
          const groupTeams = cleanTeams.filter((_, idx) => idx % k === gIdx);
          groupTeams.forEach((gt, pos) => {
            gt.groupName = gName;
            gt.groupPosition = pos + 1;
          });

          const { matches: gMatches, nextMatchNumber } = generateGroupMatches(
            tournament.id,
            gName,
            groupTeams,
            {
              startDate,
              dailyStartTime: dailyStart,
              matchDurationMinutes: duration,
              breakMinutes: breakTime,
              pitches,
              isDoubleRound: false,
              startMatchNumber: matchCounter
            }
          );

          matchCounter = nextMatchNumber;
          generatedMatches.push(...gMatches);

          const initialStandings = calculateGroupStandings(groupTeams, []);
          generatedGroups.push({
            id: `group-${gIdx + 1}`,
            tournamentId: tournament.id,
            groupName: gName,
            teamIds: groupTeams.map(t => t.id),
            standings: initialStandings
          });
        }
      }

      // Persist everything to Cloud Firestore
      await tournamentService.saveTournament(updatedTournament);
      await tournamentService.batchSaveTeams(tournament.id, cleanTeams);
      await tournamentService.batchSaveMatches(tournament.id, generatedMatches);
      await tournamentService.batchSaveGroups(tournament.id, generatedGroups);

      // Reset Drawing Session
      await tournamentService.updateDrawingSession(tournament.id, {
        status: 'idle',
        currentTeam: null,
        currentSlot: null,
        isRevealed: false,
        revealedTeamIds: [],
        message: 'Format Turnamen Baru Berhasil Diterapkan'
      });

      onConfigSaved(updatedTournament, cleanTeams);
      setStatusMessage({ type: 'success', text: 'Konfigurasi turnamen & jadwal berhasil disimpan dan disinkronkan ke Cloud Firestore!' });
    } catch (err: any) {
      console.error('Error saving tournament config:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan ke Firestore' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-2xl space-y-8">
      {/* Header with Admin Badge & Logout */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl shadow-lg shadow-amber-500/10">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Control Room
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                Super Admin
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-100">
              Panel Konfigurasi Master Turnamen
            </h3>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
        >
          Keluar Mode Super Admin
        </button>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${
          statusMessage.type === 'success'
            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
            : 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Pemilihan Tipe Kompetisi */}
      <div className="space-y-4">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          1. Pilih Tipe & Format Kompetisi
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Format 1: Knockout */}
          <div
            onClick={() => setFormat('knockout')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              format === 'knockout'
                ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-amber-400 shadow-lg shadow-indigo-500/20'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Trophy className="w-5 h-5" />
                </span>
                {format === 'knockout' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <h4 className="font-bold text-sm text-slate-100">Sistem Gugur Tunggal</h4>
              <p className="text-xs text-slate-400 mt-1">
                Pure Knockout. Menyeimbangkan tim irregular (playoff) & perebutan Juara 3.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-indigo-300">
              Maksimal 1 laga/hari per tim
            </div>
          </div>

          {/* Format 2: Setengah Kompetisi */}
          <div
            onClick={() => setFormat('group_single')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              format === 'group_single'
                ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-amber-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <RotateCw className="w-5 h-5" />
                </span>
                {format === 'group_single' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <h4 className="font-bold text-sm text-slate-100">Setengah Kompetisi</h4>
              <p className="text-xs text-slate-400 mt-1">
                Single Round-Robin. Setiap tim saling berhadapan satu kali (Algoritma Berger).
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-emerald-300">
              Klasemen otomatis realtime
            </div>
          </div>

          {/* Format 3: Kompetisi Penuh */}
          <div
            onClick={() => setFormat('group_double')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              format === 'group_double'
                ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900 border-amber-400 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Shuffle className="w-5 h-5" />
                </span>
                {format === 'group_double' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <h4 className="font-bold text-sm text-slate-100">Kompetisi Penuh</h4>
              <p className="text-xs text-slate-400 mt-1">
                Double Round-Robin. Sistem Home & Away (2 leg) dengan rotasi venue adil.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-cyan-300">
              Rotasi Home & Away
            </div>
          </div>

          {/* Format 4: Multi-stage (Grup + Knockout) */}
          <div
            onClick={() => setFormat('group_knockout')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              format === 'group_knockout'
                ? 'bg-gradient-to-b from-purple-950/80 to-slate-900 border-amber-400 shadow-lg shadow-purple-500/20'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Layers className="w-5 h-5" />
                </span>
                {format === 'group_knockout' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <h4 className="font-bold text-sm text-slate-100">Babak Grup + Knockout</h4>
              <p className="text-xs text-slate-400 mt-1">
                Penyisihan grup dilanjutkan fase gugur untuk juara & runner-up grup.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-purple-300">
              Fase Grup $\rightarrow$ Gugur
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pengaturan Jumlah Tim & Grup */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Tentukan Jumlah Tim Peserta
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih preset instan atau ketik jumlah tim yang diinginkan (saat ini: <strong className="text-amber-400">{roster.length} tim</strong>)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadUmsPreset}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gunakan Data 18 Tim UMS</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-2">Preset Cepat:</span>
          {PRESET_COUNTS.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => handleGenerateTemplateTeams(count)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                targetTeamCount === count
                  ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {count} Tim
            </button>
          ))}
        </div>

        {/* Custom Group Split (if Group-based) */}
        {(format === 'group_single' || format === 'group_double' || format === 'group_knockout') && (
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-bold text-slate-300">Bagi Ke Dalam Berapa Grup:</span>
              {[2, 4, 8].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setNumGroups(g)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    numGroups === g
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {g} Grup ({Math.ceil(roster.length / g)} tim/grup)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Pengaturan Detail Turnamen (Waktu & Lapangan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Nama Turnamen
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Durasi Laga (Menit) & Istirahat
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="10"
              max="120"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              placeholder="Main"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white text-center focus:border-amber-500 outline-none"
            />
            <input
              type="number"
              min="0"
              max="60"
              value={breakTime}
              onChange={e => setBreakTime(Number(e.target.value))}
              placeholder="Jeda"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white text-center focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Jam Mulai & Tanggal
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={dailyStart}
              onChange={e => setDailyStart(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white text-center focus:border-amber-500 outline-none"
            />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white text-center focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Daftar Lapangan (Pisahkan dengan koma)
          </label>
          <input
            type="text"
            value={pitchesText}
            onChange={e => setPitchesText(e.target.value)}
            placeholder="Lapangan A, Lapangan B"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 pt-6">
          <input
            type="checkbox"
            id="thirdPlaceCheck"
            checked={hasThirdPlace}
            onChange={e => setHasThirdPlace(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="thirdPlaceCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
            Sertakan Perebutan Juara 3 (Playoff Semifinal)
          </label>
        </div>
      </div>

      {/* 4. Tabel Roster Tim & Pengaturan Pot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Daftar Tim & Alokasi Pot Tier ({roster.length} Tim)
            </label>
            <p className="text-[11px] text-slate-400">
              Pot 1: Tim Unggulan (Direct Bye), Pot 2: Menengah, Pot 3: Masuk babak Playoff pendahuluan jika jumlah tim ganjil.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddTeam}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center space-x-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tambah Tim</span>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">Nama Tim</th>
                <th className="py-2.5 px-3">Official</th>
                <th className="py-2.5 px-3">Fakultas / Instansi</th>
                <th className="py-2.5 px-3 text-center w-24">Pot Tier</th>
                <th className="py-2.5 px-3 text-center w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {roster.map((team, idx) => (
                <tr key={team.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-3 text-center text-slate-500 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={team.name}
                      onChange={e => handleUpdateTeamField(team.id, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={team.officialName}
                      onChange={e => handleUpdateTeamField(team.id, 'officialName', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500 outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={team.departmentOrigin}
                      onChange={e => handleUpdateTeamField(team.id, 'departmentOrigin', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500 outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={team.potTier}
                      onChange={e => handleUpdateTeamField(team.id, 'potTier', Number(e.target.value) as 1 | 2 | 3)}
                      className="bg-slate-900 border border-slate-800 text-amber-400 font-bold rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                    >
                      <option value={1}>Pot 1</option>
                      <option value={2}>Pot 2</option>
                      <option value={3}>Pot 3</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(team.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Hapus Tim"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Simpan Konfigurasi & Inisialisasi Turnamen */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Format Terpilih: <strong className="text-amber-400 uppercase">{format.replace('_', ' ')}</strong> • Total: <strong className="text-indigo-400">{roster.length} Tim</strong>
        </div>

        <button
          type="button"
          onClick={handleSaveConfiguration}
          disabled={saving}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menerapkan & Menyinkronkan ke Cloud...' : 'Terapkan & Inisialisasi Turnamen ke Cloud'}</span>
        </button>
      </div>
    </div>
  );
};
