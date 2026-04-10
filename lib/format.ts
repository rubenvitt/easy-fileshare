/**
 * Format bytes into a human-readable file size string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format a unix timestamp as a relative time string in German.
 * Examples: "in 3 Tagen", "in 2 Stunden", "abgelaufen", "heute"
 */
export function formatRelativeTime(unixTs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = unixTs - now;
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffSeconds / 3600);
  const diffDays = Math.floor(diffSeconds / 86400);

  if (diffSeconds < 0) {
    const absDays = Math.abs(diffDays);
    const absHours = Math.abs(diffHours);
    if (absDays > 0) {
      return `vor ${absDays} ${absDays === 1 ? "Tag" : "Tagen"}`;
    }
    if (absHours > 0) {
      return `vor ${absHours} ${absHours === 1 ? "Stunde" : "Stunden"}`;
    }
    return "abgelaufen";
  }

  if (diffDays > 0) {
    return `in ${diffDays} ${diffDays === 1 ? "Tag" : "Tagen"}`;
  }
  if (diffHours > 0) {
    return `in ${diffHours} ${diffHours === 1 ? "Stunde" : "Stunden"}`;
  }
  if (diffMinutes > 0) {
    return `in ${diffMinutes} ${diffMinutes === 1 ? "Minute" : "Minuten"}`;
  }
  return "heute";
}

/**
 * Format a unix timestamp as a localized German date string.
 */
export function formatDate(unixTs: number): string {
  return new Date(unixTs * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check whether a share has expired based on its expiresAt unix timestamp.
 */
export function isExpired(expiresAt: number): boolean {
  return expiresAt < Math.floor(Date.now() / 1000);
}
