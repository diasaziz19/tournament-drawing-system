/**
 * Knockout Tournament Engine (Single Elimination & Multi-stage Bracket)
 * Features:
 * - Balancing non-power-of-two team counts with preliminary playoff rounds
 * - Strategic Seeded Plotting (Juara 1 -> Slot 1, Juara 2 -> Slot 16, Juara 3 -> Slot 9, Juara 4 -> Slot 8)
 * - Chronological Match Numbering & Strict 5-Day Schedule:
 *   - Day 1: 6 matches (3 Playoff + 3 Round of 16 direct byes)
 *   - Day 2: 5 matches (5 Round of 16 remaining matches)
 *   - Day 3: 4 matches (4 Quarterfinals / 8 Besar)
 *   - Day 4: 2 matches (2 Semifinals)
 *   - Day 5: 2 matches (Perebutan Juara 3 + Grand Final)
 * - Rest-time protection: Maximum 1 match/day per team
 * - Auto-advancement of winners and losers (3rd place)
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

export interface BracketStructure {
  totalTeams: number;
  nearestPowerOfTwo: number;
  playoffMatchesCount: number;
  playoffTeamsCount: number;
  directByesCount: number;
  totalMatches: number;
}

/**
 * Calculates bracket structural parameters for non-power-of-two tournaments
 */
export function calculateBracketStructure(totalTeams: number): BracketStructure {
  const N = Math.max(2, totalTeams);
  let P = 2;
  while (P * 2 <= N) {
    P *= 2;
  }

  // Excess teams requiring preliminary playoff matches
  const excess = N - P;
  const playoffMatchesCount = excess;
  const playoffTeamsCount = excess * 2;
  const directByesCount = N - playoffTeamsCount;
  const totalMatches = N - 1;

  return {
    totalTeams: N,
    nearestPowerOfTwo: P,
    playoffMatchesCount,
    playoffTeamsCount,
    directByesCount,
    totalMatches
  };
}

/**
 * Maps stage enum to standard stage title
 */
export function getStageTitle(stage: MatchStage): string {
  switch (stage) {
    case 'playoff': return 'Babak Playoff / Pendahuluan';
    case 'round_of_32': return 'Babak 32 Besar';
    case 'round_of_16': return 'Babak 16 Besar';
    case 'quarter_final': return 'Perempat Final (8 Besar)';
    case 'semi_final': return 'Semifinal';
    case 'third_place': return 'Perebutan Juara 3';
    case 'final': return 'Grand Final';
    default: return 'Babak Turnamen';
  }
}

/**
 * Format helper for time calculations
 */
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
 * Slot Definition for dynamic live drawing placement
 */
export interface BracketSlotInfo {
  slotId: number;
  label: string;
  stage: 'playoff' | 'round_of_16';
  isSeedSlot?: boolean;
  seedRank?: 1 | 2 | 3 | 4;
}

/**
 * Returns available slot definitions for drawing for a given team count
 */
export function getAvailableBracketSlots(teamCount: number): BracketSlotInfo[] {
  const structure = calculateBracketStructure(teamCount);
  const slots: BracketSlotInfo[] = [];

  // Playoff feeds are located at: Match 1 Away (Slot 2), Match 4 Home (Slot 7), Match 8 Home (Slot 15)
  const playoffTargetSlots = [2, 7, 15, 12].slice(0, structure.playoffMatchesCount);
  const playoffTargetSet = new Set(playoffTargetSlots);

  // R16 Slots (1 to 16)
  for (let s = 1; s <= 16; s++) {
    if (playoffTargetSet.has(s)) {
      continue; // This slot is fed by a playoff match winner
    }
    let isSeed = false;
    let seedRank: 1 | 2 | 3 | 4 | undefined;
    if (s === 1) { isSeed = true; seedRank = 1; }
    else if (s === 16) { isSeed = true; seedRank = 2; }
    else if (s === 9) { isSeed = true; seedRank = 3; }
    else if (s === 8) { isSeed = true; seedRank = 4; }

    slots.push({
      slotId: s,
      label: isSeed ? `Slot #${s} (Unggulan ${seedRank})` : `Slot #${s} (16 Besar)`,
      stage: 'round_of_16',
      isSeedSlot: isSeed,
      seedRank
    });
  }

  // Playoff Slots (e.g. Playoff 1 Home/Away, Playoff 2 Home/Away, Playoff 3 Home/Away)
  for (let p = 0; p < structure.playoffMatchesCount; p++) {
    const pNum = p + 1;
    const baseSlot = 100 + p * 2;
    const targetInfo = pNum === 1 ? 'Menuju Match 1' : pNum === 2 ? 'Menuju Match 4' : 'Menuju Match 8';
    slots.push({
      slotId: baseSlot + 1,
      label: `Playoff ${pNum} Home (${targetInfo})`,
      stage: 'playoff'
    });
    slots.push({
      slotId: baseSlot + 2,
      label: `Playoff ${pNum} Away (${targetInfo})`,
      stage: 'playoff'
    });
  }

  return slots;
}

