import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './server/auth/token';

const PASSWORD_PAGE = '/admin/account';

// Бірінші қорғаныс қабаты: /admin беттеріне жарамды сессиясыз кіргізбейді.
// Толық тексеру (админ белсенді ме, пароль ауыспаған ба) — requireAdmin() ішінде, базадан.
// Ескерту: мұнда request header-лерін қайта жазбаймыз — ол server action-дарда cookie-ді жоғалтады.
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  // Бірінші кіргенде — алдымен парольді ауыстыру.
  if (session.pw && request.nextUrl.pathname !== PASSWORD_PAGE) {
    return NextResponse.redirect(new URL(PASSWORD_PAGE, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
