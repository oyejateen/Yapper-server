const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const busboy = require('busboy');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser')
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/post');
const communityRoutes = require('./routes/community');
const socketHandler = require('./utils/socketHandler');
const cloudinary = require('./config/cloudinary');
console.log('Cloudinary config:', cloudinary.config().cloud_name);
const { Readable } = require('stream');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

dotenv.config();

const app = express();
app.use(cors({
  origin: ['https://yapperapp.xyz', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionSuccessStatus: 200
}));
app.options('*', cors());
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://yapperapp.xyz' 
      : 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

console.log('CORS origin:', process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:3000');

app.use(express.json());

app.get('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.status(200).send('ok, alive');
});

app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/post', postRoutes);
app.use('/api/community', (req, res, next) => {
  if (req.method === 'POST' && req.headers['content-type'].startsWith('multipart/form-data')) {
    const bb = busboy({ headers: req.headers });
    const fields = {};
    const filePromises = [];

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      
      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed' });
      }

      const cloudinaryPromise = new Promise((resolve, reject) => {
        const cloudinaryStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' },
          (error, result) => {
            if (error) reject(error);
            else resolve({ name, url: result.secure_url });
          }
        );

        file.pipe(cloudinaryStream);
      });

      filePromises.push(cloudinaryPromise);
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('close', async () => {
      try {
        const uploadedFiles = await Promise.all(filePromises);
        uploadedFiles.forEach(file => {
          fields[file.name] = file.url;
        });
        req.body = fields;
        next();
      } catch (err) {
        console.error('Error processing form data:', err);
        res.status(500).json({ message: 'Error processing form data', error: err.message });
      }
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      res.status(500).json({ message: 'Error processing form data', error: err.message });
    });

    req.pipe(bb);
  } else {
    // For non-multipart requests, use the built-in JSON parser
    express.json()(req, res, next);
  }
}, communityRoutes);

const notificationRoutes = require('./routes/notification');
app.use('/api/notifications', notificationRoutes);


socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));