import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export default function authJwt(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, SECRET);
      // attach user payload to req.user (should contain .role)
      req.user = payload;
    }
  } catch (e) {
    // invalid token — don't populate req.user
  }
  return next();
}
