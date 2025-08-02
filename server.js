import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
    });
    isConnected = true;
    console.log(' MongoDB connected');
  } catch (err) {
    console.error(' MongoDB connection failed:', err.message);
    throw err;
  }
}

// === Schemas ===
const adminSchema = new mongoose.Schema({
  password: String,
  initialized: { type: Boolean, default: false },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);




const Schema = new mongoose.Schema({
  value: { type: Number, required: true, default: 0 } // 0 means show timer
});

const progressPercentage = mongoose.models.progressPercentage || mongoose.model('progressPercentage', Schema);


// === Middleware ===
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// === Routes ===
app.get('/api/verify-token', authenticateJWT, (req, res) => {
  res.status(200).json({ message: 'Token valid' });
});

app.post('/api/authenticate', async (req, res) => {
  try {
    await connectDB();
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const admin = await Admin.findOne();
    if (!admin || !admin.initialized)
      return res.status(401).json({ message: 'Admin not initialized' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});




app.get('/api/init-admin', async (req, res) => {
  try {
    await connectDB();

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 8) {
      return res.status(400).send('ADMIN_PASSWORD must be at least 8 characters long');
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    await Admin.updateOne(
      { initialized: true },
      { $set: { password: hashed, initialized: true } },
      { upsert: true }
    );

    res.send('Admin created or updated');
  } catch (err) {
    res.status(500).send('Failed to initialize admin');
  }
});



app.post("/api/incrementProgress", authenticateJWT, async (req, res) => {
  const { number } = req.body;

  try {
    await connectDB();
    let coll = await progressPercentage.findOne();

    if (!coll) {
      // If no document exists, create one with the number
      coll = new progressPercentage({ value: number });
      await coll.save();
    } else {
      // Increment existing value
      coll.value += number;
      await coll.save();
    }

    return res.status(200).json({ message: "Incremented successfully", value: coll.value });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Increment failed" });
  }
});
app.post("/api/decrementProgress", authenticateJWT, async (req, res) => {
  const { number } = req.body;

  try {
    await connectDB();
    let coll = await progressPercentage.findOne();

    if (!coll) {
      // If no document exists, create one with negative value
      coll = new progressPercentage({ value: -number });
      await coll.save();
    } else {
      // Decrement existing value
      coll.value -= number;
      await coll.save();
    }

    return res.status(200).json({ message: "Decremented successfully", value: coll.value });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Decrement failed" });
  }
});
app.get("/api/getProgress", async (req, res) => {
  try {
    await connectDB();
    const coll = await progressPercentage.findOne();

    if (!coll) {
      return res.status(200).json({ value: 0 }); // Default if no document exists
    }

    return res.status(200).json({ value: coll.value });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch value" });
  }
});



// await connectDB();

// Start server only in local dev (Vercel uses serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;







