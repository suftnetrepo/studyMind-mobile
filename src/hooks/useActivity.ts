import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { activityService, type StreakData, type ActivitySummary } from '../services/api'

// Refetches whenever the screen regains focus, so numbers update after studying.
function useFocusFetch<T>(fetcher: () => Promise<T>) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    let active = true
    fetcher()
      .then((d) => { if (active) setData(d) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading }
}

export const useStreak          = () => useFocusFetch<StreakData>(activityService.streak)
export const useActivitySummary = () => useFocusFetch<ActivitySummary>(activityService.summary)
