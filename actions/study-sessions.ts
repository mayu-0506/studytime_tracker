"use server"

import { createClient } from "@/utils/supabase/server"
import { StudySessionType, SubjectType, CustomSubjectType } from "@/types"
import { PresetSubject } from "@/types/database"
import { revalidatePath } from "next/cache"

/**
 * 学習セッションを作成（新DB構造対応）
 */
export async function createSession(
  subjectId: string,
  startTime: Date = new Date()
): Promise<{ data: StudySessionType | null; error: string | null }> {
  try {
    console.log('=== セッション作成デバッグ開始 ===')
    console.log('科目ID:', subjectId)
    console.log('開始時間:', startTime)
    
    // 科目IDの形式を検証
    if (!subjectId || subjectId.trim() === '') {
      console.error('❌ 科目IDが空です')
      return { data: null, error: "科目を選択してください" }
    }
    
    const supabase = await createClient()
    
    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ 認証エラー:', authError)
      return { data: null, error: "認証エラーが発生しました" }
    }
    
    console.log('現在のユーザー:', user ? { id: user.id, email: user.email } : 'null')
    
    if (!user) {
      return { data: null, error: "認証が必要です" }
    }
    
    // プリセット科目かカスタム科目かを判定
    const isPreset = subjectId.startsWith('preset_')
    console.log('科目タイプ:', isPreset ? 'プリセット' : 'カスタム')
    
    const insertData: any = {
      user_id: user.id,
      start_time: startTime.toISOString(),
      source: 'timer' as const,
      // 旧フィールド（互換性のため）
      duration: null
    }
    
    if (isPreset) {
      // プリセット科目の場合
      const presetKey = subjectId.replace('preset_', '')
      const validPresets = ['数学', '英語', '国語', '理科', '社会', 'その他']
      
      if (!validPresets.includes(presetKey)) {
        console.error('❌ 無効なプリセット科目:', presetKey)
        return { data: null, error: `無効なプリセット科目です: ${presetKey}` }
      }
      
      // 旧subjects テーブルからプリセット科目のIDを取得（互換性のため）
      const { data: oldSubject, error: oldSubjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', presetKey)
        .is('user_id', null)
        .maybeSingle()
      
      if (oldSubjectError) {
        console.log('旧subjectsテーブルから取得できません:', oldSubjectError)
      }
      
      insertData.preset_subject = presetKey
      insertData.custom_subject_id = null // 明示的にnullを設定
      
      // 新DB構造では subject_id は必須ではない
      if (oldSubject?.id) {
        insertData.subject_id = oldSubject.id
        console.log('プリセット科目名:', presetKey, '旧ID:', oldSubject.id)
      } else {
        // 新DB構造を使用するため、subject_idはnullのままにする
        // 注: Supabaseでsubject_idのNOT NULL制約を削除する必要があります
        insertData.subject_id = null
        console.log('⚠️ 新DB構造を使用: preset_subject =', presetKey)
      }
      
      console.log('プリセット科目挿入データ:', insertData)
    } else {
      // カスタム科目の場合
      // UUID形式の確認
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      if (!uuidRegex.test(subjectId)) {
        console.error('❌ 無効なカスタム科目ID形式:', subjectId)
        return { data: null, error: "無効な科目IDです" }
      }
      
      // カスタム科目の存在確認
      const { data: customSubject, error: checkError } = await supabase
        .from('custom_subjects')
        .select('id, name')
        .eq('id', subjectId)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (checkError || !customSubject) {
        console.error('❌ カスタム科目が見つかりません:', checkError)
        return { data: null, error: "指定された科目が見つかりません" }
      }
      
      insertData.preset_subject = null // 明示的にnullを設定
      insertData.custom_subject_id = subjectId
      insertData.subject_id = subjectId // 旧構造でも同じIDを使用
      console.log('カスタム科目確認済み:', customSubject.name)
    }
    
    console.log('挿入データ（最終）:', JSON.stringify(insertData, null, 2))
    
    // データベースに挿入
    const { data, error } = await supabase
      .from("study_sessions")
      .insert(insertData)
      .select()
      .maybeSingle()
    
    if (error) {
      console.error('❌ Supabase詳細エラー:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // よくあるエラーの詳細なメッセージ
      if (error.message?.includes('violates foreign key constraint')) {
        // どの外部キー制約でエラーが発生したか特定
        if (error.message.includes('custom_subject_id')) {
          console.error('❌ カスタム科目の外部キー制約違反')
          console.error('カスタム科目ID:', insertData.custom_subject_id)
          return { data: null, error: "カスタム科目が存在しません。画面を更新してください。" }
        } else if (error.message.includes('subject_id')) {
          console.error('❌ 旧subject_idの外部キー制約違反')
          console.error('subject_id:', insertData.subject_id)
          return { data: null, error: "科目が存在しません（旧テーブル）。Supabaseでプリセット科目を追加してください。" }
        }
        return { data: null, error: "科目が存在しません。画面を更新してください。" }
      }
      
      if (error.message?.includes('null value in column')) {
        const column = error.message.match(/column "([^"]+)"/)?.[1]
        return { data: null, error: `必須項目が入力されていません: ${column}` }
      }
      
      if (error.message?.includes('invalid input value for enum')) {
        return { data: null, error: "無効な科目タイプです。プリセット科目を選び直してください。" }
      }
      
      // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { data: null, error: "データベース接続エラー。ページを再読込してください。" }
      }
      
      return { data: null, error: `セッション作成エラー: ${error.message}` }
    }
    
    console.log('✅ セッション作成成功:', {
      id: data.id,
      preset_subject: data.preset_subject,
      custom_subject_id: data.custom_subject_id
    })
    
    revalidatePath("/study")
    return { data, error: null }
  } catch (err: any) {
    console.error("❌ 予期しないエラー:", err)
    return { data: null, error: `予期しないエラーが発生しました: ${err.message || err}` }
  }
}

