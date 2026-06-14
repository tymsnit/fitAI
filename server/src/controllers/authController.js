const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'User with this email already exists',
      });
    }

    await client.query('BEGIN');

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userResult = await client.query(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, created_at AS "createdAt"
      `,
      [email, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `
      INSERT INTO user_profiles (
        user_id,
        fitness_level,
        goal,
        trainings_per_week
      )
      VALUES ($1, $2, $3, $4)
      `,
      [user.id, 'beginner', 'maintenance', 3]
    );

    await client.query('COMMIT');

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error registering user:', error);

    res.status(500).json({
      message: 'Server error while registering user',
    });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const result = await pool.query(
      `
      SELECT 
        id,
        email,
        password_hash AS "passwordHash",
        created_at AS "createdAt"
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error logging in user:', error);

    res.status(500).json({
      message: 'Server error while logging in',
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.email,
        u.created_at AS "createdAt",
        p.name,
        p.age,
        p.gender,
        p.height,
        p.weight,
        p.fitness_level AS "fitnessLevel",
        p.goal,
        p.trainings_per_week AS "trainingsPerWeek"
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting current user:', error);

    res.status(500).json({
      message: 'Server error while getting current user',
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
};