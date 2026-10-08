/** Exact native-constructor alias for an upstream Lua spelling discrepancy.
 * The official archive stays byte-identical. This supplies no card effects.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
export const NATIVE_LUA_COMPATIBILITY_NAME = 'native_compatibility.lua';
export const NATIVE_LUA_COMPATIBILITY_SOURCE = `
-- Dogmatikamacabre c60921537 calls NewGroup under Spirit Elimination.
-- CreateGroup is the native empty/variadic Group constructor.
if Group.NewGroup == nil then
    Group.NewGroup = Group.CreateGroup
end
`;
