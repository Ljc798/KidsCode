import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Admin protection
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next()
    if (pathname.startsWith("/admin/login/")) return NextResponse.next()

    const token = req.cookies.get("kidscode_admin")?.value
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(url)
    }

    // Verify via API to avoid env/config mismatch between web and api (e.g. ADMIN_JWT_SECRET).
    const meUrl = new URL("/api/auth/admin/me", req.url)
    const meRes = await fetch(meUrl, {
      headers: { cookie: `kidscode_admin=${token}` },
      cache: "no-store"
    })
    if (!meRes.ok) {
      const url = req.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  // Student protection for gameplay and code submission
  if (pathname.startsWith("/play") || pathname.startsWith("/exercises")) {
    const token = req.cookies.get("kidscode_student")?.value
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(url)
    }
    const meUrl = new URL("/api/auth/student/me", req.url)
    const meRes = await fetch(meUrl, {
      headers: { cookie: `kidscode_student=${token}` },
      cache: "no-store"
    })
    if (!meRes.ok) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/play/:path*", "/exercises/:path*"]
}
