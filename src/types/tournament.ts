/**
 * TypeScript Data Models for Online Tournament Drawing & Management System
 */

export type SportType = 'football' | 'futsal';

export type TournamentFormat = 
  | 'knockout'          // Pure Single Elimination (with non-power-of-two support)
  | 'group_single'      // Setengah Kompetisi (Single Round-Robin)
  | 'group_double'      // Kompetisi Penuh (Double Round-Robin Home & Away)
  | 'group_knockout';   // Multi-stage (Group Stage -> Knockout)

export type TournamentStatus = 'draft' | 'drawing' | 'ongoing' | 'completed';

export type MatchStage = 
  | 'playoff'           // Babak Playoff / Pendahuluan (for irregular teams)
  | 'round_of_32'
  | 'round_of_16'       // Babak 16 Besar
  | 'quarter_final'     // Perempat Final
  | 'semi_final'        // Semifinal
  | 'third_place'       // Perebutan Juara 3
  | 'final'             // Final
  | 'group_stage';      // Babak Grup

export type MatchStatus = 'scheduled' | 'live' | 'completed';

export interface Tournament {
  id: string;
  title: string;
  slug: string;
  sportType: SportType;
  format: TournamentFormat;
  matchDurationMinutes: number;   // e.g. 30
  breakMinutes: number;           // e.g. 10
  startDate: string;              // YYYY-MM-DD
  endDate: string;                // YYYY-MM-DD
  dailyStartTime: string;         // HH:mm, e.g. "07:30"
  maxMatchesPerDayPerTeam: number;// default: 1
  hasThirdPlacePlayoff: boolean;  // default: true
  status: TournamentStatus;
  ownerUid: string;
  pitches: string[];              // e.g. ["Lapangan 1", "Lapangan 2"]
  createdAt: number;              // epoch ms or Firestore Timestamp
  updatedAt?: number;
  metadata?: {
    organizer?: string;
    location?: string;
    description?: string;
  };
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  officialName: string;
  departmentOrigin: string;       // e.g. "Fakultas Kedokteran", "FKIP", "Biro Rektorat"
  potTier: 1 | 2 | 3;            // Pot 1 (Top seed), Pot 2, Pot 3
  seedNumber: number | null;      // 1 to N or null
  logoUrl?: string;
  drawnSlot: number | null;       // Assigned bracket slot (1 to N) or null
  groupName?: string | null;      // Assigned group (e.g. "Grup A") or null
  groupPosition?: number | null;  // Position inside group (1 to 4)
  notes?: string;
}

export interface TeamMatchSlot {
  id: string | null;
  name: string;
  departmentOrigin?: string;
  score: number | null;
  penaltyScore: number | null;
  logoUrl?: string;
  seedNumber?: number | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  matchNumber: number;            // Sequential fixture number (e.g. 1 to 19)
  stage: MatchStage;
  groupName?: string;             // Optional, for group stage
  homeTeam: TeamMatchSlot;
  awayTeam: TeamMatchSlot;
  winnerTeamId: string | null;
  loserTeamId: string | null;
  nextMatchId: string | null;     // Pointer to next match in knockout tree
  isNextHome: boolean;            // Whether winner feeds into nextMatch.homeTeam (true) or awayTeam (false)
  nextLoserMatchId: string | null;// Pointer to 3rd place playoff match for semifinal losers
  isNextLoserHome?: boolean;      // Feeding into 3rd place match home or away
  scheduledDate: string;          // YYYY-MM-DD
  startTime: string;              // HH:mm
  endTime: string;                // HH:mm
  pitch: string;                  // Pitch identifier
  status: MatchStatus;
  roundIndex?: number;            // 0 = Playoff, 1 = R16, 2 = QF, 3 = SF, 4 = Final
  bracketPosition?: number;       // Visual vertical order within stage (0 to N-1)
}

export interface GroupStandingItem {
  teamId: string;
  teamName: string;
  departmentOrigin?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;                     // Goals For
  ga: number;                     // Goals Against
  gd: number;                     // Goal Difference
  points: number;
}

export interface Group {
  id: string;
  tournamentId: string;
  groupName: string;              // e.g. "Grup A", "Grup B"
  teamIds: string[];
  standings: GroupStandingItem[];
}

export interface DrawingSession {
  id: string;
  tournamentId: string;
  status: 'idle' | 'drawing' | 'revealing' | 'completed';
  currentPot: number | null;
  currentSlot: number | null;
  currentTeam: Team | null;
  isRevealed: boolean;
  animationType: 'lottery_ball' | 'card_flip';
  revealedTeamIds: string[];
  lastActionTimestamp: number;
  message?: string;
}
