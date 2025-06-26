import { createClient } from "@/utils/supabase/client"

interface UploadAvatarResult {
  url: string | null
  error: string | null
}

/**
 * プロフィール画像をアップロードして、プロフィールのavatar_urlを更新
 * @param file - アップロードする画像ファイル
 * @param userId - ユーザーID
 * @returns アップロードされた画像のURL、またはエラー
 */
export async function uploadAvatar(file: File, userId: string): Promise<UploadAvatarResult> {
  try {
    const supabase = createClient()
    
    // ファイルサイズチェック（2MB制限）
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return { url: null, error: "ファイルサイズは2MB以下にしてください" }
    }
    
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      return { url: null, error: "画像ファイルを選択してください" }
    }
    
    // ファイル名を生成（常に同じファイル名でupsert）
    const fileExt = file.name.split('.').pop()
    const fileName = `profile.${fileExt}`
    const filePath = `${userId}/${fileName}`
    
    // 既存のファイルを削除（あれば）
    const { error: deleteError } = await supabase.storage
      .from('profile')
      .remove([filePath])
    
    // エラーは無視（ファイルが存在しない場合もあるため）
    
    // 新しいファイルをアップロード
    const { error: uploadError, data } = await supabase.storage
      .from('profile')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { url: null, error: "画像のアップロードに失敗しました" }
    }
    
    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('profile')
      .getPublicUrl(filePath)
    
    if (!urlData.publicUrl) {
      return { url: null, error: "画像URLの取得に失敗しました" }
    }
    
    // タイムスタンプを追加してキャッシュをバイパス
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
    
    // プロフィールのavatar_urlを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Profile update error:', updateError)
      return { url: null, error: "プロフィールの更新に失敗しました" }
    }
    
    return { url: avatarUrl, error: null }
  } catch (error) {
    console.error('Unexpected error in uploadAvatar:', error)
    return { url: null, error: "予期しないエラーが発生しました" }
  }
}

/**
 * 画像をリサイズ（2MB超の場合）
 * @param file - リサイズする画像ファイル
 * @param maxWidth - 最大幅
 * @param maxHeight - 最大高さ
 * @returns リサイズされた画像ファイル
 */
export async function resizeImage(
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 800
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // アスペクト比を保持してリサイズ
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to resize image'))
              return
            }
            
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            
            resolve(resizedFile)
          },
          file.type,
          0.85 // 品質85%
        )
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}