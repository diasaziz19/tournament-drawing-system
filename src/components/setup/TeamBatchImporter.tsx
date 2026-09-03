'use client';

import React, { useState } from 'react';
import { Team } from '../../types/tournament';
import { Users, Upload, FileText, Check, AlertCircle, Sparkles } from 'lucide-react';

interface TeamBatchImporterProps {
  tournamentId: string;
  existingTeams: Team[];
  onImportTeams: (teams: Team[]) => Promise<void>;
}

// Sample preset for quick testing (e.g. 18 teams for Dies Natalis UMS)
const SAMPLE_PRESET_18 = `Kedokteran FC, dr. Budi, Fakultas Kedokteran, 1
FKIP Juara, Prof. Sutrisno, FKIP, 1
Teknik Mesin, Ir. Joko, Fakultas Teknik, 1
Farmasi Hebat, apt. Dian, Fakultas Farmasi, 1
FEB United, Dr. Rahman, Fakultas Ekonomi Bisnis, 2
Psikologi FC, M. Ridwan M.Psi, Fakultas Psikologi, 2
Hukum Perkasa, Dr. Hartono S.H, Fakultas Hukum, 2
FIK All-Star, Nurul M.Kes, Fak. Ilmu Kesehatan, 2
FAI Soccer, Drs. Abdullah, Fak. Agama Islam, 2
Geografi FC, Tri Wahyuni M.Sc, Fakultas Geografi, 2
FKI Cyber, Gunawan M.Kom, Fak. Komunikasi & Informatika, 3
Pascasarjana FC, Dr. Anwar, Sekolah Pascasarjana, 3
Biro Rektorat, Bambang S.Sos, Biro Rektorat, 3
Biro Keuangan, Supardi S.E, Biro Administrasi Umum, 3
Perpustakaan FC, Sri Lestari S.I.Pust, Perpustakaan, 3
Pesma KH Mas Mansur, Ust. Farhan, Pesma, 3
Security UMS FC, Danang, Satpam Kampus, 3
Cleaning Service FC, Slamet, Sarana Prasarana, 3`;

export const TeamBatchImporter: React.FC<TeamBatchImporterProps> = ({
  tournamentId,
  existingTeams,
  onImportTeams
}) => {
  const [inputText, setInputText] = useState(SAMPLE_PRESET_18);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const parseLines = (text: string): Team[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('Minimal harus ada 2 tim untuk membuat turnamen.');
    }

    const parsed: Team[] = [];

    lines.forEach((line, index) => {
      // Split by comma or tab or semicolon
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      const name = parts[0] || `Tim ${index + 1}`;
      const officialName = parts[1] || `Official ${name}`;
      const departmentOrigin = parts[2] || 'Umum';
      const potRaw = parseInt(parts[3], 10);
      const potTier: 1 | 2 | 3 = (potRaw === 1 || potRaw === 2 || potRaw === 3) ? potRaw : 2;

      parsed.push({
        id: `team-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        tournamentId,
        name,
        officialName,
        departmentOrigin,
        potTier,
        seedNumber: potTier === 1 ? index + 1 : null,
        drawnSlot: null
      });
    });

    return parsed;
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setParsingError(null);
      const teams = parseLines(inputText);
      await onImportTeams(teams);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (err: any) {
      setParsingError(err.message || 'Gagal memproses data tim.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              Registrasi & Impor Tim Turnamen
            </h3>
            <p className="text-xs text-slate-400">
              Impor data peserta secara massal (CSV atau teks multi-line) beserta pembagian Pot Tier
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Upload CSV</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {parsingError && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{parsingError}</span>
        </div>
      )}

      {importSuccess && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>Data tim berhasil diimpor dan disimpan ke database!</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Format: <code>Nama Tim, Nama Official, Fakultas/Instansi Asal, Pot Tier (1/2/3)</code></span>
            <button
              type="button"
              onClick={() => setInputText(SAMPLE_PRESET_18)}
              className="text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gunakan Sampel 18 Tim UMS</span>
            </button>
          </div>
          <textarea
            rows={10}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
            placeholder="Kedokteran FC, dr. Budi, Fakultas Kedokteran, 1"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400">
            Terdeteksi: <strong className="text-indigo-400">{inputText.split('\n').filter(l => l.trim()).length}</strong> tim di kotak teks
            {existingTeams.length > 0 && ` (Tersimpan saat ini: ${existingTeams.length} tim)`}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{loading ? 'Memproses Impor...' : 'Impor & Simpan Tim'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
