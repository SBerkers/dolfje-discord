module.exports = {
  handleAction,
  selfInviteClickFunction,
  joinActionFunction,
  viewActionFunction,
  unregisterActionFunction,
  addModeratorFunction,
  createNewChannelFunction,
  voteSelectFunction,
};

let helpers = require("./ww_helpers");
const queries = require("./ww_queries");
const { t } = require("localizify");

let client;

async function handleAction(interaction) {
  // To be implemented in subsequent phases
}

const vluchtigeStemmingen = [];

async function voteSelectFunction(interaction) {
  try {
    const gameId = interaction.customId.split("-")[1];
    const voterId = interaction.user.id;
    const targetId = interaction.values[0];

    await queries.votesOn(gameId, voterId, targetId);

    await interaction.reply({
      content: `Je hebt gestemd op: <@${targetId}>`,
      ephemeral: true,
    });

    const stemstandChannelId = await queries.getChannel(
      gameId,
      helpers.channelType.stemstand,
    );

    const stemstandChannel = await interaction.client.channels.fetch(stemstandChannelId).catch(() => null);
    if (stemstandChannel) {
      await stemstandChannel.send({
        content: `<@${voterId}> heeft gestemd op: <@${targetId}>`,
      });
    }

  } catch (error) {
    console.error(error.message);
    const errorMessage = `Er ging iets mis met het stemmen: ${error.message}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

function removePreviousVluchtigeVote(votesByMessage, messageTs, userId) {
  const votes = votesByMessage[messageTs];
  for (const voteTarget in votes) {
    if (votes[voteTarget].length && votes[voteTarget].includes(userId)) {
      votes[voteTarget].splice(votes[voteTarget].indexOf(userId), 1);
    }
  }
}

function addVluchtigeVote(votesByMessage, messageTs, voteTarget, userId) {
  if (votesByMessage[messageTs][voteTarget]) {
    votesByMessage[messageTs][voteTarget].push(userId);
  } else {
    votesByMessage[messageTs][voteTarget] = [userId];
  }
}

function buildVluchtigeButtonBlocks(playersByChunk, votedOn) {
  const buttonblocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "vluchtige stemming:",
      },
    },
  ];

  if (!votedOn || votedOn === "sluit") {
    buttonblocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "stemming gesloten",
      },
    });
    return buttonblocks;
  }

  for (const channelChunk of playersByChunk) {
    buttonblocks.push({
      type: "actions",
      elements: channelChunk.map((x) => ({
        type: "button",
        text: {
          type: "plain_text",
          text: x.slack_name,
        },
        value: x.user_id,
        action_id: `vluchtig-${x.user_id}`,
      })),
    });
  }

  buttonblocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: `sluit vluchtige stemming`,
        },
        value: "sluit",
        action_id: `vluchtig-sluit`,
      },
    ],
  });

  return buttonblocks;
}

function buildVluchtigeStemUitslag(votes) {
  const stemUitslag = [];
  for (const voteTarget in votes) {
    stemUitslag.push(
      `<@${voteTarget}>: *${votes[voteTarget].length}* (${votes[voteTarget]
        .map((x) => `<@${x}>`)
        .join(", ")})`,
    );
  }
  return stemUitslag;
}

async function quickVoteClick({ body, ack, say }) {
  ack();
  try {
    if (!vluchtigeStemmingen[body.message.ts]) {
      vluchtigeStemmingen[body.message.ts] = [];
    }
    const user = body.user.id;
    const votedOn = body.actions[0].value;
    const game = await queries.getActiveGameWithChannel(body.channel.id);
    if (votedOn !== "sluit") {
      removePreviousVluchtigeVote(vluchtigeStemmingen, body.message.ts, user);
      addVluchtigeVote(vluchtigeStemmingen, body.message.ts, votedOn, user);
    }
    let playersAlive = await queries.getAlive(game.gms_id);
    playersAlive = await helpers.addSlackName(client, playersAlive);
    const chuckedUsersAlive = [];
    while (playersAlive.length) {
      chuckedUsersAlive.push(playersAlive.splice(0, 5));
    }

    const buttonblocks = buildVluchtigeButtonBlocks(chuckedUsersAlive, votedOn);
    const stemUitslag = buildVluchtigeStemUitslag(
      vluchtigeStemmingen[body.message.ts],
    );
    buttonblocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `stemmen:\n${stemUitslag.join("\n")}`,
      },
    });
    await client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.container.channel_id,
      ts: body.container.message_ts,
      text: `vluchtige stemming: ${stemUitslag.join("; ") || "gesloten"}`,
      blocks: buttonblocks,
    });
    if (!votedOn || votedOn === "sluit") {
      vluchtigeStemmingen[body.message.ts] = [];
    }
  } catch (error) {
    await helpers.sendIM(
      client,
      body.user.id,
      `Er ging iets mis met het vluchtig stemmen: ${error.message}`,
    );
  }
}

async function selfInviteClick({ body, ack, say }) {
  ack();
  const inviteTarget = body.actions[0].value;
  const userId = body.user.id;
  if (inviteTarget.startsWith("allchannels-")) {
    const gameId = Number.parseInt(inviteTarget.split("-")[1], 10);
    if (!Number.isNaN(gameId)) {
      await selfInviteAllChannelsFunction(gameId, userId);
      return;
    }
  }
  await selfInviteClickFunction(inviteTarget, userId);
}

async function selfInviteClickFunction(channelId, userId) {
  try {
    await client.conversations.invite({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      users: userId,
    });
  } catch (error) {
    await helpers.sendIM(
      client,
      userId,
      `Er ging iets mis met het het zelf uitnodigen: ${error.message}`,
    );
  }
}

async function selfInviteAllChannelsFunction(gameId, userId) {
  try {
    const channels = await queries.getAllChannels(gameId);
    for (const channel of channels) {
      try {
        await client.conversations.invite({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channel.gch_slack_id,
          users: userId,
        });
      } catch (error) {
        if (error?.data?.error === "already_in_channel") {
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    await helpers.sendIM(
      client,
      userId,
      `Er ging iets mis met uitnodigen voor alle kanalen: ${error.message}`,
    );
  }
}

async function joinAction({ body, ack, say }) {
  ack();
  try {
    const userId = body.user.id;
    const gameId = body.actions[0].value;
    const msgChannelId = body.container.channel_id;
    const msgTs = body.container.message_ts;
    const singleGame = false;
    await joinActionFunction(userId, gameId, msgChannelId, msgTs, singleGame);
  } catch (error) {
    await helpers.sendIM(
      client,
      body.user.id,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDIWILLJOIN")}: ${error.message}`,
    );
  }
}

