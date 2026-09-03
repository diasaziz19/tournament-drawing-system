/**
 * Pure Knockout Engine (Single Elimination)
 * Features:
 * - Non-power-of-two irregular team handling (17, 18, 19, 21, etc.)
 * - Automatic Byes & Preliminary Playoff rounds calculation
 * - 3rd place playoff match linkage (perebutan juara 3)
 * - Schedule Rest Engine: Enforces "Max 1 match/day per team" constraint
 * - Dynamic winner & loser propagation across the bracket tree
 */

import { Match, MatchStage, Team, TeamMatchSlot, Tournament } from '../../types/tournament';

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
    throw new Error('Tournament requires at least 2 teams');
  }

  // Find nearest lower power of two: P = 2^(floor(log2(N)))
  const floorPower = Math.pow(2, Math.floor(Math.log2(teamCount)));
  const isPowerOfTwo = (teamCount & (teamCount - 1)) === 0;

  let nearestPowerOfTwo = floorPower;
  let playoffMatchesCount = 0;
  let playoffTeamsCount = 0;
  let byeTeamsCount = teamCount;

  if (!isPowerOfTwo) {
    // Number of preliminary playoff matches = N - P
    playoffMatchesCount = teamCount - floorPower;
    playoffTeamsCount = playoffMatchesCount * 2;
    byeTeamsCount = teamCount - playoffTeamsCount;
    nearestPowerOfTwo = floorPower;
  }

  // Total matches in single elimination = N - 1 (+ 1 if 3rd place playoff)
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
 * Standard tournament seeded slot distribution
 * Generates slot pairing for a power-of-two bracket (e.g. 1 vs 16, 8 vs 9, etc.)
 */
