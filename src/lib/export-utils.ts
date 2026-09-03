/**
 * Tournament Export Utility
 * Generates CSV / Excel-compatible formats and triggers print-ready PDF views
 */

import { Match, Team, Tournament } from '../types/tournament';

export function exportFixturesToCSV(tournament: Tournament, matches: Match[]): void {
  const headers = [
    'No Pertandingan',
    'Babak (Stage)',
    'Grup',
    'Tim Home',
    'Skor Home',
    'Penalti Home',
    'Skor Away',
    'Penalti Away',
    'Tim Away',
    'Pemenang',
    'Tanggal',
    'Waktu Mulai',
    'Waktu Selesai',
    'Lapangan',
    'Status'
  ];

  const rows = matches.map(m => [
    m.matchNumber,
    m.stage,
    m.groupName || '-',
    `"${m.homeTeam.name.replace(/"/g, '""')}"`,
    m.homeTeam.score !== null ? m.homeTeam.score : '',
    m.homeTeam.penaltyScore !== null ? m.homeTeam.penaltyScore : '',
    m.awayTeam.score !== null ? m.awayTeam.score : '',
    m.awayTeam.penaltyScore !== null ? m.awayTeam.penaltyScore : '',
    `"${m.awayTeam.name.replace(/"/g, '""')}"`,
    m.winnerTeamId ? (m.winnerTeamId === m.homeTeam.id ? m.homeTeam.name : m.awayTeam.name) : '-',
    m.scheduledDate,
    m.startTime,
    m.endTime,
    `"${m.pitch}"`,
    m.status
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Jadwal_${tournament.slug || 'Turnamen'}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportTeamsToCSV(tournament: Tournament, teams: Team[]): void {
  const headers = ['Nama Tim', 'Official', 'Departemen/Fakultas', 'Pot Tier', 'Seeding', 'Slot Terundi'];
  const rows = teams.map(t => [
    `"${t.name.replace(/"/g, '""')}"`,
    `"${t.officialName.replace(/"/g, '""')}"`,
    `"${t.departmentOrigin.replace(/"/g, '""')}"`,
    t.potTier,
    t.seedNumber !== null ? t.seedNumber : '-',
    t.drawnSlot !== null ? t.drawnSlot : '-'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Daftar_Tim_${tournament.slug || 'Turnamen'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function triggerPrintReport(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
