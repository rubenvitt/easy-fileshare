import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4 opacity-20">404</div>
      <h1 className="text-xl font-semibold mb-2">Seite nicht gefunden</h1>
      <p className="text-muted-foreground mb-6">
        Die angeforderte Seite existiert nicht.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Zum Dashboard
      </Link>
    </div>
  );
}
