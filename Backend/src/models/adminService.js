const { supabase, isDatabaseReady } = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");

// Campus Pulse admin credentials. Env vars win so deployments can rotate them
// without a code change; the defaults keep the portal usable out of the box.
const DEFAULT_ADMIN_USERNAME = "crisprisbest";
const DEFAULT_ADMIN_PASSWORD = "youcan'tseeme";

// A stable UUID lets the env-configured admin own articles the same way a
// database-backed admin does, both in Supabase and in the local store.
const ENV_ADMIN_ID = "a0000000-0000-4000-8000-000000000001";

function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function getConfiguredAdmin() {
  const username =
    normalizeIdentifier(process.env.ADMIN_USERNAME) || DEFAULT_ADMIN_USERNAME;
  const email = normalizeIdentifier(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  if ((!username && !email) || !password) return null;

  return {
    username,
    email,
    password,
    id: process.env.ADMIN_FALLBACK_ID || ENV_ADMIN_ID,
    role: "admin",
  };
}

async function findAdminByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!(await isDatabaseReady())) return null;

  let byUsername = null;
  const usernameResult = await supabase
    .from("admin_users")
    .select("id, username, email, role, is_active")
    .eq("username", normalized)
    .limit(1)
    .maybeSingle();

  if (!usernameResult.error) {
    byUsername = usernameResult.data;
  }

  if (byUsername && byUsername.is_active !== false) {
    return byUsername;
  }

  const emailResult = await supabase
    .from("admin_users")
    .select("id, username, email, role, is_active")
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();

  if (emailResult.error) return null;
  if (emailResult.data && emailResult.data.is_active !== false) {
    return emailResult.data;
  }

  return null;
}

/**
 * Verify admin login credentials
 * Returns admin info if valid, null if invalid
 */
async function verifyAdminLogin(identifier, password) {
  try {
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (await isDatabaseReady()) {
      // Preferred RPC signature (username/email identifier)
      let { data, error } = await supabase.rpc("verify_admin_login", {
        p_identifier: normalizedIdentifier,
        p_password: password,
      });

      // Backward-compatible fallback for older SQL function signature
      if (error) {
        const fallbackResult = await supabase.rpc("verify_admin_login", {
          p_email: normalizedIdentifier,
          p_password: password,
        });

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error("[Admin] Verify error:", error.message || error);
      } else if (data && data.length > 0) {
        return {
          ...data[0],
          auth_source: "database",
        };
      }
    }

    const configured = getConfiguredAdmin();
    if (!configured) return null;

    const identifierMatches =
      normalizedIdentifier === configured.username ||
      normalizedIdentifier === configured.email;

    if (!identifierMatches || password !== configured.password) {
      return null;
    }

    const existingAdmin = await findAdminByIdentifier(
      configured.email || configured.username,
    );

    if (existingAdmin) {
      return {
        ...existingAdmin,
        auth_source: "env",
      };
    }

    return {
      id: configured.id,
      username: configured.username || normalizedIdentifier,
      email: configured.email || null,
      role: configured.role,
      is_active: true,
      auth_source: "env",
    };
  } catch (err) {
    console.error("[Admin] Unexpected error:", err);
    return null;
  }
}

/**
 * Get admin by ID
 */
async function getAdminById(adminId) {
  try {
    if (!(await isDatabaseReady())) return null;

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, username, email, full_name, role, is_active")
      .eq("id", adminId)
      .single();

    if (error) {
      console.error("[Admin] Fetch error:", error.message || error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[Admin] Unexpected error:", err);
    return null;
  }
}

/**
 * Create manual story by admin
 */
async function createManualStory(
  adminId,
  title,
  category,
  mainImage = null,
  description = null,
) {
  try {
    // Generate slug
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data, error } = await supabase
      .from("stories")
      .insert([
        {
          title,
          slug,
          category,
          main_image: mainImage,
          sources_count: 0,
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("[Admin] Story creation error:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[Admin] Unexpected error:", err);
    return null;
  }
}

/**
 * Create manual article by admin for a story
 */
async function createManualArticle(
  adminId,
  storyId,
  title,
  description,
  url,
  sourceName,
  imageUrl = null,
  publishedAt = null,
) {
  const articleInput = {
    title,
    description,
    url,
    source_name: sourceName,
    image_url: imageUrl,
    published_at: publishedAt || new Date().toISOString(),
  };

  // Local store first: it is the source of truth whenever Supabase is not set
  // up, and it keeps the post on disk across restarts either way.
  const localArticle = fallbackStore.insertAdminArticle(
    articleInput,
    storyId,
    adminId,
  );

  if (!(await isDatabaseReady())) {
    if (!localArticle) {
      console.error("[Admin] Article rejected: URL already published");
    }
    return localArticle;
  }

  try {
    const payload = { story_id: storyId, ...articleInput };

    if (isUuid(adminId)) {
      payload.published_by_admin_id = adminId;
    }

    let { data, error } = await supabase
      .from("articles")
      .insert([payload])
      .select("*")
      .single();

    // Retry without the admin link when the column or its FK target is absent
    // (migration 005/006 not applied yet).
    if (error && String(error.message || "").includes("published_by_admin_id")) {
      const fallbackResult = await supabase
        .from("articles")
        .insert([{ story_id: storyId, ...articleInput }])
        .select("*")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error("[Admin] Article creation error:", error.message || error);
      // The post is still readable from the local store, so do not fail the
      // request just because the database write did not land.
      return localArticle;
    }

    return data;
  } catch (err) {
    console.error("[Admin] Unexpected error:", err.message || err);
    return localArticle;
  }
}

/**
 * Get admin-published articles
 */
/**
 * Merge database rows with local-store rows, de-duplicated by URL.
 * Database rows win, so ids stay stable once Supabase is available.
 */
function mergeArticlesByUrl(primary, secondary) {
  const seen = new Set(
    primary.map((article) => String(article.url || "").toLowerCase()),
  );
  const merged = [...primary];

  for (const article of secondary) {
    const key = String(article.url || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(article);
  }

  return merged.sort(
    (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0),
  );
}

async function getAdminPublishedArticles(adminId, limit = 20, offset = 0) {
  const localArticles = fallbackStore.getAdminArticles(adminId, limit, offset);

  if (!isUuid(adminId) || !(await isDatabaseReady())) {
    return localArticles;
  }

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("published_by_admin_id", adminId)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(
        "[Admin] Published articles fetch error:",
        error.message || error,
      );
      return localArticles;
    }

    return mergeArticlesByUrl(data || [], localArticles).slice(0, limit);
  } catch (err) {
    console.error("[Admin] Unexpected error:", err.message || err);
    return localArticles;
  }
}

module.exports = {
  verifyAdminLogin,
  getAdminById,
  createManualStory,
  createManualArticle,
  getAdminPublishedArticles,
};
