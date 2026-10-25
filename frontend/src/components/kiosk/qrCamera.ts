export const READER_ID = 'kiosk-reader';
export const QR_BOX = 160;

export type CameraTarget = string | MediaTrackConstraints;

export function cameraEnvironment(): { available: boolean; message: string } {
  if (typeof window === 'undefined') {
    return { available: false, message: 'The camera is not available in this view.' };
  }

  if (!window.isSecureContext) {
    return {
      available: false,
      message:
        'Camera scanning needs HTTPS or localhost. This page is on a network address, so enter the code below.',
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      available: false,
      message: 'This browser does not expose a camera. Enter the code below.',
    };
  }

  return { available: true, message: '' };
}

function cameraErrorName(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: unknown }).name ?? '');
  }
  return '';
}

export function describeCameraError(error: unknown): string {
  switch (cameraErrorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Camera access is blocked. Allow the camera in this browser, then try again or enter the code below.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found. Enter the code from your points claim instead.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is busy in another app. Close it, then try again or enter the code below.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'That camera could not be started. Choose another camera or enter the code below.';
    case 'AbortError':
      return 'The camera stopped before it could start. Try again or enter the code below.';
    default:
      return 'The camera could not start. Try again, use another camera, or enter the code below.';
  }
}
