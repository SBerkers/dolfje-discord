const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('localizify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wwhelp')
    .setDescription('Get help and information about the bot'),

  async execute(interaction) {
    try {
      const helpText = t("HELPTEXT");
      const embed = new EmbedBuilder()
        .setTitle('Dolfje Help')
        .setDescription(helpText)
        .setColor(0x0099FF);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(error.message);
      await interaction.reply({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDHELP")}: ${error.message}`, ephemeral: true });
    }
  }
};
