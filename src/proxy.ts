import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
};
