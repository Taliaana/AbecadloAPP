import { createClient } from '@supabase/supabase-js'
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Ustaw serwerowe zmienne Supabase.')
const storage = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).storage
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'pinktower-assets'
const { data: existing, error: lookup } = await storage.getBucket(bucket)
if (lookup && !String(lookup.message).toLowerCase().includes('not found')) throw new Error('Nie udało się sprawdzić bucketu.')
const options = { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ['image/png','image/jpeg','image/webp','image/gif'] }
const { error } = existing ? await storage.updateBucket(bucket, options) : await storage.createBucket(bucket, options)
if (error) throw new Error('Nie udało się przygotować prywatnego bucketu.')
console.log('Prywatny bucket jest gotowy.')
