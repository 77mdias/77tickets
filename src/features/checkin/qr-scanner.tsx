"use client";

import { useEffect, useRef } from "react";
import { mapCameraError, parseQrResult } from "./qr-scanner-client";

export interface QrScannerProps {
  onScan: (code: string) => void;
  onError: (reason: string) => void;
}

const FRAME_INTERVAL_MS = 150;

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let jsQR: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;

    const stopStream = () => {
      if (frameTimerRef.current) {
        clearTimeout(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
    };

    const scanFrame = () => {
      if (!mountedRef.current || !jsQR) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        frameTimerRef.current = setTimeout(scanFrame, FRAME_INTERVAL_MS);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        frameTimerRef.current = setTimeout(scanFrame, FRAME_INTERVAL_MS);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      const code = parseQrResult(result);

      if (code) {
        stopStream();
        onScan(code);
        return;
      }

      frameTimerRef.current = setTimeout(scanFrame, FRAME_INTERVAL_MS);
    };

    const startCamera = async () => {
      try {
        const jsqrModule = await import("jsqr");
        jsQR = jsqrModule.default as typeof jsQR;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        if (!mountedRef.current) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          scanFrame();
        }
      } catch (err) {
        if (!mountedRef.current) return;
        onError(mapCameraError(err));
      }
    };

    void startCamera();

    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, [onScan, onError]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-black">
      <video
        ref={videoRef}
        className="w-full"
        autoPlay
        muted
        playsInline
        aria-label="Feed da câmera para leitura de QR code"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-48 w-48 rounded-lg border-2 border-white opacity-60" />
      </div>
    </div>
  );
}
