const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const fs = require('fs');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());
// Parse JSON bodies
app.use(express.json());

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

// Upload a new movie
app.post('/api/movies', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'poster', maxCount: 1 }]), (req, res) => {
    const { title, genre, description } = req.body;

    if (!req.files || !req.files.video || !req.files.poster) {
        return res.status(400).json({ error: 'Both video and poster files are required' });
    }

    const videoUrl = '/uploads/' + req.files.video[0].filename;
    const posterUrl = '/uploads/' + req.files.poster[0].filename;

    db.run(
        'INSERT INTO movies (title, genre, description, video_url, poster_url) VALUES (?, ?, ?, ?, ?)',
        [title, genre, description, videoUrl, posterUrl],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Movie uploaded successfully' });
        }
    );
});

// Start the server
app.listen(port, () => {
    console.log(`Movie server listening at http://localhost:${port}`);
});
