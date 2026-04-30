const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Mock external dependencies before requiring the command
const mockQueries = {
  getActiveGameWithChannel: async () => ({ gms_id: 1 }),
  getChannel: async () => '12345',
  getPlayerList: async () => [{ gpl_slack_id: 'user1', status: 'participant' }]
};

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request.includes('ww_queries')) return mockQueries;
  if (request.includes('ww_helpers')) return { channelType: { vote: 'vote' } };
  if (request === 'localizify') return { t: (key) => key };
  return originalRequire.apply(this, arguments);
};

const wwlist = originalRequire(path.join(__dirname, '../src/discord/commands/wwlist.js'));

test('wwlist command has correct data structure', () => {
  assert.strictEqual(wwlist.data.name, 'wwlist');
  assert.strictEqual(typeof wwlist.execute, 'function');
});

test('wwlist command handles public option correctly', async () => {
  let repliedEmbeds, repliedEphemeral;

  const interaction = {
    channelId: 'channel1',
    options: {
      getBoolean: (opt) => opt === 'public' ? true : false
    },
    guild: {
      members: {
        fetch: async () => new Map([['user1', { displayName: 'User One' }]])
      }
    },
    reply: async ({ embeds, ephemeral }) => {
      repliedEmbeds = embeds;
      repliedEphemeral = ephemeral;
    }
  };

  await wwlist.execute(interaction);
  assert.strictEqual(repliedEphemeral, false);
  assert.ok(repliedEmbeds[0]);
});

// Restore require
Module.prototype.require = originalRequire;
