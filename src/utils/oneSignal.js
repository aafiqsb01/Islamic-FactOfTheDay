const APP_ID =
  (import.meta.env.VITE_ONESIGNAL_APP_ID || '14996b7d-30b9-4a71-8f1c-cae2395e750e').trim();

let initQueued = false;

/** Queue a single OneSignal.init — safe across StrictMode remounts. */
export function queueOneSignalInit() {
  if (typeof window === 'undefined' || initQueued) return;

  initQueued = true;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
  });
}

/** Run a callback once the OneSignal SDK is ready. */
export function withOneSignal(callback) {
  if (typeof window === 'undefined') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    await callback(OneSignal);
  });
}

export function getOneSignalAppId() {
  return APP_ID;
}
