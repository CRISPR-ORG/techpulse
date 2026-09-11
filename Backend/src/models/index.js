// models/index.js
// Central export for all model services

const { supabase } = require("../config/supabaseClient");
const storiesService = require("./storiesService");
const articlesService = require("./articlesService");
const sourcesService = require("./sourcesService");
const storyClicksService = require("./storyClicksService");
const adminService = require("./adminService");
const subscribersService = require("./subscribersService");

module.exports = {
  supabase,
  storiesService,
  articlesService,
  sourcesService,
  storyClicksService,
  adminService,
  subscribersService,
};
