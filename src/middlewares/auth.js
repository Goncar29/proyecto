const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    console.log('Decoded user:', req.user);

    if (!token)
        return res.status(401).json({ error: 'Access Denied, no token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        console.log('✅ Decoded user:', user);
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;

        next();
    });
}

module.exports = authenticateToken;