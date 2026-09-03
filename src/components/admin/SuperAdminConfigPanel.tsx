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

// Preset 19 Tim Minisoccer Dies Natalis UMS 2026
const UMS_19_TEAMS_PRESET: Omit<Team, 'id' | 'tournamentId' | 'drawnSlot'>[] = [
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
  { name: 'Cleaning Service FC', officialName: 'Slamet', departmentOrigin: 'Sarana Prasarana', potTier: 3, seedNumber: null },
  { name: 'KSR / Relawan Kampus', officialName: 'Ahmad M.Pd', departmentOrigin: 'Unit Kegiatan Mahasiswa', potTier: 3, seedNumber: null }
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

  // 4 Tim Unggulan (Seeded Teams Selection)
  const [seed1TeamId, setSeed1TeamId] = useState<string>('');
  const [seed2TeamId, setSeed2TeamId] = useState<string>('');
  const [seed3TeamId, setSeed3TeamId] = useState<string>('');
  const [seed4TeamId, setSeed4TeamId] = useState<string>('');

  // Assigned slots for the 4 seeds (defaults: Undian 3, Undian 19, Undian 11, Undian 8)
  const [seed1Slot, setSeed1Slot] = useState<number>(3);
  const [seed2Slot, setSeed2Slot] = useState<number>(19);
  const [seed3Slot, setSeed3Slot] = useState<number>(11);
  const [seed4Slot, setSeed4Slot] = useState<number>(8);

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

    // Check if EDUTORIUM is mistakenly flagged as seed or Pot 1
    const edutorium = teams.find(t => t.name.toUpperCase().includes('EDUTORIUM'));
    if (edutorium && (edutorium.seedNumber !== null || edutorium.potTier !== 3)) {
      const corrected = teams.map(t => {
        if (t.id === edutorium.id) {
          return { ...t, potTier: 3 as const, seedNumber: null, drawnSlot: null };
        }
        return t;
      });
      setRoster(corrected);
      tournamentService.batchSaveTeams(tournament.id, corrected).catch(() => {});
    }

    const isSeedEligible = (t: Team) => !t.name.toUpperCase().includes('EDUTORIUM') && t.potTier !== 3;

    const s1 = teams.find(t => t.seedNumber === 1 && isSeedEligible(t));
    const s2 = teams.find(t => t.seedNumber === 2 && isSeedEligible(t));
    const s3 = teams.find(t => t.seedNumber === 3 && isSeedEligible(t));
    const s4 = teams.find(t => t.seedNumber === 4 && isSeedEligible(t));

    if (s1) {
      setSeed1TeamId(s1.id);
      if (s1.drawnSlot) setSeed1Slot(s1.drawnSlot);
    }
    if (s2) {
      setSeed2TeamId(s2.id);
      if (s2.drawnSlot) setSeed2Slot(s2.drawnSlot);
    }
    if (s3) {
      setSeed3TeamId(s3.id);
      if (s3.drawnSlot) setSeed3Slot(s3.drawnSlot);
    }
    if (s4) {
      setSeed4TeamId(s4.id);
      if (s4.drawnSlot) setSeed4Slot(s4.drawnSlot);
    }
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

  // Manual Plotting of 4 Seeded Teams to Assigned Slots
  const handlePlotSeededTeams = async () => {
    if (!seed1TeamId || !seed2TeamId || !seed3TeamId || !seed4TeamId) {
      setStatusMessage({ type: 'error', text: 'Harap pilih 4 tim unggulan lengkap (Unggulan 1, 2, 3, dan 4).' });
      return;
    }

    const selectedIds = [seed1TeamId, seed2TeamId, seed3TeamId, seed4TeamId];
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size < 4) {
      setStatusMessage({ type: 'error', text: 'Setiap posisi unggulan harus diisi oleh tim yang berbeda.' });
      return;
    }

    const updatedRoster = roster.map(t => {
      if (t.id === seed1TeamId) {
        return { ...t, potTier: 1 as const, seedNumber: 1, drawnSlot: seed1Slot };
      } else if (t.id === seed2TeamId) {
        return { ...t, potTier: 1 as const, seedNumber: 2, drawnSlot: seed2Slot };
      } else if (t.id === seed3TeamId) {
        return { ...t, potTier: 1 as const, seedNumber: 3, drawnSlot: seed3Slot };
      } else if (t.id === seed4TeamId) {
        return { ...t, potTier: 1 as const, seedNumber: 4, drawnSlot: seed4Slot };
      } else {
        return { ...t, drawnSlot: null };
      }
    });

    setRoster(updatedRoster);
    await syncRosterAndMatches(updatedRoster, '📌 4 Tim Unggulan berhasil diplot ke Bagan! Nama mereka langsung muncul di Bagan Pertandingan.');
  };

  // Randomize Pool for Juara 1 & 2 (Pool Atas vs Pool Bawah)
  const handleRandomizeTop2Pool = async () => {
    if (!seed1TeamId || !seed2TeamId) {
      setStatusMessage({ type: 'error', text: 'Harap pilih Tim Juara 1 dan Juara 2 terlebih dahulu.' });
      return;
    }
    const t1 = roster.find(t => t.id === seed1TeamId);
    const t2 = roster.find(t => t.id === seed2TeamId);
    if (!t1 || !t2) return;

    // 50:50 Coin Toss: Undian 3 (Pool Atas) vs Undian 19 (Pool Bawah)
    const isT1Top = Math.random() < 0.5;
    const slotT1 = isT1Top ? 3 : 19;
    const slotT2 = isT1Top ? 19 : 3;

    setSeed1Slot(slotT1);
    setSeed2Slot(slotT2);

    const updatedRoster = roster.map(t => {
      if (t.id === t1.id) return { ...t, potTier: 1 as const, seedNumber: 1, drawnSlot: slotT1 };
      if (t.id === t2.id) return { ...t, potTier: 1 as const, seedNumber: 2, drawnSlot: slotT2 };
      return t;
    });
    setRoster(updatedRoster);

    const outcomeMsg = isT1Top
      ? `🎲 Hasil Acak Pool: Juara 1 (${t1.name}) ➔ Pool Atas (Undian #3) & Juara 2 (${t2.name}) ➔ Pool Bawah (Undian #19)`
      : `🎲 Hasil Acak Pool: Juara 1 (${t1.name}) ➔ Pool Bawah (Undian #19) & Juara 2 (${t2.name}) ➔ Pool Atas (Undian #3)`;

    setSeedSuccess(outcomeMsg);
    await syncRosterAndMatches(updatedRoster, outcomeMsg);
  };

  // Randomize Pool for Juara 3 & 4 (Pool Atas vs Pool Bawah)
  const handleRandomize3rd4thPool = async () => {
    if (!seed3TeamId || !seed4TeamId) {
      setStatusMessage({ type: 'error', text: 'Harap pilih Tim Juara 3 dan Juara 4 terlebih dahulu.' });
      return;
    }
    const t3 = roster.find(t => t.id === seed3TeamId);
    const t4 = roster.find(t => t.id === seed4TeamId);
    if (!t3 || !t4) return;

    // 50:50 Coin Toss: Undian 8 (Pool Atas) vs Undian 11 (Pool Bawah)
    const isT3Top = Math.random() < 0.5;
    const slotT3 = isT3Top ? 8 : 11;
    const slotT4 = isT3Top ? 11 : 8;

    setSeed3Slot(slotT3);
    setSeed4Slot(slotT4);

    const updatedRoster = roster.map(t => {
      if (t.id === t3.id) return { ...t, potTier: 1 as const, seedNumber: 3, drawnSlot: slotT3 };
      if (t.id === t4.id) return { ...t, potTier: 1 as const, seedNumber: 4, drawnSlot: slotT4 };
      return t;
    });
    setRoster(updatedRoster);

    const outcomeMsg = isT3Top
      ? `🎲 Hasil Acak Pool: Juara 3 (${t3.name}) ➔ Pool Atas (Undian #8) & Juara 4 (${t4.name}) ➔ Pool Bawah (Undian #11)`
      : `🎲 Hasil Acak Pool: Juara 3 (${t3.name}) ➔ Pool Bawah (Undian #11) & Juara 4 (${t4.name}) ➔ Pool Atas (Undian #8)`;

    setSeedSuccess(outcomeMsg);
    await syncRosterAndMatches(updatedRoster, outcomeMsg);
  };

  // Randomize all 4 seeds simultaneously
  const handleRandomizeAll4Seeds = async () => {
    if (!seed1TeamId || !seed2TeamId || !seed3TeamId || !seed4TeamId) {
      setStatusMessage({ type: 'error', text: 'Harap pilih ke-4 tim unggulan terlebih dahulu.' });
      return;
    }
    const t1 = roster.find(t => t.id === seed1TeamId);
    const t2 = roster.find(t => t.id === seed2TeamId);
    const t3 = roster.find(t => t.id === seed3TeamId);
    const t4 = roster.find(t => t.id === seed4TeamId);
    if (!t1 || !t2 || !t3 || !t4) return;

    const isT1Top = Math.random() < 0.5;
    const slotT1 = isT1Top ? 3 : 19;
    const slotT2 = isT1Top ? 19 : 3;

    const isT3Top = Math.random() < 0.5;
    const slotT3 = isT3Top ? 8 : 11;
    const slotT4 = isT3Top ? 11 : 8;

    setSeed1Slot(slotT1);
    setSeed2Slot(slotT2);
    setSeed3Slot(slotT3);
    setSeed4Slot(slotT4);

    const updatedRoster = roster.map(t => {
      if (t.id === t1.id) return { ...t, potTier: 1 as const, seedNumber: 1, drawnSlot: slotT1 };
      if (t.id === t2.id) return { ...t, potTier: 1 as const, seedNumber: 2, drawnSlot: slotT2 };
      if (t.id === t3.id) return { ...t, potTier: 1 as const, seedNumber: 3, drawnSlot: slotT3 };
      if (t.id === t4.id) return { ...t, potTier: 1 as const, seedNumber: 4, drawnSlot: slotT4 };
      return { ...t, drawnSlot: null };
    });
    setRoster(updatedRoster);

    const outcomeMsg = `🎉 Hasil Acak 4 Besar Selesai!\n• Juara 1 (${t1.name}): ${isT1Top ? 'Pool Atas (Undian #3)' : 'Pool Bawah (Undian #19)'}\n• Juara 2 (${t2.name}): ${isT1Top ? 'Pool Bawah (Undian #19)' : 'Pool Atas (Undian #3)'}\n• Juara 3 (${t3.name}): ${isT3Top ? 'Pool Atas (Undian #8)' : 'Pool Bawah (Undian #11)'}\n• Juara 4 (${t4.name}): ${isT3Top ? 'Pool Bawah (Undian #11)' : 'Pool Atas (Undian #8)'}`;

    setSeedSuccess(outcomeMsg);
    await syncRosterAndMatches(updatedRoster, outcomeMsg);
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

    if (seed1TeamId && roster.find(t => t.id === seed1TeamId)?.name.toUpperCase().includes('EDUTORIUM')) setSeed1TeamId('');
    if (seed2TeamId && roster.find(t => t.id === seed2TeamId)?.name.toUpperCase().includes('EDUTORIUM')) setSeed2TeamId('');
    if (seed3TeamId && roster.find(t => t.id === seed3TeamId)?.name.toUpperCase().includes('EDUTORIUM')) setSeed3TeamId('');
    if (seed4TeamId && roster.find(t => t.id === seed4TeamId)?.name.toUpperCase().includes('EDUTORIUM')) setSeed4TeamId('');

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

      {/* 3. EXCLUSIVE: Plotting & Pengacakan Pool 4 Tim Unggulan */}
      {format === 'knockout' && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-950 border-2 border-amber-500/50 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white flex items-center space-x-2">
                  <span>Plotting & Pengacakan Pool 4 Tim Unggulan</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    Prestasi Tahun Lalu
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Pilih 4 tim unggulan dari daftar tim. Anda bebas memilih tim apa pun, lalu acak pool atau terapkan ke bagan.
                </p>
              </div>
            </div>

            {/* All-in-one randomizer */}
            <button
              type="button"
              onClick={handleRandomizeAll4Seeds}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              <Dices className="w-4 h-4" />
              <span>🎲 Acak Seluruh Pool 4 Besar Sekaligus</span>
            </button>
          </div>

          {seedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in whitespace-pre-line">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{seedSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Pasangan Juara 1 & 2 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Pasangan Juara 1 & Runner-Up
                </span>
                <button
                  type="button"
                  onClick={handleRandomizeTop2Pool}
                  disabled={saving}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center space-x-1 transition-colors"
                  title="Acak apakah Juara 1 di Pool Atas atau Pool Bawah"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>🎲 Acak Pool 1 & 2</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>Juara 1 Tahun Lalu</span>
                    <span className="text-amber-400 text-[10px] font-mono">
                      {seed1Slot === 3 ? 'Pool Atas (Undian 3)' : 'Pool Bawah (Undian 19)'}
                    </span>
                  </div>
                  <select
                    value={seed1TeamId}
                    onChange={e => setSeed1TeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-amber-400"
                  >
                    <option value="">-- Pilih Juara 1 (Pot 1/2) --</option>
                    {seedEligibleTeams.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name} (Pot {t.potTier} - {t.departmentOrigin})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>Juara 2 (Runner-Up)</span>
                    <span className="text-amber-400 text-[10px] font-mono">
                      {seed2Slot === 3 ? 'Pool Atas (Undian 3)' : 'Pool Bawah (Undian 19)'}
                    </span>
                  </div>
                  <select
                    value={seed2TeamId}
                    onChange={e => setSeed2TeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-amber-400"
                  >
                    <option value="">-- Pilih Juara 2 (Pot 1/2) --</option>
                    {seedEligibleTeams.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name} (Pot {t.potTier} - {t.departmentOrigin})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Box 2: Pasangan Juara 3 & 4 */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Pasangan Juara 3 & Juara 4
                </span>
                <button
                  type="button"
                  onClick={handleRandomize3rd4thPool}
                  disabled={saving}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center space-x-1 transition-colors"
                  title="Acak apakah Juara 3 di Pool Atas atau Pool Bawah"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>🎲 Acak Pool 3 & 4</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>Juara 3 Tahun Lalu</span>
                    <span className="text-amber-400 text-[10px] font-mono">
                      {seed3Slot === 8 ? 'Pool Atas (Undian 8)' : 'Pool Bawah (Undian 11)'}
                    </span>
                  </div>
                  <select
                    value={seed3TeamId}
                    onChange={e => setSeed3TeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-amber-400"
                  >
                    <option value="">-- Pilih Juara 3 (Pot 1/2) --</option>
                    {seedEligibleTeams.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name} (Pot {t.potTier} - {t.departmentOrigin})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>Juara 4 Tahun Lalu</span>
                    <span className="text-amber-400 text-[10px] font-mono">
                      {seed4Slot === 8 ? 'Pool Atas (Undian 8)' : 'Pool Bawah (Undian 11)'}
                    </span>
                  </div>
                  <select
                    value={seed4TeamId}
                    onChange={e => setSeed4TeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-amber-400"
                  >
                    <option value="">-- Pilih Juara 4 (Pot 1/2) --</option>
                    {seedEligibleTeams.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name} (Pot {t.potTier} - {t.departmentOrigin})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleFixEdutorium}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                title="Pastikan EDUTORIUM berada di Pot 3 (Debutan) dan bebas dari unggulan"
              >
                <span>🛡️ Set Edutorium ke Pot 3 (Bukan Unggulan)</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handlePlotSeededTeams}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Pin className="w-4 h-4" />
              <span>Terapkan Posisi Unggulan Saat Ini ke Bagan</span>
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
