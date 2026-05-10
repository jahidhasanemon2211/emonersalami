const sqlite3 = require('sqlite3').verbose();

// Create a new database file or connect to the existing one
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Initialize the movies table
        db.run(`
            CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                genre TEXT NOT NULL,
                description TEXT,
                video_url TEXT NOT NULL,
                poster_url TEXT NOT NULL,
                quality TEXT DEFAULT '1080p'
            )
        `, (err) => {
            if (err) {
                console.error('Error creating movies table:', err.message);
            } else {
                console.log('Movies table ready.');

                // Attempt to add 'quality' column if it doesn't exist (for users with older databases)
                db.run(`ALTER TABLE movies ADD COLUMN quality TEXT DEFAULT '1080p'`, (alterErr) => {
                    // Ignore error: this usually means the column already exists, which is fine
                });
            }
        });
    }
});

module.exports = db;
