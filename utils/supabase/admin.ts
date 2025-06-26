import { createClient } from '@supabase/supabase-js'

// Supabase Admin クライアント（サービスロールキー使用）
// 注意: このファイルはサーバーサイドでのみ使用すること
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // サービスロールキーが必要
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * 全ユーザーのprofile_imageをBase64からURLに変換
 */
export async function migrateProfileImagesToUrls() {
  console.log('🔄 Starting profile image migration...')
  
  try {
    // 全ユーザーを取得（ページネーション対応）
    let page = 1
    let hasMore = true
    let totalMigrated = 0
    
    while (hasMore) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: 50
      })
      
      if (error) {
        throw error
      }
      
      if (!users || users.length === 0) {
        hasMore = false
        break
      }
      
      // 各ユーザーを処理
      for (const user of users) {
        const metadata = user.user_metadata
        
        // Base64画像を検出
        if (metadata?.profile_image && 
            typeof metadata.profile_image === 'string' &&
            metadata.profile_image.startsWith('data:image/')) {
          
          console.log(`📸 Found Base64 image for user: ${user.email}`)
          
          try {
            // Base64をBlobに変換してSupabase Storageにアップロード
            const base64Data = metadata.profile_image.split(',')[1]
            const mimeType = metadata.profile_image.split(':')[1].split(';')[0]
            const fileExt = mimeType.split('/')[1] || 'png'
            
            // Bufferを使用してBase64をデコード
            const buffer = Buffer.from(base64Data, 'base64')
            
            // ファイル名を生成
            const fileName = `${user.id}_${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`
            
            // Supabase Storageにアップロード
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from('avatars')
              .upload(filePath, buffer, {
                contentType: mimeType,
                upsert: false
              })
            
            if (uploadError) {
              console.error(`❌ Upload error for ${user.email}:`, uploadError)
              continue
            }
            
            // 公開URLを取得
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('avatars')
              .getPublicUrl(filePath)
            
            // ユーザーメタデータを更新
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              user.id,
              {
                user_metadata: {
                  ...metadata,
                  profile_image: null, // Base64を削除
                  avatar_url: publicUrl // URLを保存
                }
              }
            )
            
            if (updateError) {
              console.error(`❌ Update error for ${user.email}:`, updateError)
              continue
            }
            
            console.log(`✅ Migrated profile image for ${user.email}`)
            totalMigrated++
            
          } catch (err) {
            console.error(`❌ Migration error for ${user.email}:`, err)
          }
        }
      }
      
      page++
    }
    
    console.log(`✨ Migration complete! Total migrated: ${totalMigrated}`)
    return { success: true, totalMigrated }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return { success: false, error }
  }
}

/**
 * ユーザーメタデータから大きなデータを削除
 */
export async function cleanupUserMetadata(userId: string) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (error || !user) {
      throw error || new Error('User not found')
    }
    
    const metadata = user.user_metadata || {}
    const cleanedMetadata = { ...metadata }
    
    // 大きなフィールドを削除
    const largeFields = ['profile_image', 'large_data', 'base64_data']
    let cleaned = false
    
    largeFields.forEach(field => {
      if (cleanedMetadata[field] && 
          typeof cleanedMetadata[field] === 'string' &&
          cleanedMetadata[field].length > 1024) {
        console.log(`🗑️ Removing large field: ${field} (${cleanedMetadata[field].length} bytes)`)
        delete cleanedMetadata[field]
        cleaned = true
      }
    })
    
    if (cleaned) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { user_metadata: cleanedMetadata }
      )
      
      if (updateError) {
        throw updateError
      }
      
      console.log(`✅ Cleaned metadata for user ${userId}`)
    }
    
    return { success: true, cleaned }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    return { success: false, error }
  }
}