/**
 * 学習セッションを更新（終了時刻と時間を記録）
 */
export async function updateSession(
  sessionId: string,
  updates: {
    end_time?: Date
    duration?: number  // 分単位
    memo?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const updateData: any = {}
    
    if (updates.end_time) {
      updateData.end_time = updates.end_time.toISOString()
    }
    if (updates.duration !== undefined) {
      // duration_minに分単位で保存（新DB構造）
      updateData.duration_min = Math.floor(updates.duration)
      // 互換性のためdurationも更新
      updateData.duration = Math.floor(updates.duration)
    }
    if (updates.memo !== undefined) {
      updateData.memo = updates.memo
    }
    
    // デバッグログ追加
    console.log('🔍 updateSession called with:', {
      sessionId,
      updates,
      updateData,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email
    })
    
    
    // 更新前にセッションの状態を確認
    const { data: currentSession, error: checkError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle()
      
    console.log('🔍 Current session check:', {
      found: !!currentSession,
      checkError,
      sessionData: currentSession
    })
    
    
    const { data: updateResult, error, count } = await supabase
      .from("study_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select()
      .maybeSingle()
    
    if (error) {
      // PGRST116 = 行が見つからない場合のエラー
      if (error.code === 'PGRST116') {
        console.warn('⚠️ No rows matched for update - session might have been already updated or deleted')
        // 念のため、セッションの現在の状態を確認
        const { data: checkSession } = await supabase
          .from("study_sessions")
          .select("id, end_time, duration, duration_min")
          .eq("id", sessionId)
          .maybeSingle()
        
        if (checkSession?.end_time) {
          console.log('ℹ️ Session already has end_time:', checkSession)
          // すでに終了している場合は成功として扱う
          return { success: true }
        }
      }
      
      // JSON object requested エラーの場合
      if (error.message?.includes('JSON object requested')) {
        console.error('❌ Multiple or no rows returned error:', {
          sessionId,
          userId: user.id,
          error: error.message
        })
        
        // 重複セッションの確認
        const { data: duplicateSessions } = await supabase
          .from("study_sessions")
          .select("id, user_id, start_time, end_time")
          .eq("id", sessionId)
        
        console.log('🔍 Sessions with same ID:', duplicateSessions)
        
        // user_idとsession_idの組み合わせで検索
        const { data: userSessions } = await supabase
          .from("study_sessions")
          .select("id, start_time, end_time")
          .eq("user_id", user.id)
          .eq("id", sessionId)
        
        console.log('🔍 User sessions with ID:', userSessions)
      }
      
      // デバッグ用：エラー詳細を出力
      console.error('❌ updateSession error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        sessionId,
        updateData,
        currentSession
      })
      
      // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { success: false, error: "セッション保存に失敗しました。再読込みしてください。" }
      }
      return { success: false, error: error.message }
    }
    
    // 更新が成功したか確認（Supabaseのupdateは成功しても結果を返さないことがある）
    if (!updateResult && !error) {
      // 更新後のデータを再取得
      const { data: verifyUpdate, error: verifyError } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle()
      
      if (verifyError || !verifyUpdate) {
        console.error('❌ Session not found for update:', sessionId)
        
        // より詳細な調査
        const { data: allUserSessions } = await supabase
          .from("study_sessions")
          .select("id, user_id, start_time, end_time")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)
          
        console.log('🔍 Recent user sessions:', allUserSessions)
        
        // セッションIDだけで検索（user_id条件なし）
        const { data: sessionById } = await supabase
          .from("study_sessions")
          .select("id, user_id")
          .eq("id", sessionId)
          .maybeSingle()
          
        console.log('🔍 Session by ID only:', sessionById)
        
        return { success: false, error: "セッションが見つかりませんでした" }
      }
      
      // 更新は成功したが、結果が返されなかった場合
      console.log('✅ Update succeeded (verified):', verifyUpdate)
    }
    
    // 更新成功時のログ
    if (updateResult) {
      console.log('✅ updateSession success:', {
        sessionId,
        updateResult,
        updateData
      })
    }
    
    // 更新後のデータを取得
    const { data: updatedSession, error: fetchError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle()
    
    if (fetchError) {
      console.error('❌ Failed to fetch updated session:', fetchError)
    } else if (updatedSession) {
      console.log('🔍 Verification - Updated session:', {
        sessionId,
        end_time: updatedSession.end_time,
        duration: updatedSession.duration,
        duration_min: updatedSession.duration_min,
        hasEndTime: !!updatedSession.end_time,
        hasDuration: !!updatedSession.duration
      })
    }
    
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
        return { success: false, error: "エラーが発生しました" }
  }
}

