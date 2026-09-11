const SKJ_APP_TOKEN = process.env.SKJ_APP_TOKEN || 'skj-default-dev-token-xyz123';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentification requise pour accéder à SKJ IDE AI.'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== SKJ_APP_TOKEN) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Jeton d\'authentification invalide.'
      }
    });
  }

  next();
};

module.exports = authMiddleware;
