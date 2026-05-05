const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUsername = username ? username.toLowerCase().trim() : '';
        console.log('Login attempt for:', normalizedUsername);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', normalizedUsername)
            .single();
        
        if (error || !user) {
            console.log('User not found or error:', normalizedUsername, error);
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        if (user.is_blocked) {
            console.log('User is blocked:', normalizedUsername);
            return res.status(403).json({ error: 'Your account is blocked. Please contact Admin.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Invalid password for:', normalizedUsername);
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        let branchName = null;
        if (user.branch_id) {
            const { data: branch } = await supabase
                .from('branches')
                .select('name')
                .eq('id', user.branch_id)
                .single();
            if (branch) branchName = branch.name;
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, branch_id: user.branch_id, branch_name: branchName, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, branch_id: user.branch_id, branch_name: branchName } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Get all users
router.get('/users', async (req, res) => {
    try {
        const token = req.header('Authorization');
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        if (decoded.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });

        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, role, branch_id, is_blocked, branches(name)')
            .order('id');
            
        if (error) throw error;

        // Map branch name for compatibility
        const formattedUsers = users.map(u => ({
            ...u,
            branch_name: u.branches ? u.branches.name : null
        }));

        res.json(formattedUsers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Create user
router.post('/register', async (req, res) => {
    try {
        const { username, password, role, branch_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { error } = await supabase
            .from('users')
            .insert({
                username: username.toLowerCase().trim(),
                password: hashedPassword,
                role: role || 'Branch',
                branch_id: branch_id || null
            });
            
        if (error) throw error;
        res.json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Admin: Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { username, password, branch_id, role } = req.body;
        const updates = {
            username: username.toLowerCase().trim(),
            branch_id: branch_id || null,
            role: role
        };
        
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }
        
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Toggle block/unblock user
router.patch('/users/:id/block', async (req, res) => {
    try {
        const { is_blocked } = req.body;
        const { error } = await supabase
            .from('users')
            .update({ is_blocked: is_blocked ? 1 : 0 })
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.json({ message: `User ${is_blocked ? 'blocked' : 'unblocked'}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Get branches
router.get('/branches', async (req, res) => {
    try {
        const { data: branches, error } = await supabase
            .from('branches')
            .select('*')
            .order('name');
            
        if (error) throw error;
        res.json(branches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
