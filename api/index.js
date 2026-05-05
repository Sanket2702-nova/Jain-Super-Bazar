const app = require('../backend/server.js');

// Add a direct health check route to verify the function is alive
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      jwt: !!process.env.JWT_SECRET
    }
  });
});

module.exports = app;
