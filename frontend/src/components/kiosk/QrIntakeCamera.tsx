'use client';

import type { CameraDevice } from 'html5-qrcode';
import { READER_ID } from '@/components/kiosk/qrCamera';

interface QrIntakeCameraProps {
  cameras: CameraDevice[];
  cameraId: string;
  requesting: boolean;
  message: string;
  onChangeCamera: (deviceId: string) => void;
  onEnterCode: () => void;
  onCancel: () => void;
}

export function QrIntakeCamera({
  cameras,
  cameraId,
  requesting,
  message,
  onChangeCamera,
  onEnterCode,
  onCancel,
}: QrIntakeCameraProps) {
  return (
    <div className="mt-3">
      <div className="relative h-48 w-full overflow-hidden border border-white/25 bg-black sm:h-52">
        <div id={READER_ID} className="h-full w-full" />
        <span
          aria-hidden
          className="scan-sweep pointer-events-none absolute inset-x-0 h-[2px] bg-caution"
        />
        <span aria-hidden className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-white/80" />
        <span aria-hidden className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-white/80" />
        <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-white/80" />
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-white/80" />
      </div>

      {cameras.length > 0 && (
        <label className="mt-3 block">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-white/50">
            Camera
          </span>
          <select
            value={cameraId}
            onChange={(event) => onChangeCamera(event.target.value)}
            disabled={requesting}
            className="mt-1 h-12 w-full border border-white/25 bg-paper px-3 font-data text-xs text-ink outline-none focus:border-white"
          >
            {cameras.map((camera, index) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="mt-3 text-sm leading-relaxed text-white/70">{message}</p>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={onEnterCode}
          className="flex h-12 touch-manipulation items-center justify-center bg-paper px-4 font-data text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-zinc-100"
        >
          Enter code instead
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-12 touch-manipulation items-center justify-center border border-white/30 px-4 font-data text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10"
        >
          Cancel scan
        </button>
      </div>
    </div>
  );
}
