/**
 * Berger Round-Robin Engine & Standings Calculator
 * Features:
 * - Circle/Berger pairing algorithm for single round (setengah kompetisi) & double round (home & away)
 * - Odd team count handling with automated Byes
 * - Home/Away balance optimization
 * - Real-time standings calculation (Points, GD, GF, H2H)
 * - Multi-stage qualifier progression to knockout brackets
 */

import { Group, GroupStandingItem, Match, Team, TeamMatchSlot } from '../../types/tournament';

export interface BergerMatchPair {
  round: number;
  homeTeam: Team | null; // null represents a BYE
  awayTeam: Team | null;
}

/**
 * Generates round-robin fixtures using the Berger / Circle algorithm
 */
export function generateBergerFixtures(
  teams: Team[],
  isDoubleRound: boolean = false
): BergerMatchPair[] {
  if (teams.length < 2) return [];

  // Create working copy of teams
  const teamList: (Team | null)[] = [...teams];

  // If odd number of teams, add dummy Bye team (null)
  if (teamList.length % 2 !== 0) {
    teamList.push(null);
  }

  const N = teamList.length;
  const totalRounds = N - 1;
  const matchesPerRound = N / 2;
  const singleRoundFixtures: BergerMatchPair[] = [];

  // Circle rotation
  const rotatingTeams = [...teamList];

  for (let r = 0; r < totalRounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      let home = rotatingTeams[m];
      let away = rotatingTeams[N - 1 - m];

      // Home/Away alternation for the fixed team (index 0) to avoid consecutive home/away games
      if (m === 0) {
        if (r % 2 !== 0) {
          const temp = home;
          home = away;
          away = temp;
        }
      } else {
        // Alternate other slots based on round index
        if ((m + r) % 2 !== 0) {
          const temp = home;
          home = away;
          away = temp;
        }
      }

      // If neither team is the BYE dummy, register match
      if (home !== null && away !== null) {
        singleRoundFixtures.push({
          round: r + 1,
          homeTeam: home,
          awayTeam: away
        });
      }
    }

    // Rotate array clockwise, keeping index 0 fixed
    const fixed = rotatingTeams[0];
    const last = rotatingTeams[N - 1];
    const middle = rotatingTeams.slice(1, N - 1);
    rotatingTeams.splice(0, N, fixed, last, ...middle);
  }

  if (!isDoubleRound) {
    return singleRoundFixtures;
  }

  // Generate second leg (invert home & away)
  const doubleRoundFixtures = [...singleRoundFixtures];
  singleRoundFixtures.forEach(fix => {
    doubleRoundFixtures.push({
      round: fix.round + totalRounds,
      homeTeam: fix.awayTeam,
      awayTeam: fix.homeTeam
    });
  });

  return doubleRoundFixtures;
}

/**
 * Converts Berger fixtures into Match documents with schedule matrix
 */
export function generateGroupMatches(
  tournamentId: string,
  groupName: string,
  teams: Team[],
  config: {
    startDate: string;
    dailyStartTime: string;
    matchDurationMinutes: number;
    breakMinutes: number;
    pitches: string[];
    isDoubleRound?: boolean;
    startMatchNumber?: number;
  }
): { matches: Match[]; nextMatchNumber: number } {
  const {
    startDate,
    dailyStartTime,
    matchDurationMinutes,
    breakMinutes,
    pitches,
    isDoubleRound = false,
    startMatchNumber = 1
  } = config;

  const fixtures = generateBergerFixtures(teams, isDoubleRound);
  const matches: Match[] = [];
  let matchCounter = startMatchNumber;

  const slotMinutes = matchDurationMinutes + breakMinutes;
  let currentRound = 1;
  let dayOffset = 0;
  let [currentH, currentM] = dailyStartTime.split(':').map(Number);
  let pitchIdx = 0;

  for (const fix of fixtures) {
    if (fix.round !== currentRound) {
      currentRound = fix.round;
      // Advance to next time slot or day for new round
      dayOffset++;
      [currentH, currentM] = dailyStartTime.split(':').map(Number);
    }

    const startStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
    const endMinutesTotal = currentH * 60 + currentM + matchDurationMinutes;
    const endH = Math.floor(endMinutesTotal / 60) % 24;
    const endM = endMinutesTotal % 60;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const matchDate = new Date(startDate);
    matchDate.setDate(matchDate.getDate() + dayOffset);
    const dateStr = matchDate.toISOString().split('T')[0];

    const matchId = `MG-${groupName.replace(/\s+/g, '')}-${String(matchCounter).padStart(2, '0')}`;

    matches.push({
      id: matchId,
      tournamentId,
      matchNumber: matchCounter++,
      stage: 'group_stage',
      groupName,
      homeTeam: {
        id: fix.homeTeam!.id,
        name: fix.homeTeam!.name,
        departmentOrigin: fix.homeTeam!.departmentOrigin,
        score: null,
        penaltyScore: null,
        logoUrl: fix.homeTeam!.logoUrl
      },
      awayTeam: {
        id: fix.awayTeam!.id,
        name: fix.awayTeam!.name,
        departmentOrigin: fix.awayTeam!.departmentOrigin,
        score: null,
        penaltyScore: null,
        logoUrl: fix.awayTeam!.logoUrl
      },
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
      isNextHome: false,
      nextLoserMatchId: null,
      scheduledDate: dateStr,
      startTime: startStr,
      endTime: endStr,
      pitch: pitches[pitchIdx % pitches.length] || 'Lapangan 1',
      status: 'scheduled'
    });

    pitchIdx++;
    if (pitchIdx >= pitches.length) {
      pitchIdx = 0;
      const nextTotalMin = currentH * 60 + currentM + slotMinutes;
      currentH = Math.floor(nextTotalMin / 60) % 24;
      currentM = nextTotalMin % 60;
    }
  }

  return { matches, nextMatchNumber: matchCounter };
}

