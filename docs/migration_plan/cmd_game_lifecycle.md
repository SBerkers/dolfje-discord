# Migration Plan: Game Lifecycle Commands

## Commands Covered
- `/wwstartregistration`
- `/wwstartgame`
- `/wwstopgame`

## Discord Implementation Strategy
These commands control the creation and closing of a game.

1. **`/wwstartregistration [password] [votestyle] [revivable]`**
   - **Slack:** Arbitrary text parameters.
   - **Discord:** Slash Command with 3 required options: `password` (String), `votestyle` (String, with choices e.g., 'blind'), `revivable` (Integer/Boolean).
   - **Behavior:** Needs to create a new entry in the database. Returns an embed with registration instructions and action buttons for "Join" or "Spectate", replacing text instructions to type `/wwiwilljoin`.

2. **`/wwstartgame [gamename] [playeramount] [mainchannelname] [usestatus]`**
   - **Slack:** Checks if user is moderator, creates a bunch of private channels, invites users via conversations API.
   - **Discord:**
     - Command options: `gamename` (String), `playeramount` (Integer), `mainchannelname` (String).
     - **Architecture Shift:** Creates a Discord Category named after the game (e.g., `WW-1-GAME-TITLE`). All channels (village, wolves, voting booth, etc.) are created inside this category.
     - **Permissions:** Replaces Slack channel invites with Discord Channel Permission Overwrites (adding `VIEW_CHANNEL` for specific User IDs). This is vital for maintaining hidden roles (like Wolves) without creating global roles.

3. **`/wwstopgame [password] [gamename]`**
   - **Slack:** Archives channels, stops game in DB.
   - **Discord:** Options: `password` (String), `gamename` (String).
   - **Behavior:** Updates DB. We might need to map Slack "archive" to Discord "hide category" or deleting the channels depending on preferences. The existing logic to post a "self-invite to channels" message with buttons should be mapped to Discord Action Rows with buttons linking to the channels (or granting access roles/permissions temporarily).

## User Stories & Estimation (Max 200 LOC per story)
1. **US-GL1: Implement `/wwstartregistration` Slash Command** (Est: 150 LOC)
   - Setup slash command definition with options.
   - Call `queries.createNewGame`.
   - Return Discord Embed with "Join" / "Spectate" buttons.
2. **US-GL2: Implement Game Category & Basic Channels Creation (`/wwstartgame` part 1)** (Est: 200 LOC)
   - Setup `/wwstartgame` command definition.
   - Implement `helpers.createDiscordCategory` and `helpers.createDiscordChannelWithPermissions`.
   - Create Category and the Main/Spectator channels.
3. **US-GL3: Implement Secret Roles Channels Creation (`/wwstartgame` part 2)** (Est: 150 LOC)
   - Create Wolves, Vote Booth, Spoiler, and Talk channels with strict Permission Overwrites for specific users.
   - Finalize DB inserts for the channels.
4. **US-GL4: Implement `/wwstopgame` Slash Command** (Est: 150 LOC)
   - Setup slash command.
   - Update DB status.
   - Send End-of-game summary embed with buttons to reveal previously hidden channels to all participants.

## Test Coverage Strategy
- **Unit Tests:** Mock `discord.js` interaction objects. Verify that `queries.createNewGame` and `queries.startGame` are called with correct, parsed parameters. Verify that `PermissionOverwrites` are correctly structured for secret channels (e.g. `@everyone` denied, specific user allowed).
- **Integration Tests:** (Mocking DB) Test the full flow from a mocked `/wwstartgame` command resolving to the creation of the Discord Category and all its child channels.
