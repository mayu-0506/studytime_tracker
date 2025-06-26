// utils/cleanup-profile-images.ts
import { createClient } from "@/utils/supabase/client"

/**
 * Base64画像データをuser_metadataから削除してHTTP 431エラーを解決するためのクリーンアップスクリプト
 */
export async function cleanupBase64ProfileImages() {
  const supabase = createClient()
  
  try {
    // 現在のユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`ユーザー取得エラー: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('ログインが必要です')
    }
    
    // 現在のプロフィール画像がBase64データかどうかをチェック
    const currentProfileImage = user.user_metadata?.profile_image
    
    if (!currentProfileImage) {
      console.log('プロフィール画像が設定されていません')
      return { success: true, message: 'クリーンアップ不要' }
    }
    
    // Base64データかどうかを判定（data:image/で始まる場合はBase64）
    const isBase64 = currentProfileImage.startsWith('data:image/')
    
    if (!isBase64) {
      console.log('プロフィール画像は既にURL形式です')
      return { success: true, message: 'クリーンアップ不要' }
    }
    
    console.log('Base64プロフィール画像を削除中...')
    
    // user_metadataからprofile_imageを削除
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        profile_image: null // Base64データを削除
      }
    })
    
    if (updateError) {
      throw new Error(`メタデータ更新エラー: ${updateError.message}`)
    }
    
    console.log('Base64プロフィール画像を正常に削除しました')
    return { 
      success: true, 
      message: 'Base64プロフィール画像を削除しました。新しい画像をアップロードしてください。' 
    }
    
  } catch (error) {
    console.error('クリーンアップエラー:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'クリーンアップに失敗しました' 
    }
  }
}

/**
 * 手動実行用のクリーンアップ関数
 * ブラウザのコンソールで実行可能
 */
export async function runProfileImageCleanup() {
  console.log('プロフィール画像のクリーンアップを開始...')
  const result = await cleanupBase64ProfileImages()
  
  if (result.success) {
    console.log('✅ クリーンアップ完了:', result.message)
  } else {
    console.error('❌ クリーンアップ失敗:', result.message)
  }
  
  return result
}