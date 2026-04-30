require("dotenv").config();
const localizify = require("localizify");

const en = require("./en.json");
const nl = require("./nl.json");
localizify.default.add("en", en).add("nl", nl).setLocale(process.env.APPLANG);
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const ww_actions = require("./ww_actions");
const ww_commands = require("./ww_commands");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("ready", async () => {
  console.log(`dolfje is running as ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
    const commands = ww_commands.getCommandDefinitions();

    console.log("Started refreshing application (/) commands.");
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await ww_commands.handleCommand(interaction);
  } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
    await ww_actions.handleAction(interaction);
  }
});

app
  .start(6262)
  .then(() => console.log("dolfje is running"))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
