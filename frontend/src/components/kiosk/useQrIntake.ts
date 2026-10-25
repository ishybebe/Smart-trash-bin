'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode';
import { api } from '@/lib/api';
import type { IntakeStatus } from '@/components/kiosk/types';
import {
  cameraEnvironment,
  describeCameraError,
  READER_ID,
  type CameraTarget,
} from '@/components/kiosk/qrCamera';

interface ScanResult {
  credited_points: number;
  session_id: string;
  points: number;
  message?: string;
}

export interface QrIntakeProps {
  sessionId: string;
  requestHeaders?: Record<string, string>;
  onLoaded: (creditedPoints: number, sessionPoints: number) => void;
  onStatusChange: (status: IntakeStatus) => void;
}

export function useQrIntake({
  sessionId,
  requestHeaders,
  onLoaded,
  onStatusChange,
}: QrIntakeProps) {
  const [status, setStatus] = useState<IntakeStatus>('idle');
  const [message, setMessage] = useState('');
  const [credited, setCredited] = useState(0);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [cameraHint, setCameraHint] = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanHandledRef = useRef(false);
  const submittingRef = useRef(false);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    const support = cameraEnvironment();
    const timer = window.setTimeout(() => {
      setCameraHint(support.available ? '' : support.message);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const transition = useCallback(
    (next: IntakeStatus, nextMessage: string) => {
      setStatus(next);
      setMessage(nextMessage);
      onStatusChange(next);
    },
    [onStatusChange],
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;

    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Camera teardown is best-effort; the browser releases the track.
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const handleCameraError = useCallback(
    (error: unknown) => {
      void stopScanner();
      setCameraOpen(false);
      transition('unavailable', describeCameraError(error));
    },
    [stopScanner, transition],
  );

  const submitToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token || submittingRef.current) return;

      if (!sessionId) {
        transition('unavailable', 'The session is still starting. Try again.');
        return;
      }

      submittingRef.current = true;
      setCameraOpen(false);
      setManualOpen(false);
      transition('verifying', 'Checking this code.');

      const res = await api<ScanResult>('/api/session/scan', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ session_id: sessionId, token }),
      });

      submittingRef.current = false;

      if (res.success && res.data) {
        setCredited(res.data.credited_points);
        setManualCode('');
        transition(
          'loaded',
          res.data.message ?? `Loaded ${res.data.credited_points} points.`,
        );
        onLoadedRef.current(res.data.credited_points, res.data.points);
        return;
      }

      const networkFailure = res.error?.code === 'NETWORK_ERROR';
      transition(
        networkFailure ? 'unavailable' : 'rejected',
        res.error?.message ?? 'That code could not be read.',
      );
    },
    [requestHeaders, sessionId, transition],
  );

  const startScanner = useCallback(
    async (target: CameraTarget) => {
      await stopScanner();
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      if (!document.getElementById(READER_ID)) {
        transition('unavailable', 'The scan bay did not open. Try again.');
        setCameraOpen(false);
        return;
      }

      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      scannerRef.current = scanner;
      scanHandledRef.current = false;

      const camera: CameraTarget =
        typeof target === 'string' ? { deviceId: { exact: target } } : target;

      try {
        await scanner.start(
          camera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            disableFlip: false,
          },
          (decodedText) => {
            if (scanHandledRef.current) return;
            scanHandledRef.current = true;
            setCameraOpen(false);
            void (async () => {
              await stopScanner();
              await submitToken(decodedText);
            })();
          },
          () => {
            // Per-frame misses are expected while the code is out of frame.
          },
        );
        transition('scanning', 'Hold the saved code inside the frame.');
      } catch (error) {
        handleCameraError(error);
      }
    },
    [handleCameraError, stopScanner, submitToken, transition],
  );

  const openScanner = useCallback(async () => {
    if (requesting) return;

    const support = cameraEnvironment();
    if (!support.available) {
      setCameraOpen(false);
      setManualOpen(false);
      transition('unavailable', support.message);
      return;
    }

    setRequesting(true);
    setManualOpen(false);
    setCameraOpen(true);
    transition('verifying', 'Requesting camera access.');

    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);

      if (devices.length === 0) {
        await startScanner({ facingMode: 'environment' });
        return;
      }

      const preferred =
        devices.find((device) => /back|rear|environment/i.test(device.label)) ??
        devices[0];

      setCameraId(preferred.id);
      await startScanner(preferred.id);
    } catch (error) {
      handleCameraError(error);
    } finally {
      setRequesting(false);
    }
  }, [handleCameraError, requesting, startScanner, transition]);

  const changeCamera = useCallback(
    async (nextId: string) => {
      setCameraId(nextId);
      setCameraOpen(true);
      transition('verifying', 'Switching camera.');
      await startScanner(nextId);
    },
    [startScanner, transition],
  );

  function reset() {
    void stopScanner();
    setCameraOpen(false);
    setCredited(0);
    setManualOpen(false);
    setManualCode('');
    transition('idle', '');
  }

  function openManual() {
    setManualOpen(true);
    transition('idle', '');
  }

  function closeManual() {
    setManualOpen(false);
    setManualCode('');
    if (status === 'rejected' || status === 'unavailable') {
      transition('idle', '');
    }
  }

  function enterCodeFromCamera() {
    void stopScanner();
    setCameraOpen(false);
    setManualOpen(true);
    transition('idle', '');
  }

  function submitManual() {
    void stopScanner();
    void submitToken(manualCode);
  }

  const busyState = status === 'verifying' || status === 'scanning';
  const showCamera = cameraOpen && (status === 'verifying' || status === 'scanning');
  const faulted = status === 'rejected' || status === 'unavailable';

  return {
    status,
    message,
    credited,
    cameras,
    cameraId,
    requesting,
    cameraHint,
    manualOpen,
    manualCode,
    setManualCode,
    busyState,
    showCamera,
    faulted,
    openScanner,
    changeCamera,
    reset,
    openManual,
    closeManual,
    enterCodeFromCamera,
    submitManual,
  };
}
