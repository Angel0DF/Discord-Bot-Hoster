export interface TemplateFile {
  name: string;
  content: string;
}

export interface BotTemplate {
  id: string;
  name: string;
  runtime: 'nodejs' | 'python' | 'bun';
  description: string;
  mainFile: string;
  defaultEnv: Record<string, string>;
  files: TemplateFile[];
}

export const BOT_TEMPLATES: BotTemplate[] = [
  {
    id: "discord-js-v14",
    name: "Discord.js v14 (JavaScript)",
    runtime: "nodejs",
    description: "Template pronto all'uso con Discord.js v14, gestione eventi e comandi slash (Ping & Info).",
    mainFile: "index.js",
    defaultEnv: {
      DISCORD_BOT_TOKEN: "YOUR_BOT_TOKEN_HERE",
      CLIENT_ID: "YOUR_CLIENT_ID_HERE",
      PREFIX: "!"
    },
    files: [
      {
        name: "package.json",
        content: JSON.stringify({
          name: "discord-js-bot",
          version: "1.0.0",
          main: "index.js",
          dependencies: {
            "discord.js": "^14.17.3",
            "dotenv": "^16.4.7"
          }
        }, null, 2)
      },
      {
        name: "index.js",
        content: `require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Comandi Slash
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Risponde con Pong e la latenza del bot!'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Mostra informazioni sul server corrente'),
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log('✅ [Proxmox Bot Host] Loggato con successo come: ' + client.user.tag);
  client.user.setActivity('Proxmox Server 🚀', { type: ActivityType.Watching });

  if (process.env.DISCORD_BOT_TOKEN && process.env.CLIENT_ID) {
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
      console.log('🔄 Registrazione comandi slash globali in corso...');
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('✨ Comandi slash registrati con successo!');
    } catch (err) {
      console.error('⚠️ Errore durante la registrazione dei comandi slash:', err.message);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    const sent = await interaction.reply({ content: '🏓 Calcolo ping in corso...', fetchReply: true });
    const pingTime = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply('🏓 **Pong!**\\n⏱️ Latenza Bot: ' + pingTime + 'ms\\n🌐 Latenza API: ' + Math.round(client.ws.ping) + 'ms\\n🖥️ Ospitato su Proxmox VE!');
  } else if (commandName === 'serverinfo') {
    await interaction.reply('🏰 **Nome Server:** ' + interaction.guild.name + '\\n👥 **Membri Totali:** ' + interaction.guild.memberCount);
  }
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  const prefix = process.env.PREFIX || '!';
  
  if (message.content.startsWith(prefix + 'ping')) {
    message.reply('🏓 Pong dal server Proxmox! (' + client.ws.ping + 'ms)');
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ ERRORE: DISCORD_BOT_TOKEN non configurato! Vai nelle impostazioni del bot e inserisci il token.');
  process.exit(1);
}

client.login(token);
`
      },
      {
        name: ".env.example",
        content: `DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
CLIENT_ID=YOUR_CLIENT_ID_HERE
PREFIX=!
`
      }
    ]
  },
  {
    id: "discord-py-starter",
    name: "Discord.py (Python 3)",
    runtime: "python",
    description: "Template moderno in Python 3 con comandi slash (@app_commands), comandi a prefisso e gestione errori.",
    mainFile: "main.py",
    defaultEnv: {
      DISCORD_BOT_TOKEN: "YOUR_BOT_TOKEN_HERE",
      PREFIX: "!"
    },
    files: [
      {
        name: "requirements.txt",
        content: `discord.py>=2.3.2
python-dotenv>=1.0.1
`
      },
      {
        name: "main.py",
        content: `import os
import sys
import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_BOT_TOKEN")
PREFIX = os.getenv("PREFIX", "!")

if not TOKEN or TOKEN == "YOUR_BOT_TOKEN_HERE":
    print("❌ ERRORE: DISCORD_BOT_TOKEN non configurato nelle variabili d'ambiente!", file=sys.stderr)
    sys.exit(1)

intents = discord.Intents.default()
intents.message_content = True

class ProxmoxBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix=PREFIX, intents=intents)

    async def setup_hook(self):
        print("🔄 Sincronizzazione comandi slash in corso...")
        try:
            synced = await self.tree.sync()
            print(f"✨ Sincronizzati {len(synced)} comandi slash!")
        except Exception as e:
            print(f"⚠️ Errore sincronizzazione: {e}")

bot = ProxmoxBot()

@bot.event
async def on_ready():
    print(f"✅ [Proxmox Bot Host] Loggato come {bot.user} (ID: {bot.user.id})")
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching, 
            name="Proxmox Server 🚀"
        )
    )

@bot.tree.command(name="ping", description="Controlla la latenza del bot")
async def ping_slash(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    await interaction.response.send_message(f"🏓 **Pong!** Latenza: {latency}ms (Ospitato su Proxmox VE)")

@bot.command(name="ping")
async def ping_prefix(ctx):
    latency = round(bot.latency * 1000)
    await ctx.send(f"🏓 Pong! {latency}ms")

if __name__ == "__main__":
    bot.run(TOKEN)
`
      },
      {
        name: ".env.example",
        content: `DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
PREFIX=!
`
      }
    ]
  },
  {
    id: "custom-empty",
    name: "Personalizzato / Vuoto",
    runtime: "nodejs",
    description: "Progetto vuoto per caricare il tuo codice personalizzato o clonare da Git.",
    mainFile: "index.js",
    defaultEnv: {
      DISCORD_BOT_TOKEN: ""
    },
    files: [
      {
        name: "index.js",
        content: `console.log("🚀 Bot personalizzato avviato!");
// Inserisci il tuo codice qui
`
      }
    ]
  }
];

