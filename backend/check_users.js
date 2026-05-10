const supabase = require('./supabase');
async function checkUsers() {
    const { data: users, error } = await supabase.from('users').select('username, role');
    if (error) console.error(error);
    else console.log(users);
}
checkUsers();
