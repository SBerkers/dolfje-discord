const test = require('node:test');
const assert = require('node:assert');
const helpers = require('../ww_helpers');

test('US-GL3: helpers.createDiscordChannelWithPermissions', async () => {
  const mockClient = {};
  const categoryId = 'mock-category-123';
  const channelName = 'ww1_wolves';
  const userIds = ['user1', 'user2'];

  const result = await helpers.createDiscordChannelWithPermissions(
    mockClient,
    categoryId,
    channelName,
    userIds
  );

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.channel.name, channelName);
  assert.strictEqual(result.channel.id, 'mock-' + channelName);

  const overwrites = result.channel.permissionOverwrites;
  assert.ok(Array.isArray(overwrites), 'permissionOverwrites should be an array');
  assert.strictEqual(overwrites.length, 3, 'Should have 1 category rule + 2 user rules');

  // Verify category rule explicitly denies VIEW_CHANNEL
  const categoryRule = overwrites.find(o => o.id === categoryId);
  assert.ok(categoryRule, 'Category rule should exist');
  assert.deepStrictEqual(categoryRule.deny, ['VIEW_CHANNEL']);
  assert.strictEqual(categoryRule.allow, undefined);

  // Verify user rules explicitly allow VIEW_CHANNEL
  for (const userId of userIds) {
    const userRule = overwrites.find(o => o.id === userId);
    assert.ok(userRule, `Rule for user ${userId} should exist`);
    assert.deepStrictEqual(userRule.allow, ['VIEW_CHANNEL']);
    assert.strictEqual(userRule.deny, undefined);
  }
});
