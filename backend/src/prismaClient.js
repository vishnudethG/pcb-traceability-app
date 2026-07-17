const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Get the connection string from the .env file
const connectionString = process.env.DATABASE_URL;

// Initialize a standard Postgres connection pool
const pool = new Pool({ connectionString });

// Wrap the pool in Prisma's adapter
const adapter = new PrismaPg(pool);

// Pass the adapter into the Prisma Client constructor
const prisma = new PrismaClient({ adapter });

module.exports = prisma;