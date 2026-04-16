import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useFact() {
  const [fact, setFact] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadFact = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('facts')
        .select('text, category, source_title, source_url')

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('No facts found in database')
      }

      // pick random fact
      const randomFact = data[Math.floor(Math.random() * data.length)]

      // normalize shape to match your UI expectations
      setFact({
        fact: randomFact.text,
        category: randomFact.category,
        source: randomFact.source_title,
        sourceUrl: randomFact.source_url
      })

    } catch (err) {
      console.error(err)
      setError('Could not load fact from database')
      setFact(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFact()
  }, [loadFact])

  return { fact, loading, error, loadFact }
}