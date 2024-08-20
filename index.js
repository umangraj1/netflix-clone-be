const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3300;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const mongoURI = 'mongodb://localhost:27017/netflix';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Movie Schema and Model
const movieSchema = new mongoose.Schema({
    name: { type: String, required: true },
    year: { type: String, required: true },
    genere: { type: String, required: true },
    poster: { type: String, required: true },
    description: { type: String, required: true },
    video: { type: String, required: true },
    category: { type: String, default: 'popular' }
});

const Movie = mongoose.model('Movie', movieSchema);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 70000000 }, // 70MB limit for video
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).fields([
    { name: 'poster', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images and videos only!');
    }
}

// Routes
app.post('/api/movie/create', async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) return res.status(400).json({ message: err });

            const { name, year, genere, description } = req.body;
            if (!name || !year || !genere || !description) {
                return res.status(400).json({ message: 'Missing form fields!' });
            }

            const posterFileName = req.files?.poster ? `uploads/${req.files['poster'][0].filename}` : '';
            const videoFileName = req.files?.video ? `uploads/${req.files['video'][0].filename}` : '';

            if (!posterFileName || !videoFileName) {
                return res.status(400).json({ message: 'Poster or Video file is missing!' });
            }

            const newMovie = new Movie({ name, year, genere, description, poster: posterFileName, video: videoFileName });
            await newMovie.save();

            res.status(200).json({ message: 'Movie has been added', movie: newMovie });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating movie' });
    }
});

app.get('/api/movie/list', async (req, res) => {
    try {
        const movies = await Movie.find();
        if (movies.length === 0) {
            return res.status(404).json({ message: 'No movies available' });
        }

        const moviesByCategory = movies.reduce((result, movie) => {
            result[movie.category] = result[movie.category] || [];
            result[movie.category].push(movie);
            return result;
        }, {});

        res.status(200).json(moviesByCategory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching movies' });
    }
});

// Start Server
app.listen(port)