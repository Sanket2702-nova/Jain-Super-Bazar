require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Fallback in case .env didn't load JWT_SECRET
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'supersecretkey_cashflow_jain_2024';
  console.warn('⚠️  JWT_SECRET not found in .env, using fallback.');
}

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

app.use('/uploads', express.static('uploads')); // For proof images

app.use((err, req, res, next) => {
    console.error('CRITICAL GLOBAL ERROR:', err);
    res.status(500).json({ 
        error: 'Internal Server Error: ' + err.message,
        path: req.path,
        method: req.method
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
