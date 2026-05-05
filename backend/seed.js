const supabase = require('./supabase');
const bcrypt = require('bcryptjs');

/**
 * SEED SCRIPT FOR JAIN SUPER BAZAR (SUPABASE)
 * This script initializes the database with default branches, 
 * users, and system settings.
 */

async function seed() {
    try {
        console.log('🚀 INITIALIZING SUPABASE DATABASE SEEDING...');
        
        // Ensure environment variables are present
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            console.error('❌ ERROR: Supabase credentials missing. Check backend/.env');
            process.exit(1);
        }

        // Shared default password for all initial accounts
        const DEFAULT_PASSWORD = 'password123';
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // ─── 1. SEED SETTINGS ───
        console.log('⚙️  Configuring system settings...');
        const { error: settingsErr } = await supabase
            .from('settings')
            .upsert({ 
                key: 'backup_path', 
                value: 'C:\\Users\\admin\\Desktop\\reporting' 
            }, { onConflict: 'key' });
        
        if (settingsErr) {
            console.warn('⚠️  Note: Settings table might not exist yet, skipping settings seed.');
        } else {
            console.log('✅ Default system settings applied.');
        }

        // ─── 2. SEED BRANCHES ───
        console.log('🏪 Provisioning branches...');
        const defaultBranches = [
            'Slave 1', 'Slave 2', 'Slave 3', 'Slave 4', 
            'JSB03', 'JSB05', 'JSB07'
        ];
        
        for (const branchName of defaultBranches) {
            const { error: bErr } = await supabase
                .from('branches')
                .upsert({ name: branchName }, { onConflict: 'name' });
            
            if (bErr) {
                console.error(`❌ Failed to seed branch "${branchName}":`, bErr.message);
            }
        }
        console.log('✅ Branches have been synchronized.');

        // ─── 3. SEED ADMIN USER ───
        console.log('👑 Seeding primary administrator...');
        const { error: adminError } = await supabase
            .from('users')
            .upsert({ 
                username: 'admin', 
                password: passwordHash, 
                role: 'Admin' 
            }, { onConflict: 'username' });

        if (adminError) {
            console.error('❌ Admin creation failed:', adminError.message);
        } else {
            console.log('✅ Administrator account ("admin") is ready.');
        }

        // ─── 4. SEED BRANCH USERS ───
        console.log('👥 Generating branch manager accounts...');
        const { data: branches, error: branchFetchError } = await supabase
            .from('branches')
            .select('*');

        if (branchFetchError) {
            console.error('❌ Could not fetch branches for user linking:', branchFetchError.message);
        } else if (branches && branches.length > 0) {
            for (let branch of branches) {
                // Generate username from branch name (e.g. "Slave 1" -> "slave1")
                const username = branch.name.toLowerCase().replace(/\s+/g, '');
                
                const { error: userError } = await supabase
                    .from('users')
                    .upsert({ 
                        username: username, 
                        password: passwordHash, 
                        branch_id: branch.id, 
                        role: 'Branch' 
                    }, { onConflict: 'username' });

                if (userError) {
                    console.error(`⚠️  Failed to create user for ${branch.name}:`, userError.message);
                } else {
                    console.log(`✅ Branch account ready: ${username}`);
                }
            }
        }

        console.log('\n✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨');
        console.log('----------------------------------------------');
        console.log(`Total Branches Processed: ${defaultBranches.length}`);
        console.log(`Default Password: ${DEFAULT_PASSWORD}`);
        console.log('----------------------------------------------');
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ SEEDING CRASHED:', err.message);
        process.exit(1);
    }
}

seed();
