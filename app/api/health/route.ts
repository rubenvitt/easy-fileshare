import { NextResponse } from "next/server";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "@/lib/s3";

export const dynamic = "force-dynamic";

// Der Healthcheck prüft bewusst auch den Storage-Pfad. Der frühere Check gab
// blind 200 zurück und blieb grün, während der Download-Pfad durch
// Socket-Erschöpfung tot war — der Container wurde deshalb nie als unhealthy
// markiert. Da diese Probe selbst einen Socket aus dem Pool braucht, schlägt sie
// bei Erschöpfung fehl (kurzer Timeout) -> Container unhealthy. Den daraus
// folgenden Neustart übernimmt der autoheal-Sidecar (siehe docker-compose.yml);
// plain Docker startet unhealthy Container NICHT von selbst neu.
export async function GET() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }), {
      abortSignal: AbortSignal.timeout(3_000),
    });
    return NextResponse.json({ status: "ok", storage: "ok" });
  } catch (e) {
    console.error("[health] storage check failed:", e);
    return NextResponse.json(
      { status: "degraded", storage: "unreachable" },
      { status: 503 }
    );
  }
}
