const { supabase } = require("../config/supabaseClient");

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
  const username = normalizeIdentifier(process.env.ADMIN_USERNAME);
  const email = normalizeIdentifier(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || "");

  if ((!username && !email) || !password) return null;

  return {
    username,
    email,
    password,
    id: process.env.ADMIN_FALLBACK_ID || "env-admin",
    role: "admin",
  };
}

async function findAdminByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

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
      console.error("[Admin] Verify error:", error);
    } else if (data && data.length > 0) {
      return {
        ...data[0],
        auth_source: "database",
      };
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
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, username, email, full_name, role, is_active")
      .eq("id", adminId)
      .single();

    if (error) {
      console.error("[Admin] Fetch error:", error);
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
  try {
    const payload = {
      story_id: storyId,
      title,
      description,
      url,
      source_name: sourceName,
      image_url: imageUrl,
      published_at: publishedAt || new Date().toISOString(),
    };

    if (isUuid(adminId)) {
      payload.published_by_admin_id = adminId;
    }

    let { data, error } = await supabase
      .from("articles")
      .insert([payload])
      .select("*")
      .single();

    // Backward-compatible fallback if column does not exist yet.
    if (
      error &&
      String(error.message || "").includes("published_by_admin_id")
    ) {
      const fallbackPayload = {
        story_id: storyId,
        title,
        description,
        url,
        source_name: sourceName,
        image_url: imageUrl,
        published_at: publishedAt || new Date().toISOString(),
      };

      const fallbackResult = await supabase
        .from("articles")
        .insert([fallbackPayload])
        .select("*")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error("[Admin] Article creation error:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[Admin] Unexpected error:", err);
    return null;
  }
}

/**
 * Get admin-published articles
 */
async function getAdminPublishedArticles(adminId, limit = 20, offset = 0) {
  try {
    if (!isUuid(adminId)) {
      return [];
    }

    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("published_by_admin_id", adminId)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Admin] Published articles fetch error:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[Admin] Unexpected error:", err);
    return [];
  }
}

module.exports = {
  verifyAdminLogin,
  getAdminById,
  createManualStory,
  createManualArticle,
  getAdminPublishedArticles,
};
