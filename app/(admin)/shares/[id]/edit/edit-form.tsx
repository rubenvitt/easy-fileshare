"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { updateShare } from "@/app/(admin)/dashboard/actions";
import { toast } from "sonner";

interface EditFormProps {
  share: {
    id: string;
    title: string;
    description: string | null;
    expiresAt: number;
    maxDownloads: number | null;
    hasPassword: boolean;
  };
  maxExpiryDays: number;
}

export function EditForm({ share, maxExpiryDays }: EditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(share.title);
  const [description, setDescription] = useState(share.description ?? "");
  const [expiryDays, setExpiryDays] = useState(1);
  const [maxDownloads, setMaxDownloads] = useState(
    share.maxDownloads != null ? String(share.maxDownloads) : ""
  );
  const [changePassword, setChangePassword] = useState(false);
  const [removePassword, setRemovePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Bitte gib einen Titel ein.");
      return;
    }

    startTransition(async () => {
      try {
        let password: string | null | undefined = undefined;
        if (removePassword) {
          password = null;
        } else if (changePassword && newPassword) {
          password = newPassword;
        }

        await updateShare(share.id, {
          title: title.trim(),
          description: description.trim() || null,
          expiryDays,
          maxDownloads: maxDownloads ? Number(maxDownloads) : null,
          password,
        });

        toast.success("Sharing wurde aktualisiert.");
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Fehler beim Aktualisieren."
        );
      }
    });
  };

  const currentExpiryDate = new Date(share.expiresAt * 1000);
  const isExpired = currentExpiryDate < new Date();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          placeholder="z.B. Projektbericht Q1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Beschreibung{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Zusaetzliche Informationen zum Sharing..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="expiry">Ablauf verlaengern</Label>
        <p className="text-sm text-muted-foreground">
          Aktuell:{" "}
          <span className={isExpired ? "text-destructive font-medium" : ""}>
            {currentExpiryDate.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {isExpired && " (abgelaufen)"}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="expiry"
            type="number"
            min={1}
            max={maxExpiryDays}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">
            Tage ab jetzt (max. {maxExpiryDays})
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxDownloads">
          Max Downloads{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="maxDownloads"
          type="number"
          min={1}
          placeholder="Unbegrenzt"
          value={maxDownloads}
          onChange={(e) => setMaxDownloads(e.target.value)}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {share.hasPassword
            ? "Dieses Sharing ist passwortgeschuetzt."
            : "Dieses Sharing hat kein Passwort."}
        </p>

        {share.hasPassword && (
          <div className="flex items-center gap-3">
            <Switch
              checked={removePassword}
              onCheckedChange={(checked) => {
                setRemovePassword(checked);
                if (checked) {
                  setChangePassword(false);
                  setNewPassword("");
                }
              }}
            />
            <Label>Passwort entfernen</Label>
          </div>
        )}

        {!removePassword && (
          <div className="flex items-center gap-3">
            <Switch
              checked={changePassword}
              onCheckedChange={(checked) => {
                setChangePassword(checked);
                if (!checked) setNewPassword("");
              }}
            />
            <Label>
              {share.hasPassword ? "Passwort aendern" : "Passwort setzen"}
            </Label>
          </div>
        )}

        {changePassword && !removePassword && (
          <Input
            type="password"
            placeholder="Neues Passwort eingeben"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Wird gespeichert..." : "Sharing aktualisieren"}
      </Button>
    </form>
  );
}
