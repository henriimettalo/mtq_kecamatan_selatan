interface NIKResult {
  valid: boolean;
  error?: string;
}

interface WhatsAppResult {
  valid: boolean;
  error?: string;
}

interface FileUploadResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateNIK(nik: string): NIKResult {
  if (nik.length === 0) {
    return { valid: false, error: "NIK tidak boleh kosong" };
  }
  if (nik.length !== 16) {
    return { valid: false, error: "NIK harus terdiri dari 16 digit" };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { valid: false, error: "NIK hanya boleh mengandung angka" };
  }
  return { valid: true };
}

export function normalizeWhatsApp(phone: string): string {
  let normalized = phone.replace(/\+/g, "");
  if (normalized.startsWith("0")) {
    normalized = "62" + normalized.slice(1);
  } else if (!normalized.startsWith("62")) {
    normalized = "62" + normalized;
  }
  return normalized;
}

const INDONESIAN_PHONE_REGEX = /^62\d{8,12}$/;

export function validateWhatsApp(phone: string): WhatsAppResult {
  if (phone.length === 0) {
    return { valid: false, error: "Nomor WhatsApp tidak boleh kosong" };
  }
  const normalized = normalizeWhatsApp(phone);
  if (!INDONESIAN_PHONE_REGEX.test(normalized)) {
    return { valid: false, error: "Nomor WhatsApp tidak valid. Gunakan format 08xx atau 62xx" };
  }
  return { valid: true };
}

export function validateFileUpload(file: { type: string; size: number }): FileUploadResult {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: "Tipe file tidak didukung. Hanya JPG, PNG, dan PDF yang diperbolehkan" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Ukuran file melebihi batas 5MB" };
  }
  return { valid: true };
}

const VALID_GENDER = new Set(["L", "P"]);

export function validateJenisKelamin(value: string): { valid: boolean; error?: string } {
  if (!VALID_GENDER.has(value)) {
    return { valid: false, error: "Pilih jenis kelamin" };
  }
  return { valid: true };
}

export function validateDocumentUpload(file: { type: string; size: number }): FileUploadResult {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return { valid: false, error: "Tipe file tidak didukung. Hanya PDF dan dokumen Word (.doc/.docx) yang diperbolehkan" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Ukuran file melebihi batas 5MB" };
  }
  return { valid: true };
}
