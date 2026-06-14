const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutPlanRoutes = require('./routes/workoutPlanRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const workoutHistoryRoutes = require('./routes/workoutHistoryRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'FitAI API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workout-plan', workoutPlanRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/workout-history', workoutHistoryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FitAI server is running on port ${PORT}`);
});