

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "@/lib/navigation";
import Link from "@/lib/link";
import { calculateAge } from "@shared/age";
import { branches, isEligible, type BranchDefinition } from "@shared/branches";
import {
  validateNIK,
  normalizeWhatsApp,
  validateWhatsApp,
  validateFileUpload,
  validateJenisKelamin,
  validateDocumentUpload,
} from "@shared/validation";
import { cn } from "@/lib/utils";

const DEFAULT_REFERENCE_DATE =
  "2026-07-01";

interface FormErrors {
  [key: string]: string;
}

interface FileValidationState {
  file: File | null;
  error: string;
}

interface RegistrationFormProps {
  referenceDate?: string;
  branchDefinitions?: BranchDefinition[];
  eventName?: string;
  eventId?: string;
  statementTemplateUrl?: string;
}

function formatIndonesianDate(isoDateString: string): string {
  if (!isoDateString) return "-";
  try {
    const d = new Date(isoDateString + "T00:00:00");
    if (isNaN(d.getTime())) return isoDateString;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return isoDateString;
  }
}

function SubmitButton({
  isSubmitting,
  disabled,
}: {
  isSubmitting: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className="inline-flex items-center justify-center gap-2 rounded-comfortable bg-[#35533e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#263e32] focus:outline-none focus:ring-2 focus:ring-[#35533e] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
    >
      {isSubmitting ? (
        <>
          <svg
            className="h-4 w-4 animate-spin text-white"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Mengirim...</span>
        </>
      ) : (
        <span>✓ Kirim Pendaftaran</span>
      )}
    </button>
  );
}

const STEPS = [
  { id: 1, title: "Data Diri", desc: "Biodata & Kontak" },
  { id: 2, title: "Cabang", desc: "Pilihan Lomba" },
  { id: 3, title: "Berkas", desc: "Dokumen Syarat" },
  { id: 4, title: "Konfirmasi", desc: "Review & Kirim" },
];

