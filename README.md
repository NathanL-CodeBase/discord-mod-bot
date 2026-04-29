# Discord Moderation Bot

A full-featured Discord moderation bot built with **discord.js v14**. Supports multiple servers, with per-server configuration managed via `/setup` slash commands. Includes moderation commands, auto-moderation, and comprehensive logging.

---

## Features

### Slash Commands
| Command | Description | Permission Required |
|---|---|---|
| `/ban` | Ban a member (with optional message deletion) | Ban Members |
| `/kick` | Kick a member | Kick Members |
| `/mute` | Timeout a member (1 min – 7 days) | Moderate Members |
| `/unmute` | Remove a timeout | Moderate Members |
| `/warn` | Issue a warning (stored persistently) | Moderate Members |
| `/warnings` | View or clear a member's warnings | Moderate Members |
| `/purge` | Bulk delete up to 100 messages | Manage Messages |
| `/setup` | Configure the bot for this server | Administrator |

### `/setup` Subcommands
| Subcommand | Description |
|---|---|
| `/setup log-channel` | Set the channel where mod-log messages are sent |
| `/setup add-bad-words` | Add words to this server's banned list (on top of the global list) |
| `/setup clear-bad-words` | Remove all server-specific banned words (global list unchanged) |
| `/setup view-bad-words` | Show global and server-specific banned word lists separately |
| `/setup block-links` | Enable or disable link blocking for this server |
| `/setup spam-threshold` | Set how many messages in 5 seconds triggers spam detection |
| `/setup view` | Show the full current configuration for this server |

### Auto-Moderation
- **Bad word filter** — Deletes messages containing words from the global list or the server's extra list
- **Link blocker** — Optionally blocks all HTTP/HTTPS URLs (per server)
- **Spam detection** — Mutes users who send too many messages too fast; escalating timeouts (1 min, 5 min, 1 hour)

### Logging (to your configured `#mod-log` channel)
- Member joins (flags accounts less than 7 days old)
- Member leaves (shows roles held)
- Message edits (before/after)
- Message deletes
- All moderation actions (ban, kick, mute, warn, auto-mod, purge)

---

## Setup Guide

### Step 1 — Create a Discord Application & Bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**, give it a name, and click **Create**
3. Go to the **Bot** tab on the left sidebar
4. Click **Add Bot** → **Yes, do it!**
5. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent**
   - **Message Content Intent**
6. Click **Save Changes**
7. Click **Reset Token** and copy your **Bot Token** — save it for later

### Step 2 — Invite the Bot to Your Server(s)

1. Go to the **OAuth2 → URL Generator** tab
2. Under **Scopes**, check: `bot` and `applications.commands`
3. Under **Bot Permissions**, check:
   - `Ban Members`
   - `Kick Members`
   - `Moderate Members` (for timeouts)
   - `Manage Messages`
   - `Send Messages`
   - `Embed Links`
   - `Read Message History`
   - `View Channels`
4. Copy the generated URL and open it in your browser to invite the bot
5. Repeat for each additional server

### Step 3 — Get Your Client ID

Enable **Developer Mode** in Discord:
> User Settings → Advanced → Developer Mode → ON

Then find your **Client ID** on the Discord Developer Portal under your App → OAuth2.

### Step 4 — Install & Configure

```bash
# Install dependencies
npm install

# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in the two required values:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

The remaining variables are optional global defaults that apply to all servers. Per-server settings are configured with `/setup` after the bot starts (see Step 6).

```env
# Words banned in every server (server admins can add more with /setup add-bad-words)
BAD_WORDS=badword1,badword2,badword3

# Global defaults — can be overridden per server with /setup
BLOCK_LINKS=false
SPAM_THRESHOLD=5
```

### Step 5 — Register Slash Commands

Commands are deployed **globally** and will be available in every server the bot joins.

```bash
npm run deploy
```

You should see:
```
Registering 8 slash command(s) globally...
Slash commands registered globally. Changes may take up to 1 hour to appear in all servers.
```

> Global commands can take up to 1 hour to propagate after the first deploy. You only need to re-run this when you add or remove commands.

### Step 6 — Start the Bot

```bash
npm start
```

You should see:
```
[CMD] Loaded: ban
[CMD] Loaded: kick
...
Logged in as YourBot#0000
```

### Step 7 — Configure Each Server

When the bot joins a server, it will automatically DM the server owner with setup instructions. You can also run these commands yourself at any time:

1. **Set a log channel** (required for logging to work):
   ```
   /setup log-channel #mod-log
   ```

2. **Add server-specific banned words** (optional — global words from `.env` are always active):
   ```
   /setup add-bad-words words:slur1,slur2
   ```

3. **Adjust other settings** as needed:
   ```
   /setup block-links enabled:true
   /setup spam-threshold amount:4
   ```

4. **Check your configuration** at any time:
   ```
   /setup view
   /setup view-bad-words
   ```

Per-server settings are saved to `data/guild-configs.json` on the host machine.

---

## Configuration Reference

### `.env` — Bot-wide settings

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | Yes | Your bot token from the Discord Developer Portal |
| `CLIENT_ID` | Yes | Your application's client ID |
| `BAD_WORDS` | No | Comma-separated words banned in all servers |
| `BLOCK_LINKS` | No | `true` or `false` — global default (default: `false`) |
| `SPAM_THRESHOLD` | No | Message count before spam triggers — global default (default: `5`) |

### `data/guild-configs.json` — Per-server settings (managed via `/setup`)

| Key | Description |
|---|---|
| `logChannelId` | Channel ID where mod-log embeds are sent |
| `extraBadWords` | Words banned only in this server, in addition to the global list |
| `blockLinks` | Overrides the global `BLOCK_LINKS` default for this server |
| `spamThreshold` | Overrides the global `SPAM_THRESHOLD` default for this server |

---

## Project Structure

```
discord-mod-bot/
├── src/
│   ├── index.js                 # Bot entry point
│   ├── deploy-commands.js       # Global slash command registration
│   ├── commands/
│   │   ├── ban.js
│   │   ├── kick.js
│   │   ├── mute.js
│   │   ├── unmute.js
│   │   ├── warn.js
│   │   ├── warnings.js
│   │   ├── purge.js
│   │   └── setup.js             # Per-server configuration command
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   ├── guildCreate.js       # Alerts server owner on bot join
│   │   ├── guildMemberAdd.js
│   │   ├── guildMemberRemove.js
│   │   ├── messageCreate.js     # Auto-mod engine
│   │   ├── messageUpdate.js
│   │   └── messageDelete.js
│   └── utils/
│       ├── logger.js            # Per-guild log channel embed sender
│       ├── guildConfig.js       # Per-guild config read/write utility
│       └── warnings.js          # Warning persistence (JSON)
├── data/
│   ├── warnings.json            # Auto-created on first /warn
│   └── guild-configs.json       # Auto-created on first /setup
├── .env                         # Your config (never commit this!)
├── .env.example                 # Safe template to share
├── package.json
└── README.md
```

---

## Running 24/7

Consider hosting on:
- **Railway** (free tier available) — [railway.app](https://railway.app)
- **Render** — [render.com](https://render.com)
- **A VPS** (DigitalOcean, Linode, etc.)
- **Your own machine** with `pm2`: `npm install -g pm2 && pm2 start src/index.js`

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Important Notes

- **Never share your `.env` file** or commit it to Git. Add it to `.gitignore`.
- The bot needs a role **higher than the roles of users it moderates** in each server's role hierarchy.
- Warnings are stored in `data/warnings.json` — back this up if you want to preserve history.
- Per-server config is stored in `data/guild-configs.json` — include this in any backups.
