import { CreateForm } from "./create-form";

export default function NewSharePage() {
  const maxFileSize = Number(process.env.MAX_FILE_SIZE ?? 524288000);
  const maxExpiryDays = Number(process.env.MAX_EXPIRY_DAYS ?? 7);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Neues Sharing erstellen</h1>
      <CreateForm
        maxFileSize={maxFileSize}
        maxExpiryDays={maxExpiryDays}
        appUrl={appUrl}
      />
    </div>
  );
}
