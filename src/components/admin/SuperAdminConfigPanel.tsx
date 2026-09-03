'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  Save,
  Shuffle,
  Star,
  Pin,
  Dices,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

interface SuperAdminConfigPanelProps {
  tournament: Tournament;
  teams: Team[];
  onConfigSaved: (updatedTournament: Tournament, updatedTeams: Team[]) => void;
  onLogout: () => void;
}

const PRESET_COUNTS = [8, 12, 16, 18, 19, 20, 24, 32];

// Preset 19 Tim Minisoccer Dies Natalis UMS 2026 with 4 Patent Seeds
const UMS_19_TEAMS_PRESET: Omit<Team, 'id' | 'tournamentId' | 'drawnSlot'>[] = [
  { name: 'SATPAM UNITED', officialName: 'Danang', departmentOrigin: 'Unit Keamanan UMS', potTier: 1, seedNumber: 1 },
  { name: 'PARKIR UNITED', officialName: 'Agus', departmentOrigin: 'Unit Parkir UMS', potTier: 1, seedNumber: 2 },
  { name: 'CAKAP FC', officialName: 'Prof. Sutrisno', departmentOrigin: 'FKIP UMS', potTier: 1, seedNumber: 3 },
  { name: 'DASP + Outsourcing', officialName: 'Slamet', departmentOrigin: 'Sarana Prasarana', potTier: 1, seedNumber: 4 },
  { name: 'Kedokteran FC', officialName: 'dr. Budi', departmentOrigin: 'Fakultas Kedokteran', potTier: 2, seedNumber: null },
  { name: 'Teknik Mesin', officialName: 'Ir. Joko', departmentOrigin: 'Fakultas Teknik', potTier: 2, seedNumber: null },
  { name: 'Farmasi Hebat', officialName: 'apt. Dian', departmentOrigin: 'Fakultas Farmasi', potTier: 2, seedNumber: null },
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
  { name: 'EDUTORIUM', officialName: 'Edutorium', departmentOrigin: 'Unit Edutorium UMS', potTier: 3, seedNumber: null }
];

// Seed Specifications for up to 8 seeds across 16 Besar direct matches
export interface SeedSpec {
  rank: number;
  slot: number;
  title: string;
  defaultPool: string;
  pairName: string;
}

export interface SeedItemConfig {
  rank: number;
  teamId: string;
  slot: number;
  title: string;
}

export const DEFAULT_SEED_SPECS: SeedSpec[] = [
  { rank: 1, slot: 3, title: 'Juara 1 Tahun Lalu', defaultPool: 'Pool Atas (Undian 3 - Laga M#7)', pairName: 'Pasangan 1 & 2' },
  { rank: 2, slot: 19, title: 'Juara 2 (Runner-Up)', defaultPool: 'Pool Bawah (Undian 19 - Laga M#11)', pairName: 'Pasangan 1 & 2' },
  { rank: 3, slot: 11, title: 'Juara 3 Tahun Lalu', defaultPool: 'Pool Bawah (Undian 11 - Laga M#6)', pairName: 'Pasangan 3 & 4' },
  { rank: 4, slot: 8, title: 'Juara 4 Tahun Lalu', defaultPool: 'Pool Atas (Undian 8 - Laga M#8)', pairName: 'Pasangan 3 & 4' },
  { rank: 5, slot: 9, title: 'Unggulan 5 (8 Besar)', defaultPool: 'Pool Atas (Undian 9 - Laga M#5)', pairName: 'Pasangan 5 & 6' },
  { rank: 6, slot: 13, title: 'Unggulan 6 (8 Besar)', defaultPool: 'Pool Bawah (Undian 13 - Laga M#9)', pairName: 'Pasangan 5 & 6' },
  { rank: 7, slot: 15, title: 'Unggulan 7 (8 Besar)', defaultPool: 'Pool Bawah (Undian 15 - Laga M#10)', pairName: 'Pasangan 7 & 8' },
  { rank: 8, slot: 4, title: 'Unggulan 8 (8 Besar)', defaultPool: 'Pool Atas (Undian 4 - Laga M#4)', pairName: 'Pasangan 7 & 8' }
];

