/**
 * Firestore Data Converters and CRUD Helpers
 * Provides strongly-typed Firestore document mapping
 */

import { 
  FirestoreDataConverter, 
  QueryDocumentSnapshot, 
  SnapshotOptions,
  DocumentData,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Tournament, 
  Team, 
  Match, 
  Group, 
  DrawingSession 
} from '../types/tournament';

// Generic converter creator
function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: T): DocumentData {
      const { id, ...data } = modelObject;
      // Strip undefined values to prevent Firestore rejection
      return JSON.parse(JSON.stringify(data, (_, v) => (v === undefined ? null : v)));
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);
      return {
        id: snapshot.id,
        ...data
      } as T;
    }
  };
}

export const tournamentConverter = createConverter<Tournament>();
export const teamConverter = createConverter<Team>();
export const matchConverter = createConverter<Match>();
export const groupConverter = createConverter<Group>();
export const drawingSessionConverter = createConverter<DrawingSession>();

// Collection reference helpers
export const collections = {
  tournaments: () => collection(db, 'tournaments').withConverter(tournamentConverter),
  tournamentDoc: (tournamentId: string) => doc(db, 'tournaments', tournamentId).withConverter(tournamentConverter),
  
  teams: (tournamentId: string) => collection(db, 'tournaments', tournamentId, 'teams').withConverter(teamConverter),
  teamDoc: (tournamentId: string, teamId: string) => doc(db, 'tournaments', tournamentId, 'teams', teamId).withConverter(teamConverter),
  
  matches: (tournamentId: string) => collection(db, 'tournaments', tournamentId, 'matches').withConverter(matchConverter),
  matchDoc: (tournamentId: string, matchId: string) => doc(db, 'tournaments', tournamentId, 'matches', matchId).withConverter(matchConverter),
  
  groups: (tournamentId: string) => collection(db, 'tournaments', tournamentId, 'groups').withConverter(groupConverter),
  groupDoc: (tournamentId: string, groupId: string) => doc(db, 'tournaments', tournamentId, 'groups', groupId).withConverter(groupConverter),
  
  drawingSessions: (tournamentId: string) => collection(db, 'tournaments', tournamentId, 'drawing_sessions').withConverter(drawingSessionConverter),
  drawingSessionDoc: (tournamentId: string, sessionId: string = 'current') => 
    doc(db, 'tournaments', tournamentId, 'drawing_sessions', sessionId).withConverter(drawingSessionConverter)
};

// Batch operations / synchronization services
export const tournamentService = {
  async saveTournament(tournament: Tournament): Promise<void> {
    const docRef = collections.tournamentDoc(tournament.id);
    await setDoc(docRef, tournament, { merge: true });
  },

  async updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void> {
    const docRef = collections.tournamentDoc(tournamentId);
    await setDoc(docRef, { ...data, id: tournamentId } as Tournament, { merge: true });
  },

  async batchSaveTeams(tournamentId: string, teams: Team[]): Promise<void> {
    for (const team of teams) {
      const docRef = collections.teamDoc(tournamentId, team.id);
      await setDoc(docRef, team, { merge: true });
    }
  },

  async batchSaveMatches(tournamentId: string, matches: Match[]): Promise<void> {
    for (const match of matches) {
      const docRef = collections.matchDoc(tournamentId, match.id);
      await setDoc(docRef, match, { merge: true });
    }
  },

  async batchSaveGroups(tournamentId: string, groups: Group[]): Promise<void> {
    for (const group of groups) {
      const docRef = collections.groupDoc(tournamentId, group.id);
      await setDoc(docRef, group, { merge: true });
    }
  },

  async updateMatchScore(
    tournamentId: string,
    matchId: string,
    update: {
      homeScore: number | null;
      awayScore: number | null;
      homePenalty?: number | null;
      awayPenalty?: number | null;
      status: 'scheduled' | 'live' | 'completed';
    }
  ): Promise<void> {
    const docRef = collections.matchDoc(tournamentId, matchId);
    await updateDoc(docRef, {
      'homeTeam.score': update.homeScore,
      'awayTeam.score': update.awayScore,
      'homeTeam.penaltyScore': update.homePenalty ?? null,
      'awayTeam.penaltyScore': update.awayPenalty ?? null,
      status: update.status
    });
  },

  async deleteTeam(tournamentId: string, teamId: string): Promise<void> {
    const docRef = collections.teamDoc(tournamentId, teamId);
    await deleteDoc(docRef);
  },

  async updateDrawingSession(tournamentId: string, session: Partial<DrawingSession>): Promise<void> {
    const docRef = collections.drawingSessionDoc(tournamentId, 'current');
    await setDoc(docRef, {
      ...session,
      id: 'current',
      tournamentId,
      lastActionTimestamp: Date.now()
    } as DrawingSession, { merge: true });
  }
};
