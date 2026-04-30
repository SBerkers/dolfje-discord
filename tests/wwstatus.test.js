const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Mock external dependencies before requiring the command
const mockQueries = {
  getGameState: async () => [{ gms_status: 'STARTED', gms_name: 'Game 1', alive: 5, viewers: 2 }],
  getActiveGameUser: async () => [{ gms_name: 'Game 1', gpl_rol: 'Wolf' }]
};

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request.includes('ww_queries')) return mockQueries;
  if (request === 'localizify') return { t: (key) => key };
  return originalRequire.apply(this, arguments);
};

const wwstatus = originalRequire(path.join(__dirname, '../src/discord/commands/wwstatus.js'));

test('wwstatus command has correct data structure', () => {
  assert.strictEqual(wwstatus.data.name, 'wwstatus');
  assert.strictEqual(typeof wwstatus.execute, 'function');
});

test('wwstatus command handles output correctly', async () => {
  let repliedEmbeds, repliedEphemeral;

  const interaction = {
    user: { id: 'user1' },
    options: {
      getBoolean: (opt) => opt === 'public' ? true : false
    },
    reply: async ({ embeds, ephemeral }) => {
      repliedEmbeds = embeds;
      repliedEphemeral = ephemeral;
    }
  };

  await wwstatus.execute(interaction);
  assert.strictEqual(repliedEphemeral, false);
  assert.ok(repliedEmbeds[0]);
  assert.ok(repliedEmbeds[0].data.description.includes('Game 1'));
  assert.ok(repliedEmbeds[0].data.description.includes('Wolf'));
});

// Restore require
Module.prototype.require = originalRequire;
