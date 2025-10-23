const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: "No token provided, authorization denied." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token is not valid." });
        }
        req.user = user;
        next();
    });
};

const checkRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
    }
    // For school-specific routes, also check school ID match unless it's a system admin
    if (req.params.id_school && req.user.id_school && req.user.id_school !== req.params.id_school) {
        return res.status(403).json({ message: 'Access denied: user does not belong to this school.' });
    }
    next();
};

const checkSystemAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super' && req.user.id_school === null) {
        return next();
    }
    return res.status(403).json({ message: 'Access denied: requires system administrator privileges.' });
};


module.exports = {
    authenticateToken,
    checkRole,
    checkSystemAdmin,
};