async function joinActionFunction(
  interaction,
  gameId,
  singleGame,
) {
  try {
    const userId = interaction.user.id;
    const userName = interaction.user.username;
    const result = await queries.joinGame(gameId, userId, userName);
    const thisGame = await queries.getSpecificGame(gameId);
    if (result.succes) {
      const regChannel = await interaction.client.channels.fetch(process.env.REG_CHANNEL).catch(() => null);
      if (regChannel) {
        await regChannel.send({
          content: `${userName} ${t("TEXTJOINED")} ${t(thisGame.gms_name)}, ${t("TEXTTHEREARE")} ${
            result.numberOfPlayers
          } ${t("TEXTAMOUNTJOINED")} ${t("TEXTAMOUNTVIEWING")} ${result.numberOfViewers}`,
        });
      }
      const doeMeeMessage = t("TEXTJOINEDGAME");
      await interaction.reply({ content: doeMeeMessage, ephemeral: true });
    } else {
      await interaction.reply({
        content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDIWILLJOIN")}: ${result.error}`,
        ephemeral: true,
      });
    }
    if (!singleGame) {
      const games = await queries.getGameRegisterUser(userId);
      if (games.length > 0) {
        const actionRow = new ActionRowBuilder();
        for (const game of games) {
          actionRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`inschrijven-${game.gms_id}`)
              .setLabel(game.gms_name)
              .setStyle(ButtonStyle.Primary)
          );
        }
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId("delete-close")
            .setLabel(`${t("TEXTCLOSEMESSAGE")}`)
            .setStyle(ButtonStyle.Secondary)
        );
        await interaction.message.edit({
          content: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKREGISTER")}`,
          components: [actionRow],
        });
      } else {
        await interaction.message.delete();
      }
    }
  } catch (error) {
    const errorMsg = `Er ging iets mis met deelnemen: ${error.message}`;
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    } else {
      await interaction.followUp({ content: errorMsg, ephemeral: true });
    }
  }
}

