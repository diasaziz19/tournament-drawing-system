/**
 * Knockout Tournament Engine (19-Team Official Structure)
 * 100% matched to the official Technical Meeting spreadsheet layout:
 * - Play-off (28 Sep): M1, M2, M3
 * - Babak 16 Besar (28-29 Sep): M4, M5, M6 (Day 1), M7, M8, M9, M10, M11 (Day 2)
 * - Perempat Final (30 Sep): M12, M13, M14, M15 (Day 3)
 * - Semifinal (1 Okt): M16 (Finalis 1), M17 (Finalis 2) (Day 4)
 * - Grand Final (2 Okt): M18 (Juara 3), M19 (Grand Final) (Day 5)
 */

import { Match, MatchStage, Team, TeamMatchSlot } from '../../types/tournament';

export interface KnockoutBracketConfig {
  tournamentId: string;
  teams: Team[];
  startDate: string;
  dailyStartTime: string;
  matchDurationMinutes: number;
  breakMinutes: number;
  pitches: string[];
  hasThirdPlacePlayoff: boolean;
  maxMatchesPerDayPerTeam?: number;
}

export interface BracketSlotInfo {
  slotId: number;
  label: string;
  stage: 'playoff' | 'round_of_16';
  isSeedSlot?: boolean;
  seedRank?: 1 | 2 | 3 | 4;
}

/**
 * Returns the exact 19 Undian slot definitions (Undian 1 to Undian 19)
 */
