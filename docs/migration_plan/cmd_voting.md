# Migration Plan: Voting Commands

## Commands Covered
- `/wwstartvoteround`
- `/wwstopvoteround`
- `/wwvotereminder`
- `/wwvotescore`
- `/wwstartquickvote`
- `/wwlotto`

## Discord Implementation Strategy
Voting is a core mechanic of the game.

1. **`/wwstartvoteround` & `/wwstartquickvote`**
   - **Slack:** Posts a message with Slack Blocks containing buttons for every living player.
   - **Discord:**
     - Must be converted to post a message with **Action Rows** containing **Buttons**.
     - Discord has a limit of 5 Action Rows per message, and 5 Buttons per Action Row (max 25 buttons per message). If there are more than 25 living players, we must split the vote buttons across two consecutive messages, or utilize a **String Select Menu**.
     - *Design Decision:* Since games might have >25 players, we will switch from Buttons to a **Select Menu** for voting. The bot will send a Select Menu containing the names of all living players.

2. **`/wwstopvoteround`**
   - **Slack:** Updates the original message to say "Closed", gathers poll results from DB, updates player stats, shuffles users in channel.
   - **Discord:**
     - Edits the original Discord message to remove the Select Menu/Buttons and append "(Closed)".
     - The channel shuffle/delayed posting mechanic needs adaptation for Discord API (Discord doesn't have a direct equivalent of `helpers.postDelayed` for sorting users in a channel visual list natively without roles, but we can manage permissions or post a summary list).

3. **`/wwvotereminder` & `/wwvotescore`**
   - **Slack:** `/wwvotereminder` IMs users who haven't voted. `/wwvotescore` IMs the moderator the current tally.
   - **Discord:**
     - `/wwvotereminder`: Sends a DM (Direct Message) to users.
     - `/wwvotescore`: Instead of a DM, it will reply ephemerally to the moderator who invoked the command in the channel, showing an Embed of the current vote tallies.

4. **`/wwlotto`**
   - **Slack:** Selects a random player. Optionally public.
   - **Discord:** Slash command with `public` boolean option. Ephemeral or public reply.

## User Stories & Estimation (Max 200 LOC per story)
1. **US-V1: Implement Voting Select Menu Action (Interaction)** (Est: 150 LOC)
   - Create the interaction handler for when a user selects someone from the voting dropdown.
   - Update `queries.vote` logic to work with Discord interaction user IDs.
2. **US-V2: Implement `/wwstartvoteround` & `/wwstartquickvote`** (Est: 180 LOC)
   - Setup slash commands.
   - Query alive players and build Discord String Select Menu component.
   - Post to voting channel and record message ID in DB.
3. **US-V3: Implement `/wwstopvoteround`** (Est: 180 LOC)
   - Setup slash command.
   - Retrieve message ID, edit message to disable/remove the Select Menu.
   - Tally results and post voting summary Embed.
4. **US-V4: Implement Reminder, Score, and Lotto Commands** (Est: 150 LOC)
   - `/wwvotereminder`: Loop and `user.send()`.
   - `/wwvotescore`: Fetch DB poll results and format ephemeral Embed.
   - `/wwlotto`: Randomize alive array and format reply.

## Test Coverage Strategy
- **Unit Tests:** Ensure the Select Menu generator creates valid Discord Component arrays. Test the vote handler to ensure it correctly identifies the voter and votee from the interaction.
- **Integration Tests:** Simulate starting a vote round -> simulate 3 different users interacting with the select menu -> stop the vote round -> verify the final tally embed matches expected counts.
