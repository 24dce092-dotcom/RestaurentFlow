export default function requireRole(allowed = []) {
  return (req, res, next) => {
    // Prefer req.user from auth middleware (JWT/session), fallback to x-user-role header for dev/testing
    const roleHeader = req.headers['x-user-role'];
    const role = (req.user && req.user.role) || roleHeader || null;
    // If no role and allowed array is empty (meaning open), allow. Otherwise require authentication.
    if (!role && allowed.length > 0) return res.status(401).json({ error: 'Unauthorized' });
    if (role && allowed.length > 0 && !allowed.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
