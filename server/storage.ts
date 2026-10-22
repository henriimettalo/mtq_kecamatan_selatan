import { resolve, sep, extname, basename } from "node:path";
import { mkdir, writeFile, readFile, rm, realpath } from "node:fs/promises";
import { config } from "./config";
import { HttpError } from "./security";
export const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export function safePath(root: string, key: string) {
  if (key.includes("\0") || key.includes("\\")) throw new HttpError(400, "Nama berkas tidak valid.");
  const base = resolve(root), path = resolve(base, key);
  if (!path.startsWith(base + sep)) throw new HttpError(400, "Nama berkas tidak valid.");
  return path;
}
export function validateFile(file: Express.Multer.File | undefined, document = false) {
  if (!file || !file.size || file.size > 5 * 1024 * 1024) throw new HttpError(400, "Berkas wajib diisi dan maksimal 5 MB.");
  const extension = extname(file.originalname).toLowerCase();
  const allowed = document ? [".pdf", ".doc", ".docx"] : [".jpg", ".jpeg", ".png", ".pdf"];
  if (!allowed.includes(extension) || file.mimetype !== contentTypes[extension]) throw new HttpError(400, "Format berkas tidak sesuai.");
  const b = file.buffer;
  const valid = extension === ".pdf" ? b.subarray(0, 5).toString() === "%PDF-"
    : [".jpg", ".jpeg"].includes(extension) ? b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    : extension === ".png" ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : extension === ".doc" ? b.subarray(0, 8).equals(Buffer.from([208,207,17,224,161,177,26,225]))
    : b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (!valid) throw new HttpError(400, "Isi berkas tidak sesuai formatnya.");
  return extension;
}
export async function saveDocument(file: Express.Multer.File, folder: string, label: string) {
  const filename = `${folder} - ${label}${extname(file.originalname).toLowerCase()}`;
  const directory = safePath(config.uploadDir, folder);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(safePath(directory, filename), file.buffer, { flag: "wx", mode: 0o600 });
  return filename;
}
export async function removeFolder(folder: string) {
  await rm(safePath(config.uploadDir, folder), { recursive: true, force: true });
}
export async function readPrivateFile(root: string, key: string) {
  try {
    const path = safePath(root, key);
    const base = await realpath(root), actual = await realpath(path);
    if (!actual.startsWith(base + sep)) throw new HttpError(403, "Akses berkas ditolak.");
    return { body: await readFile(actual), type: contentTypes[extname(path).toLowerCase()] || "application/octet-stream" };
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function participantFile(filename: string) {
  if (basename(filename) !== filename) throw new HttpError(400, "Nama berkas tidak valid.");
  return await readPrivateFile(config.uploadDir, `${filename.split(" - ")[0]}/${filename}`)
    || await readPrivateFile(config.uploadDir, filename);
}