async function viewAction({ body, ack, say }) {
  ack();
  try {
    const userId = body.user.id;
    const gameId = body.actions[0].value;
    const msgChannelId = body.container.channel_id;
    const msgTs = body.container.message_ts;
    const singleGame = false;
    await viewActionFunction(userId, gameId, msgChannelId, msgTs, singleGame);
  } catch (error) {
    await helpers.sendIM(
      client,
      body.user.id,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDIWILLVIEW")}: ${error.message}`,
    );
  }
}

async function viewActionFunction( // NOSONAR
  userId,
  gameId,
  msgChannelId,
  msgTs,
  singleGame,
) {
  try {
    const userName = await helpers.getUserName(client, userId);
    const game = await queries.getSpecificGame(gameId);
    const result = await queries.viewGame(userId, userName, game.gms_id);
    if (result.succes) {
      if (game.gms_status === "REGISTERING") {
        await client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: process.env.REG_CHANNEL,
          text: `${userName} ${t("TEXTVIEWED")} ${t(game.gms_name)}, ${t("TEXTTHEREARE")} ${
            result.numberOfPlayers
          } ${t("TEXTAMOUNTJOINED")} ${t("TEXTAMOUNTVIEWING")} ${result.numberOfViewers}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${userName} ${t("TEXTVIEWED")} ${t(game.gms_name)}, ${t("TEXTTHEREARE")} ${
                  result.numberOfPlayers
                } ${t("TEXTAMOUNTJOINED")} ${t("TEXTAMOUNTVIEWING")} ${result.numberOfViewers}`,
              },
            },
          ],
        });
      } else if (game.gms_status === "STARTED") {
        await client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: process.env.REG_CHANNEL,
          text: `${t("TEXTVIEWERJOINED")} ${userName}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${t("TEXTVIEWERJOINED")} ${userName}`,
              },
            },
          ],
        });

        //invite player to main channel
        const mainId = await queries.getChannel(
          game.gms_id,
          helpers.channelType.main,
        );
        await client.conversations.invite({
          token: process.env.SLACK_BOT_TOKEN,
          channel: mainId,
          users: userId,
        });
        //invite player to stemhok
        const voteId = await queries.getChannel(
          game.gms_id,
          helpers.channelType.vote,
        );
        await client.conversations.invite({
          token: process.env.SLACK_BOT_TOKEN,
          channel: voteId,
          users: userId,
        });
        //invite player to sectators
        const sectatorId = await queries.getChannel(
          game.gms_id,
          helpers.channelType.sectator,
        );
        await client.conversations.invite({
          token: process.env.SLACK_BOT_TOKEN,
          channel: sectatorId,
          users: userId,
        });
        //invite player to kletskanaal
        const talkChannelId = await queries.getChannel(
          game.gms_id,
          helpers.channelType.talking,
        );
        await client.conversations.invite({
          token: process.env.SLACK_BOT_TOKEN,
          channel: talkChannelId,
          users: userId,
        });
        //send IM to vertellers
        const moderatorMessage = `${t("TEXTVIEWERJOINED")} ${userName}`;
        const moderators = await queries.getModerators(game.gms_id);
        for (const moderator of moderators) {
          await helpers.sendIM(client, moderator, moderatorMessage);
        }
      }
      const viewMessage = `${t("TEXTVIEWEDGAME")} ${t("COMMANDREMOVEYOURSELFFROMGAME")}`;
      await helpers.sendIM(client, userId, viewMessage);

      if (!singleGame) {
        const games = await queries.getGameOpenUser(userId);

        if (games.length > 0) {
          let buttonElements = [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: `${t("TEXTCLOSEMESSAGE")}`,
              },
              value: "Close",
              action_id: `delete-${msgChannelId}`,
            },
          ];
          for (const singleGame of games) {
            buttonElements.push({
              type: "button",
              text: {
                type: "plain_text",
                text: singleGame.gms_name,
              },
              value: singleGame.gms_id.toString(),
              action_id: `meekijken-${singleGame.gms_id}`,
            });
          }
          let buttonblocks = [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKVIEW")}`,
              },
            },
            {
              type: "actions",
              elements: buttonElements,
            },
          ];
          await client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: msgChannelId,
            ts: msgTs,
            text: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKVIEW")}`,
            blocks: buttonblocks,
          });
        } else {
          await client.chat.delete({
            token: process.env.SLACK_BOT_TOKEN,
            channel: msgChannelId,
            ts: msgTs,
          });
        }
      }
    } else {
      await helpers.sendIM(
        client,
        userId,
        `${t("TEXTCOMMANDERROR")} ${t("COMMANDIWILLVIEW")}: ${result.error}`,
      );
    }
  } catch (error) {
    await helpers.sendIM(
      client,
      userId,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDIWILLVIEW")}: ${error.message}`,
    );
  }
}

