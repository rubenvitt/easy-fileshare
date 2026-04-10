"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UploadZone } from "./upload-zone";
import { UploadProgress } from "./upload-progress";
import { useChunkedUpload } from "./use-chunked-upload";
import { toast } from "sonner";

interface CreateFormProps {
  maxFileSize: number;
  maxExpiryDays: number;
  appUrl: string;
}

interface UploadFile {
  file: File;
  id: string;
}

export function CreateForm({ maxFileSize, maxExpiryDays, appUrl }: CreateFormProps) {
  const router = useRouter();
  const { uploadStates, startUpload, isUploading } = useChunkedUpload();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxDownloads, setMaxDownloads] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error("Bitte wähle mindestens eine Datei aus.");
      return;
    }

    if (!title.trim()) {
      toast.error("Bitte gib einen Titel ein.");
      return;
    }

    const shareId = await startUpload(
      files.map((f) => f.file),
      {
        title: title.trim(),
        description: description.trim() || undefined,
        expiryDays,
        maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
        password: passwordEnabled && password ? password : undefined,
      }
    );

    if (shareId) {
      const shareUrl = `${appUrl}/s/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Sharing erstellt! Link wurde kopiert.", {
        description: shareUrl,
      });
      router.push("/dashboard");
    } else {
      toast.error("Upload fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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
          placeholder="Zusätzliche Informationen zum Sharing..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Dateien</Label>
        <UploadZone
          files={files}
          onFilesChange={setFiles}
          maxFileSize={maxFileSize}
        />
      </div>

      {uploadStates.length > 0 && <UploadProgress uploads={uploadStates} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Läuft ab in</Label>
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
              Tage (max. {maxExpiryDays})
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
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch
            checked={passwordEnabled}
            onCheckedChange={setPasswordEnabled}
          />
          <Label>Passwortschutz</Label>
        </div>
        {passwordEnabled && (
          <Input
            type="password"
            placeholder="Passwort eingeben"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isUploading}>
        {isUploading ? "Wird hochgeladen..." : "Sharing erstellen"}
      </Button>
    </form>
  );
}