export function getSeededPairings(bracketSize: number): [number, number][] {
  let rounds = Math.log2(bracketSize);
  let list = [1, 2];

  for (let r = 1; r < rounds; r++) {
    const nextList: number[] = [];
    const sum = Math.pow(2, r + 1) + 1;
    for (let i = 0; i < list.length; i++) {
      nextList.push(list[i]);
      nextList.push(sum - list[i]);
    }
    list = nextList;
  }

  const pairings: [number, number][] = [];
  for (let i = 0; i < list.length; i += 2) {
    pairings.push([list[i], list[i + 1]]);
  }
  return pairings;
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
 * Generates full balanced knockout bracket matches with tree linkages and schedule rest enforcement
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
  const structure = calculateBracketStructure(N, hasThirdPlacePlayoff);
  const P = structure.nearestPowerOfTwo; // e.g. 16 for N=18
  const matches: Match[] = [];

  // Sort teams: priority to drawnSlot, then seedNumber, then potTier
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.drawnSlot !== null && b.drawnSlot !== null) return a.drawnSlot - b.drawnSlot;
    if (a.seedNumber !== null && b.seedNumber !== null) return a.seedNumber - b.seedNumber;
    return a.potTier - b.potTier;
  });

  const emptySlot = (placeholder: string): TeamMatchSlot => ({
    id: null,
    name: placeholder,
    score: null,
    penaltyScore: null
  });

  let matchCounter = 1;

  // 1. Determine Playoff Matches (if irregular team count)
  // Teams that play in the playoff are drawn from the lower seed / pot tier
  const playoffMatchMap = new Map<number, { matchId: string; playoffNumber: number }>();
  const playoffMatches: Match[] = [];

  if (structure.playoffMatchesCount > 0) {
    // Allocate playoff matches. For each playoff, 2 teams compete to qualify into a main round slot.
    // The teams receiving byes are the top byeTeamsCount teams.
    const playoffTeams = sortedTeams.slice(structure.byeTeamsCount, structure.byeTeamsCount + structure.playoffTeamsCount);

    for (let i = 0; i < structure.playoffMatchesCount; i++) {
      const matchId = `M-${String(matchCounter).padStart(2, '0')}`;
      const home = playoffTeams[i * 2] || null;
      const away = playoffTeams[i * 2 + 1] || null;

      const playoffMatch: Match = {
        id: matchId,
        tournamentId,
        matchNumber: matchCounter++,
        stage: 'playoff',
        homeTeam: home ? { id: home.id, name: home.name, departmentOrigin: home.departmentOrigin, score: null, penaltyScore: null, logoUrl: home.logoUrl } : emptySlot(`Playoff ${i + 1} Tim A`),
        awayTeam: away ? { id: away.id, name: away.name, departmentOrigin: away.departmentOrigin, score: null, penaltyScore: null, logoUrl: away.logoUrl } : emptySlot(`Playoff ${i + 1} Tim B`),
        winnerTeamId: null,
        loserTeamId: null,
        nextMatchId: null, // Will link to main round
        isNextHome: false, // Will be assigned
        nextLoserMatchId: null,
        scheduledDate: startDate, // Playoff matches are strictly on Day 1
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

  // 2. Build Main Tree from Final downwards to Round of P
  // Number of rounds in main tree = log2(P)
  const mainRoundsCount = Math.log2(P);
  // Rounds: e.g. for P=16 -> R16 (roundIndex 1), QF (2), SF (3), Final (4)
  const roundMatchesByStage: Record<string, Match[]> = {};

  // Final Match
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

  // 3rd Place Match (if enabled)
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

  // Quarterfinals (4 matches) if P >= 8
  if (P >= 8) {
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
  }

  // Round of 16 (8 matches) if P >= 16
  if (P >= 16) {
    const r16Matches: Match[] = [];
    const parentQfs = roundMatchesByStage['quarter_final'] || [];
    for (let i = 0; i < 8; i++) {
      const r16Id = `M-${String(matchCounter).padStart(2, '0')}`;
      const parentQf = parentQfs[Math.floor(i / 2)];
      r16Matches.push({
        id: r16Id,
        tournamentId,
        matchNumber: matchCounter++,
        stage: 'round_of_16',
        homeTeam: emptySlot(`Slot R16 ${i * 2 + 1}`),
        awayTeam: emptySlot(`Slot R16 ${i * 2 + 2}`),
        winnerTeamId: null,
        loserTeamId: null,
        nextMatchId: parentQf ? parentQf.id : null,
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
  }

  // 3. Assign Bye Teams and Link Playoff Winners into the First Main Round
  const firstMainStageKey = P >= 16 ? 'round_of_16' : P >= 8 ? 'quarter_final' : 'semi_final';
  const firstMainMatches = roundMatchesByStage[firstMainStageKey];

  // Distribute Playoff links into bottom slots of firstMainMatches
  let playoffLinkIndex = 0;
  let byeTeamIndex = 0;

  for (let mIdx = 0; mIdx < firstMainMatches.length; mIdx++) {
    const match = firstMainMatches[mIdx];

    // Home Slot
    if (playoffLinkIndex < structure.playoffMatchesCount && mIdx % 2 === 1) {
      const pInfo = playoffMatchMap.get(playoffLinkIndex)!;
      const pMatch = playoffMatches.find(pm => pm.id === pInfo.matchId)!;
      pMatch.nextMatchId = match.id;
      pMatch.isNextHome = true;
      match.homeTeam = emptySlot(`Pemenang Playoff ${pInfo.playoffNumber}`);
      playoffLinkIndex++;
    } else {
      const byeTeam = sortedTeams[byeTeamIndex++];
      if (byeTeam) {
        match.homeTeam = {
          id: byeTeam.id,
          name: byeTeam.name,
          departmentOrigin: byeTeam.departmentOrigin,
          score: null,
          penaltyScore: null,
          logoUrl: byeTeam.logoUrl
        };
      }
    }

    // Away Slot
    if (playoffLinkIndex < structure.playoffMatchesCount) {
      const pInfo = playoffMatchMap.get(playoffLinkIndex)!;
      const pMatch = playoffMatches.find(pm => pm.id === pInfo.matchId)!;
      pMatch.nextMatchId = match.id;
      pMatch.isNextHome = false;
      match.awayTeam = emptySlot(`Pemenang Playoff ${pInfo.playoffNumber}`);
      playoffLinkIndex++;
    } else {
      const byeTeam = sortedTeams[byeTeamIndex++];
      if (byeTeam) {
        match.awayTeam = {
          id: byeTeam.id,
          name: byeTeam.name,
          departmentOrigin: byeTeam.departmentOrigin,
          score: null,
          penaltyScore: null,
          logoUrl: byeTeam.logoUrl
        };
      }
    }
  }

  // 4. Schedule Rest Engine: Enforces "Max 1 match/day per team" constraint
  // Collect all matches in chronological order:
  // Day 1: Playoff matches + Direct Bye matches (that don't depend on playoff winners)
  // Day 2: R16 matches that depend on Playoff winners + remaining QF
  // Day 3: Semifinals & Finals
  const allOrderedMatches: Match[] = [
    ...playoffMatches,
    ...(roundMatchesByStage['round_of_16'] || []),
    ...(roundMatchesByStage['quarter_final'] || []),
    ...(roundMatchesByStage['semi_final'] || []),
    ...(thirdPlaceMatch ? [thirdPlaceMatch] : []),
    ...roundMatchesByStage['final']
  ];

  // Timetable generator with day allocation
  const slotMinutes = matchDurationMinutes + breakMinutes;
  let currentDayOffset = 0;
  let currentTime = dailyStartTime;
  let pitchIndex = 0;

  // Identify matches that contain playoff winners (CANNOT play on Day 1)
  const playoffWinnerMatchIds = new Set(playoffMatches.map(p => p.nextMatchId).filter(Boolean));

  for (const match of allOrderedMatches) {
    let day = currentDayOffset;

    if (match.stage === 'playoff') {
      day = 0; // Strictly Day 1
    } else if (playoffWinnerMatchIds.has(match.id)) {
      // Must not be Day 1 because playoff winners played on Day 1!
      if (day === 0) day = 1;
    } else if (match.stage === 'semi_final') {
      day = Math.max(day, 2);
    } else if (match.stage === 'third_place' || match.stage === 'final') {
      day = Math.max(day, 3);
    }

    // Time calculations
    const matchStart = currentTime;
    const matchEnd = addMinutesToTime(currentTime, matchDurationMinutes);
    const assignedPitch = pitches[pitchIndex % pitches.length] || 'Lapangan 1';

    match.scheduledDate = addDaysToDate(startDate, day);
    match.startTime = matchStart;
    match.endTime = matchEnd;
    match.pitch = assignedPitch;

    // Advance pitch or time slot
    pitchIndex++;
    if (pitchIndex >= pitches.length) {
      pitchIndex = 0;
      currentTime = addMinutesToTime(currentTime, slotMinutes);
      // If time exceeds 17:30 WIB (e.g. evening), advance to next day
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

  if (!target) throw new Error(`Match ${matchId} not found`);
  if (!target.homeTeam.id || !target.awayTeam.id) {
    throw new Error('Both teams must be present before advancing score');
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
    // Penalty shootout tie-breaker
    const penHome = scores.homePenalty ?? 0;
    const penAway = scores.awayPenalty ?? 0;
    if (penHome > penAway) {
      winnerId = target.homeTeam.id;
      loserId = target.awayTeam.id;
    } else if (penAway > penHome) {
      winnerId = target.awayTeam.id;
      loserId = target.homeTeam.id;
    } else {
      throw new Error('Match tied in full time and penalty shootout. Must declare a winner.');
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
