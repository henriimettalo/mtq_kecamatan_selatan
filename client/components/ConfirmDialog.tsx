

import { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  variant?: "danger" | "warning" | "success" | "info" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onCancel && !isLoading) {
        onCancel();
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel, isLoading]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: "#fef2f2",
      iconBorder: "#fee2e2",
      iconColor: "#dc2626",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
        </svg>
      ),
      buttonBg: "#dc2626",
      buttonHover: "#b91c1c",
    },
    warning: {
      iconBg: "#fffbeb",
      iconBorder: "#fef3c7",
      iconColor: "#d97706",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      buttonBg: "#d97706",
      buttonHover: "#b45309",
    },
    success: {
      iconBg: "#ecfdf5",
      iconBorder: "#d1fae5",
      iconColor: "#059669",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      buttonBg: "#059669",
      buttonHover: "#047857",
    },
    info: {
      iconBg: "#eff6ff",
      iconBorder: "#dbeafe",
      iconColor: "#2563eb",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      buttonBg: "#2563eb",
      buttonHover: "#1d4ed8",
    },
    primary: {
      iconBg: "#ecfdf5",
      iconBorder: "#d1fae5",
      iconColor: "#059669",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      buttonBg: "#059669",
      buttonHover: "#047857",
    },
  }[variant];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 9999,
        animation: "mtqFadeIn 0.15s ease-out",
      }}
      onClick={() => {
        if (onCancel && !isLoading) onCancel();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "460px",
          width: "100%",
          padding: "24px 28px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
          animation: "mtqScaleUp 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ikon Header */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: variantStyles.iconBg,
            border: `1px solid ${variantStyles.iconBorder}`,
            color: variantStyles.iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
          }}
        >
          {variantStyles.icon}
        </div>

        {/* Judul Modal */}
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "18px",
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </h3>

        {/* Isi Pesan */}
        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: "13.5px",
            color: "#475467",
            lineHeight: 1.55,
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </p>

        {/* Tombol Aksi */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {cancelLabel && onCancel && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "10px 18px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#334155",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cancelLabel}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 20px",
              background: variantStyles.buttonBg,
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            {isLoading ? (
              <>
                <svg
                  style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px" }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Memproses…</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
