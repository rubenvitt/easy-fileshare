import { ThemeToggle } from "@/components/theme-toggle";

const appName = process.env.APP_NAME || "EasyShare";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{appName}</h1>
        </div>
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