export function getAvailableBracketSlots(teamCount: number): BracketSlotInfo[] {
  const slots: BracketSlotInfo[] = [];

  const slotDescriptions: Record<number, { label: string; stage: 'playoff' | 'round_of_16'; isSeed?: boolean; seedRank?: 1 | 2 | 3 | 4 }> = {
    1: { label: 'Undian 1 (Playoff M1 - Lawan Undian 2)', stage: 'playoff' },
    2: { label: 'Undian 2 (Playoff M1 - Lawan Undian 1)', stage: 'playoff' },
    3: { label: 'Undian 3 (16 Besar - Unggulan 1 / Lawan Menang M1)', stage: 'round_of_16', isSeed: true, seedRank: 1 },
    4: { label: 'Undian 4 (16 Besar - M4 Lawan Undian 5)', stage: 'round_of_16' },
    5: { label: 'Undian 5 (16 Besar - M4 Lawan Undian 4)', stage: 'round_of_16' },
    6: { label: 'Undian 6 (Playoff M2 - Lawan Undian 7)', stage: 'playoff' },
    7: { label: 'Undian 7 (Playoff M2 - Lawan Undian 6)', stage: 'playoff' },
    8: { label: 'Undian 8 (16 Besar - Unggulan 4 / Lawan Menang M2)', stage: 'round_of_16', isSeed: true, seedRank: 4 },
    9: { label: 'Undian 9 (16 Besar - M5 Lawan Undian 10)', stage: 'round_of_16' },
    10: { label: 'Undian 10 (16 Besar - M5 Lawan Undian 9)', stage: 'round_of_16' },
    11: { label: 'Undian 11 (16 Besar - Unggulan 3 / M6 Lawan Undian 12)', stage: 'round_of_16', isSeed: true, seedRank: 3 },
    12: { label: 'Undian 12 (16 Besar - M6 Lawan Undian 11)', stage: 'round_of_16' },
    13: { label: 'Undian 13 (16 Besar - M9 Lawan Undian 14)', stage: 'round_of_16' },
    14: { label: 'Undian 14 (16 Besar - M9 Lawan Undian 13)', stage: 'round_of_16' },
    15: { label: 'Undian 15 (16 Besar - M10 Lawan Undian 16)', stage: 'round_of_16' },
    16: { label: 'Undian 16 (16 Besar - M10 Lawan Undian 15)', stage: 'round_of_16' },
    17: { label: 'Undian 17 (Playoff M3 - Lawan Undian 18)', stage: 'playoff' },
    18: { label: 'Undian 18 (Playoff M3 - Lawan Undian 17)', stage: 'playoff' },
    19: { label: 'Undian 19 (16 Besar - Unggulan 2 / Lawan Menang M3)', stage: 'round_of_16', isSeed: true, seedRank: 2 }
  };

  for (let s = 1; s <= 19; s++) {
    const info = slotDescriptions[s] || { label: `Undian ${s}`, stage: 'round_of_16' };
    slots.push({
      slotId: s,
      label: info.label,
      stage: info.stage,
      isSeedSlot: info.isSeed,
      seedRank: info.seedRank
    });
  }

  return slots;
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function addDaysToDate(dateStr: string, daysToAdd: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

/**
 * Generates full 19-team balanced knockout bracket matches strictly mapped to the official spreadsheet
 */
export function generateKnockoutBracket(config: KnockoutBracketConfig): Match[] {
  const {
    tournamentId,
    teams,
    startDate,
    dailyStartTime,
    matchDurationMinutes,
    breakMinutes,
    pitches,
    hasThirdPlacePlayoff
  } = config;

  // Map teams by their assigned slot (1 to 19)
  const teamBySlot = new Map<number, Team>();
  teams.forEach(t => {
    if (t.drawnSlot !== null && t.drawnSlot !== undefined) {
      teamBySlot.set(t.drawnSlot, t);
    }
  });

  const getTeamForSlot = (slotNumber: number, placeholderTitle: string): TeamMatchSlot => {
    const found = teamBySlot.get(slotNumber);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        departmentOrigin: found.departmentOrigin,
        score: null,
        penaltyScore: null,
        logoUrl: found.logoUrl,
        seedNumber: found.seedNumber
      };
    }
    return {
      id: null,
      name: placeholderTitle,
      departmentOrigin: undefined,
      score: null,
      penaltyScore: null
    };
  };

  const emptySlot = (placeholder: string): TeamMatchSlot => ({
    id: null,
    name: placeholder,
    score: null,
    penaltyScore: null
  });

  // --- 1. Play-off Matches (M1, M2, M3) ---
  const m1: Match = {
    id: 'M-01',
    tournamentId,
    matchNumber: 1,
    stage: 'playoff',
    homeTeam: getTeamForSlot(1, 'Undian 1'),
    awayTeam: getTeamForSlot(2, 'Undian 2'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-07',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: startDate,
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 0,
    bracketPosition: 0
  };

  const m2: Match = {
    id: 'M-02',
    tournamentId,
    matchNumber: 2,
    stage: 'playoff',
    homeTeam: getTeamForSlot(6, 'Undian 6'),
    awayTeam: getTeamForSlot(7, 'Undian 7'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-08',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: startDate,
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 0,
    bracketPosition: 1
  };

  const m3: Match = {
    id: 'M-03',
    tournamentId,
    matchNumber: 3,
    stage: 'playoff',
    homeTeam: getTeamForSlot(17, 'Undian 17'),
    awayTeam: getTeamForSlot(18, 'Undian 18'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-11',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: startDate,
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 0,
    bracketPosition: 2
  };

  // --- 2. Babak 16 Besar (M4, M5, M6, M7, M8, M9, M10, M11) ---
  const m4: Match = {
    id: 'M-04',
    tournamentId,
    matchNumber: 4,
    stage: 'round_of_16',
    homeTeam: getTeamForSlot(4, 'Undian 4'),
    awayTeam: getTeamForSlot(5, 'Undian 5'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-12',
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: startDate,
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 1
  };

  const m5: Match = {
    id: 'M-05',
    tournamentId,
    matchNumber: 5,
    stage: 'round_of_16',
    homeTeam: getTeamForSlot(9, 'Undian 9'),
    awayTeam: getTeamForSlot(10, 'Undian 10'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-13',
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: startDate,
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 3
  };

  const m6: Match = {
    id: 'M-06',
    tournamentId,
    matchNumber: 6,
    stage: 'round_of_16',
    homeTeam: getTeamForSlot(11, 'Undian 11'),
    awayTeam: getTeamForSlot(12, 'Undian 12'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-14',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: startDate,
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 4
  };

  const m7: Match = {
    id: 'M-07',
    tournamentId,
    matchNumber: 7,
    stage: 'round_of_16',
    homeTeam: emptySlot('Menang M1'),
    awayTeam: getTeamForSlot(3, 'Undian 3'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-12',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 1),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 0
  };

  const m8: Match = {
    id: 'M-08',
    tournamentId,
    matchNumber: 8,
    stage: 'round_of_16',
    homeTeam: emptySlot('Menang M2'),
    awayTeam: getTeamForSlot(8, 'Undian 8'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-13',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 1),
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 2
  };

  const m9: Match = {
    id: 'M-09',
    tournamentId,
    matchNumber: 9,
    stage: 'round_of_16',
    homeTeam: getTeamForSlot(13, 'Undian 13'),
    awayTeam: getTeamForSlot(14, 'Undian 14'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-14',
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 1),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 5
  };

  const m10: Match = {
    id: 'M-10',
    tournamentId,
    matchNumber: 10,
    stage: 'round_of_16',
    homeTeam: getTeamForSlot(15, 'Undian 15'),
    awayTeam: getTeamForSlot(16, 'Undian 16'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-15',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 1),
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 6
  };

  const m11: Match = {
    id: 'M-11',
    tournamentId,
    matchNumber: 11,
    stage: 'round_of_16',
    homeTeam: emptySlot('Menang M3'),
    awayTeam: getTeamForSlot(19, 'Undian 19'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-15',
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 1),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 1,
    bracketPosition: 7
  };

  // --- 3. Perempat Final (M12, M13, M14, M15) ---
  const m12: Match = {
    id: 'M-12',
    tournamentId,
    matchNumber: 12,
    stage: 'quarter_final',
    homeTeam: emptySlot('Menang M7'),
    awayTeam: emptySlot('Menang M4'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-16',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 2),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 2,
    bracketPosition: 0
  };

  const m13: Match = {
    id: 'M-13',
    tournamentId,
    matchNumber: 13,
    stage: 'quarter_final',
    homeTeam: emptySlot('Menang M8'),
    awayTeam: emptySlot('Menang M5'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-16',
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 2),
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 2,
    bracketPosition: 1
  };

  const m14: Match = {
    id: 'M-14',
    tournamentId,
    matchNumber: 14,
    stage: 'quarter_final',
    homeTeam: emptySlot('Menang M6'),
    awayTeam: emptySlot('Menang M9'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-17',
    isNextHome: true,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 2),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 2,
    bracketPosition: 2
  };

  const m15: Match = {
    id: 'M-15',
    tournamentId,
    matchNumber: 15,
    stage: 'quarter_final',
    homeTeam: emptySlot('Menang M10'),
    awayTeam: emptySlot('Menang M11'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-17',
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 2),
    startTime: '',
    endTime: '',
    pitch: pitches[1 % pitches.length] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 2,
    bracketPosition: 3
  };

  // --- 4. Semifinal (M16 & M17) ---
  const m16: Match = {
    id: 'M-16',
    tournamentId,
    matchNumber: 16,
    stage: 'semi_final',
    homeTeam: emptySlot('Menang M12'),
    awayTeam: emptySlot('Menang M13'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-19',
    isNextHome: true,
    nextLoserMatchId: 'M-18',
    isNextLoserHome: true,
    scheduledDate: addDaysToDate(startDate, 3),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 3,
    bracketPosition: 0
  };

  const m17: Match = {
    id: 'M-17',
    tournamentId,
    matchNumber: 17,
    stage: 'semi_final',
    homeTeam: emptySlot('Menang M14'),
    awayTeam: emptySlot('Menang M15'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: 'M-19',
    isNextHome: false,
    nextLoserMatchId: 'M-18',
    isNextLoserHome: false,
    scheduledDate: addDaysToDate(startDate, 3),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 3,
    bracketPosition: 1
  };

  // --- 5. Perebutan Juara 3 (M18) & Grand Final (M19) ---
  const m18: Match = {
    id: 'M-18',
    tournamentId,
    matchNumber: 18,
    stage: 'third_place',
    homeTeam: emptySlot('Kalah M16'),
    awayTeam: emptySlot('Kalah M17'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: null,
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 4),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 4,
    bracketPosition: 1
  };

  const m19: Match = {
    id: 'M-19',
    tournamentId,
    matchNumber: 19,
    stage: 'final',
    homeTeam: emptySlot('Finalis 1 (Menang M16)'),
    awayTeam: emptySlot('Finalis 2 (Menang M17)'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: null,
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: addDaysToDate(startDate, 4),
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 4,
    bracketPosition: 0
  };

  // --- 6. Schedule Timetable & Pitch Distribution ---
  const daysSchedule = [
    { dayOffset: 0, matches: [m1, m2, m3, m4, m5, m6] },           // Hari 1: 6 Match
    { dayOffset: 1, matches: [m7, m8, m9, m10, m11] },              // Hari 2: 5 Match
    { dayOffset: 2, matches: [m12, m13, m14, m15] },                // Hari 3: 4 Match
    { dayOffset: 3, matches: [m16, m17] },                          // Hari 4: 2 Match
    { dayOffset: 4, matches: [m18, m19] }                           // Hari 5: 2 Match
  ];

  const slotMinutes = matchDurationMinutes + breakMinutes;

  daysSchedule.forEach(({ dayOffset, matches: dMatches }) => {
    const dayDate = addDaysToDate(startDate, dayOffset);
    let currentTime = dailyStartTime;
    let pitchIdx = 0;

    dMatches.forEach(m => {
      m.scheduledDate = dayDate;
      m.startTime = currentTime;
      m.endTime = addMinutesToTime(currentTime, matchDurationMinutes);
      m.pitch = pitches[pitchIdx % pitches.length] || 'Lapangan 1';

      pitchIdx++;
      if (pitchIdx >= pitches.length) {
        pitchIdx = 0;
        currentTime = addMinutesToTime(currentTime, slotMinutes);
      }
    });
  });

  const allMatches: Match[] = [
    m1, m2, m3,
    m4, m5, m6, m7, m8, m9, m10, m11,
    m12, m13, m14, m15,
    m16, m17,
    m18, m19
  ].sort((a, b) => a.matchNumber - b.matchNumber);

  return allMatches;
}

/**
 * Propagate Knockout Match Score and Auto-Advance Winner & Loser
 */
export function advanceKnockoutWinner(
  matches: Match[],
  matchId: string,
  scores: {
    homeScore: number;
    awayScore: number;
    homePenalty?: number | null;
    awayPenalty?: number | null;
  }
): { updatedMatches: Match[]; winnerId: string; loserId: string | null } {
  const cloned = matches.map(m => ({ ...m, homeTeam: { ...m.homeTeam }, awayTeam: { ...m.awayTeam } }));
  const target = cloned.find(m => m.id === matchId);

  if (!target) throw new Error(`Match ${matchId} tidak ditemukan`);
  if (!target.homeTeam.id || !target.awayTeam.id) {
    throw new Error('Kedua tim harus terdaftar sebelum skor dapat diinputkan.');
  }

  target.homeTeam.score = scores.homeScore;
  target.awayTeam.score = scores.awayScore;
  target.homeTeam.penaltyScore = scores.homePenalty ?? null;
  target.awayTeam.penaltyScore = scores.awayPenalty ?? null;
  target.status = 'completed';

  let winnerId: string;
  let loserId: string;

  if (scores.homeScore > scores.awayScore) {
    winnerId = target.homeTeam.id;
    loserId = target.awayTeam.id;
  } else if (scores.awayScore > scores.homeScore) {
    winnerId = target.awayTeam.id;
    loserId = target.homeTeam.id;
  } else {
    const penHome = scores.homePenalty ?? 0;
    const penAway = scores.awayPenalty ?? 0;
    if (penHome > penAway) {
      winnerId = target.homeTeam.id;
      loserId = target.awayTeam.id;
    } else if (penAway > penHome) {
      winnerId = target.awayTeam.id;
      loserId = target.homeTeam.id;
    } else {
      throw new Error('Skor seri di waktu normal dan adu penalti. Harus ada pemenang.');
    }
  }

  target.winnerTeamId = winnerId;
  target.loserTeamId = loserId;

  const winnerObj = target.homeTeam.id === winnerId ? target.homeTeam : target.awayTeam;
  const loserObj = target.homeTeam.id === loserId ? target.homeTeam : target.awayTeam;

  // Advance winner to nextMatchId
  if (target.nextMatchId) {
    const nextMatch = cloned.find(m => m.id === target.nextMatchId);
    if (nextMatch) {
      const advancedSlot: TeamMatchSlot = {
        id: winnerObj.id,
        name: winnerObj.name,
        departmentOrigin: winnerObj.departmentOrigin,
        score: null,
        penaltyScore: null,
        logoUrl: winnerObj.logoUrl,
        seedNumber: winnerObj.seedNumber
      };

      if (target.isNextHome) {
        nextMatch.homeTeam = advancedSlot;
      } else {
        nextMatch.awayTeam = advancedSlot;
      }
    }
  }

  // Advance loser to 3rd place match if from semifinals
  if (target.nextLoserMatchId) {
    const loserMatch = cloned.find(m => m.id === target.nextLoserMatchId);
    if (loserMatch) {
      const loserSlot: TeamMatchSlot = {
        id: loserObj.id,
        name: loserObj.name,
        departmentOrigin: loserObj.departmentOrigin,
        score: null,
        penaltyScore: null,
        logoUrl: loserObj.logoUrl,
        seedNumber: loserObj.seedNumber
      };

      if (target.isNextLoserHome) {
        loserMatch.homeTeam = loserSlot;
      } else {
        loserMatch.awayTeam = loserSlot;
      }
    }
  }

  return { updatedMatches: cloned, winnerId, loserId };
}
