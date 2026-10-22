/**
 * Helper modul penyensoran data pribadi (Data Masking & PII Protection)
 * Sesuai prinsip minimalisasi data dan Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022).
 */

/**
 * Sensor Nomor Induk Kependudukan (NIK 16 digit).
 * Contoh: "6171012304950001" -> "617101******0001"
 * Menjaga 6 digit pertama (kode wilayah) dan 4 digit terakhir (nomor unik).
 */
export function maskNik(nik?: string | null): string {
  if (!nik) return "";
  const clean = nik.trim();
  if (clean.length < 10) return "******";
  const start = clean.slice(0, 6);
  const end = clean.slice(-4);
  const maskCount = Math.max(clean.length - 10, 4);
  return `${start}${"*".repeat(maskCount)}${end}`;
}

/**
 * Sensor Nomor WhatsApp / Telepon.
 * Contoh: "081234567890" -> "0812****7890"
 * Contoh: "6281234567890" -> "6281****7890"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.trim();
  if (clean.length < 8) return "*******";
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  const maskCount = Math.max(clean.length - 8, 4);
  return `${start}${"*".repeat(maskCount)}${end}`;
}

/**
 * Sensor Nomor Rekening Bank.
 * Contoh: "1234567890" -> "******7890"
 */
export function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return "";
  const clean = accountNumber.trim();
  if (clean.length <= 4) return "****";
  const end = clean.slice(-4);
  const maskCount = clean.length - 4;
  return `${"*".repeat(maskCount)}${end}`;
}

/**
 * Sensor Alamat Tinggal / Domisili.
 * Contoh: "Jl. Gajah Mada No. 12" -> "Jl. Ga... (Disensor sesuai UU PDP)"
 */
export function maskAddress(address?: string | null): string {
  if (!address) return "";
  const clean = address.trim();
  if (clean.length <= 6) return "*** (Disensor)";
  return `${clean.slice(0, 6)}... (Disensor)`;
}

/**
 * Sensor Tempat Lahir.
 */
export function maskBirthPlace(place?: string | null): string {
  if (!place) return "";
  return "*** (Disensor)";
}

/**
 * Sensor Tanggal Lahir (hanya tampilkan tahun atau disensor penuh).
 * Contoh: "2014-03-15" -> "****-**-**"
 */
export function maskBirthDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  return "****-**-**";
}
