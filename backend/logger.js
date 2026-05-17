const supabase = require('./supabase');

const logError = async (error, req = null) => {
    try {
        const method = req ? req.method : 'N/A';
        const url = req ? req.originalUrl : 'N/A';
        const user = req && req.user ? req.user.username : 'Guest';
        const message = error.message || String(error);
        const stack = error.stack || String(error);

        await supabase.from('error_logs').insert([{
            method,
            url,
            username: user,
            message,
            stack,
        }]);
    } catch (e) {
        // Silently fail to avoid recursive error loops
        console.error('Logger failed to write to Supabase:', e.message);
    }
};

const getLogs = async () => {
    const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw new Error(error.message);
    return data || [];
};

const clearLogs = async () => {
    const { error } = await supabase
        .from('error_logs')
        .delete()
        .gte('id', 0); // delete all rows

    if (error) throw new Error(error.message);
};

module.exports = { logError, getLogs, clearLogs };
