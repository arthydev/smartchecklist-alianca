const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

async function initDb() {
    try {
        const connection = await promisePool.getConnection();
        console.log('Connected to MySQL database.');

        // Users Table
        await connection.query(`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            phone VARCHAR(20),
            manager_id VARCHAR(36),
            area VARCHAR(50)
        )`);

        // Checklists Table
        await connection.query(`CREATE TABLE IF NOT EXISTS checklists (
            id VARCHAR(36) PRIMARY KEY,
            manager_id VARCHAR(36) NOT NULL,
            date DATE NOT NULL,
            equipment_no VARCHAR(50),
            shift VARCHAR(20),
            approval_status VARCHAR(20),
            data JSON,
            FOREIGN KEY (manager_id) REFERENCES users(id)
        )`);

        // Settings Table
        await connection.query(`CREATE TABLE IF NOT EXISTS settings (
            manager_id VARCHAR(36) PRIMARY KEY,
            items JSON,
            substitute JSON,
            scrap_recipients JSON,
            scrap_clients JSON,
            FOREIGN KEY (manager_id) REFERENCES users(id)
        )`);

        // Equipment Table
        await connection.query(`CREATE TABLE IF NOT EXISTS equipments (
            id VARCHAR(36) PRIMARY KEY,
            code VARCHAR(50) NOT NULL,
            description VARCHAR(255),
            active BOOLEAN DEFAULT TRUE,
            type VARCHAR(50),
            manager_id VARCHAR(36),
            category VARCHAR(50),
            FOREIGN KEY (manager_id) REFERENCES users(id)
        )`);

        // Absences Table
        await connection.query(`CREATE TABLE IF NOT EXISTS absences (
            id VARCHAR(36) PRIMARY KEY,
            entity_id VARCHAR(36),
            start_date DATE,
            end_date DATE,
            reason VARCHAR(50),
            manager_id VARCHAR(36),
            type VARCHAR(20),
            FOREIGN KEY (manager_id) REFERENCES users(id)
        )`);

        // Brasiltec Users Table
        await connection.query(`CREATE TABLE IF NOT EXISTS brasiltec_users (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            manager_id VARCHAR(36),
            FOREIGN KEY (manager_id) REFERENCES users(id)
        )`);

        // Seed Admin User
        const [rows] = await connection.query("SELECT id FROM users WHERE username = ?", ['ADMIN']);
        if (rows.length === 0) {
            await connection.query(`INSERT INTO users (id, name, username, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)`,
                ['1', 'Administrador Master', 'ADMIN', 'ADMIN', 'MANAGER', '5511999999999']
            );
            console.log("Seeded default admin user.");
        }

        connection.release();
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initDb();

module.exports = promisePool;
