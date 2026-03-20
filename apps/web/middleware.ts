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
      url.pathname = "/login"
      url.searchParams.set("next", `${pathname}${search}`)
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  // Student protection for gameplay and code submission
  if (pathname.startsWith("/pet")) {
    const studentToken = req.cookies.get("kidscode_student")?.value
    if (studentToken) return NextResponse.next()

    const adminToken = req.cookies.get("kidscode_admin")?.value
    if (adminToken) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith("/play") || pathname.startsWith("/exercises")) {
    const token = req.cookies.get("kidscode_student")?.value
    if (!token) {
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
  matcher: ["/admin/:path*", "/play/:path*", "/exercises/:path*", "/pet/:path*"]
}
