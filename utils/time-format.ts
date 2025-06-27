// 分を時間:分形式に変換（秒は除去）
export function formatMinutesToHoursMinutes(minutes: number): string {
  // undefined, null, NaNのチェック
  if (minutes === undefined || minutes === null || isNaN(minutes)) {
    return '0分'
  }
  
  // 0や負の値の場合
  if (minutes <= 0) {
    return '0分'
  }
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}分`
  }
  
  return mins === 0 ? `${hours}時間` : `${hours}時間${mins}分`
}

// 時刻文字列をHH:MM形式に変換（秒は除去）
export function formatTimeToHoursMinutes(timeString: string): string {
  const date = new Date(timeString)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// ISO文字列から日本時間のHH:MM形式を取得
export function formatISOToJapanTime(isoString: string): string {
  const date = new Date(isoString)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 開始時間と終了時間から勉強時間を計算（分単位、秒切り捨て）
export function calculateStudyMinutes(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime()
  return Math.floor(diffMs / (1000 * 60)) // ミリ秒から分に変換（秒切り捨て）
}

// 秒から分に変換（秒切り捨て）
export function secondsToMinutes(seconds: number): number {
  return Math.floor(seconds / 60)
}

// 秒を時間:分:秒形式に変換（タイマー表示用）
export function formatTime(seconds: number): string {
  // 負の値の場合は0として扱う
  const absSeconds = Math.max(0, seconds)
  
  const hours = Math.floor(absSeconds / 3600)
  const minutes = Math.floor((absSeconds % 3600) / 60)
  const secs = absSeconds % 60
  
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0")
  ].join(":")
}

// 勉強時間のフォーマット（開始時間と終了時間から）
export function formatStudyTime(startTime: Date, endTime: Date): string {
  const totalMinutes = calculateStudyMinutes(startTime, endTime)
  return formatMinutesToHoursMinutes(totalMinutes)
}