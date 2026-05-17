const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'logs', 'error.log');

// Ensure log file exists
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
}

const logError = (error, req = null) => {
    const timestamp = new Date().toISOString();
    const method = req ? req.method : 'N/A';
    const url = req ? req.originalUrl : 'N/A';
    const user = req && req.user ? req.user.username : 'Guest';
    
    const logMessage = `[${timestamp}] | User: ${user} | Method: ${method} | URL: ${url}\nError: ${error.stack || error}\n${'='.repeat(80)}\n`;
    
    fs.appendFileSync(logFilePath, logMessage);
};

const getLogs = () => {
    if (!fs.existsSync(logFilePath)) return '';
    return fs.readFileSync(logFilePath, 'utf8');
};

const clearLogs = () => {
    fs.writeFileSync(logFilePath, '');
};

module.exports = { logError, getLogs, clearLogs };
