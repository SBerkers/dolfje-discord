# Migration Plan: Registration & Participation Commands

## Commands Covered
- `/wwiwilljoin`
- `/wwiwillview`
- `/wwremoveyourselffromgame`
- `/wwwhoisplaying`

## Discord Implementation Strategy
These commands manage user enrollment in games. With the migration to Discord, we can drastically improve the UX by using Buttons from the `/wwstartregistration` command instead of requiring users to type slash commands, though the slash commands should still be registered as fallbacks.

1. **`/wwiwilljoin`, `/wwiwillview`, `/wwremoveyourselffromgame`**
   - **Slack:** If multiple games are open, it opens an IM with buttons to pick a game. If one game is open, it auto-registers.
   - **Discord:**
     - The command takes an optional `gamename` parameter.
     - If no parameter is provided and multiple games exist, return an **ephemeral message** (instead of IM) with Action Row Buttons listing the open games.
     - Note: A large portion of this logic will be triggered directly via `interactionCreate` when users click the "Join" or "Spectate" buttons created by `/wwstartregistration`.

2. **`/wwwhoisplaying`**
   - **Slack:** Posts an ephemeral or public list of enrollments.
   - **Discord:**
     - Slash command with an optional `public` boolean parameter.
     - Responds with an Embed listing the active games and the registered/viewing users (using Discord mention syntax `<@discord_id>`).

## User Stories & Estimation (Max 200 LOC per story)
1. **US-RP1: Refactor Registration Actions for Discord Interactions** (Est: 150 LOC)
   - Update `ww_actions.js` (`joinActionFunction`, `viewActionFunction`, `unregisterActionFunction`) to accept and reply to Discord `ButtonInteraction` objects.
2. **US-RP2: Implement `/wwiwilljoin` & `/wwiwillview` Slash Commands** (Est: 150 LOC)
   - Setup slash commands.
   - Implement ephemeral response with game selection buttons if multiple games are active.
   - Hook up to the refactored actions from US-RP1.
3. **US-RP3: Implement `/wwremoveyourselffromgame` Slash Command** (Est: 100 LOC)
   - Setup slash command and ephemeral button response for unregistering.
4. **US-RP4: Implement `/wwwhoisplaying` Slash Command** (Est: 120 LOC)
   - Setup slash command with a boolean `public` option.
   - Fetch DB state and format Discord Embed with grouped game registration status.

## Test Coverage Strategy
- **Unit Tests:** Verify that clicking a "Join Game X" button successfully parses the game ID from the `customId` and calls `joinActionFunction`. Verify that `/wwwhoisplaying` correctly respects the `public` boolean to use `interaction.reply({ ephemeral: true/false })`.
- **Integration Tests:** Test the registration flow: A user invokes the slash command -> gets buttons -> clicks a button -> DB state is updated -> user receives an ephemeral confirmation message.