export const AVAILABLE_SEED_SLOTS = [
  { slot: 3, label: 'Undian 3 (Pool Atas - Direct Laga M#7)', pool: 'Pool Atas' },
  { slot: 4, label: 'Undian 4 (Pool Atas - Direct Laga M#4)', pool: 'Pool Atas' },
  { slot: 8, label: 'Undian 8 (Pool Atas - Direct Laga M#8)', pool: 'Pool Atas' },
  { slot: 9, label: 'Undian 9 (Pool Atas - Direct Laga M#5)', pool: 'Pool Atas' },
  { slot: 11, label: 'Undian 11 (Pool Bawah - Direct Laga M#6)', pool: 'Pool Bawah' },
  { slot: 13, label: 'Undian 13 (Pool Bawah - Direct Laga M#9)', pool: 'Pool Bawah' },
  { slot: 15, label: 'Undian 15 (Pool Bawah - Direct Laga M#10)', pool: 'Pool Bawah' },
  { slot: 19, label: 'Undian 19 (Pool Bawah - Direct Laga M#11)', pool: 'Pool Bawah' }
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
  const [targetTeamCount, setTargetTeamCount] = useState<number>(teams.length || 19);
  const [numGroups, setNumGroups] = useState<number>(4);
  const [hasThirdPlace, setHasThirdPlace] = useState<boolean>(tournament.hasThirdPlacePlayoff);
  const [duration, setDuration] = useState<number>(tournament.matchDurationMinutes);
  const [breakTime, setBreakTime] = useState<number>(tournament.breakMinutes);
  const [startDate, setStartDate] = useState<string>(tournament.startDate);
  const [dailyStart, setDailyStart] = useState<string>(tournament.dailyStartTime);
  const [pitchesText, setPitchesText] = useState<string>(tournament.pitches.join(', '));

  // Team roster draft synchronized with teams prop
  const [roster, setRoster] = useState<Team[]>(teams);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic Tim Unggulan (Seeded Teams Selection - Supports 2, 4, 8 or custom)
  const [seedItems, setSeedItems] = useState<SeedItemConfig[]>([
    { rank: 1, teamId: '', slot: 3, title: 'Juara 1 Tahun Lalu' },
    { rank: 2, teamId: '', slot: 19, title: 'Juara 2 (Runner-Up)' },
    { rank: 3, teamId: '', slot: 11, title: 'Juara 3 Tahun Lalu' },
    { rank: 4, teamId: '', slot: 8, title: 'Juara 4 Tahun Lalu' }
  ]);

  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  // Synchronize roster when teams prop updates (from Firestore stream or Live Drawing)
  useEffect(() => {
    setRoster(teams);
  }, [teams]);

  // Initialize seeded team selections ONLY ONCE on mount or when empty
  const initializedSeedsRef = useRef(false);
  useEffect(() => {
    if (initializedSeedsRef.current) return;
    if (teams.length === 0) return;

    // Patent 4 Seeds definitions:
    // 1. SATPAM UNITED (Juara 1)
    const satpam = teams.find(t => t.name.toUpperCase().includes('SATPAM') || t.departmentOrigin.toUpperCase().includes('KEAMANAN'));
    // 2. PARKIR UNITED (Juara 2)
    const parkir = teams.find(t => t.name.toUpperCase().includes('PARKIR'));
    // 3. CAKAP FC (Juara 3)
    const cakap = teams.find(t => t.name.toUpperCase().includes('CAKAP') || t.name.toUpperCase().includes('FKIP'));
    // 4. DASP + Outsourcing (Juara 4)
    const dasp = teams.find(t => t.name.toUpperCase().includes('DASP') || t.name.toUpperCase().includes('OUTSOURCING') || t.departmentOrigin.toUpperCase().includes('SARANA') || t.departmentOrigin.toUpperCase().includes('SARPRAS') || t.departmentOrigin.toUpperCase().includes('DASP'));
    // Debutan: EDUTORIUM
    const edutorium = teams.find(t => t.name.toUpperCase().includes('EDUTORIUM'));

    // Check if auto-fix is needed for any of the 4 patent seeds or Edutorium
    const needsSeedSanitize = (
      (satpam && (satpam.seedNumber !== 1 || satpam.potTier !== 1)) ||
      (parkir && (parkir.seedNumber !== 2 || parkir.potTier !== 1)) ||
      (cakap && (cakap.seedNumber !== 3 || cakap.potTier !== 1)) ||
      (dasp && (dasp.seedNumber !== 4 || dasp.potTier !== 1)) ||
      (edutorium && (edutorium.seedNumber !== null || edutorium.potTier !== 3))
    );

    if (needsSeedSanitize) {
      const sanitized = teams.map(t => {
        if (satpam && t.id === satpam.id) return { ...t, potTier: 1 as const, seedNumber: 1, drawnSlot: t.drawnSlot || 3 };
        if (parkir && t.id === parkir.id) return { ...t, potTier: 1 as const, seedNumber: 2, drawnSlot: t.drawnSlot || 19 };
        if (cakap && t.id === cakap.id) return { ...t, potTier: 1 as const, seedNumber: 3, drawnSlot: t.drawnSlot || 11 };
        if (dasp && t.id === dasp.id) return { ...t, potTier: 1 as const, seedNumber: 4, drawnSlot: t.drawnSlot || 8 };
        if (edutorium && t.id === edutorium.id) return { ...t, potTier: 3 as const, seedNumber: null, drawnSlot: null };
        return t;
      });
      setRoster(sanitized);
      tournamentService.batchSaveTeams(tournament.id, sanitized).catch(() => {});
    }

    const isSeedEligible = (t: Team) => !t.name.toUpperCase().includes('EDUTORIUM') && t.potTier !== 3;

    // Detect how many seeds currently exist in teams
    const currentSeededTeams = teams.filter(t => t.seedNumber !== null && t.seedNumber !== undefined && isSeedEligible(t));
    const targetCount = currentSeededTeams.length > 4 ? Math.min(8, currentSeededTeams.length) : 4;

    const populated: SeedItemConfig[] = [];
    for (let r = 1; r <= targetCount; r++) {
      const spec = DEFAULT_SEED_SPECS.find(s => s.rank === r) || {
        rank: r,
        slot: r,
        title: `Unggulan ${r}`,
        defaultPool: `Undian ${r}`,
        pairName: `Pasangan ${Math.floor((r - 1) / 2) * 2 + 1} & ${Math.floor((r - 1) / 2) * 2 + 2}`
      };

      let matchedTeam: Team | undefined;
      if (r === 1) matchedTeam = satpam || teams.find(t => t.seedNumber === 1 && isSeedEligible(t));
      else if (r === 2) matchedTeam = parkir || teams.find(t => t.seedNumber === 2 && isSeedEligible(t));
      else if (r === 3) matchedTeam = cakap || teams.find(t => t.seedNumber === 3 && isSeedEligible(t));
      else if (r === 4) matchedTeam = dasp || teams.find(t => t.seedNumber === 4 && isSeedEligible(t));
      else matchedTeam = teams.find(t => t.seedNumber === r && isSeedEligible(t));

      populated.push({
        rank: r,
        teamId: matchedTeam ? matchedTeam.id : '',
        slot: (matchedTeam && matchedTeam.drawnSlot) ? matchedTeam.drawnSlot : spec.slot,
        title: spec.title
      });
    }

    setSeedItems(populated);
    initializedSeedsRef.current = true;
  }, [teams, tournament.id]);

  // Eligible teams for 4 Unggulan (excludes Pot 3 debutants like EDUTORIUM)
  const seedEligibleTeams = useMemo(() => {
    return roster.filter(t => !t.name.toUpperCase().includes('EDUTORIUM') && t.potTier !== 3);
  }, [roster]);

  // Master Synchronizer: Updates local state, Cloud Firestore, Bracket tree & Drawing session simultaneously
  const syncRosterAndMatches = async (updatedRoster: Team[], msg: string) => {
    const pitches = pitchesText.split(',').map(p => p.trim()).filter(Boolean);
    const newMatches = generateKnockoutBracket({
      tournamentId: tournament.id,
      teams: updatedRoster,
      startDate,
      dailyStartTime: dailyStart,
      matchDurationMinutes: duration,
      breakMinutes: breakTime,
      pitches: pitches.length > 0 ? pitches : ['Lapangan 1'],
      hasThirdPlacePlayoff: hasThirdPlace,
      maxMatchesPerDayPerTeam: 1
    });

    try {
      setSaving(true);
      // 1. Batch save teams to Firestore
      await tournamentService.batchSaveTeams(tournament.id, updatedRoster);
      // 2. Batch save matches to Firestore
      await tournamentService.batchSaveMatches(tournament.id, newMatches);
      
      // 3. Update drawing session with currently occupied team IDs
      const activeDrawnIds = updatedRoster.filter(t => t.drawnSlot !== null).map(t => t.id);
      await tournamentService.updateDrawingSession(tournament.id, {
        status: 'idle',
        currentTeam: null,
        currentSlot: null,
        isRevealed: false,
        revealedTeamIds: activeDrawnIds,
        message: 'Data Slot Bagan & Undian Telah Disinkronkan'
      });

      // 4. Update parent dashboard state
      onConfigSaved(tournament, updatedRoster);
      setStatusMessage({ type: 'success', text: msg });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Error syncing roster and matches:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan ke Firestore' });
    } finally {
      setSaving(false);
    }
  };

  // Generate blank template teams based on target count
  const handleGenerateTemplateTeams = (count: number) => {
    setTargetTeamCount(count);
    const newRoster: Team[] = [];
    for (let i = 1; i <= count; i++) {
      const pot: 1 | 2 | 3 = i <= 4 ? 1 : i <= Math.ceil(count * 0.6) ? 2 : 3;
      newRoster.push({
        id: `team-${i}`,
        tournamentId: tournament.id,
        name: `Tim ${i}`,
        officialName: `Official Tim ${i}`,
        departmentOrigin: `Instansi ${i}`,
        potTier: pot,
        seedNumber: pot === 1 ? i : null,
        drawnSlot: null
      });
    }
    setRoster(newRoster);
  };

  // Reset to UMS 19 teams preset
  const handleLoadUmsPreset = () => {
    setTargetTeamCount(19);
    const loaded: Team[] = UMS_19_TEAMS_PRESET.map((t, idx) => ({
      ...t,
      id: `team-ums-${idx + 1}`,
      tournamentId: tournament.id,
      drawnSlot: null
    }));
    setRoster(loaded);
    setSeed1TeamId('team-ums-1');
    setSeed2TeamId('team-ums-2');
    setSeed3TeamId('team-ums-3');
    setSeed4TeamId('team-ums-4');
    setSeed1Slot(1);
    setSeed2Slot(16);
    setSeed3Slot(9);
    setSeed4Slot(8);
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
    const updated = [...roster, newTeam];
    setRoster(updated);
    setTargetTeamCount(updated.length);
  };

  // Remove individual team row and sync with Firestore & Bracket
  const handleRemoveTeam = async (teamId: string) => {
    if (roster.length <= 2) {
      alert('Minimal harus ada 2 tim dalam turnamen.');
      return;
    }
    const updated = roster.filter(t => t.id !== teamId);
    setRoster(updated);
    setTargetTeamCount(updated.length);

    if (seed1TeamId === teamId) setSeed1TeamId('');
    if (seed2TeamId === teamId) setSeed2TeamId('');
    if (seed3TeamId === teamId) setSeed3TeamId('');
    if (seed4TeamId === teamId) setSeed4TeamId('');

    try {
      await tournamentService.deleteTeam(tournament.id, teamId);
    } catch (e) {}

    await syncRosterAndMatches(updated, 'Tim berhasil dihapus. Bagan dan daftar undian otomatis diperbarui.');
  };

  // Clear single team's slot (returns team back to undrawn pool and frees up bracket slot)
  const handleClearTeamSlot = async (teamId: string) => {
    const updatedRoster = roster.map(t => {
      if (t.id === teamId) {
        return { ...t, drawnSlot: null, seedNumber: null };
      }
      return t;
    });
    setRoster(updatedRoster);

    if (seed1TeamId === teamId) setSeed1TeamId('');
    if (seed2TeamId === teamId) setSeed2TeamId('');
    if (seed3TeamId === teamId) setSeed3TeamId('');
    if (seed4TeamId === teamId) setSeed4TeamId('');

    await syncRosterAndMatches(updatedRoster, 'Slot tim berhasil dikosongkan! Tim kembali ke wadah undian dan slot di bagan kembali terbuka.');
  };

  // Clear all random slots while preserving seeded teams
  const handleResetAllRandomSlots = async () => {
    const confirmReset = window.confirm('Kosongkan semua slot undian acak? (4 Tim Unggulan akan tetap dipertahankan di bagan)');
    if (!confirmReset) return;

    const updatedRoster = roster.map(t => {
      const isSeeded = t.seedNumber && [1, 2, 3, 4].includes(t.seedNumber);
      return isSeeded ? t : { ...t, drawnSlot: null };
    });
    setRoster(updatedRoster);
    await syncRosterAndMatches(updatedRoster, 'Semua slot undian acak berhasil dikosongkan. Tim kembali ke wadah undian!');
  };

  // Complete reset of ALL slots including seeded teams
  const handleResetAllSlotsCompletely = async () => {
    const confirmReset = window.confirm('PERINGATAN: Kosongkan SELURUH slot bagan termasuk posisi 4 Tim Unggulan?');
    if (!confirmReset) return;

    const updatedRoster = roster.map(t => ({ ...t, drawnSlot: null }));
    setRoster(updatedRoster);
    await syncRosterAndMatches(updatedRoster, 'Seluruh slot bagan telah dikosongkan total! Semua tim siap diundi.');
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

  // Dynamic Tim Unggulan Handlers
  const handleSetSeedCount = (count: number) => {
    const clamped = Math.max(2, Math.min(8, count));
    const nextList: SeedItemConfig[] = [];

    for (let r = 1; r <= clamped; r++) {
      const existing = seedItems.find(s => s.rank === r);
      const spec = DEFAULT_SEED_SPECS.find(s => s.rank === r) || {
        rank: r,
        slot: r,
        title: `Unggulan ${r}`,
        defaultPool: `Undian ${r}`,
        pairName: `Pasangan ${Math.floor((r - 1) / 2) * 2 + 1} & ${Math.floor((r - 1) / 2) * 2 + 2}`
      };

      if (existing) {
        nextList.push(existing);
      } else {
        const existingTeam = roster.find(t => t.seedNumber === r);
        nextList.push({
          rank: r,
          teamId: existingTeam ? existingTeam.id : '',
          slot: spec.slot,
          title: spec.title
        });
      }
    }
    setSeedItems(nextList);
    setStatusMessage({ type: 'success', text: `Jumlah tim unggulan diubah menjadi ${clamped} tim.` });
  };

  const handleAddSeed = () => {
    if (seedItems.length >= 8) return;
    handleSetSeedCount(seedItems.length + 1);
  };

  const handleRemoveSeed = () => {
    if (seedItems.length <= 2) return;
    handleSetSeedCount(seedItems.length - 1);
  };

  const handleUpdateSeedItem = (rank: number, field: keyof SeedItemConfig, value: any) => {
    setSeedItems(prev => prev.map(s => s.rank === rank ? { ...s, [field]: value } : s));
  };

  // Swap pool slots for a specific pair
  const handleRandomizeSeedPair = async (pairIdx: number) => {
    const r1 = pairIdx * 2 + 1;
    const r2 = pairIdx * 2 + 2;
    const item1 = seedItems.find(s => s.rank === r1);
    const item2 = seedItems.find(s => s.rank === r2);
    if (!item1 || !item2) return;

    const t1 = roster.find(t => t.id === item1.teamId);
    const t2 = roster.find(t => t.id === item2.teamId);

    // Swap slots between the pair
    const slotA = item1.slot;
    const slotB = item2.slot;

    const newItems = seedItems.map(s => {
      if (s.rank === r1) return { ...s, slot: slotB };
      if (s.rank === r2) return { ...s, slot: slotA };
      return s;
    });
    setSeedItems(newItems);

    const updatedRoster = roster.map(t => {
      if (t.id === item1.teamId) return { ...t, potTier: 1 as const, seedNumber: r1, drawnSlot: slotB };
      if (t.id === item2.teamId) return { ...t, potTier: 1 as const, seedNumber: r2, drawnSlot: slotA };
      return t;
    });
    setRoster(updatedRoster);

    const name1 = t1 ? t1.name : `Unggulan ${r1}`;
    const name2 = t2 ? t2.name : `Unggulan ${r2}`;
    const outcomeMsg = `🎲 Hasil Acak Pasangan ${r1} & ${r2}:\n• ${name1} ➔ Undian #${slotB}\n• ${name2} ➔ Undian #${slotA}`;
    setSeedSuccess(outcomeMsg);
    await syncRosterAndMatches(updatedRoster, outcomeMsg);
  };

  // Randomize all pairs simultaneously
  const handleRandomizeAllSeeds = async () => {
    const unpicked = seedItems.filter(s => !s.teamId);
    if (unpicked.length > 0) {
      setStatusMessage({ type: 'error', text: 'Harap pilih tim untuk seluruh posisi unggulan sebelum mengacak pool.' });
      return;
    }

    const pairCount = Math.ceil(seedItems.length / 2);
    const newItems = [...seedItems];

    for (let p = 0; p < pairCount; p++) {
      const r1 = p * 2 + 1;
      const r2 = p * 2 + 2;
      const idx1 = newItems.findIndex(s => s.rank === r1);
      const idx2 = newItems.findIndex(s => s.rank === r2);

      if (idx1 !== -1 && idx2 !== -1) {
        if (Math.random() < 0.5) {
          const tempSlot = newItems[idx1].slot;
          newItems[idx1].slot = newItems[idx2].slot;
          newItems[idx2].slot = tempSlot;
        }
      }
    }
    setSeedItems(newItems);

    const updatedRoster = roster.map(t => {
      const foundSeed = newItems.find(s => s.teamId === t.id);
      if (foundSeed) {
        return { ...t, potTier: 1 as const, seedNumber: foundSeed.rank, drawnSlot: foundSeed.slot };
      }
      if (t.seedNumber !== null) {
        return { ...t, seedNumber: null, drawnSlot: null };
      }
      return t;
    });
    setRoster(updatedRoster);

    const lines = newItems.map(s => {
      const t = roster.find(x => x.id === s.teamId);
      const pool = [3, 4, 8, 9].includes(s.slot) ? 'Pool Atas' : 'Pool Bawah';
      return `• Unggulan ${s.rank} (${t?.name || 'Tim'}): ${pool} (Undian #${s.slot})`;
    });
    const outcomeMsg = `🎉 Hasil Pengacakan Seluruh ${seedItems.length} Tim Unggulan Selesai!\n` + lines.join('\n');
    setSeedSuccess(outcomeMsg);
    await syncRosterAndMatches(updatedRoster, outcomeMsg);
  };

  // Manual Plotting of all configured Seeded Teams to Assigned Slots
  const handlePlotSeededTeams = async () => {
    const missing = seedItems.find(s => !s.teamId);
    if (missing) {
      setStatusMessage({ type: 'error', text: `Harap pilih tim untuk posisi ${missing.title} (Unggulan ${missing.rank}).` });
      return;
    }

    const selectedIds = seedItems.map(s => s.teamId);
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size < selectedIds.length) {
      setStatusMessage({ type: 'error', text: 'Setiap posisi unggulan harus diisi oleh tim yang berbeda (tidak boleh ganda).' });
      return;
    }

    const updatedRoster = roster.map(t => {
      const matched = seedItems.find(s => s.teamId === t.id);
      if (matched) {
        return { ...t, potTier: 1 as const, seedNumber: matched.rank, drawnSlot: matched.slot };
      } else if (t.seedNumber !== null) {
        return { ...t, seedNumber: null, drawnSlot: null };
      }
      return t;
    });

    setRoster(updatedRoster);
    const outcomeMsg = `📌 Sebanyak ${seedItems.length} Tim Unggulan berhasil diplot ke Bagan Pertandingan!`;
    setSeedSuccess(outcomeMsg);
    await syncRosterAndMatches(updatedRoster, outcomeMsg);
  };

  // Clear all seeded positions
  const handleClearAllSeeds = async () => {
    const updatedRoster = roster.map(t => {
      if (t.seedNumber !== null || t.drawnSlot !== null) {
        return { ...t, seedNumber: null, drawnSlot: null };
      }
      return t;
    });
    setRoster(updatedRoster);
    setSeedItems(prev => prev.map(s => ({ ...s, teamId: '' })));
    await syncRosterAndMatches(updatedRoster, '🗑️ Seluruh penempatan tim unggulan telah dikosongkan.');
  };

  // Explicit cleaner for EDUTORIUM to ensure it is Pot 3 debutant and not seeded
  const handleFixEdutorium = async () => {
    const updatedRoster = roster.map(t => {
      if (t.name.toUpperCase().includes('EDUTORIUM')) {
        return { ...t, potTier: 3 as const, seedNumber: null, drawnSlot: null };
      }
      return t;
    });
    setRoster(updatedRoster);

    setSeedItems(prev => prev.map(s => {
      const team = roster.find(t => t.id === s.teamId);
      if (team?.name.toUpperCase().includes('EDUTORIUM')) {
        return { ...s, teamId: '' };
      }
      return s;
    }));

    await syncRosterAndMatches(updatedRoster, '✅ Tim EDUTORIUM berhasil diset ke Pot 3 (Debutan), dibebaskan dari slot unggulan, dan siap diundi acak normal!');
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

      const cleanTeams: Team[] = roster.map((t) => ({
        ...t,
        tournamentId: tournament.id,
        groupName: null,
        groupPosition: null
      }));

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
        const k = Math.min(numGroups, Math.floor(cleanTeams.length / 2)) || 2;
        const groupNames = ['Grup A', 'Grup B', 'Grup C', 'Grup D', 'Grup E', 'Grup F', 'Grup G', 'Grup H'].slice(0, k);

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
      }

      await tournamentService.saveTournament(updatedTournament);
      await tournamentService.batchSaveTeams(tournament.id, cleanTeams);
      await tournamentService.batchSaveMatches(tournament.id, generatedMatches);
      await tournamentService.batchSaveGroups(tournament.id, generatedGroups);

      await tournamentService.updateDrawingSession(tournament.id, {
        status: 'idle',
        currentTeam: null,
        currentSlot: null,
        isRevealed: false,
        revealedTeamIds: cleanTeams.filter(t => t.drawnSlot !== null).map(t => t.id),
        message: 'Format Turnamen Baru Berhasil Diterapkan'
      });

      onConfigSaved(updatedTournament, cleanTeams);
      setStatusMessage({ type: 'success', text: `Bagan & konfigurasi ${cleanTeams.length} tim berhasil disimpan dan disinkronkan ke Cloud Firestore!` });
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
              <h4 className="font-bold text-sm text-slate-100">Sistem Gugur (Knockout)</h4>
              <p className="text-xs text-slate-400 mt-1">
                Single Elimination. Penyeimbang 19 tim otomatis (3 laga Playoff & 13 Direct Byes).
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-indigo-300">
              Maksimal 1 laga/hari per tim
            </div>
          </div>

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
              <h4 className="font-bold text-sm text-slate-100">Grup + Knockout</h4>
              <p className="text-xs text-slate-400 mt-1">
                Penyisihan grup dilanjutkan fase gugur untuk juara & runner-up grup.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-purple-300">
              Multi-Stage Tournament
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pengaturan Jumlah Tim & Preset 19 Tim UMS */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Tentukan Jumlah Tim Peserta (Saat ini: <strong className="text-amber-400">{roster.length} Tim</strong>)
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Untuk kompetisi saat ini, gunakan preset 19 tim atau atur tim sesuai kebutuhan.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadUmsPreset}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gunakan Data 19 Tim UMS (Minisoccer 2026)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-2">Pilih Jumlah Tim:</span>
          {PRESET_COUNTS.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => handleGenerateTemplateTeams(count)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                roster.length === count
                  ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {count} Tim {count === 19 ? '⭐️' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* 3. EXCLUSIVE: Plotting & Pengacakan Tim Unggulan (Berdasarkan Prestasi) */}
      {format === 'knockout' && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-950 border-2 border-amber-500/50 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white flex items-center space-x-2">
                  <span>Plotting & Pengacakan Tim Unggulan (Berdasarkan Prestasi)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    {seedItems.length} Tim Unggulan
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tentukan jumlah tim unggulan (misal: 4 semi-finalis atau 8 perempat-finalis), lalu tentukan slot atau acak pool secara simetris.
                </p>
              </div>
            </div>

            {/* Quick Actions & Randomizer */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] px-2 font-bold uppercase">Jumlah:</span>
                <button
                  type="button"
                  onClick={() => handleSetSeedCount(2)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                    seedItems.length === 2 ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  2 Tim
                </button>
                <button
                  type="button"
                  onClick={() => handleSetSeedCount(4)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                    seedItems.length === 4 ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  4 Tim (Default)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetSeedCount(8)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                    seedItems.length === 8 ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  8 Tim (8 Besar)
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleAddSeed}
                  disabled={seedItems.length >= 8}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-40 transition-colors"
                  title="Tambah 1 Tim Unggulan"
                >
                  + Tambah
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSeed}
                  disabled={seedItems.length <= 2}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-40 transition-colors"
                  title="Kurangi 1 Tim Unggulan"
                >
                  - Kurang
                </button>
              </div>

              <button
                type="button"
                onClick={handleRandomizeAllSeeds}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                <Dices className="w-4 h-4" />
                <span>🎲 Acak Seluruh Pool Sekaligus</span>
              </button>
            </div>
          </div>

          {seedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in whitespace-pre-line">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{seedSuccess}</span>
            </div>
          )}

          {/* Seed Pairs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: Math.ceil(seedItems.length / 2) }).map((_, pairIdx) => {
              const r1 = pairIdx * 2 + 1;
              const r2 = pairIdx * 2 + 2;
              const item1 = seedItems.find(s => s.rank === r1);
              const item2 = seedItems.find(s => s.rank === r2);

              const pairTitle = pairIdx === 0
                ? 'Pasangan Juara 1 & Runner-Up'
                : pairIdx === 1
                ? 'Pasangan Juara 3 & Juara 4'
                : pairIdx === 2
                ? 'Pasangan 8 Besar (Unggulan 5 & 6)'
                : 'Pasangan 8 Besar (Unggulan 7 & 8)';

              return (
                <div key={pairIdx} className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                      {pairTitle}
                    </span>
                    {item2 && (
                      <button
                        type="button"
                        onClick={() => handleRandomizeSeedPair(pairIdx)}
                        disabled={saving}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center space-x-1 transition-colors"
                        title={`Acak pool antara Unggulan ${r1} dan ${r2}`}
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>🎲 Acak Pool {r1} & {r2}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Item 1 */}
                    {item1 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                          <span>{item1.title}</span>
                          <span className="text-amber-400 text-[10px] font-mono">
                            {[3, 4, 8, 9].includes(item1.slot) ? `Pool Atas (Undian ${item1.slot})` : `Pool Bawah (Undian ${item1.slot})`}
                          </span>
                        </div>
                        <select
                          value={item1.teamId}
                          onChange={e => handleUpdateSeedItem(item1.rank, 'teamId', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-amber-400"
                        >
                          <option value="">-- Pilih Unggulan {item1.rank} --</option>
                          {seedEligibleTeams.map(t => (
                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                              {t.name} (Pot {t.potTier} - {t.departmentOrigin})
                            </option>
                          ))}
                        </select>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Slot Target:</span>
                          <select
                            value={item1.slot}
                            onChange={e => handleUpdateSeedItem(item1.rank, 'slot', Number(e.target.value))}
                            className="bg-slate-950 border border-slate-800 text-[10px] text-amber-300 rounded px-1.5 py-0.5"
                          >
                            {AVAILABLE_SEED_SLOTS.map(s => (
                              <option key={s.slot} value={s.slot}>
                                Undian #{s.slot} ({s.pool})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Item 2 */}
                    {item2 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                          <span>{item2.title}</span>
                          <span className="text-amber-400 text-[10px] font-mono">
                            {[3, 4, 8, 9].includes(item2.slot) ? `Pool Atas (Undian ${item2.slot})` : `Pool Bawah (Undian ${item2.slot})`}
                          </span>
                        </div>
                        <select
                          value={item2.teamId}
                          onChange={e => handleUpdateSeedItem(item2.rank, 'teamId', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-amber-400"
                        >
                          <option value="">-- Pilih Unggulan {item2.rank} --</option>
                          {seedEligibleTeams.map(t => (
                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                              {t.name} (Pot {t.potTier} - {t.departmentOrigin})
                            </option>
                          ))}
                        </select>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Slot Target:</span>
                          <select
                            value={item2.slot}
                            onChange={e => handleUpdateSeedItem(item2.rank, 'slot', Number(e.target.value))}
                            className="bg-slate-950 border border-slate-800 text-[10px] text-amber-300 rounded px-1.5 py-0.5"
                          >
                            {AVAILABLE_SEED_SLOTS.map(s => (
                              <option key={s.slot} value={s.slot}>
                                Undian #{s.slot} ({s.pool})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFixEdutorium}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                title="Pastikan EDUTORIUM berada di Pot 3 (Debutan) dan bebas dari unggulan"
              >
                <span>🛡️ Set Edutorium ke Pot 3 (Bukan Unggulan)</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllSeeds}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                title="Kosongkan seluruh posisi tim unggulan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan Seluruh Unggulan</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handlePlotSeededTeams}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Pin className="w-4 h-4" />
              <span>Terapkan {seedItems.length} Tim Unggulan ke Bagan</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Detail Waktu & Lapangan Turnamen */}
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

      {/* 5. Tabel Input & Edit Roster Tim Manual + Aksi Hapus Slot Per Tim */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              4. Input & Manajemen Roster Tim ({roster.length} Tim)
            </label>
            <p className="text-[11px] text-slate-400">
              Superadmin dapat mengedit data, menghapus slot tim secara individual, atau mengosongkan seluruh slot undian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetAllRandomSlots}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              title="Mengosongkan semua slot undian acak dan mengembalikan tim ke wadah undian"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kosongkan Slot Undian Acak</span>
            </button>

            <button
              type="button"
              onClick={handleResetAllSlotsCompletely}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              title="Mengosongkan seluruh slot bagan termasuk posisi unggulan"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Total Semua Slot</span>
            </button>

            <button
              type="button"
              onClick={handleAddTeam}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tambah Tim Manual</span>
            </button>
          </div>
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
                <th className="py-2.5 px-3 text-center w-40">Status Slot Bagan</th>
                <th className="py-2.5 px-3 text-center w-12">Hapus</th>
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none font-semibold"
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
                    {team.drawnSlot !== null ? (
                      <div className="flex items-center justify-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                          Slot #{team.drawnSlot}
                          {team.seedNumber && [1, 2, 3, 4].includes(team.seedNumber) && ` (Unggulan ${team.seedNumber})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleClearTeamSlot(team.id)}
                          disabled={saving}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/40 text-[10px] font-bold transition-colors disabled:opacity-50"
                          title="Hapus slot ini agar tim kembali ke wadah undian acak"
                        >
                          Hapus Slot
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">
                        Belum Terisi (Wadah Undian)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(team.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Hapus Tim dari Turnamen"
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

      {/* 6. Simpan Konfigurasi & Inisialisasi Bagan Turnamen */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Format: <strong className="text-amber-400 uppercase">{format.replace('_', ' ')}</strong> • Total: <strong className="text-indigo-400">{roster.length} Tim</strong> (13 Bye, 6 Playoff)
        </div>

        <button
          type="button"
          onClick={handleSaveConfiguration}
          disabled={saving}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menerapkan & Menyinkronkan ke Cloud...' : 'Buat Bagan & Inisialisasi Turnamen'}</span>
        </button>
      </div>
    </div>
  );
};
