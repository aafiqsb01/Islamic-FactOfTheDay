// ─── components/NotificationToggle.jsx ───────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { withOneSignal } from '../utils/oneSignal.js';
import styles from './NotificationToggle.module.css';

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOSSafari() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const showIOSHint = useMemo(
    () => isIOSSafari() && !isStandaloneMode(),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const onPermissionChange = (granted) => {
      if (!cancelled) setEnabled(granted);
    };

    withOneSignal(async (OneSignal) => {
      if (cancelled) return;

      setEnabled(OneSignal.Notifications.permission);
      OneSignal.Notifications.addEventListener('permissionChange', onPermissionChange);
    });

    return () => {
      cancelled = true;
      withOneSignal(async (OneSignal) => {
        OneSignal.Notifications.removeEventListener('permissionChange', onPermissionChange);
      });
    };
  }, []);

  function handleNotificationClick() {
    if (enabled || busy || showIOSHint) return;

    setBusy(true);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const granted = await OneSignal.Notifications.requestPermission();
        setEnabled(granted);
      } catch (err) {
        console.error('Permission request failed:', err);
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <section className={styles.section} aria-label="Daily notifications">
      {showIOSHint && (
        <p className={styles.banner}>
          Add this app to your Home Screen first to enable daily notifications on iOS.
        </p>
      )}

      <button
        type="button"
        className={`${styles.btn} ${enabled ? styles.enabled : styles.actionable} ${showIOSHint ? styles.blocked : ''}`}
        onClick={handleNotificationClick}
        disabled={enabled || busy || showIOSHint}
        aria-pressed={enabled}
        aria-busy={busy}
        aria-label={
          enabled
            ? 'Daily fact notifications enabled'
            : 'Enable daily fact notifications'
        }
      >
        {busy
          ? 'Enabling…'
          : enabled
            ? 'Daily Notifications On ✓'
            : 'Enable Daily Fact Notifications'}
      </button>
    </section>
  );
}
