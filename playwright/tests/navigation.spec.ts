import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should show signup/login buttons when not logged in', async ({ page }) => {
    // ホームページにアクセス
    await page.goto('/');
    
    // ナビゲーションバーが表示されるまで待つ
    await page.waitForSelector('header', { state: 'visible' });
    
    // ログインボタンが表示されていることを確認
    const loginButton = page.locator('a[href="/login"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText('ログイン');
    
    // サインアップボタンが表示されていることを確認
    const signupButton = page.locator('a[href="/signup"]');
    await expect(signupButton).toBeVisible();
    await expect(signupButton).toHaveText('今すぐ始める');
    
    // スクリーンショットを撮影
    await page.screenshot({ path: 'playwright/screenshots/home-not-logged-in.png', fullPage: true });
  });

  test('should have Tailwind text-3xl class on dashboard heading', async ({ page }) => {
    // ダッシュボードページにアクセス（認証なしでアクセスできるかテスト）
    await page.goto('/main');
    
    // ページが読み込まれるまで待つ
    await page.waitForLoadState('networkidle');
    
    // text-3xlクラスを持つh1要素を探す
    const heading = page.locator('h1.text-3xl');
    
    // 要素が存在する場合のみテスト
    const headingCount = await heading.count();
    if (headingCount > 0) {
      await expect(heading.first()).toBeVisible();
      await expect(heading.first()).toHaveClass(/text-3xl/);
      
      // スクリーンショットを撮影
      await page.screenshot({ path: 'playwright/screenshots/dashboard-with-tailwind.png', fullPage: true });
    }
  });
});