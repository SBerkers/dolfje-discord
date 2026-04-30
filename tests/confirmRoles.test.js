const test = require("node:test");
const assert = require("node:assert");

// Setup the mock environment variable required by localization
process.env.APPLANG = "en";

let updatedRolesCount = 0;

// Mocking required modules manually
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
    if (request === '../../ww_queries') {
        return {
            getSpecificGame: async (gameId) => ({ gms_id: gameId }),
            isModerator: async (gameId, userId) => {
                return userId === 'moderator_1';
            },
            getAlive: async (gameId) => {
                return [
                    { user_id: 'player_1', rol: null },
                    { user_id: 'player_2', rol: null },
                    { user_id: 'player_3', rol: null }
                ];
            },
            getChannel: async (gameId, type) => {
                if (type === 'WOLVES') return 'wolves_channel_id';
                return null;
            },
            updateRole: async (gameId, userId, roleName) => {
                updatedRolesCount++;
            }
        };
    }
    if (request === '../../ww_helpers') {
        return {
            channelType: { wolves: 'WOLVES' },
            shuffle: (arr) => arr // Simple mock
        };
    }
    if (request === 'localizify') {
        return {
            t: (key) => key === 'TEXTYOURROLE' ? 'your role' : (key === 'TEXTROLES' ? 'The roles' : key)
        };
    }
    return originalRequire.apply(this, arguments);
};

const { executeConfirmRoles } = require('../discord/actions/confirmRoles');

test("executeConfirmRoles handles validation and assigns roles", async () => {
    let replyContent = null;
    let editReplyContent = null;
    updatedRolesCount = 0;

    const mockInteraction = {
        deferred: false,
        replied: false,
        user: { id: 'moderator_1' },
        guild: {
            channels: {
                fetch: async (channelId) => {
                    if (channelId === 'wolves_channel_id') {
                        return {
                            permissionOverwrites: {
                                edit: async (userId, permissions) => {
                                    assert.strictEqual(permissions.ViewChannel, true);
                                    assert.ok(['player_1', 'player_2', 'player_3'].includes(userId));
                                }
                            }
                        };
                    }
                    return null;
                }
            }
        },
        deferReply: async (opts) => {
            mockInteraction.deferred = true;
            assert.strictEqual(opts.ephemeral, true);
        },
        reply: async (opts) => {
            mockInteraction.replied = true;
            replyContent = opts.content;
        },
        editReply: async (opts) => {
            editReplyContent = opts.content;
        }
    };

    let dmSentCount = 0;
    const mockClient = {
        users: {
            fetch: async (userId) => {
                return {
                    send: async (msg) => {
                        dmSentCount++;
                        assert.ok(msg.includes('your role'));
                    }
                };
            }
        }
    };

    const rolesToAssign = ["wolf", "seer", "villager"];

    await executeConfirmRoles(mockInteraction, mockClient, rolesToAssign, 1);

    assert.strictEqual(dmSentCount, 3);
    assert.strictEqual(updatedRolesCount, 3);
    assert.ok(editReplyContent.includes('The roles'));
});
