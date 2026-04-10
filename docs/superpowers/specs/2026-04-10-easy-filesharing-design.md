# Easy Filesharing — Design Spec

## Überblick

Eine einfache, selbst-gehostete File-Sharing-App. Admins erstellen zeitlich begrenzte Sharing-Links für Dateien oder Ordner. Empfänger können über den Link herunterladen — optional passwortgeschützt. Alles läuft in Docker Compose, konfigurierbar per `.env`.

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| UI | shadcn/ui, Tailwind CSS, Dark/Light Mode (auto) |
| ORM | Drizzle ORM |
| Datenbank | SQLite (auf Docker Volume) |
| Object Storage | MinIO (S3-kompatibel, nur intern erreichbar) |
| Auth | NextAuth.js v5 + PocketID (OIDC) |
| Link-IDs | nanoid (10 Zeichen) |
| Container | Docker Compose, ein exponierter Port |

## Architektur

### Übersicht

```
Browser ──► Next.js (Port konfigurierbar)
               ├── Admin-UI (geschützt via OIDC)
               ├── API Routes (Upload/Download Streaming)
               └── Öffentliche Download-Seiten
                      │
               ┌──────┴──────┐
               │  SQLite DB  │  (Docker Volume)
               └─────────────┘
                      │
               ┌──────┴──────┐
               │    MinIO     │  (nur intern, kein exponierter Port)
               └─────────────┘
```

MinIO ist **nur intern** im Docker-Netzwerk erreichbar. Alle Uploads und Downloads werden durch Next.js API Routes gestreamt. Kein direkter Browser-zu-MinIO-Kontakt.

### Verzeichnisstruktur

```
app/
  (admin)/              # Admin-Bereich (geschützt via Middleware)
    dashboard/          # Dashboard mit Stats + Sharing-Liste
    shares/
      new/              # Neues Sharing erstellen
      [id]/             # Sharing bearbeiten/Details
  (public)/             # Öffentlicher Bereich
    s/[nanoid]/         # Sharing-Download-Seite
  api/
    upload/route.ts     # Chunked Upload → MinIO Stream
    download/[id]/route.ts  # MinIO Stream → Browser
  layout.tsx
lib/
  db/                   # Drizzle Schema + Client
  s3/                   # MinIO Client
  auth/                 # NextAuth Config
```

## Datenmodell

### shares

| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (PK) | nanoid, 10 Zeichen |
| title | TEXT | Anzeigename |
| description | TEXT (nullable) | Optionale Beschreibung |
| type | TEXT | `"file"` oder `"folder"` |
| password_hash | TEXT (nullable) | bcrypt Hash, null = kein Passwort |
| expires_at | INTEGER | Unix Timestamp, max. now + 7 Tage |
| max_downloads | INTEGER (nullable) | null = unbegrenzt |
| download_count | INTEGER | Default 0 |
| total_size | INTEGER | Gesamtgröße in Bytes |
| created_at | INTEGER | Unix Timestamp |
| created_by | TEXT | OIDC Subject / E-Mail |
| s3_prefix | TEXT | MinIO-Pfad: `shares/{id}/` |

### share_files

| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (PK) | nanoid |
| share_id | TEXT (FK) | → shares.id |
| filename | TEXT | Originaler Dateiname |
| s3_key | TEXT | Pfad in MinIO |
| size | INTEGER | Größe in Bytes |
| mime_type | TEXT | MIME-Typ |
| created_at | INTEGER | Unix Timestamp |

- Einzeldatei-Sharing: 1 `shares` + 1 `share_files`
- Ordner-Sharing: 1 `shares` + N `share_files`

## Authentifizierung & Autorisierung

- **NextAuth.js v5** mit PocketID als OIDC Provider
- Admin-Berechtigung über **OIDC Gruppen-Claim** (`groups` im ID-Token)
- `OIDC_ADMIN_GROUP` in `.env` definiert die erforderliche Gruppe
- Next.js Middleware schützt alle `(admin)/*`-Routen
- Öffentliche Routen (`/s/[nanoid]`) brauchen keine Auth

### .env Konfiguration (Auth)

```env
OIDC_ISSUER=https://pocketid.example.com
OIDC_CLIENT_ID=easy-filesharing
OIDC_CLIENT_SECRET=secret
OIDC_ADMIN_GROUP=fileshare-admin
NEXTAUTH_SECRET=random-secret
NEXTAUTH_URL=https://share.example.com
```

## Upload-Flow

1. Admin öffnet "Neues Sharing erstellen"
2. Formular: Titel, Beschreibung (optional), Ablaufdatum (max 7 Tage), Max Downloads (optional), Passwort (optional)
3. Dateien per Drag & Drop oder File-Picker auswählen (Multi-File für Ordner)
4. **Chunked Upload** (5 MB Chunks): Browser → Next.js API Route `/api/upload` → Stream zu MinIO
5. Fortschrittsanzeige pro Datei im UI
6. Nach Abschluss: nanoid-Link wird generiert, Copy-to-Clipboard

### Upload-Streaming

