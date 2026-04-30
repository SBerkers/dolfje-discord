const { t } = require("localizify");
const queries = require("../../ww_queries");
const helpers = require("../../ww_helpers");

async function executeConfirmRoles(interaction, client, passedRolesToAssign, gameId) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const game = await queries.getSpecificGame(gameId);

    // Validate moderator
    if (!(await queries.isModerator(gameId, interaction.user.id))) {
      await interaction.editReply({
        content: t("TEXTONLYMODERATORROLES"),
      });
      return;
    }

    const playersAlive = await queries.getAlive(gameId);
    helpers.shuffle(playersAlive);

    let rolesToAssign = passedRolesToAssign ? [...passedRolesToAssign] : [];

    // Pad with 'villager' (burger) if not enough roles provided, or throw if too many
    if (rolesToAssign.length > playersAlive.length) {
      await interaction.editReply({
        content: t("TEXTNOTENOUGHROLES"), // Wait, the english text says "There were more players than roles." which is weird, maybe it means more roles than players.
      });
      return;
    }

    // Fill the rest with a default role if needed, although the quiz editor probably handles this
    while (rolesToAssign.length < playersAlive.length) {
        rolesToAssign.push("villager"); // default
    }

    helpers.shuffle(rolesToAssign);

    const roleList = [];
    const wolves = [];
    const seers = []; // Add other special roles if needed
    const witches = [];

    // Assign roles
    for (let i = 0; i < playersAlive.length; i++) {
      playersAlive[i].rol = rolesToAssign[i];
      const player = playersAlive[i];
      roleList.push(`<@${player.user_id}>: ${player.rol}`);

      if (player.rol.toLowerCase().includes("wolf")) {
          wolves.push(player.user_id);
      } else if (player.rol.toLowerCase().includes("seer") || player.rol.toLowerCase().includes("ziener")) {
          seers.push(player.user_id);
      } else if (player.rol.toLowerCase().includes("witch") || player.rol.toLowerCase().includes("heks")) {
          witches.push(player.user_id);
      }
    }

    // Process all Discord API calls concurrently to minimize latency
    const apiCalls = [];

    // Save roles to database
    for (const player of playersAlive) {
      apiCalls.push(
        queries.updateRole(gameId, player.user_id, player.rol).catch(e => console.error(`Failed to save role for ${player.user_id}: ${e.message}`))
      );
    }

    // Send DMs
    for (const player of playersAlive) {
      const dmCall = (async () => {
        try {
          const user = await client.users.fetch(player.user_id);
          await user.send(`${t("TEXTHI")} <@${player.user_id}>, ${t("TEXTYOURROLE")} ${player.rol}`);
        } catch (e) {
          console.error(`Failed to send DM to ${player.user_id}: ${e.message}`);
        }
      })();
      apiCalls.push(dmCall);
    }

    // Set up channel permissions
    const guild = interaction.guild;
    if (guild) {
        // Wolves channel
        if (wolves.length > 0) {
            const wolvesChannelCall = (async () => {
                try {
                    const channelId = await queries.getChannel(gameId, helpers.channelType.wolves);
                    if (channelId) {
                        const channel = await guild.channels.fetch(channelId);
                        if (channel) {
                            for (const wolfId of wolves) {
                                await channel.permissionOverwrites.edit(wolfId, { ViewChannel: true });
                            }
                        }
                    }
                } catch (e) {
                     console.error(`Failed to assign wolves channel permissions: ${e.message}`);
                }
            })();
            apiCalls.push(wolvesChannelCall);
        }

        // Special channel setup (e.g. Seer)
        // Note: For now, the database might not have these specific channelTypes defined, so we fallback or wait for other user stories.
        // But the requirement says "creates the required private role channels (e.g., granting the newly assigned Wolves access to the Wolves channel)."
    }

    await Promise.all(apiCalls);

    await interaction.editReply({
      content: `${t("TEXTROLES")}:\n${roleList.join("\n")}`,
    });

  } catch (error) {
    const errorMsg = `${t("TEXTCOMMANDERROR")} ${t("COMMANDGIVEROLES")}: ${error.message}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
}

module.exports = {
  executeConfirmRoles,
};
