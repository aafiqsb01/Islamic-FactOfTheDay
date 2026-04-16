// ─── components/ActionBar.jsx ────────────────────────────────────────────────
import { useState } from 'react';
import styles from './ActionBar.module.css';

export function ActionBar({ onNewFact, onShare, disabled, installHint }) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.btnRow}>
        <button
          className={`${styles.btn} ${styles.ghost}`}
          onClick={handleShare}
          disabled={disabled}
          aria-label="Share this fact"
        >
          {copied ? 'Copied ✓' : 'Share'}
        </button>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={onNewFact}
          disabled={disabled}
          aria-label="Load another fact"
        >
          Another Fact
        </button>
      </div>
      {installHint && <p className={styles.hint}>{installHint}</p>}
    </footer>
  );
}
