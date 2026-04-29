# Migration Plan: Utility, Info & Channel Commands

## Commands Covered
- `/wwlist`
- `/wwstatus`
- `/wwarchive`
- `/wwchannel`
- `/wwhelp`
- `/wwsummarize`

## Discord Implementation Strategy
These commands provide utility functions and information to users and moderators.

1. **`/wwlist` & `/wwstatus` & `/wwhelp`**
   - **Slack:** Text responses, occasionally using ephemeral formatting depending on "public" keyword.
   - **Discord:**
     - `/wwlist`: Options `public` (boolean), `newline` (boolean). Returns an Embed listing Living/Dead users.
     - `/wwstatus`: Options `public` (boolean). Returns an Embed with active games and enrollment status.
     - `/wwhelp`: Returns a static Embed with rules and bot information.

2. **`/wwchannel`**
   - **Slack:** Creates a private conversation between the bot, the user, and optionally narrators.
   - **Discord:**
     - Options: `channelname` (String).
     - Behavior: Creates a new Text Channel under the Game Category with `VIEW_CHANNEL` restricted to just the User and the Moderators.

3. **`/wwarchive`**
   - **Slack:** Takes `password` and `gamename`, calls Slack archive API on all game channels.
   - **Discord:**
     - Discord does not have a native "Archive" feature for channels.
     - Options: We will delete the channels OR move the Game Category to the bottom of the server and deny `@everyone` read access, effectively hiding it. Deleting is cleaner for server limits. We will implement channel deletion.

4. **`/wwsummarize`**
   - **Slack:** Fetches message history including threads, builds massive block structures.
   - **Discord:**
     - Options: `startdate`, `enddate`.
     - Behavior: Will use `channel.messages.fetch()` (or DB history if synced). Discord embeds have strict size limits (6000 chars total, 25 fields max). This command will likely need to generate a `.txt` file or multiple chained messages if the summary is large.

## User Stories & Estimation (Max 200 LOC per story)
1. **US-UTIL1: Implement Info Commands (`/wwlist`, `/wwstatus`, `/wwhelp`)** (Est: 150 LOC)
   - Setup slash commands.
   - Format DB queries into rich Discord Embeds.
   - Handle ephemeral vs public replies.
2. **US-UTIL2: Implement `/wwchannel` (Private Thread/Channel)** (Est: 120 LOC)
   - Setup slash command.
   - Create a new channel under the active game category.
   - Apply Permission Overwrites for the requester and moderators.
3. **US-UTIL3: Implement `/wwarchive` (Teardown)** (Est: 100 LOC)
   - Setup slash command requiring password and gamename.
   - Fetch all associated Discord Channel IDs from DB.
   - Iterate and `channel.delete()`, then delete the Category.
4. **US-UTIL4: Implement `/wwsummarize`** (Est: 200 LOC)
   - Setup slash command.
   - Query DB for messages in the date range.
   - Format the output. Since it can be large, implement logic to write to a temporary `.txt` file and send it as an `Attachment` in the Discord reply to avoid Embed limits.

## Test Coverage Strategy
- **Unit Tests:** Verify Embed formatting functions for the info commands return valid Discord Embed objects.
- **Integration Tests:** Test `/wwchannel` to ensure the created channel's permissions correctly include the requester and exclude `@everyone`. Test `/wwarchive` to ensure it successfully iterates and calls delete on mock channel objects.
