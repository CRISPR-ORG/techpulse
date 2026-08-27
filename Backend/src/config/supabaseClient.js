const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Running with local store.",
  );
}

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

let isReadyCache = null;
let lastCheckTime = 0;

async function isDatabaseReady() {
  if (!supabase) return false;

  const now = Date.now();
  if (isReadyCache !== null && now - lastCheckTime < 30000) {
    return isReadyCache;
  }

  try {
    const { error } = await supabase.from("stories").select("id").limit(1);
    if (error) {
      if (isReadyCache !== false) {
        console.log(
          "[Supabase] Database tables not found in schema cache. Using local active store.",
        );
      }
      isReadyCache = false;
    } else {
      if (isReadyCache !== true) {
        console.log("[Supabase] Database tables verified and active.");
      }
      isReadyCache = true;
    }
  } catch (err) {
    isReadyCache = false;
  }

  lastCheckTime = now;
  return isReadyCache;
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  isDatabaseReady,
};
