#!/bin/sh
set -e

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
  printf ".env existiert bereits. Überschreiben? [y/N] "
  read -r answer
  case "$answer" in
    [yY]) ;;
    *) echo "Abgebrochen."; exit 0 ;;
  esac
fi

# Generate random secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CLEANUP_SECRET=$(openssl rand -hex 16)

printf "Modus wählen:\n  1) Dev  (kein PocketID nötig, Login mit beliebigem Namen)\n  2) Prod (PocketID OIDC)\n> "
read -r mode

if [ "$mode" = "1" ]; then
  cat > "$ENV_FILE" << EOF
# App
PORT=3000
APP_NAME=EasyShare
APP_URL=http://localhost:3000

# Dev Mode — überspringt PocketID, Login mit beliebigem Namen
AUTH_DEV_MODE=true

# Auth Secrets
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://localhost:3000

# Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_BUCKET=fileshare
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Limits
MAX_FILE_SIZE=524288000
MAX_EXPIRY_DAYS=7

# Cleanup
CLEANUP_SECRET=${CLEANUP_SECRET}
EOF

  echo ""
  echo "✓ .env erstellt (Dev-Mode)"
  echo "  → Login unter http://localhost:3000/api/auth/signin"
  echo "  → Beliebiger Name, alle User sind Admins"
  echo ""
  echo "Starten mit: docker compose up --build"

else
  printf "PocketID Issuer URL: "
  read -r OIDC_ISSUER
  printf "Client ID: "
  read -r OIDC_CLIENT_ID
  printf "Client Secret: "
  read -r OIDC_CLIENT_SECRET
  printf "Admin-Gruppe (default: fileshare-admin): "
  read -r OIDC_ADMIN_GROUP
  OIDC_ADMIN_GROUP=${OIDC_ADMIN_GROUP:-fileshare-admin}

  cat > "$ENV_FILE" << EOF
# App
PORT=3000
APP_NAME=EasyShare
APP_URL=http://localhost:3000

# Auth (PocketID OIDC)
OIDC_ISSUER=${OIDC_ISSUER}
OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
OIDC_ADMIN_GROUP=${OIDC_ADMIN_GROUP}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://localhost:3000

# Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_BUCKET=fileshare
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Limits
MAX_FILE_SIZE=524288000
MAX_EXPIRY_DAYS=7

# Cleanup
CLEANUP_SECRET=${CLEANUP_SECRET}
EOF

  echo ""
  echo "✓ .env erstellt (Prod-Mode mit PocketID)"
  echo ""
  echo "Starten mit: docker compose up --build"
fi
