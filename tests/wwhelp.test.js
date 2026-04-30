const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request === 'localizify') return { t: (key) => key };
  return originalRequire.apply(this, arguments);
};

const wwhelp = originalRequire(path.join(__dirname, '../src/discord/commands/wwhelp.js'));

test('wwhelp command has correct data structure', () => {
  assert.strictEqual(wwhelp.data.name, 'wwhelp');
  assert.strictEqual(typeof wwhelp.execute, 'function');
});

test('wwhelp command replies with ephemeral embed', async () => {
  let repliedEmbeds, repliedEphemeral;

  const interaction = {
    reply: async ({ embeds, ephemeral }) => {
      repliedEmbeds = embeds;
      repliedEphemeral = ephemeral;
    }
  };

  await wwhelp.execute(interaction);
  assert.strictEqual(repliedEphemeral, true);
  assert.ok(repliedEmbeds[0]);
  assert.strictEqual(repliedEmbeds[0].data.description, 'HELPTEXT');
});

// Restore require
Module.prototype.require = originalRequire;
