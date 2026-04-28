"use strict";
// src/config/db.js
// Database connection — re-exports Supabase admin client as primary DB interface
const { supabaseAdmin } = require('./supabase');
// Primary database handle used by all models
const db = supabaseAdmin;
module.exports = { db };
//# sourceMappingURL=db.js.map