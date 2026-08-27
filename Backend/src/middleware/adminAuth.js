const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "techpulse_testing_admin_secret";

function requireAdminAuth(req, res, next) {
  const authHeader = String(req.headers.authorization || "");

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload || !payload.adminId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  requireAdminAuth,
  JWT_SECRET,
};