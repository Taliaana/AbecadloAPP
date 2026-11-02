import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
if (!process.env.DATABASE_URL) throw new Error('Ustaw DATABASE_URL przed migracją.')
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
try { await migrate(drizzle(client), { migrationsFolder: 'server/db/migrations' }); console.log('Migracje DB zakończone.') } finally { await client.end() }
