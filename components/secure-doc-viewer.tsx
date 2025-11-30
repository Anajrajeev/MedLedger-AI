"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface SecureDocumentViewerProps {
  fileData: ArrayBuffer;
  fileName: string;
  onClose: () => void;
  expireAt?: Date;
}

export function SecureDocumentViewer({
  fileData,
  fileName,
  onClose,
  expireAt,
}: SecureDocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  // Check expiration
  useEffect(() => {
    if (!expireAt) return;

    const checkExpiration = () => {
      if (new Date() >= expireAt) {
        setExpired(true);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
    };

    const interval = setInterval(checkExpiration, 1000);
    checkExpiration(); // Check immediately

    return () => clearInterval(interval);
  }, [expireAt]);

  // Block keyboard shortcuts
  useEffect(() => {
    const blockShortcuts = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+S, PrintScreen, F12
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "a" || e.key === "s")) ||
        e.key === "PrintScreen" ||
        e.key === "F12"
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener("keydown", blockShortcuts, true);
    return () => window.removeEventListener("keydown", blockShortcuts, true);
  }, []);

  // Block right-click and context menu
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.addEventListener("contextmenu", blockContextMenu);
      overlay.addEventListener("copy", (e) => e.preventDefault());
      overlay.addEventListener("cut", (e) => e.preventDefault());
      overlay.addEventListener("paste", (e) => e.preventDefault());
    }

    return () => {
      if (overlay) {
        overlay.removeEventListener("contextmenu", blockContextMenu);
      }
    };
  }, []);

  // Render file to canvas
  useEffect(() => {
    let mounted = true;

    const renderFile = async () => {
      // Wait for canvas to be available with retries
      let retries = 0;
      while (!canvasRef.current && retries < 10 && mounted) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!mounted) return;

      if (!canvasRef.current) {
        console.error("[Secure Viewer] Canvas ref not available after retries");
        setError("Failed to initialize canvas viewer");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Validate fileData
        if (!fileData || fileData.byteLength === 0) {
          throw new Error("File data is empty or invalid");
        }

        console.log("[Secure Viewer] Starting file render, fileData size:", fileData.byteLength);

        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("Canvas element not available");
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        const fileExtension = fileName.split(".").pop()?.toLowerCase();
        console.log("[Secure Viewer] File extension:", fileExtension);

        // Handle images
        if (fileExtension === "jpg" || fileExtension === "jpeg" || fileExtension === "png") {
          const blob = new Blob([fileData], { type: `image/${fileExtension}` });
          const url = URL.createObjectURL(blob);
          const img = new Image();

          await new Promise((resolve, reject) => {
            img.onload = () => {
              // Set canvas size to image size (max 1200px width for display)
              const maxWidth = 1200;
              const scale = img.width > maxWidth ? maxWidth / img.width : 1;
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;

              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
              resolve(undefined);
            };
            img.onerror = reject;
            img.src = url;
          });
        }
        // Handle PDFs
        else if (fileExtension === "pdf") {
          console.log("[Secure Viewer] Loading PDF.js library...");

          // Dynamic import of pdfjs-dist
          const pdfjsLib = await import("pdfjs-dist");
          console.log("[Secure Viewer] PDF.js version:", pdfjsLib.version);

          // Set worker source to local file
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
            console.log("[Secure Viewer] Worker URL set to local file");
          }

          console.log("[Secure Viewer] Creating PDF document from data, size:", fileData.byteLength, "bytes");

          // Ensure fileData is a proper ArrayBuffer/Uint8Array
          let pdfData: Uint8Array;
          // @ts-ignore - fileData type check
          if (fileData instanceof ArrayBuffer) {
            pdfData = new Uint8Array(fileData);
          } else if (fileData instanceof Uint8Array) {
            pdfData = fileData;
          } else {
            // Fallback for other types
            pdfData = new Uint8Array(fileData as any);
          }

          console.log("[Secure Viewer] PDF data prepared, length:", pdfData.length);

          // Create a timeout for PDF loading (30 seconds)
          let loadingTimeout: NodeJS.Timeout | undefined;
          const timeoutPromise = new Promise<never>((_, reject) => {
            loadingTimeout = setTimeout(() => {
              reject(new Error("PDF loading timeout after 30 seconds. The file may be too large or corrupted."));
            }, 30000);
          });

          try {
            console.log("[Secure Viewer] Calling getDocument...");
            const loadingTask = pdfjsLib.getDocument({
              data: pdfData,
              useSystemFonts: true,
              verbosity: 0,
              stopAtErrors: false,
            });

            console.log("[Secure Viewer] Waiting for PDF to load...");
            const pdf = await Promise.race([
              loadingTask.promise,
              timeoutPromise
            ]) as any;

            if (loadingTimeout) clearTimeout(loadingTimeout);
            console.log("[Secure Viewer] PDF loaded successfully, total pages:", pdf.numPages);

            if (pdf.numPages === 0) {
              throw new Error("PDF has no pages");
            }

            // Render first page
            console.log("[Secure Viewer] Getting page 1...");
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
              canvasContext: ctx,
              viewport: viewport,
            };

            console.log("[Secure Viewer] Rendering PDF page to canvas...");
            const renderTask = page.render(renderContext);
            await renderTask.promise;
            console.log("[Secure Viewer] PDF rendered successfully");
          } catch (pdfError: any) {
            if (loadingTimeout) clearTimeout(loadingTimeout);
            console.error("[Secure Viewer] PDF processing error:", pdfError);
            console.error("[Secure Viewer] Error details:", {
              name: pdfError.name,
              message: pdfError.message,
              stack: pdfError.stack,
            });
            throw new Error(`Failed to load PDF: ${pdfError.message || "Unknown error"}`);
          }
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        if (mounted) {
          setLoading(false);
          console.log("[Secure Viewer] File rendering complete");
        }
      } catch (err: any) {
        console.error("[Secure Viewer] Render failed:", err);
        if (mounted) {
          setError(err.message || "Failed to render file");
          setLoading(false);
        }
      }
    };

    // Start rendering after a short delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      renderFile();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [fileData, fileName]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-gray-900 truncate flex-1">{fileName}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 overflow-auto p-4 relative">
            {/* Canvas container - always rendered so ref is available */}
            <div className="relative">
              {/* Transparent overlay to block interactions */}
              <div
                ref={overlayRef}
                className="absolute inset-0 z-10"
                style={{
                  userSelect: "none",
                  // @ts-ignore
                  WebkitUserDrag: "none",
                  pointerEvents: "auto",
                  display: loading || error || expired ? 'none' : 'block',
                }}
              />

              {/* Canvas - always rendered for ref availability */}
              <canvas
                ref={canvasRef}
                className="mx-auto shadow-lg"
                style={{
                  userSelect: "none",
                  // @ts-ignore
                  WebkitUserDrag: "none",
                  pointerEvents: "none",
                  display: "block",
                  opacity: loading || error || expired ? 0 : 1,
                }}
              />
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-medical-blue mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading document...</p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
                <div className="text-center">
                  <p className="text-lg font-semibold text-red-600 mb-2">Error</p>
                  <p className="text-sm text-gray-600">{error}</p>
                </div>
              </div>
            )}

            {/* Expired overlay */}
            {expired && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 mb-2">Access Expired</p>
                  <p className="text-sm text-gray-600">This document is no longer available.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              This document is protected. Copying, printing, and screenshots are disabled.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

