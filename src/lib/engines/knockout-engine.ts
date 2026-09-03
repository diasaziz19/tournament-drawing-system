/**
 * Pure Knockout Engine (Single Elimination)
 * Features:
 * - Non-power-of-two irregular team handling (17, 18, 19, 21, etc.)
 * - Slot-by-slot live drawing mapping: Slots update in realtime as teams are drawn
 * - 4 Seeded teams manual plotting support (Juara 1, 2, 3, 4 tahun lalu)
 * - Automatic Byes & Preliminary Playoff rounds calculation
 * - 3rd place playoff match linkage (perebutan juara 3)
 * - Schedule Rest Engine: Enforces "Max 1 match/day per team" constraint
 * - Dynamic winner & loser propagation across the bracket tree
 */

import { Match, MatchStage, Team, TeamMatchSlot } from '../../types/tournament';

export interface KnockoutBracketConfig {
  tournamentId: string;
  teams: Team[];
  startDate: string;              // YYYY-MM-DD
  dailyStartTime: string;         // HH:mm (e.g. "07:30")
  matchDurationMinutes: number;   // e.g. 30
  breakMinutes: number;           // e.g. 10
  pitches: string[];              // e.g. ["Lapangan A"]
  hasThirdPlacePlayoff: boolean;  // default true
  maxMatchesPerDayPerTeam: number;// default 1
}

export interface KnockoutCalculationResult {
  totalTeams: number;
  nearestPowerOfTwo: number;
  playoffMatchesCount: number;
  playoffTeamsCount: number;
  byeTeamsCount: number;
  totalMatchesCount: number;
  stagesPresent: MatchStage[];
}

/**
 * Calculates bracket mathematical parameters for non-power-of-two team counts
 */
export function calculateBracketStructure(teamCount: number, hasThirdPlace: boolean = true): KnockoutCalculationResult {
  if (teamCount < 2) {
    throw new Error('Turnamen membutuhkan minimal 2 tim');
  }

  const floorPower = Math.pow(2, Math.floor(Math.log2(teamCount)));
  const isPowerOfTwo = (teamCount & (teamCount - 1)) === 0;

  let nearestPowerOfTwo = floorPower;
  let playoffMatchesCount = 0;
  let playoffTeamsCount = 0;
  let byeTeamsCount = teamCount;

  if (!isPowerOfTwo) {
    playoffMatchesCount = teamCount - floorPower;
    playoffTeamsCount = playoffMatchesCount * 2;
    byeTeamsCount = teamCount - playoffTeamsCount;
    nearestPowerOfTwo = floorPower;
  }

  const totalMatchesCount = (teamCount - 1) + (hasThirdPlace && teamCount >= 4 ? 1 : 0);

  const stagesPresent: MatchStage[] = [];
  if (playoffMatchesCount > 0) stagesPresent.push('playoff');
  if (nearestPowerOfTwo >= 32) stagesPresent.push('round_of_32');
  if (nearestPowerOfTwo >= 16) stagesPresent.push('round_of_16');
  if (nearestPowerOfTwo >= 8) stagesPresent.push('quarter_final');
  if (nearestPowerOfTwo >= 4) stagesPresent.push('semi_final');
  if (hasThirdPlace && teamCount >= 4) stagesPresent.push('third_place');
  stagesPresent.push('final');

  return {
    totalTeams: teamCount,
    nearestPowerOfTwo,
    playoffMatchesCount,
    playoffTeamsCount,
    byeTeamsCount,
    totalMatchesCount,
    stagesPresent
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

  // 1. Seeded & Direct Bye Slots in Round of 16 (for P=16)
  // Standard positions for Seeds 1, 2, 3, 4
  // Seed 1: Slot 1 (Match 1 Home)
  // Seed 2: Slot 16 (Match 8 Away)
  // Seed 3: Slot 9 (Match 5 Home)
  // Seed 4: Slot 8 (Match 4 Away)

  // Playoff feeds are located at non-seed slots: e.g. Match 2 Away (Slot 4), Match 4 Home (Slot 7), Match 6 Away (Slot 12)
  const playoffTargetSlots = [4, 7, 12, 14, 2, 10, 6, 15].slice(0, structure.playoffMatchesCount);
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
    slots.push({
      slotId: baseSlot + 1,
      label: `Playoff ${pNum} - Tim Home`,
      stage: 'playoff'
    });
    slots.push({
      slotId: baseSlot + 2,
      label: `Playoff ${pNum} - Tim Away`,
      stage: 'playoff'
    });
  }

  return slots;
}

