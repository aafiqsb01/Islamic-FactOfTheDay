import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { getUkDateString } from '../utils/ukDate'
import {
  clearBrowsingState,
  normalizeFactRow,
  pickAnotherFact,
  readBrowsingState,
  resolveDisplayedFact,
  writeBrowsingState,
} from '../utils/browsingState'

async function fetchDailyFactFromApi() {
  const response = await fetch('/api/daily-fact')
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload?.success || !payload?.fact) {
    throw new Error(payload?.error || 'Failed to load daily fact')
  }

  return {
    date: payload.date,
    fact: payload.fact,
  }
}

export function useFact() {
  const [dailyFact, setDailyFact] = useState(null)
  const [dailyFactDate, setDailyFactDate] = useState(null)
  const [fact, setFact] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const applyResolvedDisplay = useCallback((nextDailyFact, nextDate) => {
    const browsingState = readBrowsingState()
    const resolved = resolveDisplayedFact({
      dailyFact: nextDailyFact,
      browsingState,
    })

    if (resolved.clear) {
      clearBrowsingState()
    }

    setDailyFact(nextDailyFact)
    setDailyFactDate(nextDate)
    setFact(resolved.fact)
  }, [])

  const loadDailyFact = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { date, fact: todaysFact } = await fetchDailyFactFromApi()
      applyResolvedDisplay(todaysFact, date)
    } catch (err) {
      console.error(err)
      setError('Could not load fact from database')
      setDailyFact(null)
      setDailyFactDate(null)
      setFact(null)
    } finally {
      setLoading(false)
    }
  }, [applyResolvedDisplay])

  const loadAnotherFact = useCallback(async () => {
    if (!dailyFact) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('facts')
        .select('id, text, category, source_title, source_url')

      if (queryError) throw queryError
      if (!data?.length) throw new Error('No facts found in database')

      const next = pickAnotherFact(data.map(normalizeFactRow), {
        dailyFactId: dailyFact.id,
        currentFactId: fact?.id,
      })

      // Temporary browsing only — never write to fact_history.
      const now = Date.now()
      const date = dailyFactDate || getUkDateString()
      writeBrowsingState({
        lastAnotherFactAt: now,
        displayedFactId: next.id,
        displayedFactDate: date,
        displayedFact: next,
      })

      setFact(next)
    } catch (err) {
      console.error(err)
      setError('Could not load fact from database')
    } finally {
      setLoading(false)
    }
  }, [dailyFact, dailyFactDate, fact?.id])

  const revalidateDisplay = useCallback(() => {
    if (!dailyFact) return

    const today = getUkDateString()
    if (dailyFactDate && dailyFactDate !== today) {
      // New UK calendar day — reload the authoritative daily fact.
      loadDailyFact()
      return
    }

    const resolved = resolveDisplayedFact({
      dailyFact,
      browsingState: readBrowsingState(),
    })

    if (resolved.clear) {
      clearBrowsingState()
    }

    setFact(resolved.fact)
  }, [dailyFact, dailyFactDate, loadDailyFact])

  useEffect(() => {
    loadDailyFact()
  }, [loadDailyFact])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        revalidateDisplay()
      }
    }

    function onFocus() {
      revalidateDisplay()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [revalidateDisplay])

  return {
    fact,
    dailyFact,
    loading,
    error,
    loadFact: loadAnotherFact,
    loadDailyFact,
    revalidateDisplay,
  }
}
