/**
 * Vercel Edge Middleware - Basic認証
 * 環境変数でユーザー名とパスワードを設定
 *
 * 必要な環境変数:
 * - BASIC_AUTH_USER: ユーザー名
 * - BASIC_AUTH_PASSWORD: パスワード
 * - BASIC_AUTH_ENABLED: "true" で認証を有効化
 */

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}

export default function middleware(request: Request) {
  const authEnabled = process.env.BASIC_AUTH_ENABLED === 'true'

  if (!authEnabled) {
    return
  }

  const basicAuth = request.headers.get('authorization')
  const expectedUser = process.env.BASIC_AUTH_USER || 'admin'
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD || 'password'

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    try {
      const [user, password] = atob(authValue).split(':')
      if (user === expectedUser && password === expectedPassword) {
        return
      }
    } catch {
      // Invalid base64
    }
  }

  return new Response('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"'
    }
  })
}
