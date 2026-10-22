import { calculateAge } from "./age";

export interface BranchDefinition {
  id: string;
  name: string;
  maxAgeYears?: number;
  maxAgeMonths?: number;
  maxAgeDays?: number;
  minAgeYears?: number;
  description: string;
}

export const branches: BranchDefinition[] = [
  {
    id: "tartil",
    name: "Tartil",
    maxAgeYears: 11,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba tartil untuk anak-anak",
  },
  {
    id: "tilawah-anak",
    name: "Tilawah Anak-Anak",
    maxAgeYears: 13,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba tilawah untuk anak-anak",
  },
  {
    id: "tilawah-remaja",
    name: "Tilawah Remaja",
    maxAgeYears: 23,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba tilawah untuk remaja",
  },
  {
    id: "tilawah-dewasa",
    name: "Tilawah Dewasa",
    maxAgeYears: 39,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba tilawah untuk dewasa",
  },
  {
    id: "usia-emas",
    name: "Usia Emas",
    minAgeYears: 50,
    description: "Lomba untuk peserta berusia 50 tahun ke atas",
  },
  {
    id: "qiraat-murattal-remaja",
    name: "Qira'at Murattal Remaja",
    maxAgeYears: 23,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba qira'at murattal untuk remaja",
  },
  {
    id: "qiraat-murattal-dewasa",
    name: "Qira'at Murattal Dewasa",
    maxAgeYears: 39,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba qira'at murattal untuk dewasa",
  },
  {
    id: "qiraat-mujawwad-dewasa",
    name: "Qira'at Mujawwad Dewasa",
    maxAgeYears: 39,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba qira'at mujawwad untuk dewasa",
  },
  {
    id: "hafalan-1-juz",
    name: "Hafalan Al-Qur'an 1 Juz Ma'attilawah",
    maxAgeYears: 14,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba hafalan 1 juz",
  },
  {
    id: "hafalan-5-juz",
    name: "Hafalan Al-Qur'an 5 Juz Ma'attilawah",
    maxAgeYears: 19,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba hafalan 5 juz",
  },
  {
    id: "hafalan-10-juz",
    name: "Hafalan 10 Juz",
    maxAgeYears: 21,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba hafalan 10 juz",
  },
  {
    id: "hafalan-20-juz",
    name: "Hafalan 20 Juz",
    maxAgeYears: 21,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba hafalan 20 juz",
  },
  {
    id: "hafalan-30-juz",
    name: "Hafalan 30 Juz",
    maxAgeYears: 21,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba hafalan 30 juz",
  },
  {
    id: "fahmil-quran",
    name: "Fahmil Qur'an",
    maxAgeYears: 17,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba fahmil Qur'an",
  },
  {
    id: "syarhil-quran",
    name: "Syarhil Qur'an",
    maxAgeYears: 17,
    maxAgeMonths: 11,
    maxAgeDays: 29,
    description: "Lomba syarhil Qur'an",
  },
];

interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

function ageLTE(age: { years: number; months: number; days: number }, limit: { years: number; months: number; days: number }): boolean {
  if (age.years < limit.years) return true;
  if (age.years > limit.years) return false;
  if (age.months < limit.months) return true;
  if (age.months > limit.months) return false;
  return age.days <= limit.days;
}

export function isEligible(branchId: string, birthDate: string, referenceDate: string, definitions: BranchDefinition[] = branches): EligibilityResult {
  const branch = definitions.find(b => b.id === branchId);
  if (!branch) {
    return { eligible: false, reason: `Cabang "${branchId}" tidak ditemukan` };
  }

  const age = calculateAge(birthDate, referenceDate);

  if (branch.minAgeYears !== undefined) {
    if (age.years < branch.minAgeYears) {
      return { eligible: false, reason: `Usia minimal untuk ${branch.name} adalah ${branch.minAgeYears} tahun` };
    }
  }

  if (branch.maxAgeYears !== undefined) {
    const maxAge = {
      years: branch.maxAgeYears,
      months: branch.maxAgeMonths ?? 0,
      days: branch.maxAgeDays ?? 0,
    };
    if (!ageLTE(age, maxAge)) {
      return { eligible: false, reason: `Usia maksimal untuk ${branch.name} adalah ${maxAge.years} tahun ${maxAge.months} bulan ${maxAge.days} hari` };
    }
  }

  return { eligible: true };
}

export function getBranchById(id: string): BranchDefinition | undefined {
  return branches.find((branch) => branch.id === id);
}

export function getAllBranches(): BranchDefinition[] {
  return branches;
}