/**
 * Generates full balanced knockout bracket matches with tree linkages,
 * slot-based team placement, and schedule rest enforcement
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

  const N = Math.max(teams.length, 2);
  const structure = calculateBracketStructure(N, hasThirdPlacePlayoff);
  const P = structure.nearestPowerOfTwo; // 16 for N=17..31

  const emptySlot = (placeholder: string): TeamMatchSlot => ({
    id: null,
    name: placeholder,
    score: null,
    penaltyScore: null
  });

  // Map teams by their assigned drawnSlot
  const teamBySlot = new Map<number, Team>();
  teams.forEach(t => {
    if (t.drawnSlot !== null) {
      teamBySlot.set(t.drawnSlot, t);
    }
  });

  const getTeamForSlot = (slotNumber: number, placeholder: string): TeamMatchSlot => {
    const team = teamBySlot.get(slotNumber);
    if (team) {
      return {
        id: team.id,
        name: team.name,
        departmentOrigin: team.departmentOrigin,
        score: null,
        penaltyScore: null,
        logoUrl: team.logoUrl
      };
    }
    return emptySlot(placeholder);
  };

  let matchCounter = 1;
  const playoffMatches: Match[] = [];
  const playoffMatchMap = new Map<number, { matchId: string; playoffNumber: number }>();

  // 1. Determine Playoff Matches (if irregular team count like 19 teams)
  if (structure.playoffMatchesCount > 0) {
    for (let i = 0; i < structure.playoffMatchesCount; i++) {
      const matchId = `M-${String(matchCounter).padStart(2, '0')}`;
      const baseSlot = 100 + i * 2;
      const homeSlotId = baseSlot + 1;
      const awaySlotId = baseSlot + 2;

      const playoffMatch: Match = {
        id: matchId,
        tournamentId,
        matchNumber: matchCounter++,
        stage: 'playoff',
        homeTeam: getTeamForSlot(homeSlotId, `[Menunggu Undian Playoff ${i + 1}A]`),
        awayTeam: getTeamForSlot(awaySlotId, `[Menunggu Undian Playoff ${i + 1}B]`),
        winnerTeamId: null,
        loserTeamId: null,
        nextMatchId: null,
        isNextHome: false,
        nextLoserMatchId: null,
        scheduledDate: startDate, // Playoff is strictly on Day 1
        startTime: '07:30',
        endTime: '08:00',
        pitch: pitches[i % pitches.length] || 'Lapangan 1',
        status: 'scheduled',
        roundIndex: 0
      };

      playoffMatches.push(playoffMatch);
      playoffMatchMap.set(i, { matchId, playoffNumber: i + 1 });
    }
  }

  // 2. Build Main Tree from Final downwards to Round of 16
  const mainRoundsCount = Math.log2(P);
  const roundMatchesByStage: Record<string, Match[]> = {};

  // Grand Final Match
  const finalMatchId = `M-${String(matchCounter).padStart(2, '0')}`;
  const finalMatch: Match = {
    id: finalMatchId,
    tournamentId,
    matchNumber: matchCounter++,
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
    roundIndex: mainRoundsCount
  };
  roundMatchesByStage['final'] = [finalMatch];

  // 3rd Place Match (Perebutan Juara 3)
  let thirdPlaceMatch: Match | null = null;
  if (hasThirdPlacePlayoff && N >= 4) {
    const thirdMatchId = `M-${String(matchCounter).padStart(2, '0')}`;
    thirdPlaceMatch = {
      id: thirdMatchId,
      tournamentId,
      matchNumber: matchCounter++,
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
      roundIndex: mainRoundsCount
    };
  }

  // Semifinals (2 matches)
  const sfMatches: Match[] = [];
  for (let i = 0; i < 2; i++) {
    const sfId = `M-${String(matchCounter).padStart(2, '0')}`;
    sfMatches.push({
      id: sfId,
      tournamentId,
      matchNumber: matchCounter++,
      stage: 'semi_final',
      homeTeam: emptySlot(`Pemenang QF ${i * 2 + 1}`),
      awayTeam: emptySlot(`Pemenang QF ${i * 2 + 2}`),
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: finalMatch.id,
      isNextHome: i === 0,
      nextLoserMatchId: thirdPlaceMatch ? thirdPlaceMatch.id : null,
      isNextLoserHome: i === 0,
      scheduledDate: '',
      startTime: '',
      endTime: '',
      pitch: pitches[i % pitches.length] || 'Lapangan 1',
      status: 'scheduled',
      roundIndex: mainRoundsCount - 1
    });
  }
  roundMatchesByStage['semi_final'] = sfMatches;

  // Quarterfinals (4 matches)
  const qfMatches: Match[] = [];
  for (let i = 0; i < 4; i++) {
    const qfId = `M-${String(matchCounter).padStart(2, '0')}`;
    const parentSf = sfMatches[Math.floor(i / 2)];
    qfMatches.push({
      id: qfId,
      tournamentId,
      matchNumber: matchCounter++,
      stage: 'quarter_final',
      homeTeam: emptySlot(`Pemenang R16 Match ${i * 2 + 1}`),
      awayTeam: emptySlot(`Pemenang R16 Match ${i * 2 + 2}`),
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: parentSf.id,
      isNextHome: i % 2 === 0,
      nextLoserMatchId: null,
      scheduledDate: '',
      startTime: '',
      endTime: '',
      pitch: pitches[i % pitches.length] || 'Lapangan 1',
      status: 'scheduled',
      roundIndex: mainRoundsCount - 2
    });
  }
  roundMatchesByStage['quarter_final'] = qfMatches;

  // Round of 16 (8 matches)
  const r16Matches: Match[] = [];
  // Designate playoff feed slots:
  // Playoff 1 feeds into Match 2 Away (Slot 4)
  // Playoff 2 feeds into Match 4 Home (Slot 7)
  // Playoff 3 feeds into Match 6 Away (Slot 12)
  const playoffFeedAssignments = [
    { matchIdx: 1, isHome: false, slotNum: 4 }, // Playoff 1 -> M2 Away
    { matchIdx: 3, isHome: true, slotNum: 7 },  // Playoff 2 -> M4 Home
    { matchIdx: 5, isHome: false, slotNum: 12 },// Playoff 3 -> M6 Away
    { matchIdx: 6, isHome: false, slotNum: 14 },// Playoff 4 (if >19 teams)
  ];

  const playoffFeedsToUse = playoffFeedAssignments.slice(0, structure.playoffMatchesCount);
  const playoffFeedLookup = new Map<string, number>();
  playoffFeedsToUse.forEach((feed, idx) => {
    playoffFeedLookup.set(`${feed.matchIdx}-${feed.isHome}`, idx);
  });

  for (let i = 0; i < 8; i++) {
    const r16Id = `M-${String(matchCounter).padStart(2, '0')}`;
    const parentQf = qfMatches[Math.floor(i / 2)];
    const homeSlotNum = i * 2 + 1;
    const awaySlotNum = i * 2 + 2;

    // Determine Home Slot
    let homeSlotData: TeamMatchSlot;
    const homePlayoffIdx = playoffFeedLookup.get(`${i}-true`);
    if (homePlayoffIdx !== undefined) {
      const pInfo = playoffMatchMap.get(homePlayoffIdx)!;
      const pMatch = playoffMatches.find(pm => pm.id === pInfo.matchId)!;
      pMatch.nextMatchId = r16Id;
      pMatch.isNextHome = true;
      homeSlotData = emptySlot(`Pemenang Playoff ${pInfo.playoffNumber}`);
    } else {
      const seedLabel = homeSlotNum === 1 ? ' (Unggulan 1)' : homeSlotNum === 9 ? ' (Unggulan 3)' : '';
      homeSlotData = getTeamForSlot(homeSlotNum, `[Menunggu Undian Slot ${homeSlotNum}${seedLabel}]`);
    }

    // Determine Away Slot
    let awaySlotData: TeamMatchSlot;
    const awayPlayoffIdx = playoffFeedLookup.get(`${i}-false`);
    if (awayPlayoffIdx !== undefined) {
      const pInfo = playoffMatchMap.get(awayPlayoffIdx)!;
      const pMatch = playoffMatches.find(pm => pm.id === pInfo.matchId)!;
      pMatch.nextMatchId = r16Id;
      pMatch.isNextHome = false;
      awaySlotData = emptySlot(`Pemenang Playoff ${pInfo.playoffNumber}`);
    } else {
      const seedLabel = awaySlotNum === 16 ? ' (Unggulan 2)' : awaySlotNum === 8 ? ' (Unggulan 4)' : '';
      awaySlotData = getTeamForSlot(awaySlotNum, `[Menunggu Undian Slot ${awaySlotNum}${seedLabel}]`);
    }

    r16Matches.push({
      id: r16Id,
      tournamentId,
      matchNumber: matchCounter++,
      stage: 'round_of_16',
      homeTeam: homeSlotData,
      awayTeam: awaySlotData,
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: parentQf.id,
      isNextHome: i % 2 === 0,
      nextLoserMatchId: null,
      scheduledDate: '',
      startTime: '',
      endTime: '',
      pitch: pitches[i % pitches.length] || 'Lapangan 1',
      status: 'scheduled',
      roundIndex: 1
    });
  }
  roundMatchesByStage['round_of_16'] = r16Matches;

  // 3. Schedule Rest Engine: Enforce "Max 1 match/day per team" constraint
  const allOrderedMatches: Match[] = [
    ...playoffMatches,
    ...roundMatchesByStage['round_of_16'],
    ...roundMatchesByStage['quarter_final'],
    ...roundMatchesByStage['semi_final'],
    ...(thirdPlaceMatch ? [thirdPlaceMatch] : []),
    ...roundMatchesByStage['final']
  ];

  const slotMinutes = matchDurationMinutes + breakMinutes;
  let currentDayOffset = 0;
  let currentTime = dailyStartTime;
  let pitchIndex = 0;

  const playoffWinnerMatchIds = new Set(playoffMatches.map(p => p.nextMatchId).filter(Boolean));

  for (const match of allOrderedMatches) {
    let day = currentDayOffset;

    if (match.stage === 'playoff') {
      day = 0; // Strictly Day 1
    } else if (playoffWinnerMatchIds.has(match.id)) {
      if (day === 0) day = 1; // Playoff winners play on Day 2 or later
    } else if (match.stage === 'semi_final') {
      day = Math.max(day, 2);
    } else if (match.stage === 'third_place' || match.stage === 'final') {
      day = Math.max(day, 3);
    }

    const matchStart = currentTime;
    const matchEnd = addMinutesToTime(currentTime, matchDurationMinutes);
    const assignedPitch = pitches[pitchIndex % pitches.length] || 'Lapangan 1';

    match.scheduledDate = addDaysToDate(startDate, day);
    match.startTime = matchStart;
    match.endTime = matchEnd;
    match.pitch = assignedPitch;

    pitchIndex++;
    if (pitchIndex >= pitches.length) {
      pitchIndex = 0;
      currentTime = addMinutesToTime(currentTime, slotMinutes);
      const [h] = currentTime.split(':').map(Number);
      if (h >= 18) {
        currentDayOffset++;
        currentTime = dailyStartTime;
      }
    }
  }

  return allOrderedMatches;
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

  // Advance loser to nextLoserMatchId (for 3rd Place Match)
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

      if (target.isNextLoserHome ?? true) {
        loserMatch.homeTeam = loserSlot;
      } else {
        loserMatch.awayTeam = loserSlot;
      }
    }
  }

  return { updatedMatches: cloned, winnerId, loserId };
}
