export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'workforce_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'workforce-jwt-secret-key-prod-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    fallbackModel: process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant',
  },
});
