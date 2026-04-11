# Discord Moderation Bot

A full-featured Discord moderation bot built with **discord.js v14**. Includes slash commands for banning, kicking, muting, and warning members, plus auto-moderation and comprehensive logging.

---

## Features

### Slash Commands
| Command | Description | Permission Required |
|---|---|---|
| `/ban` | Ban a member (with optional message deletion) | Ban Members |
| `/kick` | Kick a member | Kick Members |
| `/mute` | Timeout a member (1min – 7 days) | Moderate Members |
| `/unmute` | Remove a timeout | Moderate Members |
| `/warn` | Issue a warning (stored persistently) | Moderate Members |
| `/warnings` | View or clear a member's warnings | Moderate Members |

### Auto-Moderation
- **Bad word filter** — Deletes messages containing configured words
- **Link blocker** — Optionally blocks all URLs
- **Spam detection** — Mutes users who send too many messages too fast (escalating timeouts: 1 min, 5 min, 1 hour)

### Logging (to your `#mod-log` channel)
- Member joins (flags new accounts less than 7 days old)
- Member leaves (shows roles)
- Message edits (before/after)
- Message deletes
- All moderation actions (ban, kick, mute, warn, auto-mod)

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

### Step 2 — Invite the Bot to Your Server

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

### Step 3 — Gather Your IDs

Enable **Developer Mode** in Discord:
> User Settings → Advanced → Developer Mode → ON

Then right-click to copy IDs:
- **Guild ID** — Right-click your server name → Copy Server ID
- **Log Channel ID** — Right-click your `#mod-log` channel → Copy Channel ID
- **Client ID** — Found on the Discord Developer Portal → Your App → OAuth2

### Step 4 — Install & Configure

```bash
# Install dependencies
npm install

# Copy the example env file
cp .env.example .env
```

Now open `.env` and fill in your values:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
LOG_CHANNEL_ID=your_log_channel_id_here
BAD_WORDS=badword1,badword2,badword3
BLOCK_LINKS=false
SPAM_THRESHOLD=5
```

### Step 5 — Register Slash Commands

```bash
npm run deploy
```

You should see: `Slash commands registered successfully.`

### Step 6 — Start the Bot

```bash
npm start
```

You should see:
```
[CMD] Loaded: ban
[CMD] Loaded: kick
...
Logged in as YourBot
```

---

## Project Structure

```
discord-mod-bot/
├── src/
│   ├── index.js              # Bot entry point
│   ├── deploy-commands.js    # Slash command registration
│   ├── commands/
│   │   ├── ban.js
│   │   ├── kick.js
│   │   ├── mute.js
│   │   ├── unmute.js
│   │   ├── warn.js
│   │   └── warnings.js
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   ├── guildMemberAdd.js
│   │   ├── guildMemberRemove.js
│   │   ├── messageCreate.js   # Auto-mod lives here
│   │   ├── messageUpdate.js
│   │   └── messageDelete.js
│   └── utils/
│       ├── logger.js          # Log channel embed sender
│       └── warnings.js        # Warning persistence (JSON)
├── data/
│   └── warnings.json          # Auto-created on first warn
├── .env                       # Your config (never commit this!)
├── .env.example               # Safe template to share
├── package.json
└── README.md
```

---

## Customization

### Adding More Bad Words
Edit `BAD_WORDS` in your `.env`:
```env
BAD_WORDS=word1,word2,word3
```

### Changing Spam Sensitivity
Lower = stricter. Default is 5 messages in 5 seconds:
```env
SPAM_THRESHOLD=3
```

### Blocking All Links
```env
BLOCK_LINKS=true
```

### Running 24/7
Consider hosting on:
- **Railway** (free tier available) — [railway.app](https://railway.app)
- **Render** — [render.com](https://render.com)
- **A VPS** (DigitalOcean, Linode, etc.)
- **Your own machine** with `pm2`: `npm install -g pm2 && pm2 start src/index.js`

---

## Important Notes

- **Never share your `.env` file** or commit it to Git. Add it to `.gitignore`.
- The bot needs a role **higher than the roles of users it moderates** in your server's role hierarchy.
- Warnings are stored in `data/warnings.json` — back this up if you want to preserve them.