/**
 * Generates full balanced knockout bracket matches with tree linkages,
 * slot-based team placement, and chronological 5-day scheduling
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

  const N = teams.length;
  const structure = calculateBracketStructure(N);
  const P = structure.nearestPowerOfTwo; // 16 for 19 teams

  // Map teams by their assigned slot
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
        logoUrl: found.logoUrl
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

  // 1. Initialize Playoff Matches (3 matches for 19 teams)
  const playoffMatches: Match[] = [];
  if (structure.playoffMatchesCount > 0) {
    for (let i = 0; i < structure.playoffMatchesCount; i++) {
      const baseSlot = 100 + i * 2;
      const homeSlotId = baseSlot + 1;
      const awaySlotId = baseSlot + 2;

      playoffMatches.push({
        id: `M-P${i + 1}`,
        tournamentId,
        matchNumber: i + 1, // M#1, M#2, M#3
        stage: 'playoff',
        homeTeam: getTeamForSlot(homeSlotId, `[Menunggu Undian Playoff ${i + 1}A]`),
        awayTeam: getTeamForSlot(awaySlotId, `[Menunggu Undian Playoff ${i + 1}B]`),
        winnerTeamId: null,
        loserTeamId: null,
        nextMatchId: null,
        isNextHome: false,
        nextLoserMatchId: null,
        scheduledDate: startDate,
        startTime: '',
        endTime: '',
        pitch: pitches[i % pitches.length] || 'Lapangan 1',
        status: 'scheduled',
        roundIndex: 0,
        bracketPosition: i
      });
    }
  }

  // 2. Initialize Round of 16 (8 matches) with visual tree bracketPosition: 0..7
  const r16Matches: Match[] = [];
  for (let i = 0; i < 8; i++) {
    const homeSlotNum = i * 2 + 1;
    const awaySlotNum = i * 2 + 2;

    let homeSlotData: TeamMatchSlot;
    let awaySlotData: TeamMatchSlot;

    if (i === 0) {
      // Tree Position 0: Home = Slot 1 (Unggulan 1), Away = Pemenang Playoff 1
      homeSlotData = getTeamForSlot(1, '[Menunggu Undian Slot 1 (Unggulan 1)]');
      awaySlotData = emptySlot('Pemenang Playoff 1');
    } else if (i === 3) {
      // Tree Position 3: Home = Slot 7, Away = Pemenang Playoff 2 (Lawan Unggulan 4)
      homeSlotData = getTeamForSlot(7, '[Menunggu Undian Slot 7]');
      awaySlotData = emptySlot('Pemenang Playoff 2');
    } else if (i === 7) {
      // Tree Position 7: Home = Pemenang Playoff 3, Away = Slot 16 (Unggulan 2)
      homeSlotData = emptySlot('Pemenang Playoff 3');
      awaySlotData = getTeamForSlot(16, '[Menunggu Undian Slot 16 (Unggulan 2)]');
    } else {
      const seedLabelHome = homeSlotNum === 9 ? ' (Unggulan 3)' : '';
      const seedLabelAway = awaySlotNum === 8 ? ' (Unggulan 4)' : '';
      homeSlotData = getTeamForSlot(homeSlotNum, `[Menunggu Undian Slot ${homeSlotNum}${seedLabelHome}]`);
      awaySlotData = getTeamForSlot(awaySlotNum, `[Menunggu Undian Slot ${awaySlotNum}${seedLabelAway}]`);
    }

    r16Matches.push({
      id: `M-R16-${i + 1}`,
      tournamentId,
      matchNumber: 0, // Will be assigned chronologically below
      stage: 'round_of_16',
      homeTeam: homeSlotData,
      awayTeam: awaySlotData,
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
      isNextHome: false,
      nextLoserMatchId: null,
      scheduledDate: '',
      startTime: '',
      endTime: '',
      pitch: pitches[i % pitches.length] || 'Lapangan 1',
      status: 'scheduled',
      roundIndex: 1,
      bracketPosition: i
    });
  }

  // 3. Initialize Quarterfinals (4 matches: QF 1..4)
  const qfMatches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    qfMatches.push({
      id: `M-QF-${i + 1}`,
      tournamentId,
      matchNumber: 12 + i, // M#12, M#13, M#14, M#15
      stage: 'quarter_final',
      homeTeam: emptySlot(`Pemenang 16 Besar Match ${i * 2 + 1}`),
      awayTeam: emptySlot(`Pemenang 16 Besar Match ${i * 2 + 2}`),
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
      isNextHome: i % 2 === 0,
      nextLoserMatchId: null,
      scheduledDate: '',
      startTime: '',
      endTime: '',
      pitch: pitches[i % pitches.length] || 'Lapangan 1',
      status: 'scheduled',
      roundIndex: 2,
      bracketPosition: i
    });
  }

  // 4. Initialize Semifinals (2 matches: SF 1 & SF 2)
  const sfMatches: Match[] = [];
  for (let i = 0; i < 2; i++) {
    sfMatches.push({
      id: `M-SF-${i + 1}`,
      tournamentId,
      matchNumber: 16 + i, // M#16, M#17
      stage: 'semi_final',
      homeTeam: emptySlot(`Pemenang 8 Besar QF ${i * 2 + 1}`),
      awayTeam: emptySlot(`Pemenang 8 Besar QF ${i * 2 + 2}`),
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
      isNextHome: i === 0,
      nextLoserMatchId: null,
      scheduledDate: '',
      startTime: '',
      endTime: '',
      pitch: pitches[i % pitches.length] || 'Lapangan 1',
      status: 'scheduled',
      roundIndex: 3,
      bracketPosition: i
    });
  }

  // 5. Initialize Perebutan Juara 3 & Grand Final
  const thirdPlaceMatch: Match = {
    id: 'M-18',
    tournamentId,
    matchNumber: 18, // M#18
    stage: 'third_place',
    homeTeam: emptySlot('Kalah Semifinal 1'),
    awayTeam: emptySlot('Kalah Semifinal 2'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: null,
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: '',
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 4,
    bracketPosition: 1
  };

  const finalMatch: Match = {
    id: 'M-19',
    tournamentId,
    matchNumber: 19, // M#19
    stage: 'final',
    homeTeam: emptySlot('Pemenang Semifinal 1'),
    awayTeam: emptySlot('Pemenang Semifinal 2'),
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: null,
    isNextHome: false,
    nextLoserMatchId: null,
    scheduledDate: '',
    startTime: '',
    endTime: '',
    pitch: pitches[0] || 'Lapangan 1',
    status: 'scheduled',
    roundIndex: 4,
    bracketPosition: 0
  };

  // Wire Tree Linkages
  // R16 (0, 1) -> QF 1; (2, 3) -> QF 2; (4, 5) -> QF 3; (6, 7) -> QF 4
  r16Matches.forEach((m, idx) => {
    const parentQf = qfMatches[Math.floor(idx / 2)];
    m.nextMatchId = parentQf.id;
    m.isNextHome = idx % 2 === 0;
  });

  // QF (0, 1) -> SF 1; (2, 3) -> SF 2
  qfMatches.forEach((m, idx) => {
    const parentSf = sfMatches[Math.floor(idx / 2)];
    m.nextMatchId = parentSf.id;
    m.isNextHome = idx % 2 === 0;
  });

  // SF 1 & 2 -> Final & 3rd Place
  sfMatches.forEach((m, idx) => {
    m.nextMatchId = finalMatch.id;
    m.isNextHome = idx === 0;
    m.nextLoserMatchId = thirdPlaceMatch.id;
    m.isNextLoserHome = idx === 0;
  });

  // Playoff linkages into Round of 16:
  // Playoff 1 -> r16Matches[0] (Away)
  // Playoff 2 -> r16Matches[3] (Away)
  // Playoff 3 -> r16Matches[7] (Home)
  if (playoffMatches[0]) {
    playoffMatches[0].nextMatchId = r16Matches[0].id;
    playoffMatches[0].isNextHome = false;
  }
  if (playoffMatches[1]) {
    playoffMatches[1].nextMatchId = r16Matches[3].id;
    playoffMatches[1].isNextHome = false;
  }
  if (playoffMatches[2]) {
    playoffMatches[2].nextMatchId = r16Matches[7].id;
    playoffMatches[2].isNextHome = true;
  }

  // 6. Chronological Scheduling & Strict Match Numbering:
  // Hari 1 (6 match):
  // - M#1: Playoff 1
  // - M#2: Playoff 2
  // - M#3: Playoff 3
  // - M#4: 16 Besar (r16Matches[1] - Slot 3 vs 4)
  // - M#5: 16 Besar (r16Matches[2] - Slot 5 vs 6)
  // - M#6: 16 Besar (r16Matches[4] - Slot 9 vs 10)
  // Hari 2 (5 match):
  // - M#7: 16 Besar (r16Matches[0] - Lawan Playoff 1)
  // - M#8: 16 Besar (r16Matches[3] - Lawan Playoff 2)
  // - M#9: 16 Besar (r16Matches[5] - Slot 11 vs 12)
  // - M#10: 16 Besar (r16Matches[6] - Slot 13 vs 14)
  // - M#11: 16 Besar (r16Matches[7] - Lawan Playoff 3)
  // Hari 3 (4 match): M#12, M#13, M#14, M#15 (8 Besar)
  // Hari 4 (2 match): M#16, M#17 (Semifinal)
  // Hari 5 (2 match): M#18 (Juara 3), M#19 (Grand Final)

  // Assign R16 match numbers
  r16Matches[1].matchNumber = 4;
  r16Matches[2].matchNumber = 5;
  r16Matches[4].matchNumber = 6;
  r16Matches[0].matchNumber = 7;
  r16Matches[3].matchNumber = 8;
  r16Matches[5].matchNumber = 9;
  r16Matches[6].matchNumber = 10;
  r16Matches[7].matchNumber = 11;

  // Days mapping
  const day1Matches = [
    playoffMatches[0],
    playoffMatches[1],
    playoffMatches[2],
    r16Matches[1],
    r16Matches[2],
    r16Matches[4]
  ].filter(Boolean);

  const day2Matches = [
    r16Matches[0],
    r16Matches[3],
    r16Matches[5],
    r16Matches[6],
    r16Matches[7]
  ].filter(Boolean);

  const day3Matches = [...qfMatches];
  const day4Matches = [...sfMatches];
  const day5Matches = [thirdPlaceMatch, finalMatch];

  const daysSchedule = [
    { dayOffset: 0, matches: day1Matches },
    { dayOffset: 1, matches: day2Matches },
    { dayOffset: 2, matches: day3Matches },
    { dayOffset: 3, matches: day4Matches },
    { dayOffset: 4, matches: day5Matches }
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

  // Final list of all matches sorted chronologically by matchNumber
  const allMatches: Match[] = [
    ...playoffMatches,
    ...r16Matches,
    ...qfMatches,
    ...sfMatches,
    thirdPlaceMatch,
    finalMatch
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
        logoUrl: winnerObj.logoUrl
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
        logoUrl: loserObj.logoUrl
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