async function unregisterAction({ body, ack, say }) {
  ack();
  try {
    const userId = body.user.id;
    const gameId = body.actions[0].value;
    const msgChannelId = body.container.channel_id;
    const msgTs = body.container.message_ts;
    const singleGame = false;
    await unregisterActionFunction(
      userId,
      gameId,
      msgChannelId,
      msgTs,
      singleGame,
    );
  } catch (error) {
    await helpers.sendIM(
      client,
      body.user.id,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDREMOVEYOURSELFFROMGAME")}: ${error.message}`,
    );
  }
}

async function unregisterActionFunction(
  userId,
  gameId,
  msgChannelId,
  msgTs,
  singleGame,
) {
  try {
    const userName = await helpers.getUserName(client, userId);
    const result = await queries.leaveGame(gameId, userId);
    const thisGame = await queries.getSpecificGame(gameId);
    if (result.succes) {
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.REG_CHANNEL,
        text: `${userName} ${t("TEXTNOTINGAMEANYMORE")} ${thisGame.gms_name}, ${t("TEXTTHEREARE")} ${
          result.numberOfPlayers
        } ${t("TEXTAMOUNTJOINED")} ${t("TEXTAMOUNTVIEWING")} ${result.numberOfViewers}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${userName} ${t("TEXTNOTINGAMEANYMORE")} ${thisGame.gms_name}, ${t("TEXTTHEREARE")} ${
                result.numberOfPlayers
              } ${t("TEXTAMOUNTJOINED")} ${t("TEXTAMOUNTVIEWING")} ${result.numberOfViewers}`,
            },
          },
        ],
      });
      const doeMeeMessage = `${t("TEXTPLAYERNOTINGAME")} ${thisGame.gms_name}. ${t("TEXTCHANGEDMIND")} ${t(
        "COMMANDIWILLJOIN",
      )}`;
      await helpers.sendIM(client, userId, doeMeeMessage);
      if (!singleGame) {
        const games = await queries.getGameUnregisterUser(userId);
        if (games.length > 0) {
          let buttonElements = [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: `${t("TEXTCLOSEMESSAGE")}`,
              },
              value: "Close",
              action_id: `delete-${msgChannelId}`,
            },
          ];
          for (const game of games) {
            buttonElements.push({
              type: "button",
              text: {
                type: "plain_text",
                text: game.gms_name,
              },
              value: game.gms_id.toString(),
              action_id: `uitschrijven-${game.gms_id}`,
            });
          }
          let buttonblocks = [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKUNREGISTER")}`,
              },
            },
            {
              type: "actions",
              elements: buttonElements,
            },
          ];
          await client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: msgChannelId,
            ts: msgTs,
            text: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKUNREGISTER")}`,
            blocks: buttonblocks,
          });
        } else {
          await client.chat.delete({
            token: process.env.SLACK_BOT_TOKEN,
            channel: msgChannelId,
            ts: msgTs,
          });
        }
      }
    } else {
      await helpers.sendIM(
        client,
        userId,
        `${t("TEXTCOMMANDERROR")} ${t("COMMANDREMOVEYOURSELFFROMGAME")}: ${result.error}`,
      );
    }
  } catch (error) {
    await helpers.sendIM(
      client,
      userId,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDREMOVEYOURSELFFROMGAME")}: ${error.message}`,
    );
  }
}

