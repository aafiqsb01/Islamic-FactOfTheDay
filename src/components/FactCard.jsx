// ─── components/FactCard.jsx ─────────────────────────────────────────────────
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader } from './Loader';
import styles from './FactCard.module.css';

export function FactCard({ fact, loading, animKey }) {
  const [flipped, setFlipped] = useState(false);
  const innerRef = useRef(null);
  const frontFaceRef = useRef(null);
  const frontMeasureRef = useRef(null);
  const backFaceRef = useRef(null);
  const backMeasureRef = useRef(null);

  // Reset flip to front whenever a new fact loads
  useEffect(() => {
    setFlipped(false);
  }, [animKey]);

  const heightKey = useMemo(() => {
    return `${animKey}-${loading ? 'loading' : 'ready'}-${flipped ? 'back' : 'front'}`;
  }, [animKey, loading, flipped]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    function applyHeight() {
      const targetMeasure = flipped ? backMeasureRef.current : frontMeasureRef.current;
      const targetFace = flipped ? backFaceRef.current : frontFaceRef.current;
      if (!targetMeasure || !targetFace) return;

      const measureH = Math.ceil(targetMeasure.scrollHeight || targetMeasure.getBoundingClientRect().height);

      const cs = window.getComputedStyle(targetFace);
      const paddingTop = parseFloat(cs.paddingTop) || 0;
      const paddingBottom = parseFloat(cs.paddingBottom) || 0;
      const borderTop = parseFloat(cs.borderTopWidth) || 0;
      const borderBottom = parseFloat(cs.borderBottomWidth) || 0;

      const next = Math.ceil(measureH + paddingTop + paddingBottom + borderTop + borderBottom);
      if (next > 0) {
        inner.style.transition = 'none';
        inner.style.height = `${next}px`;
        requestAnimationFrame(() => {
          inner.style.transition = '';
        });
      }
    }

    applyHeight();

    const ro = new ResizeObserver(() => applyHeight());
    if (frontMeasureRef.current) ro.observe(frontMeasureRef.current);
    if (backMeasureRef.current) ro.observe(backMeasureRef.current);
    window.addEventListener('resize', applyHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', applyHeight);
    };
  }, [heightKey, flipped]);


  function handleFlip() {
    if (!fact || loading) return;
    setFlipped(prev => !prev);
  }


  return (
    <div className={styles.card} key={animKey}>
      <div ref={innerRef} className={styles.inner} data-flipped={flipped ? 'true' : undefined}>

        {/* FRONT */}
        <div
          ref={frontFaceRef}
          className={`${styles.face} ${styles.front}`}
          aria-hidden={flipped}
          inert={flipped ? true : undefined}
        >
          <div ref={frontMeasureRef} className={styles.measure}>
            {loading || !fact ? (
              <div className={styles.loaderCenter}>
                <Loader />
              </div>
            ) : (
              <div className={styles.content}>
                <span className={styles.badge}>{fact.category}</span>
                <p className={styles.factText}>{fact.fact}</p>
                <div className={styles.divider} aria-hidden="true" />
                <button
                  className={styles.flipHint}
                  onClick={handleFlip}
                  aria-label="Flip card to see source"
                >
                  Tap to verify source ↻
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BACK */}
        <div
          ref={backFaceRef}
          className={`${styles.face} ${styles.back}`}
          aria-hidden={!flipped}
          inert={!flipped ? true : undefined}
        >
          <div ref={backMeasureRef} className={styles.measure}>
            <div className={`${styles.content} ${styles.backContent}`}>
              <span className={styles.backLabel}>Source</span>
              <div className={styles.sourceBlock}>
                <p className={styles.sourceName}>{fact?.source}</p>
                {fact?.sourceUrl ? (
                  <a
                    href={fact.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                    onClick={e => e.stopPropagation()}
                  >
                    {hostnameFrom(fact.sourceUrl)} ↗
                  </a>
                ) : (
                  <p className={styles.noLink}>No link available</p>
                )}
              </div>
              <div className={styles.divider} aria-hidden="true" />
              <button
                className={styles.flipHint}
                onClick={handleFlip}
                aria-label="Flip card back to fact"
              >
                ↺ Back to fact
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


function hostnameFrom(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
