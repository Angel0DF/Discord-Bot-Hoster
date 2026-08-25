#!/usr/bin/env bash
# ==========================================================
# Proxmox Bot Runner Agent - Installazione Automatica LXC
# ==========================================================
set -e

echo "🚀 [Proxmox Bot Agent] Avvio installazione su container LXC / VM..."

# Aggiornamento e installazione runtime
apt update && apt install -y curl wget git python3 python3-pip python3-venv build-essential

# Node.js 22 LTS
if ! command -v node &> /dev/null; then
    echo "📦 Installazione Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi

# Crea cartella agent
mkdir -p /opt/bot-agent
cp -r . /opt/bot-agent/
cd /opt/bot-agent

npm install --production

# Genera Secret Key se non specificata
SECRET_KEY="${1:-proxmox_discord_secret_2026}"
echo "AGENT_SECRET_KEY=$SECRET_KEY" > /opt/bot-agent/.env
echo "PORT=4000" >> /opt/bot-agent/.env

# Configurazione servizio Systemd
cat << EOF > /etc/systemd/system/proxmox-bot-agent.service
[Unit]
Description=Proxmox Discord Bot Runner Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bot-agent
ExecStart=/usr/bin/node /opt/bot-agent/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now proxmox-bot-agent

IP=$(hostname -I | awk '{print $1}')

echo ""
echo "🎉 ===================================================== 🎉"
echo "✅ Proxmox Bot Agent installato con successo ed in esecuzione!"
echo "📍 Indirizzo Agent: http://${IP}:4000"
echo "🔑 Secret Key: ${SECRET_KEY}"
echo ""
echo "👉 Inserisci questi valori nella tua dashboard Netlify:"
echo "   - Proxmox Agent URL: http://${IP}:4000 (o il tuo URL Cloudflare Tunnel)"
echo "   - Agent Secret Key: ${SECRET_KEY}"
echo "🎉 ===================================================== 🎉"

