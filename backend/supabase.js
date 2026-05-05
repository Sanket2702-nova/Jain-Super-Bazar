const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: SUPABASE_URL or SUPABASE_KEY is missing!');
  // Create a dummy client or handle as needed to prevent crash
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) })
    }),
    storage: { from: () => ({ upload: () => Promise.resolve({ error: { message: 'Supabase not configured' } }), getPublicUrl: () => ({ data: { publicUrl: null } }) }) }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = supabase;