/**
 * Computes live group standings table from match results
 */
export function calculateGroupStandings(
  teams: Team[],
  matches: Match[]
): GroupStandingItem[] {
  // Initialize table
  const tableMap = new Map<string, GroupStandingItem>();
  const h2hMap = new Map<string, Map<string, { pts: number; gd: number; gf: number }>>();

  for (const team of teams) {
    tableMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      departmentOrigin: team.departmentOrigin,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    });
    h2hMap.set(team.id, new Map());
  }

  // Iterate over completed matches
  for (const m of matches) {
    if (m.status !== 'completed' || m.homeTeam.score === null || m.awayTeam.score === null) {
      continue;
    }

    const homeId = m.homeTeam.id;
    const awayId = m.awayTeam.id;
    if (!homeId || !awayId || !tableMap.has(homeId) || !tableMap.has(awayId)) continue;

    const homeStats = tableMap.get(homeId)!;
    const awayStats = tableMap.get(awayId)!;

    const hs = m.homeTeam.score;
    const as = m.awayTeam.score;

    homeStats.played += 1;
    awayStats.played += 1;
    homeStats.gf += hs;
    homeStats.ga += as;
    awayStats.gf += as;
    awayStats.ga += hs;

    if (hs > as) {
      homeStats.won += 1;
      homeStats.points += 3;
      awayStats.lost += 1;
      // H2H tracking
      updateH2H(h2hMap, homeId, awayId, 3, hs - as, hs);
      updateH2H(h2hMap, awayId, homeId, 0, as - hs, as);
    } else if (as > hs) {
      awayStats.won += 1;
      awayStats.points += 3;
      homeStats.lost += 1;
      updateH2H(h2hMap, awayId, homeId, 3, as - hs, as);
      updateH2H(h2hMap, homeId, awayId, 0, hs - as, hs);
    } else {
      homeStats.drawn += 1;
      homeStats.points += 1;
      awayStats.drawn += 1;
      awayStats.points += 1;
      updateH2H(h2hMap, homeId, awayId, 1, 0, hs);
      updateH2H(h2hMap, awayId, homeId, 1, 0, as);
    }

    homeStats.gd = homeStats.gf - homeStats.ga;
    awayStats.gd = awayStats.gf - awayStats.ga;
  }

  const standings = Array.from(tableMap.values());

  // Multi-tier sort: Points DESC -> H2H Points DESC -> Goal Difference DESC -> Goals For DESC
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    // Head-to-Head between tied teams
    const h2hAtoB = h2hMap.get(a.teamId)?.get(b.teamId);
    if (h2hAtoB) {
      const h2hBtoA = h2hMap.get(b.teamId)?.get(a.teamId);
      const ptsA = h2hAtoB.pts;
      const ptsB = h2hBtoA?.pts ?? 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      if (h2hAtoB.gd !== (h2hBtoA?.gd ?? 0)) return (h2hBtoA?.gd ?? 0) - h2hAtoB.gd;
    }

    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamName.localeCompare(b.teamName);
  });

  return standings;
}

function updateH2H(
  map: Map<string, Map<string, { pts: number; gd: number; gf: number }>>,
  t1: string,
  t2: string,
  pts: number,
  gd: number,
  gf: number
) {
  const current = map.get(t1)?.get(t2) || { pts: 0, gd: 0, gf: 0 };
  current.pts += pts;
  current.gd += gd;
  current.gf += gf;
  map.get(t1)?.set(t2, current);
}
