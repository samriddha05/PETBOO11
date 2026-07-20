const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const aiRoutes = require('./src/routes/aiRoutes');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const petRoutes = require('./src/routes/petRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const productRoutes = require('./src/routes/productRoutes');
const vetRoutes = require('./src/routes/vetRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const groomingRoutes = require('./src/routes/groomingRoutes');
const medicalRoutes = require('./src/routes/medicalRoutes');
const activityRoutes = require('./src/routes/activityRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: (origin, callback) => {
    const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const allowed = rawOrigin
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (!origin || allowed.includes('*')) {
      return callback(null, true);
    }

    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin denied: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/pets', petRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/vets', vetRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/groomers', groomingRoutes);
app.use('/api/v1/pets/:petId/medical', medicalRoutes);
app.use('/api/v1/pets/:petId/activities', activityRoutes);

// Serve uploaded medical files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendBuilt = fs.existsSync(frontendDistPath);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (frontendBuilt) {
  app.use(express.static(frontendDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('PetSphere Backend API is running perfectly!');
  });
}

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  const dbConfigured = !!process.env.DATABASE_URL;
  const authConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const aiConfigured = !!process.env.GROQ_API_KEY;

  console.log(`\n🐾 PetSphere backend running on http://localhost:${PORT}`);
  console.log(`   Database:  ${dbConfigured ? '✅ PostgreSQL' : '⚡ In-memory mock data'}`);
  console.log(`   Auth:      ${authConfigured ? '✅ Supabase' : '⚡ Demo mode only'}`);
  console.log(`   AI Chat:   ${aiConfigured ? '✅ Groq API' : '⚡ Mock responses'}\n`);

  if (dbConfigured) {
    const db = require('./src/utils/db');
    db.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP;

      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "petId" UUID NOT NULL REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "type" TEXT NOT NULL,
        "value" DOUBLE PRECISION NOT NULL,
        "date" DATE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "ActivityLog_petId_idx" ON "ActivityLog"("petId");
      CREATE INDEX IF NOT EXISTS "ActivityLog_date_idx" ON "ActivityLog"("date" DESC);
    `).then(() => {
      console.log('   ✅ PostgreSQL User table schema and ActivityLog table verified/created');
    }).catch(err => {
      console.error('   ❌ Failed to verify/migrate database schema:', err.message);
    });
  }
});
