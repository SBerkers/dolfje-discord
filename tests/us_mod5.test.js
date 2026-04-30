const test = require('node:test');
const assert = require('node:assert');
const helpers = require('../ww_helpers');

test('US-MOD5: helpers.grantDiscordChannelAccess', async () => {
  const mockClient = {};
  const channelId = 'mock-channel-id';
  const userIds = ['user1', 'user2'];

  const result = await helpers.grantDiscordChannelAccess(
    mockClient,
    channelId,
    userIds
  );

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.channelId, channelId);
  assert.deepStrictEqual(result.userIds, userIds);
  assert.deepStrictEqual(result.permissions, ['VIEW_CHANNEL']);
});

test('US-MOD5: helpers.grantDiscordChannelAccess with custom permissions', async () => {
  const mockClient = {};
  const channelId = 'mock-channel-id-2';
  const userIds = ['user3'];
  const customPerms = ['VIEW_CHANNEL', 'SEND_MESSAGES'];

  const result = await helpers.grantDiscordChannelAccess(
    mockClient,
    channelId,
    userIds,
    customPerms
  );

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.channelId, channelId);
  assert.deepStrictEqual(result.userIds, userIds);
  assert.deepStrictEqual(result.permissions, customPerms);
});
