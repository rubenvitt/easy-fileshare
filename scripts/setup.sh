#!/bin/sh
set -e

# Generate all secrets upfront
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CLEANUP_SECRET=$(openssl rand -hex 32)
S3_ACCESS_KEY=$(openssl rand -hex 16)
S3_SECRET_KEY=$(openssl rand -hex 32)

printf "Modus wählen:\n  1) Dev  (kein PocketID nötig, Login mit beliebigem Namen)\n  2) Prod (PocketID OIDC)\n> "
read -r mode

if [ "$mode" = "1" ]; then

ENV_CONTENT=$(cat << EOF
# ============================================================
# EASY-FILESHARE — Dev-Konfiguration
# ============================================================

# ------ HIER ANPASSEN ------

# App-Name und URL (anpassen wenn nicht localhost)
APP_NAME=EasyShare
APP_URL=http://localhost:3000
PORT=3000

# Dev Mode — überspringt PocketID, Login mit beliebigem Namen
AUTH_DEV_MODE=true

# Limits
MAX_FILE_SIZE=524288000          # 500 MB
MAX_EXPIRY_DAYS=7
GRACE_PERIOD_HOURS=24

# ------ GENERIERTE SECRETS (nicht ändern) ------

NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://localhost:3000
CLEANUP_SECRET=${CLEANUP_SECRET}

# MinIO
S3_ENDPOINT=http://minio:9000
S3_BUCKET=fileshare
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
EOF
)

else

ENV_CONTENT=$(cat << EOF
# ============================================================
# EASY-FILESHARE — Produktions-Konfiguration
# ============================================================

# ------ HIER ANPASSEN ------

# App-Name und öffentliche URL
APP_NAME=EasyShare
APP_URL=https://share.example.com
PORT=3000

# PocketID / OIDC — Werte aus deinem PocketID Dashboard
OIDC_ISSUER=https://pocketid.example.com
OIDC_CLIENT_ID=easy-filesharing
OIDC_CLIENT_SECRET=CHANGE_ME
OIDC_ADMIN_GROUP=fileshare-admin

# Limits
MAX_FILE_SIZE=524288000          # 500 MB
MAX_EXPIRY_DAYS=7
GRACE_PERIOD_HOURS=24

# ------ GENERIERTE SECRETS (nicht ändern) ------

NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=https://share.example.com
CLEANUP_SECRET=${CLEANUP_SECRET}

# MinIO
S3_ENDPOINT=http://minio:9000
S3_BUCKET=fileshare
S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY}
EOF
)

fi

# Output to clipboard and file
printf "%s" "$ENV_CONTENT" | pbcopy
printf "%s\n" "$ENV_CONTENT" > .env

echo ""
echo "Done — .env erstellt und in die Zwischenablage kopiert."
echo ""
if [ "$mode" = "1" ]; then
  echo "  Modus:  Dev (alle User sind Admins)"
  echo "  Login:  http://localhost:3000/api/auth/signin"
else
  echo "  Modus:  Prod (PocketID OIDC)"
  echo "  TODO:   OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET anpassen"
fi
echo ""
echo "  Starten: docker compose up --build"
