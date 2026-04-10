"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface PasswordGateProps {
  shareId: string;
  children: ReactNode;
}

export function PasswordGate({ shareId, children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setChecking(true);

    try {
      const res = await fetch(`/api/download/${shareId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setUnlocked(true);
      } else {
        setError("Falsches Passwort.");
      }
    } catch {
      setError("Fehler bei der Überprüfung.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="text-center py-20 max-w-sm mx-auto">
      <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h1 className="text-xl font-semibold mb-2">Passwortgeschützt</h1>
      <p className="text-muted-foreground mb-6">
        Dieses Sharing ist passwortgeschützt.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort eingeben"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={checking}>
          {checking ? "Prüfe..." : "Entsperren"}
        </Button>
      </form>
    </div>
  );
}
