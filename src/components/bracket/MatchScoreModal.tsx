'use client';

import React, { useState } from 'react';
import { Match } from '../../types/tournament';
import { X, Trophy, Clock, MapPin, Calendar, Check, AlertCircle } from 'lucide-react';

interface MatchScoreModalProps {
  match: Match | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaveScore: (matchId: string, scores: {
    homeScore: number;
    awayScore: number;
    homePenalty?: number | null;
    awayPenalty?: number | null;
  }) => Promise<void>;
}

export const MatchScoreModal: React.FC<MatchScoreModalProps> = ({
  match,
  isAdmin,
  onClose,
  onSaveScore
}) => {
  if (!match) return null;

  const [homeScore, setHomeScore] = useState<string>(
    match.homeTeam.score !== null ? String(match.homeTeam.score) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.awayTeam.score !== null ? String(match.awayTeam.score) : ''
  );
  const [isPenalty, setIsPenalty] = useState<boolean>(
    match.homeTeam.penaltyScore !== null || match.awayTeam.penaltyScore !== null
  );
  const [homePenalty, setHomePenalty] = useState<string>(
    match.homeTeam.penaltyScore !== null ? String(match.homeTeam.penaltyScore) : ''
  );
  const [awayPenalty, setAwayPenalty] = useState<string>(
    match.awayTeam.penaltyScore !== null ? String(match.awayTeam.penaltyScore) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isAdmin && match.homeTeam.id && match.awayTeam.id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);

    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      setError('Masukkan skor angka yang valid.');
      return;
    }

    let hp: number | null = null;
    let ap: number | null = null;

    if (hs === as) {
      // Tie requires penalty shootout in knockout
      hp = parseInt(homePenalty, 10);
      ap = parseInt(awayPenalty, 10);
      if (isNaN(hp) || isNaN(ap) || hp === ap) {
        setError('Pertandingan seri harus memiliki pemenang melalui adu penalti (skor penalti tidak boleh sama).');
        setIsPenalty(true);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      await onSaveScore(match.id, {
        homeScore: hs,
        awayScore: as,
        homePenalty: hp,
        awayPenalty: ap
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan skor pertandingan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Match #{match.matchNumber} • {match.stage.replace(/_/g, ' ').toUpperCase()}
            </span>
            <h3 className="text-lg font-black text-slate-100 mt-0.5">
              Detail & Skor Pertandingan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule & Venue Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl my-4 border border-slate-800">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{match.scheduledDate || 'Tanggal TBD'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{match.startTime} - {match.endTime} WIB</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{match.pitch}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Teams and Score Matrix */}
          <div className="grid grid-cols-5 items-center gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {/* Home Team */}
            <div className="col-span-2 text-center">
              <h4 className="font-bold text-sm text-slate-200 truncate" title={match.homeTeam.name}>
                {match.homeTeam.name}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {match.homeTeam.departmentOrigin || 'Home'}
              </p>
              {canEdit ? (
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={e => setHomeScore(e.target.value)}
                  className="mt-3 w-16 h-12 text-center text-2xl font-black bg-slate-800 border-2 border-indigo-500/50 focus:border-indigo-400 rounded-xl mx-auto block text-white outline-none"
                  required
                />
              ) : (
                <div className="mt-3 text-3xl font-black text-amber-400">
                  {match.homeTeam.score !== null ? match.homeTeam.score : '-'}
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="col-span-1 text-center font-black text-slate-500 text-xs uppercase tracking-widest">
              VS
            </div>

            {/* Away Team */}
            <div className="col-span-2 text-center">
              <h4 className="font-bold text-sm text-slate-200 truncate" title={match.awayTeam.name}>
                {match.awayTeam.name}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {match.awayTeam.departmentOrigin || 'Away'}
              </p>
              {canEdit ? (
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={e => setAwayScore(e.target.value)}
                  className="mt-3 w-16 h-12 text-center text-2xl font-black bg-slate-800 border-2 border-indigo-500/50 focus:border-indigo-400 rounded-xl mx-auto block text-white outline-none"
                  required
                />
              ) : (
                <div className="mt-3 text-3xl font-black text-amber-400">
                  {match.awayTeam.score !== null ? match.awayTeam.score : '-'}
                </div>
              )}
            </div>
          </div>

          {/* Penalty Shootout Section (when tied) */}
          {(isPenalty || homeScore === awayScore && homeScore !== '') && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-center font-bold text-xs text-amber-400 mb-2 uppercase">
                Adu Penalti (Shootout)
              </div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Penalti Home</span>
                  {canEdit ? (
                    <input
                      type="number"
                      min="0"
                      value={homePenalty}
                      onChange={e => setHomePenalty(e.target.value)}
                      className="w-14 h-10 text-center text-lg font-bold bg-slate-800 border border-amber-500/50 rounded-lg text-amber-300 outline-none"
                    />
                  ) : (
                    <span className="font-bold text-amber-300">{match.homeTeam.penaltyScore ?? '-'}</span>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Penalti Away</span>
                  {canEdit ? (
                    <input
                      type="number"
                      min="0"
                      value={awayPenalty}
                      onChange={e => setAwayPenalty(e.target.value)}
                      className="w-14 h-10 text-center text-lg font-bold bg-slate-800 border border-amber-500/50 rounded-lg text-amber-300 outline-none"
                    />
                  ) : (
                    <span className="font-bold text-amber-300">{match.awayTeam.penaltyScore ?? '-'}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Winner Indicator */}
          {match.winnerTeamId && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center space-x-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>
                Pemenang: <strong>{match.winnerTeamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name}</strong> (Lolos ke babak berikutnya)
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Tutup
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Skor & Majukan Pemenang'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
