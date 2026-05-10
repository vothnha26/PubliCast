const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);

app.get('/', (req, res) => {
  res.send('PubliCast API is running');
});

module.exports = app;
