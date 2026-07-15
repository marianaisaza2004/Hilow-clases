import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-800 bg-neutral-900/60 px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center gap-6">
          <span className="font-semibold text-white">HiLow Planner</span>
          <Link href="/dashboard" className="text-sm text-neutral-300 hover:text-white">
            Calendario
          </Link>
          <Link href="/exercises" className="text-sm text-neutral-300 hover:text-white">
            Catálogo de ejercicios
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
