

import { useState, useEffect, useCallback } from "react";

export interface DocumentItem {
  label: string;
  filename: string;
}

interface DocumentGalleryProps {
  documents: DocumentItem[];
  fileBaseUrl: string;
}

export function DocumentGallery({ documents, fileBaseUrl }: DocumentGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedDoc = selectedIndex !== null ? documents[selectedIndex] : null;
  const selectedExt = selectedDoc?.filename.split(".").pop()?.toLowerCase() || "";
  const selectedIsImage = ["jpg", "jpeg", "png", "webp"].includes(selectedExt);
  const selectedUrl = selectedDoc ? `${fileBaseUrl}/${encodeURIComponent(selectedDoc.filename)}` : "";

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handlePrev = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! > 0 ? prev! - 1 : documents.length - 1));
  }, [selectedIndex, documents.length]);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! < documents.length - 1 ? prev! + 1 : 0));
  }, [selectedIndex, documents.length]);

  // Handle ESC and Arrow keys
  useEffect(() => {
    if (selectedIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {documents.map((doc, idx) => {
          const ext = doc.filename.split(".").pop()?.toLowerCase() || "";
          const fileUrl = `${fileBaseUrl}/${encodeURIComponent(doc.filename)}`;
          const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);

          return (
            <div
              key={doc.label}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e6e6e6",
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "box-shadow 180ms ease, border-color 180ms ease",
              }}
              className="hover:shadow-md hover:border-[#8d9d85]"
            >
              {/* Card Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid #e6e6e6", backgroundColor: "#fafaf9" }}
              >
                <span
                  className="text-text-primary"
                  style={{ fontSize: "14px", fontWeight: 510 }}
                >
                  {doc.label}
                </span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ fontSize: "12px", fontWeight: 460, color: "#5e6ad2" }}
                  title="Unduh / Buka file di tab baru"
                  onClick={(e) => e.stopPropagation()}
                >
                  Unduh ↗
                </a>
              </div>

              {/* Card Content / Clickable Preview */}
              {isImage ? (
                <div
                  className="p-3 cursor-pointer group flex-1 flex flex-col justify-center items-center relative"
                  style={{ backgroundColor: "#f7f8f8", minHeight: "220px" }}
                  onClick={() => setSelectedIndex(idx)}
                  title="Klik untuk membuka pratinjau gambar"
                >
                  <img
                    src={fileUrl}
                    alt={doc.label}
                    style={{
                      width: "100%",
                      maxHeight: "220px",
                      objectFit: "contain",
                      borderRadius: "6px",
                      transition: "transform 180ms ease",
                    }}
                    className="group-hover:scale-[1.02]"
                  />
                  <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 rounded-b-lg"
                  >
                    <span className="bg-white/90 text-[#263e32] px-3 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-xs flex items-center gap-1.5">
                      🔍 Perbesar Gambar
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-8 px-4 flex-1 cursor-pointer group"
                  style={{ backgroundColor: "#f7f8f8", minHeight: "220px" }}
                  onClick={() => setSelectedIndex(idx)}
                  title="Klik untuk melihat dokumen"
                >
                  <div
                    className="text-text-tertiary mb-2 group-hover:scale-110 transition-transform"
                    style={{ fontSize: "36px" }}
                  >
                    📄
                  </div>
                  <span
                    className="text-text-secondary text-center"
                    style={{ fontSize: "13px", fontWeight: 500 }}
                  >
                    {ext.toUpperCase()} Dokumen
                  </span>
                  <span
                    className="text-text-tertiary text-center truncate max-w-[200px]"
                    style={{ fontSize: "11px", fontWeight: 400, marginTop: "2px" }}
                    title={doc.filename}
                  >
                    {doc.filename}
                  </span>
                  <button
                    type="button"
                    className="mt-3 text-xs font-medium text-[#35533e] bg-white border border-[#cbd5e1] px-3 py-1.5 rounded-comfortable group-hover:border-[#35533e] transition-colors"
                  >
                    🔍 Pratinjau Dokumen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox / Preview Modal */}
      {selectedDoc && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={handleClose}
        >
          <div
            style={{
              position: "relative",
              maxWidth: selectedIsImage ? "92vw" : "1000px",
              width: "100%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#18181b",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                borderBottom: "1px solid #27272a",
                backgroundColor: "#27272a",
                color: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>
                  {selectedDoc.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#a1a1aa",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  ({selectedIndex! + 1} dari {documents.length}: {selectedDoc.filename})
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <a
                  href={selectedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    color: "#60a5fa",
                    textDecoration: "none",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(96, 165, 250, 0.1)",
                    border: "1px solid rgba(96, 165, 250, 0.2)",
                  }}
                >
                  Buka Tab Baru ↗
                </a>

                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "20px",
                    cursor: "pointer",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    lineHeight: 1,
                  }}
                  title="Tutup (ESC)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div
              style={{
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "auto",
                backgroundColor: "#09090b",
                minHeight: "300px",
                maxHeight: "calc(92vh - 60px)",
              }}
            >
              {selectedIsImage ? (
                <img
                  src={selectedUrl}
                  alt={selectedDoc.label}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "calc(88vh - 80px)",
                    objectFit: "contain",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <iframe
                  src={selectedUrl}
                  title={selectedDoc.label}
                  style={{
                    width: "100%",
                    height: "calc(85vh - 80px)",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#ffffff",
                  }}
                />
              )}
            </div>

            {/* Prev / Next navigation arrows if more than 1 document */}
            {documents.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                  title="Dokumen Sebelumnya (Panah Kiri)"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                  title="Dokumen Selanjutnya (Panah Kanan)"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
