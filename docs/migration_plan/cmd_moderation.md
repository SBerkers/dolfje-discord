# Migration Plan: Moderation & Role Assignment Commands

## Commands Covered
- `/wwgiveroles`
- `/wwdead`
- `/wwrevive`
- `/wwextramoderator`
- `/wwinvitemoderators`
- `/wwinviteplayers`

## Discord Implementation Strategy
These commands are strictly for moderators to manage the state of the game and players.

1. **`/wwgiveroles`**
   - **Slack:** Moderator types text like `/wwgiveroles wolf:2 heks:1`. Bot PMs everyone their role.
   - **Discord:**
     - **Architecture Shift:** As per the `README.md`, this will be replaced with an interactive **Quiz Editor UI**.
     - When a mod types `/wwgiveroles`, the bot responds ephemerally with an embed showing current counts and Action Row buttons (➕/➖) for each known role (Wolf, Seer, Witch, etc.).
     - A "Confirm" button finalizes the distribution, shuffles players, updates DB, sends DMs, and creates the required private role channels (e.g., granting the newly assigned Wolves access to the Wolves channel).

2. **`/wwdead` & `/wwrevive`**
   - **Slack:** Marks user dead/alive in DB. Invites/kicks from spectator channel.
   - **Discord:**
     - Options: `user` (User type option).
     - Behavior: Update DB. To manage permissions, when dead, remove their `SEND_MESSAGES` permission from the main Village/Vote channels, and add them to the spectator channel via Permission Overwrites. On revive, restore their permissions.

3. **`/wwextramoderator` & `/wwinvitemoderators` & `/wwinviteplayers`**
   - **Slack:** Modifies DB roles, invites users to channels via Slack invite API.
   - **Discord:**
     - Options: `user` (User type option) for extramod.
     - Behavior: Updates DB. Discord equivalent of "invite" here is adding `VIEW_CHANNEL` to the user's Permission Overwrites for the specific game channels.

## User Stories & Estimation (Max 200 LOC per story)
1. **US-MOD1: Build Role Assigner UI State Manager** (Est: 150 LOC)
   - Create logic to track the temporary state of the Quiz Editor (how many of each role are currently selected).
   - Generate the dynamic Embed and Button Action Rows based on this state.
2. **US-MOD2: Implement Quiz Editor Interaction Handlers** (Est: 150 LOC)
   - Handle the `+` and `-` button clicks, update the state, and edit the ephemeral message to reflect new counts.
3. **US-MOD3: Implement Role Confirmation & Channel Setup** (Est: 200 LOC)
   - Handle the "Confirm" button.
   - Execute the role shuffling logic.
   - DM users their roles.
   - **Crucial:** Apply Discord Permission Overwrites to the special channels (Wolves, Spoilers, etc.) based on the assigned roles.
4. **US-MOD4: Implement Life/Death Commands (`/wwdead`, `/wwrevive`)** (Est: 150 LOC)
   - Setup slash commands with User option.
   - Update DB.
   - Update Discord Channel permissions (mute in village, allow in graveyard/spectator).
5. **US-MOD5: Implement Moderator/Player Invite Commands** (Est: 150 LOC)
   - Map `/wwextramoderator`, `/wwinvitemoderators`, `/wwinviteplayers`.
   - Update DB and apply batch Permission Overwrites to sync the channel access.

## Test Coverage Strategy
- **Unit Tests:** Extensively test the Role Assigner UI state manager to ensure role counts never go below 0 or exceed the total player count.
- **Integration Tests:** Test the full `/wwgiveroles` flow: mock the interaction -> click + Wolf -> click + Seer -> click Confirm. Verify that exactly 1 player is granted access to the mocked Seer channel, and 1 player to the mocked Wolf channel.
