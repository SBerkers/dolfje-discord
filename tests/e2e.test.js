require("dotenv").config({ path: "e2etesting.env" });
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { Client, GatewayIntentBits } = require("discord.js");

// In a real E2E environment, we mock the `interactionCreate` event to simulate user actions
// because Discord doesn't allow bots to invoke slash commands directly.
// This test suite acts as the "Observer" to verify what the main bot (which is being tested)
// actually creates in the Discord Guild (Channels, Categories, Roles, etc.)

describe("End-to-End Discord Bot Flow", () => {
  let client;
  let guild;
  let testCategoryId;

  before(async () => {
    // We only connect if tokens are provided, otherwise tests will just mock the connection or fail
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.warn(
        "WARNING: DISCORD_BOT_TOKEN not set in e2etesting.env. Tests will fail."
      );
      return;
    }

    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);
    guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    assert.ok(guild, "Test guild not found");
  });

  after(async () => {
    if (client) {
      // Clean up categories created during testing
      if (testCategoryId) {
        try {
          const category = await guild.channels.fetch(testCategoryId);
          if (category) {
            // delete all channels inside
            for (const [id, channel] of category.children.cache) {
              await channel.delete();
            }
            await category.delete();
          }
        } catch (err) {
          console.error("Cleanup failed:", err.message);
        }
      }
      client.destroy();
    }
  });

  // Helper to simulate sending an interaction to the main bot logic
  // Since the bot is currently in Slack mode, this helper acts as a placeholder
  // that will trigger the newly migrated Discord logic.
  async function simulateSlashCommand(commandName, options) {
    // In a fully integrated test, we would construct a fake Discord.js Interaction
    // and pass it to the bot's `client.emit('interactionCreate', fakeInteraction)`.
    // Since the bot isn't migrated yet, this will fail.

    // Example mock interaction (we will assume the bot exports a handleInteraction function eventually)
    const fakeInteraction = {
      isChatInputCommand: () => true,
      commandName: commandName,
      options: {
        getString: (name) => options[name],
        getInteger: (name) => options[name],
        getUser: (name) => options[name],
      },
      guildId: guild?.id,
      user: client?.user, // using the bot itself as the "user"
      reply: async (msg) => { console.log(`Mock Reply:`, msg); },
      deferReply: async () => {},
      editReply: async (msg) => { console.log(`Mock EditReply:`, msg); },
      channel: {
        id: "mock_channel_id",
      }
    };

    // The bot doesn't have this yet, so we throw to show it fails miserably as expected
    // const mainBotApp = require('../index.js');
    // await mainBotApp.handleInteraction(fakeInteraction);
    throw new Error(`Command /${commandName} not implemented in Discord yet`);
  }

  test("Flow 1: Start Registration", async () => {
    // 1. Simulate `/startregistration`
    // In Discord, we expect options: pass, votestyle, reviveable
    await simulateSlashCommand("startregistration", {
      pass: process.env.MNOT_ADMIN_PASS,
      votestyle: "blind",
      reviveable: 1,
    });

    // We would assert the bot sent a message to the registration channel
    // assert(something)
  });

  test("Flow 2: Users Join Game", async () => {
    // Simulate `/iwilljoin`
    await simulateSlashCommand("iwilljoin", {});
  });

  test("Flow 3: Start Game", async () => {
    // Simulate `/startgame`
    await simulateSlashCommand("startgame", {
      gamename: "ww1",
      playeramount: 1,
      mainchannel: "ww1_dorp",
    });

    // Verification: Wait a bit for the bot to create channels on Discord
    await new Promise((r) => setTimeout(r, 2000));

    // Assert that a Category was created for the game
    const categories = await guild.channels.fetch();
    const gameCategory = categories.find((c) => c.name.toLowerCase().includes("ww1") && c.type === 4); // 4 = GUILD_CATEGORY
    assert.ok(gameCategory, "Game category was not created on Discord");

    testCategoryId = gameCategory.id;

    // Assert channels are in the category
    const channelsInCat = categories.filter(c => c.parentId === gameCategory.id);
    const channelNames = channelsInCat.map(c => c.name);

    assert.ok(channelNames.includes("ww1_dorp"), "Main channel missing");
    assert.ok(channelNames.includes("ww1_wolven"), "Wolves channel missing");
    assert.ok(channelNames.includes("ww1_stemhokje"), "Vote booth missing");
  });

  test("Flow 4: Assign Roles with Interactive Quiz UI", async () => {
    // Simulate the new Quiz UI for roles
    await simulateSlashCommand("assignroles", {});

    // Simulate clicking the "Add Wolf" button
    // A button interaction looks different than a command interaction
    const fakeButtonInteraction = {
      isButton: () => true,
      customId: "add_wolf",
      message: { id: "mock_msg_id" },
      update: async (msg) => { console.log("Embed updated:", msg); }
    };
    // throw new Error("Not implemented yet");
  });

  test("Flow 5: Voting Round", async () => {
    await simulateSlashCommand("voteround", {
      title: "Who to lynch?",
    });

    // Verify the bot posts an Action Row of buttons in the voting booth
  });

  test("Flow 6: Stop Game", async () => {
    await simulateSlashCommand("stopgame", {
      pass: process.env.MNOT_ADMIN_PASS,
      gamename: "ww1",
    });

    // Verify category permissions are opened or game is marked stopped
  });
});
