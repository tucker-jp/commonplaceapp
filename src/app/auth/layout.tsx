export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <span className="text-4xl">📖</span>
        <h1 className="mt-2 text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
          CommonPlace
        </h1>
      </div>
      {children}
    </div>
  );
}