/**
 * タイマーから完全な学習セッションを一括で記録
 */
export async function recordCompleteSession(
  data: {
    subjectId: string
    startTime: Date
    endTime: Date
    note?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // データ検証
    if (data.startTime >= data.endTime) {
      return { success: false, error: "終了時刻は開始時刻より後である必要があります" }
    }
    
    if (data.startTime > new Date()) {
      return { success: false, error: "未来の学習記録は作成できません" }
    }
    
    // 24時間以上の学習時間は異常として扱う
    const durationMs = data.endTime.getTime() - data.startTime.getTime()
    if (durationMs > 24 * 60 * 60 * 1000) {
      return { success: false, error: "学習時間が24時間を超えています" }
    }
    
    // 時間を分単位で計算
    const duration = Math.round(durationMs / (1000 * 60))
    
    // プリセット科目かカスタム科目かを判定
    const isPreset = data.subjectId.startsWith('preset_')
    const insertData: any = {
      user_id: user.id,
      start_time: data.startTime.toISOString(),
      end_time: data.endTime.toISOString(),
      duration_min: duration,  // 新DB構造
      duration: duration,      // 互換性のため
      memo: data.note || null,
      source: 'timer' as const
    }
    
    if (isPreset) {
      // プリセット科目の場合
      const presetKey = data.subjectId.replace('preset_', '') as PresetSubject
      insertData.preset_subject = presetKey
      insertData.custom_subject_id = null
      insertData.subject_id = null // 新DB構造対応
    } else {
      // カスタム科目の場合
      insertData.preset_subject = null
      insertData.custom_subject_id = data.subjectId
      insertData.subject_id = data.subjectId // 旧構造互換性
    }
    
    console.log('📝 Recording complete session:', {
      subjectId: data.subjectId,
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      duration: duration
    })
    
    const { error } = await supabase
      .from("study_sessions")
      .insert(insertData)
    
    if (error) {
      console.error('❌ Failed to record session:', error)
      
      // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { success: false, error: "セッション保存に失敗しました。再読込みしてください。" }
      }
      
      // 外部キー制約エラーの場合
      if (error.message?.includes('violates foreign key constraint')) {
        return { success: false, error: "科目が存在しません。画面を更新してください。" }
      }
      
      return { success: false, error: error.message }
    }
    
    console.log('✅ Session recorded successfully')
    
    // サーバーアクションではemitStudyEventやSWRのmutateは使用できない
    // revalidatePathでキャッシュを更新
    revalidatePath("/study")
    revalidatePath("/dashboard")
    
    return { success: true }
  } catch (err) {
    console.error("❌ Unexpected error in recordCompleteSession:", err)
    return { success: false, error: "エラーが発生しました" }
  }
}

