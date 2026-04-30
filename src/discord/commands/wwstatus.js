const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const queries = require('../../../ww_queries');
const { t } = require('localizify');

function formatStatusLine(gameState, index) {
  if (gameState.gms_status === "REGISTERING") {
    return `${index + 1}. \t ${gameState.gms_name} \t ${t("TEXTOPENREGISTRATION")} ${t("COMMANDIWILLJOIN")} ${gameState.viewers} \n`;
  }
  if (gameState.gms_status === "STARTED") {
    return `${index + 1}. \t ${gameState.gms_name} \t ${t("TEXTGAMESTARTED")} ${gameState.alive} ${t("TEXTPLAYERSAND")} ${gameState.viewers} ${t("TEXTSPECTATORSMULTIPLE")} \n`;
  }
  return "";
}

function appendEnrolledGames(returnText, enrolledGames) {
  if (enrolledGames.length > 0) {
    returnText += `\n${t("TEXTYOUAREENROLLED")}:\n`;
    for (const game of enrolledGames) {
      returnText += `\t ${game.gms_name} ${t("TEXTAS")} ${game.gpl_rol} \n`;
    }
  }
  return returnText;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wwstatus')
    .setDescription('View the status of all games')
    .addBooleanOption(option =>
      option.setName('public')
        .setDescription('Make the response public')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const state = await queries.getGameState();
      let returnText = `${t("TEXTGAMESTOPPED")}`;

      if (state && state.length > 0) {
        returnText = `${t("TEXTSTATUSGAME")}\n\n`;
        for (let i = 0; i < state.length; i++) {
          returnText += formatStatusLine(state[i], i);
        }
        const enrolledGames = await queries.getActiveGameUser(interaction.user.id);
        if (enrolledGames) {
           returnText = appendEnrolledGames(returnText, enrolledGames);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('WW Status')
        .setDescription(returnText)
        .setColor(0x00FF00);

      const isPublic = interaction.options.getBoolean('public') || false;
      await interaction.reply({ embeds: [embed], ephemeral: !isPublic });
    } catch (error) {
      console.error(error.message);
      await interaction.reply({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDSTATUS")}: ${error.message}`, ephemeral: true });
    }
  }
};
