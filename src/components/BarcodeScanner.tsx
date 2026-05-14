import { useRef, useState, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { X, ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  onScanned: (code: string) => void;
}

export function BarcodeScanner({ onScanned }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScan = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => { stopScan(); };
  }, [stopScan]);

  // Once scanning is true and video element is in DOM, start decoding
  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.ITF,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODABAR,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result) {
        const text = result.getText();
        if (text) {
          onScanned(text);
          stopScan();
        }
      }
    }).catch(() => {
      setError("Não foi possível acessar a câmera.");
      stopScan();
    });
  }, [cameraReady, onScanned, stopScan]);

  const startScan = () => {
    if (scanning) return;
    setError(null);
    setScanning(true);
  };

  // Called when video element mounts via ref callback
  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      setCameraReady(true);
    }
  }, []);

  return (
    <div className="space-y-3">
      {scanning ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          <video ref={handleVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-16 border-2 border-primary rounded-xl opacity-80 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-xl" />
            </div>
          </div>
          <button
            onClick={stopScan}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/50 flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={startScan}
          className="w-full h-12 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
        >
          <ScanLine size={18} /> Escanear código de barras
        </button>
      )}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
