// ─── hooks/useFact.js ────────────────────────────────────────────────────────
//
// A custom hook that bundles all fact-fetching state and logic together.
// The App component just calls useFact() and gets everything it needs back.

import { useState, useCallback, useEffect } from 'react';
import { fetchIslamicFact, FALLBACK_FACT } from '../services/claudeApi';

export function useFact() {
  const [fact, setFact]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const loadFact = useCallback(async (isBonus = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIslamicFact(isBonus);
      setFact(result);
    } catch (err) {
      console.error('Failed to fetch fact:', err);
      setError('Could not load a fact. Showing a classic instead.');
      setFact(FALLBACK_FACT);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load today's fact on mount
  useEffect(() => {
    loadFact(false);
  }, [loadFact]);

  return { fact, loading, error, loadFact };
}
