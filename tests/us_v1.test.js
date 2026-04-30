const test = require('node:test');
const assert = require('node:assert');

// Manual mock setup
const originalRequire = require('module').prototype.require;

let queriesMock = {
  votesOn: async () => {},
  getChannel: async () => 'mock-stemstand-channel'
};

require('module').prototype.require = function (moduleName) {
  if (moduleName.endsWith('ww_queries')) {
    return queriesMock;
  }
  return originalRequire.apply(this, arguments);
};

const actions = require('../ww_actions');

require('module').prototype.require = originalRequire;

test('US-V1: voteSelectFunction', async () => {
  let votesOnCalled = false;
  queriesMock.votesOn = async (gameId, voterId, targetId) => {
    assert.strictEqual(gameId, '123');
    assert.strictEqual(voterId, 'user1');
    assert.strictEqual(targetId, 'user2');
    votesOnCalled = true;
  };

  let getChannelCalled = false;
  queriesMock.getChannel = async (gameId, channelType) => {
    assert.strictEqual(gameId, '123');
    assert.strictEqual(channelType, 'VOTEFLOW');
    getChannelCalled = true;
    return 'mock-stemstand-channel';
  };

  let replyCalled = false;
  let sendCalled = false;

  const mockInteraction = {
    customId: 'stem-123',
    user: { id: 'user1' },
    values: ['user2'],
    reply: async (options) => {
      assert.strictEqual(options.ephemeral, true);
      assert.ok(options.content.includes('<@user2>'));
      replyCalled = true;
    },
    client: {
      channels: {
        fetch: async (id) => {
          assert.strictEqual(id, 'mock-stemstand-channel');
          return {
            send: async (options) => {
              assert.ok(options.content.includes('<@user1>'));
              assert.ok(options.content.includes('<@user2>'));
              sendCalled = true;
            }
          };
        }
      }
    }
  };

  await actions.voteSelectFunction(mockInteraction);

  assert.ok(votesOnCalled, 'queries.votesOn should have been called');
  assert.ok(getChannelCalled, 'queries.getChannel should have been called');
  assert.ok(replyCalled, 'interaction.reply should have been called');
  assert.ok(sendCalled, 'stemstandChannel.send should have been called');
});
