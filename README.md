# 🚀 Proxmox Discord Bot Hoster

Piattaforma self-hosted con interfaccia web moderna (stile **Magic UI**, **Aceternity UI** e **Untitled UI**) progettata per ospitare, gestire e monitorare bot Discord 24/7 sul proprio server casalingo **Proxmox VE** (LXC o Docker), senza dover accedere via SSH o interfaccia PVE ogni volta.

---

## ✨ Funzionalità

- 🎨 **Dashboard Moderna**: Bento Grid, Dark mode, Glassmorphism, animazioni fluide e gradienti pulsanti.
- ⚡ **Gestione Processi Real-time**: Avvio, arresto, riavvio e auto-restart automatico in caso di crash per bot **Node.js** (`discord.js`), **Python** (`discord.py`, `disnake`) e **Bun**.
- 💻 **Terminale & Live Console**: Streaming SSE in tempo reale dei log con colori ANSI e invio comandi `stdin`.
- 📁 **File Manager & Editor di Codice**: Naviga i file del bot, modificali e salvali direttamente dal browser (con supporto scorciatoia `Ctrl + S`).
- 🔑 **Gestione Variabili d'Ambiente**: Imposta `DISCORD_BOT_TOKEN`, `CLIENT_ID`, prefissi e secret con mascheramento password e visualizzazione selettiva.
- 📊 **Monitoraggio Risorse Hardware**: Visualizzazione CPU, RAM usata, uptime e statistiche host in tempo reale.
- 📦 **Template Pronti**: Template integrati per **Discord.js v14** (Slash commands) e **Discord.py** (Python 3).

---

## 🛠️ Avvio Rapido Locale (Sviluppo)

1. Installa le dipendenze:
   ```bash
   npm install
   ```

2. Avvia in modalità sviluppo:
   ```bash
   npm run dev
   ```

3. Apri il browser all'indirizzo [http://localhost:3000](http://localhost:3000).

---

## 🖥️ Installazione su Proxmox VE

### Opzione 1: Container LXC (Debian 12 / Ubuntu 24.04) - *Consigliata*

1. Crea un container LXC su Proxmox (o usane uno esistente).
2. Apri la console del container e clona questo repository:
   ```bash
   git clone <URL_DEL_TUO_REPO> /opt/bot-hoster
   cd /opt/bot-hoster
   ```
3. Esegui lo script di installazione automatica:
   ```bash
   chmod +x deploy-proxmox-lxc.sh
   ./deploy-proxmox-lxc.sh
   ```
4. Il servizio `discord-bot-hoster` verrà avviato come demone `systemd` e risponderà sulla porta `3000` all'indirizzo IP del tuo container LXC (es. `http://192.168.1.150:3000`).

---

### Opzione 2: Docker / Docker Compose

Puoi avviarlo con Docker in un singolo comando:
```bash
docker compose up -d --build
```
I dati e i bot rimarranno salvati persistentemente nella cartella `./data`.

---

## 🌐 Accesso Remoto Fuori Casa (Senza aprire porte)
Puoi usare **Cloudflare Tunnels** o **Tailscale** per accedere al tuo pannello ovunque ti trovi dal telefono o dal PC portatile in totale sicurezza.

