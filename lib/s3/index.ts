import { S3Client } from "@aws-sdk/client-s3";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";

// Begrenzter Socket-Pool mit endlichen Timeouts. Ohne diese Konfiguration nutzt
// das AWS SDK Sockets ohne Inaktivitäts-Timeout: ein abgebrochener Download,
// dessen Body-Stream nie geschlossen wird, hält seinen Socket für immer. Sobald
// der Pool (Default maxSockets 50) erschöpft ist, hängt JEDER weitere
// GetObject-Request unendlich (0 % CPU) — der gesamte Download-Pfad ist tot,
// während Routen ohne S3 (z. B. /api/health alt) weiter 200 liefern.
// `throwOnRequestTimeout` ist zwingend: ohne ihn loggt das SDK bei requestTimeout
// nur eine Warnung und der Request hängt trotzdem weiter.
const SOCKET_OPTS = { maxSockets: 128, keepAlive: true } as const;

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
  },
  forcePathStyle: true,
  requestHandler: {
    httpAgent: new HttpAgent(SOCKET_OPTS),
    httpsAgent: new HttpsAgent(SOCKET_OPTS),
    connectionTimeout: 6_000,
    requestTimeout: 60_000,
    throwOnRequestTimeout: true,
  },
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "fileshare";
