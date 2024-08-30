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
const chatRoutes = require('./routes/chatRoutes');
const postRoutes = require('./routes/post');
const communityRoutes = require('./routes/community');
const socketHandler = require('./utils/socketHandler');
const cloudinary = require('./config/cloudinary');
console.log('Cloudinary config:', cloudinary.config().cloud_name);
const { Readable } = require('stream');
const webpush = require('web-push');
const multer = require('multer');

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

dotenv.config();

const app = express();
app.use(cors({
  origin: ['https://yapperapp.xyz', 'http://localhost:3000', 'http://192.168.101.166:3000', 'https://yapperapp.onrender.com', 'https://yapperapp.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  optionsSuccessStatus: 200
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
    origin: ['https://yapperapp.xyz', 'http://localhost:3000', 'http://192.168.101.166:3000', 'https://yapperapp.onrender.com', 'https://yapperapp.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    optionsSuccessStatus: 200
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
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.status(200).send('ok, alive');
});

app.use('/uploads', express.static('uploads'));
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/post', (req, res, next) => {
  console.log('Received request for /api/post');
  console.log('Request method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);

  if (req.method === 'POST' && req.headers['content-type'].startsWith('multipart/form-data')) {
    upload.single('media')(req, res, (err) => {
      if (err) {
        console.error('Error processing file:', err);
        return res.status(400).json({ message: 'Error processing file', error: err.message });
      }
      console.log('File processed successfully');
      next();
    });
  } else {
    console.log('Not a multipart/form-data request, proceeding to next middleware');
    next();
  }
}, postRoutes);

socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));