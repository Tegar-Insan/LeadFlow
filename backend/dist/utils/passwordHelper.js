"use strict";
// src/utils/passwordHelper.js
// bcrypt password hashing and comparison
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 12;
async function hashPassword(plainText) {
    return bcrypt.hash(plainText, SALT_ROUNDS);
}
async function comparePassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
}
module.exports = { hashPassword, comparePassword };
//# sourceMappingURL=passwordHelper.js.map