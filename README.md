# Dolfje - Discord Migration Plan & Documentation

This document outlines the migration plan and technical requirements to port the Slack Dolfje werewolf bot to Discord, ensuring all features are mapped correctly and adapted to Discord's capabilities, permissions, and API (`discord.js`).

## 1. Slack vs Discord Functionality Mapping

### Architectural Gaps
- **Workspaces & Channels:** Slack uses Workspaces and Channels. Discord uses Servers (Guilds) with Categories and Channels.
- **Interactions:** Slack relies on Blocks, Modals, and Action IDs. Discord uses Embeds, Modals (limited to text inputs), and Message Components (Action Rows, Buttons, Select Menus).
- **Ephemeral Messages:** Slack ephemeral messages can be sent anytime in a channel. Discord ephemeral messages must be a direct response to an Interaction (like a Slash Command or Button click).
- **Slash Commands:** Slack allows arbitrary text after a slash command (e.g., `/startgame ww1 15 mychannel`). Discord strongly prefers defined arguments/options for commands, creating a better UI.

### Overcoming the Gaps
- **Slash Commands:** All commands will be converted to Discord Application Commands (Slash Commands) with specific argument types (String, Integer, User, etc.). We will use English statically for command names (e.g. `/startgame` instead of dynamically localized command names) to comply with Discord's command registration.
- **Game Organization:** A game will be created under a **Discord Category** named after the game (e.g. `WW-1-GAME-TITLE`). All channels created for the game (`village`, `voting-booth`, `wolves`) will be nested in this category.
- **UI Components:** We will replace Slack blocks with Discord **Embeds** and **Action Rows**.
- **Threading:** We will convert Slack's thread history gathering to Discord's thread API if needed, although Discord allows creating a dedicated Thread channel directly on a message.

## 2. Discord Permissions & Channel Setup

The fundamental requirement is to maintain anonymity for the Wolves and specific roles. Discord supports this by assigning channel permissions directly to Users, entirely avoiding the need to create roles.

### Channel Creation Strategy
1. **Category:** Create a Category (e.g., `ww_1_my_game`).
2. **Global Hidden:** The category and all channels will have `@everyone` `VIEW_CHANNEL` set to `false`.
3. **Village Channel:** The `ww-1-village` channel will have `VIEW_CHANNEL` set to `true` for all assigned players (via specific User ID permission overwrites) and Moderators. Spectators will have `VIEW_CHANNEL` `true` but `SEND_MESSAGES` `false`.
4. **Wolves Channel:** The `ww-1-wolves` channel will be completely hidden from anyone not explicitly assigned. The bot will add `VIEW_CHANNEL` `true` *only* for the specific User IDs of the drawn Wolves and Moderators. This way, no one can see who has access, and no server-wide "Wolf" role is ever created, avoiding "role profile leakage."
5. **Special Roles Channels:** Similar to the Wolves, any special roles that need private text channels (e.g., Seer) will have a channel specifically created with `VIEW_CHANNEL` restricted to just that User ID and the Moderators.
6. **Voting Booth:** Living players get access to talk/vote. Dead players will have `SEND_MESSAGES` disabled.

## 3. Quiz Editor: Role Assigner UI

Currently, the host types `/wwverdeelrollen wolf:5 ziener:1 heks:2 burger:`.
In Discord, we will create an interactive "Quiz Editor" UI.

**Flow:**
1. The moderator types `/assignroles` without specifying amounts.
2. The bot responds with an ephemeral message containing an Embed that lists the current roles configured:
   - Wolves: 0
   - Seer: 0
   - Witch: 0
   - Villagers: [Remaining]
3. Below the Embed, the bot provides **Action Rows** with Buttons for the roles.
   - ➕ `Add Wolf` | ➖ `Remove Wolf`
   - ➕ `Add Seer` | ➖ `Remove Seer`
   - etc.
4. Each button press updates the embed in real-time.
5. A final `Confirm Distribution` button applies the roles and creates the corresponding private channels for the special roles.

## 4. Database & Technical Details

The current backend uses PostgreSQL (`pg` module) and the schema is defined in `wwmnot.sql`.

### Technical Gaps & Required Changes:
- **Slack IDs:** The current schema uses columns like `gpl_slack_id`, `gch_slack_id`, and `gpo_slack_message_id`. Discord uses "Snowflakes" (18-19 digit numbers). Since the database uses `varchar(255)`, it natively supports Discord Snowflakes without data truncation.
- **Schema Update:** While technically compatible, we should semantically rename the columns from `*_slack_id` to `*_discord_id` (or just `*_user_id`/`*_channel_id`) for clarity in future migrations.
- **Message Tracking:** Discord message IDs are also Snowflakes. The Slack `ts` (timestamp string) format used for message grouping will be replaced by the direct Discord Message ID Snowflake.
- **Environment Variables:** `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` will be replaced by `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID`.

## 5. Summary of Execution Steps
1. Re-initialize `discord.js` within `index.js`, dropping `@slack/bolt` dependencies.
2. Refactor `ww_queries.js` and `wwmnot.sql` to rename Slack specific column names and ensure queries match Discord logic.
3. Migrate all commands in `ww_commands.js` to Discord Application Slash Commands format.
4. Implement the role distribution interactive button UI.
5. Overhaul `ww_helpers.js` channel creation functions to build Discord Categories and assign User Permission Overwrites instead of inviting via Slack conversations.
6. Localize texts as needed but keep Slash command structural names statically English.
