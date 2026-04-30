const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const queries = require('../../../ww_queries');
const helpers = require('../../../ww_helpers');
const { t } = require('localizify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wwlist')
    .setDescription('List living and dead users')
    .addBooleanOption(option =>
      option.setName('public')
        .setDescription('Make the response public')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('newline')
        .setDescription('Separate names with newlines instead of commas')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const channelId = interaction.channelId;
      const game = await queries.getActiveGameWithChannel(channelId);
      if (!game) {
        await interaction.reply({ content: t("TEXTCOMMANDERROR") + " " + t("COMMANDLIST") + ": No active game found in this channel.", ephemeral: true });
        return;
      }

      // We will look up each player in the guild to get their display name
      const playerList = await queries.getPlayerList(game.gms_id);
      const guildMembers = await interaction.guild.members.fetch();

      const inputList = playerList.map(player => {
        const member = guildMembers.get(player.gpl_slack_id);
        return {
          id: player.gpl_slack_id,
          name: member ? member.displayName : player.gpl_slack_id,
          status: player.status
        };
      });

      const separator = interaction.options.getBoolean('newline') ? '\n' : ', ';

      const livingPlayers = inputList.filter(x => x.status === t("TEXTPARTICIPANT") || x.status === t("TEXTMAYOR"));
      const deadPlayers = inputList.filter(x => x.status === t("TEXTDEAD"));
      const noStatusPlayers = inputList.filter(x => !x.status || x.status === "");

      const livingText = livingPlayers.map(x => x.name).join(separator) || "-";
      const deadText = deadPlayers.map(x => x.name).join(separator) || "-";
      const noStatusText = noStatusPlayers.map(x => x.name).join(separator) || "-";

      const embed = new EmbedBuilder()
        .setTitle(t("TEXTLIVING") + " / " + t("TEXTDEAD"))
        .setColor(0x0099FF)
        .addFields(
          { name: `${t("TEXTLIVING")} (${livingPlayers.length})`, value: livingText },
          { name: `${t("TEXTMULTIPLEDEAD")} (${deadPlayers.length})`, value: deadText }
        );

      if (noStatusPlayers.length > 0) {
        embed.addFields({ name: `${t("TEXTNOSTATUS")} (${noStatusPlayers.length})`, value: noStatusText });
      }

      const isPublic = interaction.options.getBoolean('public') || false;
      await interaction.reply({ embeds: [embed], ephemeral: !isPublic });
    } catch (error) {
      console.error(error.message);
      await interaction.reply({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDLIST")}: ${error.message}`, ephemeral: true });
    }
  }
};
