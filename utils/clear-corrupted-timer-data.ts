/**
 * 破損したタイマーデータをクリアする
 * ローカルストレージから無効なタイマーデータを検出して削除
 */
export function clearCorruptedTimerData() {
  const savedSession = localStorage.getItem("unsaved_study_session")
  
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession)
      const elapsedTime = parsed.elapsedTime || 0
      const pausedTime = parsed.pausedTime || 0
      
      // 無効なデータのチェック
      const isCorrupted = 
        elapsedTime < 0 || 
        pausedTime < 0 || 
        pausedTime > elapsedTime ||
        elapsedTime > 86400 || // 24時間以上
        !parsed.session?.id // セッションIDがない
      
      if (isCorrupted) {
        console.warn("Corrupted timer data detected, clearing...", {
          elapsedTime,
          pausedTime,
          hasSessionId: !!parsed.session?.id
        })
        localStorage.removeItem("unsaved_study_session")
        return true
      }
    } catch (error) {
      console.error("Failed to parse saved session, clearing...", error)
      localStorage.removeItem("unsaved_study_session")
      return true
    }
  }
  
  return false
}