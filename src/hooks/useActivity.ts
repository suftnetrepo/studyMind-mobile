import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { activityService, type StreakData } from '../services/api'

// Refetches whenever the screen regains focus, so numbers update after studying.
function useFocusFetch<T>(fetcher: () => Promise<T>) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try { setData(await fetcher()) } catch {}
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { refetch() }, [refetch]))

  return { data, loading, refetch }
}

export const useStreak = () => useFocusFetch<StreakData>(activityService.streak)
