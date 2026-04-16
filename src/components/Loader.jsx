// ─── components/Loader.jsx ───────────────────────────────────────────────────
import styles from './Loader.module.css';

export function Loader() {
  return (
    <div className={styles.wrapper} role="status" aria-label="Loading fact">
      <div className={styles.spinner} />
      <p className={styles.text}>Seeking knowledge…</p>
    </div>
  );
}
