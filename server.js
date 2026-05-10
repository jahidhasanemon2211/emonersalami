const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const fs = require('fs');
const basicAuth = require('express-basic-auth');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());
// Parse JSON bodies
app.use(express.json());

// Set up Admin Authentication
const adminAuth = basicAuth({
    users: { 'admin': 'admin123' }, // Default username: admin, password: admin123
    challenge: true,
    realm: 'WORST FTP Admin Panel',
});

// Protect the admin page html
app.use('/admin.html', adminAuth);

// Setup storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes

// Get all movies
app.get('/api/movies', (req, res) => {
    db.all('SELECT * FROM movies', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get a single movie by ID
app.get('/api/movies/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM movies WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Movie not found' });
            return;
        }
        res.json(row);
    });
});

// Upload a new movie (Protected)
app.post('/api/movies', adminAuth, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'poster', maxCount: 1 }]), (req, res) => {
    const { title, genre, description, video_url, poster_url, quality } = req.body;

    let finalVideoUrl = video_url;
    let finalPosterUrl = poster_url;

    // Use uploaded file if present, otherwise use the provided URL
    if (req.files && req.files.video) {
        finalVideoUrl = '/uploads/' + req.files.video[0].filename;
    }

    if (req.files && req.files.poster) {
        finalPosterUrl = '/uploads/' + req.files.poster[0].filename;
    }

    if (!finalVideoUrl || !finalPosterUrl) {
        return res.status(400).json({ error: 'Both video and poster (either file or URL) are required' });
    }

    const finalQuality = quality || '1080p';

    db.run(
        'INSERT INTO movies (title, genre, description, video_url, poster_url, quality) VALUES (?, ?, ?, ?, ?, ?)',
        [title, genre, description, finalVideoUrl, finalPosterUrl, finalQuality],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Movie uploaded successfully' });
        }
    );
});

// Update a movie (Protected)
app.put('/api/movies/:id', adminAuth, (req, res) => {
    const id = req.params.id;
    const { title, genre, description, quality } = req.body;

    db.run(
        'UPDATE movies SET title = ?, genre = ?, description = ?, quality = ? WHERE id = ?',
        [title, genre, description, quality, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Movie updated successfully' });
        }
    );
});

// Delete a movie (Protected)
app.delete('/api/movies/:id', adminAuth, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM movies WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Movie deleted successfully' });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Movie server listening at http://localhost:${port}`);
});
