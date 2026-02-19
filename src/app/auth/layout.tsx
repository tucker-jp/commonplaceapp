export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <span className="text-4xl">📖</span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          CommonPlace
        </h1>
      </div>
      {children}
    </div>
  );
}
