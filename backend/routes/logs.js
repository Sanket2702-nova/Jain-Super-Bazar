const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getLogs, clearLogs } = require('../logger');

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') return next();
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
};

// GET all logs
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const logs = await getLogs();
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read logs: ' + error.message });
    }
});

// DELETE all logs
router.delete('/', auth, isAdmin, async (req, res) => {
    try {
        await clearLogs();
        res.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear logs: ' + error.message });
    }
});

module.exports = router;