export function RegistrationForm({
  referenceDate = DEFAULT_REFERENCE_DATE,
  branchDefinitions = branches,
  eventName = "MTQ",
  eventId = "",
  statementTemplateUrl = "/templates/surat-pernyataan-komitmen-mtq-2026.pdf",
}: RegistrationFormProps) {
  const REFERENCE_DATE = referenceDate;
  const router = useRouter();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [highestStepReached, setHighestStepReached] = useState<number>(1);
  const [isAgreed, setIsAgreed] = useState<boolean>(false);

  // Field States
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [nomorWhatsApp, setNomorWhatsApp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [asalSekolah, setAsalSekolah] = useState("");
  const [noRekening, setNoRekening] = useState("");
  const [namaPemilikRekening, setNamaPemilikRekening] = useState("");
  const [cabang, setCabang] = useState("");
  const [kkFile, setKkFile] = useState<FileValidationState>({
    file: null,
    error: "",
  });
  const [ktpFile, setKtpFile] = useState<FileValidationState>({
    file: null,
    error: "",
  });
  const [aktaFile, setAktaFile] = useState<FileValidationState>({
    file: null,
    error: "",
  });
  const [suratPernyataanFile, setSuratPernyataanFile] =
    useState<FileValidationState>({ file: null, error: "" });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const [age, setAge] = useState<{
    years: number;
    months: number;
    days: number;
  } | null>(null);
  const [eligibleBranches, setEligibleBranches] =
    useState<BranchDefinition[]>(branchDefinitions);

  const isUnder17 = age !== null && age.years < 17;

  const selectedBranchObj = useMemo(() => {
    return branchDefinitions.find((b) => b.id === cabang);
  }, [branchDefinitions, cabang]);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleTanggalLahirChange = useCallback(
    (value: string) => {
      setTanggalLahir(value);
      clearFieldError("tanggalLahir");
      if (value) {
        const computedAge = calculateAge(value, REFERENCE_DATE);
        setAge(computedAge);

        const filtered = branchDefinitions.filter((branch) => {
          const result = isEligible(
            branch.id,
            value,
            REFERENCE_DATE,
            branchDefinitions,
          );
          return result.eligible;
        });
        setEligibleBranches(filtered);

        if (cabang) {
          const stillEligible = filtered.some((b) => b.id === cabang);
          if (!stillEligible) {
            setCabang("");
          }
        }
      } else {
        setAge(null);
        setEligibleBranches(branchDefinitions);
      }
    },
    [cabang, REFERENCE_DATE, branchDefinitions, clearFieldError],
  );

  const handleNikChange = useCallback(
    (value: string) => {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 16);
      setNik(digitsOnly);
      clearFieldError("nik");
    },
    [clearFieldError],
  );

  const handleNikBlur = useCallback(() => {
    if (nik) {
      const result = validateNIK(nik);
      if (!result.valid && result.error) {
        setErrors((prev) => ({ ...prev, nik: result.error! }));
      } else {
        clearFieldError("nik");
      }
    }
  }, [nik, clearFieldError]);

  const handleWhatsAppBlur = useCallback(() => {
    if (nomorWhatsApp) {
      const result = validateWhatsApp(nomorWhatsApp);
      if (!result.valid && result.error) {
        setErrors((prev) => ({ ...prev, nomorWhatsApp: result.error! }));
      } else {
        clearFieldError("nomorWhatsApp");
        setNomorWhatsApp(normalizeWhatsApp(nomorWhatsApp));
      }
    }
  }, [nomorWhatsApp, clearFieldError]);

  const handleFileChange = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<FileValidationState>>,
      field: string,
    ) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
          setter({ file: null, error: "" });
          return;
        }

        const result = validateFileUpload(file);
        if (!result.valid) {
          setter({ file: null, error: result.error! });
          setErrors((prev) => ({ ...prev, [field]: result.error! }));
        } else {
          setter({ file, error: "" });
          clearFieldError(field);
        }
      },
    [clearFieldError],
  );

  const handleDocumentFileChange = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<FileValidationState>>,
      field: string,
    ) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
          setter({ file: null, error: "" });
          return;
        }

        const result = validateDocumentUpload(file);
        if (!result.valid) {
          setter({ file: null, error: result.error! });
          setErrors((prev) => ({ ...prev, [field]: result.error! }));
        } else {
          setter({ file, error: "" });
          clearFieldError(field);
        }
      },
    [clearFieldError],
  );

  // Validate fields for a given step
  const validateStep = useCallback(
    (step: number): boolean => {
      const stepErrors: FormErrors = {};

      if (step === 1) {
        if (!nama.trim()) {
          stepErrors.nama = "Nama lengkap wajib diisi";
        }
        if (!nik.trim()) {
          stepErrors.nik = "NIK wajib diisi";
        } else {
          const nikRes = validateNIK(nik);
          if (!nikRes.valid) {
            stepErrors.nik = nikRes.error || "NIK harus 16 digit angka valid";
          }
        }
        if (!jenisKelamin) {
          stepErrors.jenisKelamin = "Silakan pilih jenis kelamin";
        }
        if (!tempatLahir.trim()) {
          stepErrors.tempatLahir = "Tempat lahir wajib diisi";
        }
        if (!tanggalLahir) {
          stepErrors.tanggalLahir = "Tanggal lahir wajib diisi";
        }
        if (!nomorWhatsApp.trim()) {
          stepErrors.nomorWhatsApp = "Nomor WhatsApp aktif wajib diisi";
        } else {
          const waRes = validateWhatsApp(nomorWhatsApp);
          if (!waRes.valid) {
            stepErrors.nomorWhatsApp =
              waRes.error || "Nomor WhatsApp tidak valid (contoh: 081234567890)";
          }
        }
        if (!alamat.trim()) {
          stepErrors.alamat = "Alamat domisili lengkap wajib diisi";
        }
      } else if (step === 2) {
        if (!cabang) {
          stepErrors.cabang = "Silakan pilih cabang lomba yang akan diikuti";
        } else if (tanggalLahir) {
          const eligible = isEligible(
            cabang,
            tanggalLahir,
            REFERENCE_DATE,
            branchDefinitions,
          );
          if (!eligible.eligible) {
            stepErrors.cabang =
              eligible.reason ||
              "Usia tidak memenuhi syarat untuk cabang lomba ini";
          }
        }
      } else if (step === 3) {
        if (!kkFile.file) {
          stepErrors.kkFile = "Scan asli Kartu Keluarga (KK) wajib diunggah";
        } else if (kkFile.error) {
          stepErrors.kkFile = kkFile.error;
        }

        if (!ktpFile.file) {
          stepErrors.ktpFile = isUnder17
            ? "Scan asli KK (pengganti KTP) wajib diunggah"
            : "Scan asli KTP wajib diunggah";
        } else if (ktpFile.error) {
          stepErrors.ktpFile = ktpFile.error;
        }

        if (!aktaFile.file) {
          stepErrors.aktaFile = "Scan asli Akta Lahir wajib diunggah";
        } else if (aktaFile.error) {
          stepErrors.aktaFile = aktaFile.error;
        }

        if (!suratPernyataanFile.file) {
          stepErrors.suratPernyataanFile =
            "Surat Pernyataan Keaslian wajib diunggah";
        } else if (suratPernyataanFile.error) {
          stepErrors.suratPernyataanFile = suratPernyataanFile.error;
        }
      }

      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        return false;
      }

      return true;
    },
    [
      nama,
      nik,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      nomorWhatsApp,
      alamat,
      cabang,
      REFERENCE_DATE,
      branchDefinitions,
      kkFile,
      ktpFile,
      aktaFile,
      suratPernyataanFile,
      isUnder17,
    ],
  );

  const goToStep = useCallback(
    (targetStep: number) => {
      if (targetStep < currentStep) {
        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Validating current step before advancing
      if (validateStep(currentStep)) {
        setCurrentStep(targetStep);
        setHighestStepReached((prev) => Math.max(prev, targetStep));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentStep, validateStep],
  );

  const handleNextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setHighestStepReached((prev) => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, validateStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateStep(1)) {
        setCurrentStep(1);
        return;
      }
      if (!validateStep(2)) {
        setCurrentStep(2);
        return;
      }
      if (!validateStep(3)) {
        setCurrentStep(3);
        return;
      }
      if (!isAgreed) {
        setErrors((prev) => ({
          ...prev,
          agreement: "Silakan centang pernyataan keabsahan sebelum mengirim formulir.",
        }));
        return;
      }

      setIsSubmitting(true);
      setServerError("");
      setErrors({});

      const form = e.currentTarget;
      const formData = new FormData(form);

      try {
        const response = await fetch("/api/register", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          setErrors(result.errors || {});
          if (result.errors?.general) {
            setServerError(result.errors.general);
          } else {
            // Jump to the step with error
            const errKeys = Object.keys(result.errors || {});
            if (
              errKeys.some((k) =>
                [
                  "nama",
                  "nik",
                  "jenisKelamin",
                  "tempatLahir",
                  "tanggalLahir",
                  "nomorWhatsApp",
                  "alamat",
                  "asalSekolah",
                ].includes(k),
              )
            ) {
              setCurrentStep(1);
            } else if (errKeys.includes("cabang")) {
              setCurrentStep(2);
            } else if (
              errKeys.some((k) =>
                [
                  "kkFile",
                  "ktpFile",
                  "aktaFile",
                  "suratPernyataanFile",
                ].includes(k),
              )
            ) {
              setCurrentStep(3);
            }
          }
        } else if (result.redirectUrl) {
          router.push(result.redirectUrl);
          return;
        }
      } catch (err) {
        setServerError("Terjadi kesalahan jaringan. Silakan coba lagi.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateStep, isAgreed, router],
  );

  const fillPercentage = useMemo(() => {
    return ((currentStep - 1) / (STEPS.length - 1)) * 100;
  }, [currentStep]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-marketing px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-[700px] rounded-panel border border-[#d0d6e0] bg-white p-6 shadow-sm sm:p-8">
        {/* Navigation back */}
        <div className="mb-4 flex items-center justify-between border-b border-[#e2e8f0] pb-3 text-xs text-text-secondary">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-text-secondary transition-colors hover:text-[#35533e]"
          >
            ← Beranda Utama
          </Link>
          <Link
            href="/peserta"
            className="font-medium text-[#35533e] transition-colors hover:underline"
          >
            Portal Peserta MTQ →
          </Link>
        </div>

        {/* Title Header */}
        <div className="mb-6">
          <span className="inline-block rounded-full bg-[#e9eee3] px-3 py-1 text-xs font-semibold tracking-wide text-[#35533e]">
            Formulir Pendaftaran Resmi
          </span>
          <h1 className="mt-2 text-2xl font-normal leading-tight tracking-heading-1 text-text-primary sm:text-3xl">
            Pendaftaran {eventName}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Isi formulir secara bertahap melalui 4 langkah mudah di bawah ini.
          </p>
        </div>

        {/* Visual Stepper / Stage Tracker */}
        <div className="mtq-wizard-stepper" aria-label="Tahapan pendaftaran">
          <div className="mtq-wizard-track" />
          <div
            className="mtq-wizard-fill"
            style={{ width: `calc(${fillPercentage}% * 0.88)` }}
          />

          {STEPS.map((step) => {
            const isDone = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isClickable = step.id <= highestStepReached;

            return (
              <button
                type="button"
                key={step.id}
                onClick={() => isClickable && goToStep(step.id)}
                disabled={!isClickable}
                className={cn(
                  "mtq-wizard-step",
                  isActive && "mtq-wizard-step-active",
                  isDone && "mtq-wizard-step-done",
                  isClickable && "mtq-wizard-step-clickable",
                )}
                title={`Tahap ${step.id}: ${step.title}`}
              >
                <div className="mtq-wizard-step-bubble">
                  {isDone ? "✓" : step.id}
                </div>
                <span className="mtq-wizard-step-label">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} noValidate>
          <input type="hidden" name="eventId" value={eventId} />

          {/* ========================================================================= */}
          {/* TAHAP 1: DATA DIRI & KONTAK */}
          {/* ========================================================================= */}
          <div className={cn(currentStep === 1 ? "space-y-5" : "hidden")}>
            <div className="rounded-comfortable border-l-4 border-[#35533e] bg-[#f8faf7] p-3.5">
              <h2 className="text-sm font-semibold text-[#263e32]">
                Tahap 1: Biodata Diri & Kontak Calon Peserta
              </h2>
              <p className="text-xs text-text-secondary">
                Pastikan data yang dimasukkan sesuai dengan Kartu Keluarga (KK)
                atau dokumen kependudukan resmi.
              </p>
            </div>

            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label
                htmlFor="nama"
                className="block text-sm font-medium text-text-primary"
              >
                Nama Lengkap Peserta <span className="text-red-500">*</span>
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                required
                value={nama}
                onChange={(e) => {
                  setNama(e.target.value);
                  clearFieldError("nama");
                }}
                className={cn(
                  "w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50",
                  errors.nama && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                )}
                placeholder="Contoh: Muhammad Raihan"
              />
              {errors.nama && (
                <p className="text-xs text-red-600">{errors.nama}</p>
              )}
            </div>

            {/* NIK */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="nik"
                  className="block text-sm font-medium text-text-primary"
                >
                  Nomor Induk Kependudukan (NIK) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-text-tertiary">
                  {nik.length}/16 digit
                </span>
              </div>
              <input
                id="nik"
                name="nik"
                type="text"
                inputMode="numeric"
                required
                maxLength={16}
                value={nik}
                onChange={(e) => handleNikChange(e.target.value)}
                onBlur={handleNikBlur}
                className={cn(
                  "w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50 font-mono",
                  errors.nik && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                )}
                placeholder="16 digit angka sesuai KK / KTP"
              />
              {errors.nik && <p className="text-xs text-red-600">{errors.nik}</p>}
            </div>

            {/* Jenis Kelamin */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Jenis Kelamin <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-comfortable border p-3 text-sm transition-all",
                    jenisKelamin === "L"
                      ? "border-[#35533e] bg-[#f0f4ef] font-semibold text-[#263e32] ring-1 ring-[#35533e]"
                      : "border-[#d0d6e0] bg-white text-text-secondary hover:bg-[#fafaf9]",
                  )}
                >
                  <input
                    type="radio"
                    name="jenisKelamin"
                    value="L"
                    checked={jenisKelamin === "L"}
                    onChange={(e) => {
                      setJenisKelamin(e.target.value);
                      clearFieldError("jenisKelamin");
                    }}
                    className="sr-only"
                  />
                  <span>👨 Laki-laki</span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-comfortable border p-3 text-sm transition-all",
                    jenisKelamin === "P"
                      ? "border-[#35533e] bg-[#f0f4ef] font-semibold text-[#263e32] ring-1 ring-[#35533e]"
                      : "border-[#d0d6e0] bg-white text-text-secondary hover:bg-[#fafaf9]",
                  )}
                >
                  <input
                    type="radio"
                    name="jenisKelamin"
                    value="P"
                    checked={jenisKelamin === "P"}
                    onChange={(e) => {
                      setJenisKelamin(e.target.value);
                      clearFieldError("jenisKelamin");
                    }}
                    className="sr-only"
                  />
                  <span>🧕 Perempuan</span>
                </label>
              </div>
              {errors.jenisKelamin && (
                <p className="text-xs text-red-600">{errors.jenisKelamin}</p>
              )}
            </div>

            {/* Tempat & Tanggal Lahir */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="tempatLahir"
                  className="block text-sm font-medium text-text-primary"
                >
                  Tempat Lahir <span className="text-red-500">*</span>
                </label>
                <input
                  id="tempatLahir"
                  name="tempatLahir"
                  type="text"
                  required
                  value={tempatLahir}
                  onChange={(e) => {
                    setTempatLahir(e.target.value);
                    clearFieldError("tempatLahir");
                  }}
                  className={cn(
                    "w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50",
                    errors.tempatLahir && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                  )}
                  placeholder="Contoh: Pontianak"
                />
                {errors.tempatLahir && (
                  <p className="text-xs text-red-600">{errors.tempatLahir}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tanggalLahir"
                  className="block text-sm font-medium text-text-primary"
                >
                  Tanggal Lahir <span className="text-red-500">*</span>
                </label>
                <input
                  id="tanggalLahir"
                  name="tanggalLahir"
                  type="date"
                  required
                  value={tanggalLahir}
                  onChange={(e) => handleTanggalLahirChange(e.target.value)}
                  className={cn(
                    "w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50",
                    errors.tanggalLahir && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                  )}
                />
                {errors.tanggalLahir && (
                  <p className="text-xs text-red-600">{errors.tanggalLahir}</p>
                )}
              </div>
            </div>

            {/* Age Badge */}
            {age && (
              <div className="rounded-comfortable border border-[#d8e1cc] bg-[#f2f6ee] p-3 text-xs text-[#263e32]">
                <span className="font-semibold">Perhitungan Usia Resmi:</span>{" "}
                <strong>
                  {age.years} tahun {age.months} bulan {age.days} hari
                </strong>{" "}
                (per {formatIndonesianDate(REFERENCE_DATE)})
              </div>
            )}

            {/* Nomor WhatsApp */}
            <div className="space-y-1.5">
              <label
                htmlFor="nomorWhatsApp"
                className="block text-sm font-medium text-text-primary"
              >
                Nomor WhatsApp Aktif <span className="text-red-500">*</span>
              </label>
              <input
                id="nomorWhatsApp"
                name="nomorWhatsApp"
                type="tel"
                value={nomorWhatsApp}
                onChange={(e) => {
                  setNomorWhatsApp(e.target.value);
                  clearFieldError("nomorWhatsApp");
                }}
                onBlur={handleWhatsAppBlur}
                className={cn(
                  "w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50",
                  errors.nomorWhatsApp && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                )}
                placeholder="Contoh: 081234567890"
              />
              <p className="text-xs text-text-tertiary">
                Nomor kontak aktif yang dapat dihubungi panitia untuk informasi pelaksanaan & jadwal seleksi.
              </p>
              {errors.nomorWhatsApp && (
                <p className="text-xs text-red-600">{errors.nomorWhatsApp}</p>
              )}
            </div>

            {/* Alamat Lengkap */}
            <div className="space-y-1.5">
              <label
                htmlFor="alamat"
                className="block text-sm font-medium text-text-primary"
              >
                Alamat Lengkap Domisili <span className="text-red-500">*</span>
              </label>
              <textarea
                id="alamat"
                name="alamat"
                required
                rows={2}
                value={alamat}
                onChange={(e) => {
                  setAlamat(e.target.value);
                  clearFieldError("alamat");
                }}
                className={cn(
                  "w-full resize-y rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50",
                  errors.alamat && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                )}
                placeholder="Jalan, Gang, No. Rumah, Kelurahan, Kecamatan Pontianak Selatan"
              />
              {errors.alamat && (
                <p className="text-xs text-red-600">{errors.alamat}</p>
              )}
            </div>

            {/* Asal Sekolah / Lembaga */}
            <div className="space-y-1.5">
              <label
                htmlFor="asalSekolah"
                className="block text-sm font-medium text-text-primary"
              >
                Asal Sekolah / Lembaga / TPQ / Kafilah{" "}
                <span className="text-xs font-normal text-text-tertiary">
                  (Opsional)
                </span>
              </label>
              <input
                id="asalSekolah"
                name="asalSekolah"
                type="text"
                value={asalSekolah}
                onChange={(e) => setAsalSekolah(e.target.value)}
                className="w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50"
                placeholder="Masukkan nama sekolah atau utusan kafilah"
              />
            </div>

            {/* Action Bar Stage 1 */}
            <div className="flex justify-end pt-4 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center justify-center gap-2 rounded-comfortable bg-[#35533e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#263e32]"
              >
                <span>Lanjut: Pilih Cabang Lomba</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAHAP 2: CABANG LOMBA & REKENING */}
          {/* ========================================================================= */}
          <div className={cn(currentStep === 2 ? "space-y-5" : "hidden")}>
            <div className="rounded-comfortable border-l-4 border-[#35533e] bg-[#f8faf7] p-3.5">
              <h2 className="text-sm font-semibold text-[#263e32]">
                Tahap 2: Pilihan Cabang Lomba & Info Rekening
              </h2>
              <p className="text-xs text-text-secondary">
                Daftar cabang lomba di bawah disaring otomatis sesuai batas usia
                tanggal lahir peserta.
              </p>
            </div>

            {/* Age Confirmation Banner */}
            <div className="rounded-comfortable border border-[#d8e1cc] bg-[#f2f6ee] p-3 text-xs text-[#263e32]">
              {age ? (
                <span>
                  🎯 Usia Peserta:{" "}
                  <strong>
                    {age.years} tahun {age.months} bulan {age.days} hari
                  </strong>{" "}
                  (per {formatIndonesianDate(REFERENCE_DATE)}).
                </span>
              ) : (
                <span>
                  ⚠️ Tanggal lahir belum diisi. Silakan kembali ke Tahap 1 untuk
                  mengisi tanggal lahir.
                </span>
              )}
            </div>

            {/* Cabang Lomba Dropdown */}
            <div className="space-y-1.5">
              <label
                htmlFor="cabang"
                className="block text-sm font-medium text-text-primary"
              >
                Cabang Lomba yang Diikuti <span className="text-red-500">*</span>
              </label>
              <select
                id="cabang"
                name="cabang"
                required
                value={cabang}
                onChange={(e) => {
                  setCabang(e.target.value);
                  clearFieldError("cabang");
                }}
                className={cn(
                  "w-full cursor-pointer appearance-none rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-3 text-base text-text-primary outline-none transition-colors focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50",
                  errors.cabang && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
                )}
              >
                <option value="">-- Pilih Cabang Lomba --</option>
                {eligibleBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              {tanggalLahir && eligibleBranches.length === 0 && (
                <div className="rounded-comfortable border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                  Tidak ada cabang lomba yang memenuhi kriteria usia peserta ({age?.years} tahun).
                </div>
              )}

              {errors.cabang && (
                <p className="text-xs text-red-600">{errors.cabang}</p>
              )}
            </div>

            {/* Selected Branch Detail */}
            {selectedBranchObj && (
              <div className="rounded-comfortable border border-[#d8ddd1] bg-[#fbfbfa] p-4 text-xs text-text-secondary">
                <div className="font-semibold text-[#263e32]">
                  {selectedBranchObj.name}
                </div>
                {selectedBranchObj.description && (
                  <div className="mt-1">
                    Keterangan: <strong>{selectedBranchObj.description}</strong>
                  </div>
                )}
                {selectedBranchObj.maxAgeYears !== undefined && (
                  <div className="mt-0.5 text-text-tertiary">
                    Batas maksimal usia: {selectedBranchObj.maxAgeYears} tahun{" "}
                    {selectedBranchObj.maxAgeMonths ?? 0} bulan {selectedBranchObj.maxAgeDays ?? 0} hari
                  </div>
                )}
                {selectedBranchObj.minAgeYears !== undefined && (
                  <div className="mt-0.5 text-text-tertiary">
                    Batas minimal usia: {selectedBranchObj.minAgeYears} tahun
                  </div>
                )}
              </div>
            )}

            {/* Info Rekening (Opsional) */}
            <div className="mt-6 border-t border-[#e2e8f0] pt-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Informasi Rekening Bank Kalbar{" "}
                  <span className="text-xs font-normal text-text-tertiary">
                    (Opsional)
                  </span>
                </h3>
                <p className="text-xs text-text-secondary">
                  Digunakan untuk keperluan penyaluran insentif/hadiah bagi pemenang jika diperlukan.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="noRekening"
                    className="block text-xs font-medium text-text-secondary"
                  >
                    Nomor Rekening Bank Kalbar
                  </label>
                  <input
                    id="noRekening"
                    name="noRekening"
                    type="text"
                    value={noRekening}
                    onChange={(e) => setNoRekening(e.target.value)}
                    className="w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50"
                    placeholder="Kosongkan jika belum memiliki"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="namaPemilikRekening"
                    className="block text-xs font-medium text-text-secondary"
                  >
                    Nama Pemilik Rekening
                  </label>
                  <input
                    id="namaPemilikRekening"
                    name="namaPemilikRekening"
                    type="text"
                    value={namaPemilikRekening}
                    onChange={(e) => setNamaPemilikRekening(e.target.value)}
                    className="w-full rounded-comfortable border border-[#d0d6e0] bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-[#35533e] focus:ring-1 focus:ring-[#35533e]/50"
                    placeholder="Nama sesuai buku rekening"
                  />
                </div>
              </div>
            </div>

            {/* Action Bar Stage 2 */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="rounded-comfortable border border-[#8d9d85] bg-white px-4 py-2.5 text-sm font-medium text-[#263e32] transition-colors hover:bg-[#f2f6ee] shrink-0"
              >
                ← Data Diri
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center justify-center gap-2 rounded-comfortable bg-[#35533e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#263e32]"
              >
                <span>Lanjut: Unggah Berkas</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAHAP 3: UNGGAH BERKAS PERSYARATAN */}
          {/* ========================================================================= */}
          <div className={cn(currentStep === 3 ? "space-y-5" : "hidden")}>
            <div className="rounded-comfortable border-l-4 border-[#35533e] bg-[#f8faf7] p-3.5">
              <h2 className="text-sm font-semibold text-[#263e32]">
                Tahap 3: Unggah Berkas Dokumen Persyaratan
              </h2>
              <p className="text-xs text-text-secondary">
                Unggah hasil pindai (*scan*) atau foto dokumen asli yang jelas dan
                terbaca. Maksimal 5MB per berkas.
              </p>
            </div>

            {/* Download Template Banner */}
            <div className="flex flex-col gap-2 rounded-comfortable border border-[#d8e1cc] bg-[#f7faf4] p-3.5 text-xs text-[#263e32] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-semibold">📄 Template Surat Pernyataan:</span>
                <p className="text-text-secondary">
                  Unduh dan isi format surat pernyataan keaslian sebelum diunggah.
                </p>
              </div>
              <a
                href={statementTemplateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-comfortable bg-[#35533e] px-3.5 py-2 font-medium text-white transition-colors hover:bg-[#263e32] whitespace-nowrap"
              >
                <span>Unduh Format</span>
                <span>⬇</span>
              </a>
            </div>

            {/* KK File */}
            <div
              className={cn(
                "mtq-file-card",
                kkFile.file && "mtq-file-card-success",
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <label
                    htmlFor="kkFile"
                    className="block text-sm font-medium text-text-primary"
                  >
                    1. Scan Asli Kartu Keluarga (KK){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-text-tertiary">
                    Format: JPG, PNG, atau PDF (maks. 5MB)
                  </p>
                </div>
                {kkFile.file && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    ✓ Terlampir
                  </span>
                )}
              </div>
              <input
                id="kkFile"
                name="kkFile"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                required
                onChange={handleFileChange(setKkFile, "kkFile")}
                className="w-full text-xs text-text-secondary file:mr-3 file:rounded-comfortable file:border-0 file:bg-[#35533e] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:cursor-pointer hover:file:bg-[#263e32]"
              />
              {kkFile.file && (
                <div className="mt-2 text-xs text-emerald-700">
                  File: <strong>{kkFile.file.name}</strong> (
                  {(kkFile.file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {errors.kkFile && (
                <p className="mt-1 text-xs text-red-600">{errors.kkFile}</p>
              )}
            </div>

            {/* KTP / KK File */}
            <div
              className={cn(
                "mtq-file-card",
                ktpFile.file && "mtq-file-card-success",
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <label
                    htmlFor="ktpFile"
                    className="block text-sm font-medium text-text-primary"
                  >
                    {isUnder17
                      ? "2. Scan Asli KK (Pengganti KTP untuk <17 Tahun) "
                      : "2. Scan Asli KTP Peserta "}
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-text-tertiary">
                    Format: JPG, PNG, atau PDF (maks. 5MB)
                  </p>
                </div>
                {ktpFile.file && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    ✓ Terlampir
                  </span>
                )}
              </div>
              <input
                id="ktpFile"
                name="ktpFile"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                required
                onChange={handleFileChange(setKtpFile, "ktpFile")}
                className="w-full text-xs text-text-secondary file:mr-3 file:rounded-comfortable file:border-0 file:bg-[#35533e] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:cursor-pointer hover:file:bg-[#263e32]"
              />
              {ktpFile.file && (
                <div className="mt-2 text-xs text-emerald-700">
                  File: <strong>{ktpFile.file.name}</strong> (
                  {(ktpFile.file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {errors.ktpFile && (
                <p className="mt-1 text-xs text-red-600">{errors.ktpFile}</p>
              )}
            </div>

            {/* Akta Lahir File */}
            <div
              className={cn(
                "mtq-file-card",
                aktaFile.file && "mtq-file-card-success",
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <label
                    htmlFor="aktaFile"
                    className="block text-sm font-medium text-text-primary"
                  >
                    3. Scan Asli Akta Kelahiran{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-text-tertiary">
                    Format: JPG, PNG, atau PDF (maks. 5MB)
                  </p>
                </div>
                {aktaFile.file && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    ✓ Terlampir
                  </span>
                )}
              </div>
              <input
                id="aktaFile"
                name="aktaFile"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                required
                onChange={handleFileChange(setAktaFile, "aktaFile")}
                className="w-full text-xs text-text-secondary file:mr-3 file:rounded-comfortable file:border-0 file:bg-[#35533e] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:cursor-pointer hover:file:bg-[#263e32]"
              />
              {aktaFile.file && (
                <div className="mt-2 text-xs text-emerald-700">
                  File: <strong>{aktaFile.file.name}</strong> (
                  {(aktaFile.file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {errors.aktaFile && (
                <p className="mt-1 text-xs text-red-600">{errors.aktaFile}</p>
              )}
            </div>

            {/* Surat Pernyataan File */}
            <div
              className={cn(
                "mtq-file-card",
                suratPernyataanFile.file && "mtq-file-card-success",
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <label
                    htmlFor="suratPernyataanFile"
                    className="block text-sm font-medium text-text-primary"
                  >
                    4. Surat Pernyataan Keaslian Bermeterai{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-text-tertiary">
                    Format: PDF atau Word (.doc / .docx, maks. 5MB)
                  </p>
                </div>
                {suratPernyataanFile.file && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    ✓ Terlampir
                  </span>
                )}
              </div>
              <input
                id="suratPernyataanFile"
                name="suratPernyataanFile"
                type="file"
                accept=".doc,.docx,.pdf"
                required
                onChange={handleDocumentFileChange(
                  setSuratPernyataanFile,
                  "suratPernyataanFile",
                )}
                className="w-full text-xs text-text-secondary file:mr-3 file:rounded-comfortable file:border-0 file:bg-[#35533e] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:cursor-pointer hover:file:bg-[#263e32]"
              />
              {suratPernyataanFile.file && (
                <div className="mt-2 text-xs text-emerald-700">
                  File: <strong>{suratPernyataanFile.file.name}</strong> (
                  {(suratPernyataanFile.file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {errors.suratPernyataanFile && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.suratPernyataanFile}
                </p>
              )}
            </div>

            {/* Action Bar Stage 3 */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="rounded-comfortable border border-[#8d9d85] bg-white px-4 py-2.5 text-sm font-medium text-[#263e32] transition-colors hover:bg-[#f2f6ee] shrink-0"
              >
                ← Cabang Lomba
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center justify-center gap-2 rounded-comfortable bg-[#35533e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#263e32]"
              >
                <span>Lanjut: Review & Konfirmasi</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAHAP 4: REVIEW / KONFIRMASI & SUBMIT */}
          {/* ========================================================================= */}
          <div className={cn(currentStep === 4 ? "space-y-5" : "hidden")}>
            <div className="rounded-comfortable border-l-4 border-[#35533e] bg-[#f8faf7] p-3.5">
              <h2 className="text-sm font-semibold text-[#263e32]">
                Tahap 4: Peninjauan Akhir & Pengiriman Pendaftaran
              </h2>
              <p className="text-xs text-text-secondary">
                Periksa kembali data Anda sebelum menekan tombol kirim. Anda dapat
                mengubah data jika masih ada kekeliruan.
              </p>
            </div>

            {/* Review Box 1: Biodata */}
            <div className="mtq-review-box">
              <div className="mtq-review-box-header">
                <span className="text-sm font-semibold text-[#263e32]">
                  👤 Rincian Biodata Peserta
                </span>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="text-xs font-semibold text-[#5e7058] hover:text-[#263e32] hover:underline"
                >
                  Ubah Data ✎
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-text-tertiary">Nama Lengkap:</span>
                  <div className="font-medium text-text-primary">{nama || "-"}</div>
                </div>
                <div>
                  <span className="text-text-tertiary">NIK:</span>
                  <div className="font-mono font-medium text-text-primary">
                    {nik || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-text-tertiary">Jenis Kelamin:</span>
                  <div className="font-medium text-text-primary">
                    {jenisKelamin === "L"
                      ? "Laki-laki"
                      : jenisKelamin === "P"
                        ? "Perempuan"
                        : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-text-tertiary">Tempat, Tanggal Lahir:</span>
                  <div className="font-medium text-text-primary">
                    {tempatLahir || "-"},{" "}
                    {tanggalLahir ? formatIndonesianDate(tanggalLahir) : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-text-tertiary">Usia Seleksi:</span>
                  <div className="font-medium text-emerald-800">
                    {age
                      ? `${age.years} thn ${age.months} bln ${age.days} hr`
                      : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-text-tertiary">No. WhatsApp:</span>
                  <div className="font-medium text-text-primary">
                    {nomorWhatsApp || "-"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-text-tertiary">Alamat Domisili:</span>
                  <div className="font-medium text-text-primary">{alamat || "-"}</div>
                </div>
                {asalSekolah && (
                  <div className="sm:col-span-2">
                    <span className="text-text-tertiary">
                      Asal Sekolah / Lembaga / Utusan:
                    </span>
                    <div className="font-medium text-text-primary">
                      {asalSekolah}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Review Box 2: Cabang Lomba */}
            <div className="mtq-review-box">
              <div className="mtq-review-box-header">
                <span className="text-sm font-semibold text-[#263e32]">
                  🏆 Cabang Lomba & Rekening
                </span>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="text-xs font-semibold text-[#5e7058] hover:text-[#263e32] hover:underline"
                >
                  Ubah Cabang ✎
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <span className="text-text-tertiary">Cabang Terpilih:</span>
                  <div className="font-semibold text-[#263e32]">
                    {selectedBranchObj?.name || cabang || "-"}
                  </div>
                </div>
                {noRekening && (
                  <>
                    <div>
                      <span className="text-text-tertiary">Rekening Bank Kalbar:</span>
                      <div className="font-mono font-medium text-text-primary">
                        {noRekening}
                      </div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Atas Nama:</span>
                      <div className="font-medium text-text-primary">
                        {namaPemilikRekening || "-"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Review Box 3: Berkas Persyaratan */}
            <div className="mtq-review-box">
              <div className="mtq-review-box-header">
                <span className="text-sm font-semibold text-[#263e32]">
                  📁 Berkas Persyaratan Terlampir
                </span>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="text-xs font-semibold text-[#5e7058] hover:text-[#263e32] hover:underline"
                >
                  Ubah Berkas ✎
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-[#f0f0ee] pb-1.5">
                  <span className="text-text-secondary">Scan Kartu Keluarga (KK):</span>
                  <span className="font-medium text-emerald-700">
                    {kkFile.file ? `✓ ${kkFile.file.name}` : "❌ Belum ada"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f0f0ee] pb-1.5">
                  <span className="text-text-secondary">
                    {isUnder17 ? "Scan KK (pengganti KTP):" : "Scan KTP Peserta:"}
                  </span>
                  <span className="font-medium text-emerald-700">
                    {ktpFile.file ? `✓ ${ktpFile.file.name}` : "❌ Belum ada"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f0f0ee] pb-1.5">
                  <span className="text-text-secondary">Scan Akta Lahir:</span>
                  <span className="font-medium text-emerald-700">
                    {aktaFile.file ? `✓ ${aktaFile.file.name}` : "❌ Belum ada"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Surat Pernyataan:</span>
                  <span className="font-medium text-emerald-700">
                    {suratPernyataanFile.file
                      ? `✓ ${suratPernyataanFile.file.name}`
                      : "❌ Belum ada"}
                  </span>
                </div>
              </div>
            </div>

            {/* Pakta Integritas / Pernyataan */}
            <div className="rounded-comfortable border border-[#d8e1cc] bg-[#fbfdfa] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => {
                    setIsAgreed(e.target.checked);
                    clearFieldError("agreement");
                  }}
                  className="mt-0.5 h-4 w-4 rounded accent-[#35533e]"
                />
                <span className="text-xs leading-relaxed text-text-primary">
                  Saya menyatakan dengan sesungguhnya bahwa seluruh data dan
                  dokumen berkas yang saya lampirkan adalah <strong>benar, sah, dan sesuai aslinya</strong>.
                  Apabila di kemudian hari ditemukan pemalsuan atau ketidaksesuaian data,
                  saya bersedia didiskualifikasi dari kepesertaan {eventName}.
                </span>
              </label>
              {errors.agreement && (
                <p className="mt-2 text-xs text-red-600">{errors.agreement}</p>
              )}
            </div>

            {/* Error banner from backend */}
            {serverError && (
              <div className="rounded-comfortable border border-red-300 bg-red-50 p-3.5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* Action Bar Stage 4 */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="rounded-comfortable border border-[#8d9d85] bg-white px-4 py-2.5 text-sm font-medium text-[#263e32] transition-colors hover:bg-[#f2f6ee] disabled:opacity-50 shrink-0"
              >
                ← Ubah Berkas
              </button>
              <SubmitButton isSubmitting={isSubmitting} disabled={!isAgreed} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
