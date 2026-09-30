export function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/")
  );
}
