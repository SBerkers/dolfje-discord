# Dolfje Bot - Master Discord Migration Plan (Plan of Plans)

## Executive Summary
This document serves as the master plan for migrating the "Dolfje" Slack bot to Discord using `discord.js`. The migration involves a fundamental shift in how UI and permissions are handled, moving away from Slack's Blocks and Workspaces towards Discord's Embeds, Components, Categories, and Channel Permission Overwrites.

The core requirement of the bot—maintaining anonymity for special roles (like Wolves)—will be preserved by strictly using User-specific `VIEW_CHANNEL` permission overwrites, ensuring no visible Discord Roles are ever created that could leak information via user profiles.

## Migration Strategy & Gaps Addressed

### 1. Interaction Model (Slash Commands)
All commands currently relying on text parsing (e.g., `/wwstartgame ww1 15 mychannel`) will be converted to Discord Application Commands (Slash Commands) with strictly defined Options (Strings, Integers, Booleans, User Mentions). This provides built-in validation and a superior UI. Command names will be statically defined in English.

### 2. UI Components
Slack Blocks and Modals are replaced with Discord Embeds and Message Components.
- Registration will utilize inline Buttons (`Join`, `Spectate`).
- Voting will shift from a large array of Buttons to a clean `String Select Menu` to accommodate games with many players without hitting Discord's component limits.
- Role Assignment will be completely overhauled into an interactive "Quiz Editor" utilizing stateful embeds and buttons (➕/➖).

### 3. Channel & Hierarchy Mapping
Slack Workspaces map to Discord Guilds (Servers). To organize games, we will utilize Discord **Categories**.
- When a game starts, a Category (e.g., `WW-1`) is created.
- All associated channels (village, wolves, voting booth) are created under this Category.
- Private communications (Slack IMs with the bot) will be replaced with Discord DMs (`user.send()`) or Ephemeral Messages (`interaction.reply({ ephemeral: true })`).

### 4. Database Adjustments
The PostgreSQL schema (`wwmnot.sql`) is largely compatible as Discord Snowflakes (IDs) fit within the existing `varchar(255)` columns. While a semantic renaming from `slack_id` to `discord_id` is planned, the core logic remains intact.

---

## Detailed Implementation Plans by Domain

The migration has been broken down into logical domains, each detailed in its own markdown file.

| Domain | File | Commands Covered | Focus Area |
| :--- | :--- | :--- | :--- |
| **Game Lifecycle** | [cmd_game_lifecycle.md](./cmd_game_lifecycle.md) | `/wwstartregistration`, `/wwstartgame`, `/wwstopgame` | Category/Channel creation, Slash command setup. |
| **Registration** | [cmd_registration.md](./cmd_registration.md) | `/wwiwilljoin`, `/wwiwillview`, `/wwremoveyourselffromgame`, `/wwwhoisplaying` | Button Interactions, Ephemeral Game Selection. |
| **Voting** | [cmd_voting.md](./cmd_voting.md) | `/wwstartvoteround`, `/wwstopvoteround`, `/wwvotereminder`, `/wwvotescore`, `/wwstartquickvote`, `/wwlotto` | String Select Menus, State editing. |
| **Moderation** | [cmd_moderation.md](./cmd_moderation.md) | `/wwgiveroles`, `/wwdead`, `/wwrevive`, `/wwextramoderator`, `/wwinvitemoderators`, `/wwinviteplayers` | Quiz Editor UI, Permission Overwrites. |
| **Utility & Info** | [cmd_utility.md](./cmd_utility.md) | `/wwlist`, `/wwstatus`, `/wwarchive`, `/wwchannel`, `/wwhelp`, `/wwsummarize` | Embed Formatting, Channel Deletion, History to `.txt`. |

---

## Work Breakdown & User Stories Estimation

The work has been scoped into User Stories (US), with each story aimed at being under 200 Lines of Code to ensure manageable PRs and testing.

| ID | Story Name | Estimated Effort (LOC) | Target File/Domain |
| :--- | :--- | :--- | :--- |
| **US-GL1** | Implement `/wwstartregistration` Slash Command | 150 | Game Lifecycle |
| **US-GL2** | Implement Game Category & Basic Channels | 200 | Game Lifecycle |
| **US-GL3** | Implement Secret Roles Channels | 150 | Game Lifecycle |
| **US-GL4** | Implement `/wwstopgame` Slash Command | 150 | Game Lifecycle |
| **US-RP1** | Refactor Actions for Discord Interactions | 150 | Registration |
| **US-RP2** | Implement `/wwiwilljoin` & `/wwiwillview` | 150 | Registration |
| **US-RP3** | Implement `/wwremoveyourselffromgame` | 100 | Registration |
| **US-RP4** | Implement `/wwwhoisplaying` | 120 | Registration |
| **US-V1** | Implement Voting Select Menu Action | 150 | Voting |
| **US-V2** | Implement `/wwstartvoteround` & `/wwstartquickvote` | 180 | Voting |
| **US-V3** | Implement `/wwstopvoteround` | 180 | Voting |
| **US-V4** | Implement Reminder, Score, and Lotto | 150 | Voting |
| **US-MOD1** | Build Role Assigner UI State Manager | 150 | Moderation |
| **US-MOD2** | Implement Quiz Editor Interactions | 150 | Moderation |
| **US-MOD3** | Implement Role Confirmation & Permissions | 200 | Moderation |
| **US-MOD4** | Implement Life/Death Commands | 150 | Moderation |
| **US-MOD5** | Implement Invite Commands | 150 | Moderation |
| **US-UTIL1**| Implement Info Commands (`list`, `status`, `help`) | 150 | Utility |
| **US-UTIL2**| Implement `/wwchannel` | 120 | Utility |
| **US-UTIL3**| Implement `/wwarchive` | 100 | Utility |
| **US-UTIL4**| Implement `/wwsummarize` | 200 | Utility |

**Total Estimated User Stories:** 21
**Total Estimated Effort:** ~3200 LOC

## Integration & Testing Plan

1. **Phase 1: Bootstrapping (Not tracked in US above)**
   - Swap `@slack/bolt` for `discord.js` in `package.json`.
   - Update `index.js` to initialize the Discord Client and register the Slash Commands array globally.
2. **Phase 2: Database Schema Prep**
   - Execute an SQL migration (if required) or update `ww_queries.js` mapping to ensure Discord Snowflake IDs are saved safely into the existing varchar fields.
3. **Phase 3: Domain Implementation**
   - Implement the domains roughly in order: Lifecycle -> Registration -> Moderation -> Voting -> Utility.
4. **Phase 4: End-to-End Testing**
   - Conduct a full simulated game flow test using actual Discord accounts to verify that Permission Overwrites accurately hide channels, and that the Quiz Editor assigns roles and permissions without leaking information.
