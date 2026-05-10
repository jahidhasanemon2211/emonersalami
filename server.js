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
    const { title, genre, description, video_url, poster_url } = req.body;

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

    db.run(
        'INSERT INTO movies (title, genre, description, video_url, poster_url) VALUES (?, ?, ?, ?, ?)',
        [title, genre, description, finalVideoUrl, finalPosterUrl],
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
