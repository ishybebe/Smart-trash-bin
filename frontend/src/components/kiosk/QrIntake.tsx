'use client';

import { QrIntakeCamera } from '@/components/kiosk/QrIntakeCamera';
import { QrIntakeEntry } from '@/components/kiosk/QrIntakeEntry';
import { useQrIntake, type QrIntakeProps } from '@/components/kiosk/useQrIntake';

export function QrIntake(props: QrIntakeProps) {
  const {
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
  } = useQrIntake(props);

  return (
    <section className="bg-ink px-5 py-6 text-white sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-data text-[10px] uppercase tracking-[0.24em] text-white/50">
          Points intake
        </p>
        <p className="font-data text-[10px] uppercase tracking-[0.14em] text-white/50">
          Single use
        </p>
      </div>

      {status === 'loaded' ? (
        <div className="mt-4">
          <div className="flex items-end gap-3">
            <span className="font-display text-4xl font-extrabold leading-none tabular-nums text-white">
              +{credited}
            </span>
            <span className="mb-1 font-data text-[10px] uppercase tracking-[0.16em] text-white/50">
              points loaded
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 flex h-12 w-full touch-manipulation items-center justify-center border border-white/30 px-4 font-data text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Load another code
          </button>
        </div>
      ) : showCamera ? (
        <QrIntakeCamera
          cameras={cameras}
          cameraId={cameraId}
          requesting={requesting}
          message={message}
          onChangeCamera={(deviceId) => void changeCamera(deviceId)}
          onEnterCode={enterCodeFromCamera}
          onCancel={reset}
        />
      ) : (
        <QrIntakeEntry
          status={status}
          message={message}
          cameraHint={cameraHint}
          manualOpen={manualOpen}
          manualCode={manualCode}
          busyState={busyState}
          requesting={requesting}
          faulted={faulted}
          onCodeChange={setManualCode}
          onSubmit={submitManual}
          onOpenScanner={() => void openScanner()}
          onOpenManual={openManual}
          onCloseManual={closeManual}
        />
      )}
    </section>
  );
}
