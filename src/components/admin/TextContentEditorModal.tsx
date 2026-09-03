'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, 
  X, 
  Save, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Megaphone,
  LayoutTemplate,
  Trophy
} from 'lucide-react';
import { Tournament } from '../../types/tournament';
import { tournamentService } from '../../lib/firestore-converters';

interface TextContentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onTournamentUpdated: (updated: Tournament) => void;
}

export const TextContentEditorModal: React.FC<TextContentEditorModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onTournamentUpdated
}) => {
  const [title, setTitle] = useState(tournament?.title || 'Turnamen Minisoccer Dies Natalis UMS 2026');
  const [subtitle, setSubtitle] = useState(tournament?.subtitle || '');
  const [headerBadge, setHeaderBadge] = useState(tournament?.headerBadge || 'Tournament Studio');
  const [announcementText, setAnnouncementText] = useState(tournament?.announcementText || '');
  const [poolAtasLabel, setPoolAtasLabel] = useState(
    tournament?.poolAtasLabel || 'POOL ATAS (UNDIAN 1 S/D 10 ➔ MENUJU FINALIS 1)'
  );
  const [poolBawahLabel, setPoolBawahLabel] = useState(
    tournament?.poolBawahLabel || 'POOL BAWAH (UNDIAN 11 S/D 19 ➔ MENUJU FINALIS 2)'
  );
  const [finalBannerDate, setFinalBannerDate] = useState(
    tournament?.finalBannerDate || 'Partai Puncak (2 Oktober)'
  );
  const [finalBannerTitle, setFinalBannerTitle] = useState(
    tournament?.finalBannerTitle || 'M#19 • Grand Final Turnamen'
  );
  const [finalBannerSubtitle, setFinalBannerSubtitle] = useState(
    tournament?.finalBannerSubtitle || 'Finalis 1 (Menang M16) vs Finalis 2 (Menang M17)'
  );
  const [footerText, setFooterText] = useState(
    tournament?.footerText || 'Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js'
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tournament) {
      setTitle(tournament.title || 'Turnamen Minisoccer Dies Natalis UMS 2026');
      setSubtitle(tournament.subtitle || '');
      setHeaderBadge(tournament.headerBadge || 'Tournament Studio');
      setAnnouncementText(tournament.announcementText || '');
      setPoolAtasLabel(tournament.poolAtasLabel || 'POOL ATAS (UNDIAN 1 S/D 10 ➔ MENUJU FINALIS 1)');
      setPoolBawahLabel(tournament.poolBawahLabel || 'POOL BAWAH (UNDIAN 11 S/D 19 ➔ MENUJU FINALIS 2)');
      setFinalBannerDate(tournament.finalBannerDate || 'Partai Puncak (2 Oktober)');
      setFinalBannerTitle(tournament.finalBannerTitle || 'M#19 • Grand Final Turnamen');
      setFinalBannerSubtitle(tournament.finalBannerSubtitle || 'Finalis 1 (Menang M16) vs Finalis 2 (Menang M17)');
      setFooterText(tournament.footerText || 'Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js');
    }
  }, [tournament, isOpen]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setTitle('Turnamen Minisoccer Dies Natalis UMS 2026');
    setSubtitle('Turnamen Resmi Dies Natalis Ke-68 Universitas Muhammadiyah Surakarta');
    setHeaderBadge('Tournament Studio');
    setAnnouncementText('');
    setPoolAtasLabel('POOL ATAS (UNDIAN 1 S/D 10 ➔ MENUJU FINALIS 1)');
    setPoolBawahLabel('POOL BAWAH (UNDIAN 11 S/D 19 ➔ MENUJU FINALIS 2)');
    setFinalBannerDate('Partai Puncak (2 Oktober)');
    setFinalBannerTitle('M#19 • Grand Final Turnamen');
    setFinalBannerSubtitle('Finalis 1 (Menang M16) vs Finalis 2 (Menang M17)');
    setFooterText('Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated: Tournament = {
        ...tournament,
        title: title.trim() || 'Turnamen Minisoccer Dies Natalis UMS 2026',
        subtitle: subtitle.trim() || '',
        headerBadge: headerBadge.trim() || 'Tournament Studio',
        announcementText: announcementText.trim() || '',
        poolAtasLabel: poolAtasLabel.trim() || 'POOL ATAS (UNDIAN 1 S/D 10 ➔ MENUJU FINALIS 1)',
        poolBawahLabel: poolBawahLabel.trim() || 'POOL BAWAH (UNDIAN 11 S/D 19 ➔ MENUJU FINALIS 2)',
        finalBannerDate: finalBannerDate.trim() || 'Partai Puncak (2 Oktober)',
        finalBannerTitle: finalBannerTitle.trim() || 'M#19 • Grand Final Turnamen',
        finalBannerSubtitle: finalBannerSubtitle.trim() || 'Finalis 1 (Menang M16) vs Finalis 2 (Menang M17)',
        footerText: footerText.trim() || 'Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js',
        updatedAt: Date.now()
      };

      // Instantly update parent state
      onTournamentUpdated(updated);

      // Persist to Firestore
      try {
        await tournamentService.saveTournament(updated);
      } catch (saveErr) {
        console.warn('saveTournament fallback to updateTournament:', saveErr);
        await tournamentService.updateTournament(tournament.id, updated);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Failed to save tournament text contents:', err);
      alert('Gagal menyimpan perubahan teks: ' + (err?.message || 'Pastikan koneksi internet stabil'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Edit Konten Teks, Header & Banner
                </h3>
                <p className="text-xs text-slate-400">
                  Ubah judul turnamen, banner pengumuman, dan teks bagan secara realtime
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Section 1: Header & Branding */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                <LayoutTemplate className="w-4 h-4" />
                <span>1. Header Utama & Branding Turnamen</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Judul Utama Turnamen
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Contoh: Turnamen Minisoccer Dies Natalis UMS 2026"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Badge Header
                  </label>
                  <input
                    type="text"
                    value={headerBadge}
                    onChange={e => setHeaderBadge(e.target.value)}
                    placeholder="Contoh: Tournament Studio"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subjudul / Keterangan Edisi (Opsional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  placeholder="Contoh: Turnamen Resmi Antar Unit & Fakultas Dies Natalis Ke-68 UMS"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Section 2: Banner Pengumuman Panitia */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-black text-cyan-400 uppercase tracking-wider">
                <Megaphone className="w-4 h-4" />
                <span>2. Banner Pengumuman Panitia (Running Text / Info Bar)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teks Pengumuman Berjalan (Akan tampil di bawah navigasi)
                </label>
                <textarea
                  rows={2}
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  placeholder="Contoh: 📢 Info Panitia: Pertandingan dimulai pukul 07:30 WIB. Harap setiap tim hadir 30 menit sebelum kick-off!"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-cyan-400 outline-none resize-none"
                />
                <span className="text-[10px] text-slate-500">
                  Kosongkan jika tidak ingin menampilkan banner pengumuman.
                </span>
              </div>
            </div>

            {/* Section 3: Label Pool Bagan */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-black text-indigo-400 uppercase tracking-wider">
                <LayoutTemplate className="w-4 h-4" />
                <span>3. Label Header Pool Bagan Pertandingan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Label Header Pool Atas
                  </label>
                  <input
                    type="text"
                    value={poolAtasLabel}
                    onChange={e => setPoolAtasLabel(e.target.value)}
                    placeholder="Contoh: POOL ATAS (UNDIAN 1 S/D 10 ➔ MENUJU FINALIS 1)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-indigo-400 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Label Header Pool Bawah
                  </label>
                  <input
                    type="text"
                    value={poolBawahLabel}
                    onChange={e => setPoolBawahLabel(e.target.value)}
                    placeholder="Contoh: POOL BAWAH (UNDIAN 11 S/D 19 ➔ MENUJU FINALIS 2)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-indigo-400 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Podium Grand Final Banner */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                <Trophy className="w-4 h-4" />
                <span>4. Banner Podium Grand Final (Pusat Bagan)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tag Edisi / Tanggal
                  </label>
                  <input
                    type="text"
                    value={finalBannerDate}
                    onChange={e => setFinalBannerDate(e.target.value)}
                    placeholder="Contoh: Partai Puncak (2 Oktober)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Judul Banner Grand Final
                  </label>
                  <input
                    type="text"
                    value={finalBannerTitle}
                    onChange={e => setFinalBannerTitle(e.target.value)}
                    placeholder="Contoh: M#19 • Grand Final Turnamen"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Keterangan Tim Finalis
                </label>
                <input
                  type="text"
                  value={finalBannerSubtitle}
                  onChange={e => setFinalBannerSubtitle(e.target.value)}
                  placeholder="Contoh: Finalis 1 (Menang M16) vs Finalis 2 (Menang M17)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Section 5: Footer Text */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Teks Footer Website
              </label>
              <input
                type="text"
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="Contoh: Online Tournament Drawing & Management Cloud System • Google Firebase Firestore & Next.js"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-slate-500 outline-none"
              />
            </div>

            {/* Buttons Bar */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Default</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Tutup
                </button>

                <button
                  type="submit"
                  disabled={saving || success}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {success ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