- Der Upload nutzt **S3 Multipart Upload** unter der Haube:
  1. Client initiiert Upload → API Route ruft `createMultipartUpload` auf MinIO
  2. Client sendet Datei in 5 MB Chunks an `/api/upload` (jeweils ein HTTP Request pro Chunk)
  3. API Route streamt jeden Chunk via `uploadPart` direkt an MinIO weiter (kein RAM-Buffering des gesamten Files)
  4. Nach dem letzten Chunk: `completeMultipartUpload`
- Bei Abbruch: `abortMultipartUpload` räumt Teiluploads auf
- Max. Dateigröße: konfigurierbar per `MAX_FILE_SIZE` in `.env`, Default 500 MB

## Download-Flow

1. Empfänger öffnet `/s/{nanoid}`
2. Prüfungen: Existiert das Sharing? Abgelaufen? Download-Limit erreicht?
3. Falls passwortgeschützt → Passwort-Eingabe-Dialog
4. Anzeige: Titel, Beschreibung, Dateien (Name, Größe, Typ), Ablaufdatum
5. Preview für Bilder und PDFs
6. Download: Einzeldatei direkt, Ordner als ZIP oder Einzeldateien
7. Download-Counter wird inkrementiert
8. **Streaming:** Next.js API Route `/api/download/[id]` → Stream von MinIO → Browser

### ZIP-Download für Ordner

- On-the-fly ZIP-Erstellung: Dateien aus MinIO werden gestreamt und direkt als ZIP an den Browser gesendet
- Kein temporäres ZIP auf Disk

## Ablauf & Cleanup

- **Lazy Check:** Bei jedem Zugriff auf `/s/[nanoid]` wird geprüft, ob das Sharing abgelaufen ist oder das Download-Limit erreicht wurde. Falls ja: 410 Gone.
- **Aktiver Cleanup:** Eine Next.js API Route `/api/cleanup` (mit Secret-Token in `.env` gesichert) löscht abgelaufene Sharings + deren MinIO-Objekte. Kann per externem Cron (z.B. Docker Healthcheck, systemd Timer, oder Cron-Container) regelmäßig getriggert werden.
- Cleanup löscht: `share_files` → `shares` → MinIO-Objekte unter `shares/{id}/`

## UI/UX

### Allgemein
- **shadcn/ui** mit Tailwind CSS
- **Dark/Light Mode** automatisch (System-Präferenz), manuell umschaltbar
- Responsive Design
- Modernes, minimalistisches Design

### Admin Dashboard
- **Statistik-Cards** oben: Aktive Sharings, Downloads gesamt, Speicher belegt (jeweils mit Kontext-Info)
- **Sharing-Tabelle** darunter: Titel, Typ-Badge (Datei/Ordner), Ablaufdatum, Download-Counter, Passwort-Status, Schnellaktionen (Link kopieren, Löschen)
- Abgelaufene Sharings rot markiert
- "Neues Sharing"-Button prominent

### Erstellen-Formular
- Titel + Beschreibung (optional)
- Drag & Drop Upload-Zone mit Multi-File-Support
- Fortschrittsanzeige pro Datei (Prozent + Statusicon)
- Ablaufdatum-Dropdown (1–7 Tage)
- Max Downloads (optional, Zahlenfeld)
- Passwort-Toggle mit Passwort-Eingabe

### Download-Seite (öffentlich)
- Zentriertes, minimalistisches Layout — kein Menü, kein Login
- App-Branding ("EasyShare" o.ä., konfigurierbar)
- Datei-Typ-Icon
- Titel, Beschreibung, Dateigröße
- Download-Button (Einzeldatei) oder Dateiliste + "Alle als ZIP" (Ordner)
- Meta-Info: Ablaufdatum, Download-Zähler
- Passwort-Dialog wird VOR der Inhaltsseite angezeigt

## Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - DATABASE_URL=/data/db.sqlite
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET=${S3_BUCKET:-fileshare}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      # ... weitere .env Variablen
    volumes:
      - db-data:/data
    depends_on:
      - minio

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${S3_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${S3_SECRET_KEY}
    volumes:
      - minio-data:/data
    # Kein Port-Mapping — nur intern erreichbar

volumes:
  db-data:
  minio-data:
```

## .env Konfiguration (vollständig)

```env
# App
PORT=3000
APP_NAME=EasyShare
APP_URL=https://share.example.com

# Auth (PocketID OIDC)
OIDC_ISSUER=https://pocketid.example.com
OIDC_CLIENT_ID=easy-filesharing
OIDC_CLIENT_SECRET=secret
OIDC_ADMIN_GROUP=fileshare-admin
NEXTAUTH_SECRET=random-secret
NEXTAUTH_URL=https://share.example.com

# Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_BUCKET=fileshare
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Limits
MAX_FILE_SIZE=524288000        # 500 MB in Bytes
MAX_EXPIRY_DAYS=7
```

## Sicherheit

- Passwörter werden mit bcrypt gehasht gespeichert
- Alle Uploads/Downloads durch Next.js — MinIO nie direkt exponiert
- CSRF-Schutz via NextAuth.js
- Rate-Limiting für Download-Endpunkte (optional, per .env)
- nanoid-Links sind nicht erratbar (10 Zeichen, ~59 Bit Entropie)
- Abgelaufene Sharings werden nicht ausgeliefert