async function addModeratorAction({ body, ack, say }) {
  await ack();
  const userId = body?.user?.id;
  try {
    const moderatorId = body.actions[0].value;
    const channelId = process.env.REG_CHANNEL;
    const gameId = body.actions[0].action_id.trim().split("-")[1];
    const msgChannelId = body.container.channel_id;
    const msgTs = body.container.message_ts;
    const singleGame = false;
    await addModeratorFunction(
      moderatorId,
      userId,
      channelId,
      gameId,
      msgChannelId,
      msgTs,
      singleGame,
    );
  } catch (error) {
    await helpers.sendIM(
      client,
      userId,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDEXTRAMODERATOR")}: ${error.message}`,
    );
  }
}

function isIgnorableInviteError(error) {
  const errorCode = error?.data?.error || error?.error;
  return errorCode === "already_in_channel";
}

async function inviteUserToChannel(channelId, userId) {
  try {
    await client.conversations.invite({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      users: userId,
    });
  } catch (error) {
    if (isIgnorableInviteError(error)) {
      return;
    }
    throw error;
  }
}

async function inviteModeratorToGameChannels(
  gameId,
  moderatorId,
  mainChannelId,
) {
  const allChannels = await queries.getAllChannels(gameId);
  let resolvedMainChannel = mainChannelId;

  for (const oneChannel of allChannels) {
    await inviteUserToChannel(oneChannel.gch_slack_id, moderatorId);
    if (oneChannel.gch_type === "MAIN") {
      resolvedMainChannel = oneChannel.gch_slack_id;
    }
  }

  return resolvedMainChannel;
}

async function updateModeratorSelectionMessage(
  userId,
  moderatorId,
  msgChannelId,
  msgTs,
) {
  const games = await queries.getGameModerator(userId, moderatorId);
  if (!games.length) {
    await client.chat.delete({
      token: process.env.SLACK_BOT_TOKEN,
      channel: msgChannelId,
      ts: msgTs,
    });
    return;
  }

  const buttonElements = [
    {
      type: "button",
      text: {
        type: "plain_text",
        text: `${t("TEXTCLOSEMESSAGE")}`,
      },
      value: "Close",
      action_id: `delete-${msgChannelId}`,
    },
    ...games.map((game) => ({
      type: "button",
      text: {
        type: "plain_text",
        text: game.gms_name,
      },
      value: moderatorId,
      action_id: `verteller-${game.gms_id}`,
    })),
  ];

  const buttonblocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKVERTELLER")}`,
      },
    },
    {
      type: "actions",
      elements: buttonElements,
    },
  ];

  await client.chat.update({
    token: process.env.SLACK_BOT_TOKEN,
    channel: msgChannelId,
    ts: msgTs,
    text: `${t("TEXTCLICKGAME")} ${t("TEXTCLICKVERTELLER")}`,
    blocks: buttonblocks,
  });
}

