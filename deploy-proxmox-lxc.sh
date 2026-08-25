#!/usr/bin/env bash
# ==========================================================
# Proxmox Discord Bot Hoster - Script di installazione LXC
# ==========================================================
set -e

echo "🚀 [Proxmox Bot Hoster] Inizio installazione..."

# Aggiornamento pacchetti di sistema
apt update && apt upgrade -y
apt install -y curl wget git python3 python3-pip python3-venv build-essential

# Installazione Node.js 22 LTS
if ! command -v node &> /dev/null; then
    echo "📦 Installazione Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi

echo "🟢 Node.js $(node -v) e Python 3 $(python3 --version) pronti!"

# Installazione dipendenze progetto
echo "📦 Installazione pacchetti npm..."
npm install

# Build Next.js
echo "🏗️ Compilazione applicazione Next.js..."
npm run build

# Creazione del servizio Systemd
SERVICE_FILE="/etc/systemd/system/discord-bot-hoster.service"
CURRENT_DIR=$(pwd)

echo "⚙️ Configurazione servizio systemd in $SERVICE_FILE..."
cat << EOF > $SERVICE_FILE
[Unit]
Description=Proxmox Discord Bot Hoster Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now discord-bot-hoster

echo ""
echo "🎉 ===================================================== 🎉"
echo "✅ Proxmox Discord Bot Hoster installato e avviato!"
echo "🌐 Accedi alla dashboard aprendo il browser su:"
echo "   http://$(hostname -I | awk '{print $1}'):3000"
echo "🎉 ===================================================== 🎉"

