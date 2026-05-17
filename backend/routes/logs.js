const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getLogs, clearLogs } = require('../logger');

// Middleware to check if user is Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
};

router.get('/', auth, isAdmin, (req, res) => {
    try {
        const logs = getLogs();
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

router.delete('/', auth, isAdmin, (req, res) => {
    try {
        clearLogs();
        res.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

module.exports = router;
