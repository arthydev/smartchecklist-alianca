const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        try {
            console.log('Body:', JSON.stringify(req.body).substring(0, 200) + '...');
        } catch (e) {
            console.log('Body: [Error stringifying]');
        }
    }
    next();
});

// --- System Health ---
app.get('/api/health', async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// --- Authentication ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        const user = rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { password: _, ...userWithoutPass } = user;
        res.json(userWithoutPass);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Checklists ---
app.get('/api/checklists', async (req, res) => {
    const { managerId } = req.query;
    if (!managerId) return res.status(400).json({ error: 'Manager ID required' });

    try {
        const [rows] = await db.query("SELECT * FROM checklists WHERE manager_id = ?", [managerId]);
        const checklists = rows.map(row => {
            // MySQL driver might parse JSON columns automatically if defined as JSON type?
            // If they come back as objects, no need to parse. If strings, need to parse.
            // mysql2 usually returns JSON columns as objects.
            return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        });
        res.json(checklists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/checklists', async (req, res) => {
    const checklist = req.body;
    const { id, managerId, date, equipmentNo, shift, approvalStatus } = checklist;

    try {
        // MySQL UPSERT syntax: INSERT ... ON DUPLICATE KEY UPDATE
        const query = `
            INSERT INTO checklists (id, manager_id, date, equipment_no, shift, approval_status, data) 
            VALUES (?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            date = VALUES(date), 
            equipment_no = VALUES(equipment_no), 
            shift = VALUES(shift), 
            approval_status = VALUES(approval_status), 
            data = VALUES(data)
        `;
        console.log(`Executing Checklist Upsert for ID: ${id}`);
        await db.query(query, [id, managerId, date, equipmentNo, shift, approvalStatus, JSON.stringify(checklist)]);
        console.log(`Successfully saved checklist ${id}`);
        res.json(checklist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
    const { managerId } = req.query;
    try {
        const [rows] = await db.query("SELECT * FROM settings WHERE manager_id = ?", [managerId]);
        const row = rows[0];

        // Reconstruct settings object or defaults
        const settings = row ? {
            items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
            substitute: typeof row.substitute === 'string' ? JSON.parse(row.substitute) : (row.substitute || { name: '', phone: '', isActive: false }),
            scrapRecipients: typeof row.scrap_recipients === 'string' ? JSON.parse(row.scrap_recipients) : (row.scrap_recipients || []),
            scrapClients: typeof row.scrap_clients === 'string' ? JSON.parse(row.scrap_clients) : (row.scrap_clients || []),
        } : {
            items: [],
            substitute: { name: '', phone: '', isActive: false },
            scrapRecipients: [],
            scrapClients: []
        };

        const [equipments] = await db.query("SELECT * FROM equipments WHERE manager_id = ?", [managerId]);
        const [absences] = await db.query("SELECT * FROM absences WHERE manager_id = ?", [managerId]);

        settings.equipment = equipments.map(e => ({ ...e, active: e.active === 1 }));
        settings.absences = absences;
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    const { managerId, updates } = req.body;

    try {
        const [rows] = await db.query("SELECT * FROM settings WHERE manager_id = ?", [managerId]);
        if (rows.length === 0) {
            await db.query("INSERT INTO settings (manager_id) VALUES (?)", [managerId]);
        }

        // Handle JSON updates
        if (updates.items) await db.query("UPDATE settings SET items = ? WHERE manager_id = ?", [JSON.stringify(updates.items), managerId]);
        if (updates.substitute) await db.query("UPDATE settings SET substitute = ? WHERE manager_id = ?", [JSON.stringify(updates.substitute), managerId]);
        if (updates.scrapRecipients) await db.query("UPDATE settings SET scrap_recipients = ? WHERE manager_id = ?", [JSON.stringify(updates.scrapRecipients), managerId]);
        if (updates.scrapClients) await db.query("UPDATE settings SET scrap_clients = ? WHERE manager_id = ?", [JSON.stringify(updates.scrapClients), managerId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Users API ---
app.get('/api/users', async (req, res) => {
    const { managerId } = req.query;
    if (!managerId) return res.status(400).json({ error: 'Manager ID required' });

    try {
        const [users] = await db.query("SELECT * FROM users WHERE manager_id = ? OR id = ?", [managerId, managerId]);
        const sanitizedUsers = users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(sanitizedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const user = req.body;
    const { id, name, username, password, role, managerId, area } = user;
    try {
        await db.query("INSERT INTO users (id, name, username, password, role, manager_id, area) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, name, username, password, role, managerId, area]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, username, password, role, area } = req.body;
    try {
        await db.query("UPDATE users SET name = ?, username = ?, password = ?, role = ?, area = ? WHERE id = ?",
            [name, username, password, role, area, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Absences API ---
app.post('/api/absences', async (req, res) => {
    const absence = req.body;
    const { id, entityId, startDate, endDate, reason, managerId } = absence;
    try {
        await db.query("INSERT INTO absences (id, entity_id, start_date, end_date, reason, manager_id) VALUES (?, ?, ?, ?, ?, ?)",
            [id, entityId, startDate, endDate, reason, managerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/absences/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM absences WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Brasiltec API ---
app.get('/api/brasiltec', async (req, res) => {
    const { managerId } = req.query;
    try {
        const [rows] = await db.query("SELECT * FROM brasiltec_users WHERE manager_id = ?", [managerId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/brasiltec', async (req, res) => {
    const { id, name, password, managerId } = req.body;
    try {
        await db.query("INSERT INTO brasiltec_users (id, name, password, manager_id) VALUES (?, ?, ?, ?)",
            [id, name, password, managerId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/brasiltec/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM brasiltec_users WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Frontend Static Support ---
const path = require('path');
const publicPath = path.join(__dirname, 'public');

// Force bypass of browser cache for assets. The browser previously cached the JS as text/html
// when the routes were broken. This strips the conditional GET headers so Express always
// returns a fresh 200 OK with the proper application/javascript MIME type.
app.use((req, res, next) => {
    if (req.url.match(/\.(js|css)$/)) {
        delete req.headers['if-none-match'];
        delete req.headers['if-modified-since'];
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
    next();
});

// Serve static files from the 'public' directory at multiple possible base paths
app.use(express.static(publicPath));
app.use('/~leon2682/smartchecklist', express.static(publicPath));
app.use('/~leon2682', express.static(publicPath));
app.use('/smartchecklist', express.static(publicPath));

// Handle React Routing, return all requests to React app
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) return next();

    // If the request looks like a static asset that wasn't found (e.g., .js, .css)
    // we should NOT return index.html, to prevent the "text/html" MIME type error.
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|woff|ttf|svg)$/)) {
        return res.status(404).json({ error: 'Asset not found', path: req.url });
    }

    if (req.method === 'GET') {
        res.sendFile(path.join(publicPath, 'index.html'));
    } else {
        next();
    }
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Accessible externally)`);
});
