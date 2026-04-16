// ─── components/Header.jsx ───────────────────────────────────────────────────
import styles from './Header.module.css';

export function Header({ dateString }) {
  return (
    <header className={styles.header}>
      <span className={styles.crescent} aria-hidden="true">☽</span>
      <h1 className={styles.title}>Islamic Fact of the Day</h1>
      <p className={styles.date}>{dateString}</p>
    </header>
  );
}
