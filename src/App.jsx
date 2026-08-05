// ─── App.jsx ─────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useFact }       from './hooks/useFact';
import { StarPattern }   from './components/StarPattern';
import { Header }        from './components/Header';
import { FactCard }      from './components/FactCard';
import { ActionBar }     from './components/ActionBar';
import { NotificationToggle } from './components/NotificationToggle';
import './styles/global.css';
import styles from './App.module.css';

export default function App() {
  const { fact, loading, loadFact } = useFact();
  const [animKey, setAnimKey] = useState(0);

  
  async function handleNewFact() {
    await loadFact(true);
    setAnimKey(prev => prev + 1);
  }

  // Islamic (Hijri) calendar date via the built-in Intl API — no library needed.
  // 'islamic-umalqura' is the Saudi Umm al-Qura standard used for religious dates.
  const dateString = useMemo(() => {
    return new Date().toLocaleDateString('en-GB-u-ca-islamic-umalqura', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }, []);


  const installHint = useMemo(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone;
    if (isStandalone) return '';
    if (/iphone|ipad|ipod/i.test(navigator.userAgent))
      return 'Tap Share → Add to Home Screen to install';
    if (/android/i.test(navigator.userAgent))
      return 'Tap ⋮ → Add to Home Screen to install';
    return 'Add to home screen for daily access';
  }, []);


  function handleShare() {
    if (!fact) return;
    const text = `✦ Islamic Fact of the Day ✦\n\n${fact.fact}\n— ${fact.source}\n${fact.sourceUrl ?? ''}`.trim();
    if (navigator.share) {
      navigator.share({ title: 'Islamic Fact of the Day', text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  return (
    <>
      <StarPattern />
      <main className={styles.app}>
        <Header dateString={dateString} />
        <FactCard fact={fact} loading={loading} animKey={animKey} />
        <NotificationToggle />
        <ActionBar
          onNewFact={handleNewFact}
          onShare={handleShare}
          disabled={loading || !fact}
          installHint={installHint}
        />
      </main>
    </>
  );
}