/**
 * 手動で学習セッションを追加
 */
export async function createManualSession(
  data: {
    subjectId: string
    startTime: Date
    endTime: Date
    memo?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    // 時間を分単位で計算
    const duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60))
    
    // プリセット科目かカスタム科目かを判定
    const isPreset = data.subjectId.startsWith('preset_')
    const insertData: any = {
      user_id: user.id,
      start_time: data.startTime.toISOString(),
      end_time: data.endTime.toISOString(),
      duration_min: duration,  // 新DB構造
      duration: duration,      // 互換性のため
      memo: data.memo || null,
      source: 'manual' as const
    }
    
    if (isPreset) {
      // プリセット科目の場合
      const presetKey = data.subjectId.replace('preset_', '') as PresetSubject
      insertData.preset_subject = presetKey
    } else {
      // カスタム科目の場合
      insertData.custom_subject_id = data.subjectId
    }
    
    const { error } = await supabase
      .from("study_sessions")
      .insert(insertData)
    
    if (error) {
            // スキーマキャッシュエラーの場合
      if (error.message?.includes('schema cache') || error.message?.includes('refresh')) {
        return { success: false, error: "セッション保存に失敗しました。再読込みしてください。" }
      }
      return { success: false, error: error.message }
    }
    
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
        return { success: false, error: "エラーが発生しました" }
  }
}

/**
 * アクティブなセッションを取得
 */
export async function getActiveSession(): Promise<StudySessionType | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from("study_sessions")
      .select(`
        *,
        custom_subject:custom_subjects(*)
      `)
      .eq("user_id", user.id)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code !== "PGRST116") { // not found
              }
      return null
    }
    
    return data
  } catch (err) {
        return null
  }
}

/**
 * 今日の学習セッションを取得
 */
export async function getTodaySessions(): Promise<StudySessionType[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data, error } = await supabase
      .from("study_sessions")
      .select(`
        *,
        custom_subject:custom_subjects(*)
      `)
      .eq("user_id", user.id)
      .gte("start_time", today.toISOString())
      .order("start_time", { ascending: false })
    
    if (error) {
            return []
    }
    
    return data || []
  } catch (err) {
        return []
  }
}

/**
 * 科目別の学習時間サマリーを取得
 */
export async function getSubjectSummary(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ subject_id: string; total_duration: number; subject?: SubjectType }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    let query = supabase
      .from("study_sessions")
      .select(`
        subject_id,
        duration,
        subject:subjects(*)
      `)
      .eq("user_id", user.id)
      .not("duration", "is", null)
    
    if (startDate) {
      query = query.gte("start_time", startDate.toISOString())
    }
    if (endDate) {
      query = query.lte("start_time", endDate.toISOString())
    }
    
    const { data, error } = await query
    
    if (error) {
            return []
    }
    
    // 科目ごとに集計
    const summary = new Map<string, { subject: SubjectType | undefined; total: number }>()
    
    data?.forEach(session => {
      const subjectId = session.subject_id
      const subject = session.subject as unknown as SubjectType | undefined
      const duration = session.duration || 0
      
      const current = summary.get(subjectId) || { subject, total: 0 }
      current.total += duration
      summary.set(subjectId, current)
    })
    
    return Array.from(summary.entries()).map(([id, data]) => ({
      subject_id: id,
      total_duration: data.total,
      subject: data.subject
    }))
  } catch (err) {
        return []
  }
}

/**
 * セッションを削除
 */
export async function deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "認証が必要です" }
    }
    
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id)
    
    if (error) {
            return { success: false, error: error.message }
    }
    
    revalidatePath("/study")
    return { success: true }
  } catch (err) {
        return { success: false, error: "エラーが発生しました" }
  }
}