async function addModeratorFunction(
  moderatorId,
  userId,
  mainChannel,
  gameId,
  msgChannelId,
  msgTs,
  singleGame,
) {
  try {
    const thisGame = await queries.getSpecificGame(gameId);
    const userName = await helpers.getUserName(client, moderatorId);
    await queries.addModerator(moderatorId, userName, thisGame.gms_id);

    if (thisGame.gms_status === "STARTED") {
      mainChannel = await inviteModeratorToGameChannels(
        thisGame.gms_id,
        moderatorId,
        mainChannel,
      );
    }

    await client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: mainChannel,
      text: `${userName} ${t("TEXTISVERTELLER")} ${thisGame.gms_name}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${userName} ${t("TEXTISVERTELLER")} ${thisGame.gms_name}`,
          },
        },
      ],
    });
    const message = `${t("TEXTBECAMEMODERATOR")} ${thisGame.gms_name}`;
    await helpers.sendIM(client, moderatorId, message);

    if (!singleGame) {
      await updateModeratorSelectionMessage(
        userId,
        moderatorId,
        msgChannelId,
        msgTs,
      );
    }
  } catch (error) {
    await helpers.sendIM(
      client,
      userId,
      `${t("TEXTCOMMANDERROR")} ${t("COMMANDEXTRAMODERATOR")}: ${error.message}`,
    );
  }
}

const { ChannelType } = require('discord.js');

async function createNewChannel(interaction) {
  try {
    const userId = interaction.user.id;
    // Extract channelName from customId (e.g. kanaal-mychannel)
    const channelName = interaction.customId.replace("kanaal-", "");
    // Extract gameId from the selected value
    const gameId = interaction.values[0];
    const singleGame = false;
    await createNewChannelFunction(
      gameId,
      userId,
      channelName,
      interaction,
      null,
      singleGame,
    );
  } catch (error) {
    console.error(error.message);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDCREATECHANNEL")}: ${error.message}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDCREATECHANNEL")}: ${error.message}`, ephemeral: true });
    }
  }
}

async function createNewChannelFunction(
  gameId,
  userId,
  newChannelName,
  interaction,
  msgTs,
  singleGame,
) {
  try {
    if (newChannelName.trim().length === 0) {
      throw new Error(t("TEXTNONAME"));
    }
    const allModerators = await queries.getModerators(gameId);
    const game = await queries.getSpecificGame(gameId);
    if (!allModerators.includes(userId)) {
      allModerators.push(userId);
    }
    let channelName;
    const regexName = /^ww\d.*/i;
    if (regexName.test(newChannelName) === false) {
      channelName = `${game.gms_name.toLowerCase().split(" ").join("-")}-${newChannelName.toLowerCase()}`;
    } else {
      channelName = newChannelName.toLowerCase();
    }

    // Sanitize the entire channel name to remove spaces as required by Discord text channels
    channelName = channelName.replace(/\s+/g, '-');

    const category = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === game.gms_name.toLowerCase() && c.type === ChannelType.GuildCategory);

    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: ['ViewChannel'],
      },
    ];

    for (const modId of allModerators) {
      permissionOverwrites.push({
        id: modId,
        allow: ['ViewChannel'],
      });
    }

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      permissionOverwrites: permissionOverwrites,
    });

    await channel.send({
      content: `<@${userId}> ${t("TEXTCREATEDCHANNEL")}`,
    });

    const channelInput = {
      gch_gms_id: gameId,
      gch_slack_id: channel.id,
      gch_name: channel.name,
      gch_type: helpers.channelType.standard,
      gch_user_created: userId,
    };
    await queries.logChannel(channelInput);

    if (!singleGame) {
      if (interaction.isStringSelectMenu()) {
        await interaction.update({ content: `${t("TEXTCREATEDCHANNEL")} <#${channel.id}>`, components: [] });
      }
    } else {
      await interaction.reply({ content: `${t("TEXTCREATEDCHANNEL")} <#${channel.id}>`, ephemeral: true });
    }
  } catch (error) {
    console.error(error.message);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDCREATECHANNEL")}: ${error.message}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `${t("TEXTCOMMANDERROR")} ${t("COMMANDCREATECHANNEL")}: ${error.message}`, ephemeral: true });
    }
  }
}

async function deleteMessage({ body, ack, say }) {
  ack();
  try {
    await client.chat.delete({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.container.channel_id,
      ts: body.container.message_ts,
    });
  } catch (error) {
    await helpers.sendIM(
      client,
      body.user.id,
      `${t("TEXTCOMMANDERROR")}: ${error.message}`,
    );
  }
}
