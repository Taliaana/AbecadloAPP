import { createHandler } from '../server/http.js'
import { postgresRepository } from '../server/db/repository.js'
import { supabaseFiles } from '../server/storage/supabase.js'
import { createService } from '../server/services.js'
let handler: ReturnType<typeof createHandler>
export default async function api(request: any, response: any) {
  if (!['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SESSION_SECRET','TEACHER_PIN_HASH'].every(key => process.env[key])) {
    response.statusCode = 503; response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({ error: 'Nie udało się połączyć. Spróbuj ponownie.' })); return
  }
  handler ||= createHandler(createService(postgresRepository(process.env.DATABASE_URL!), supabaseFiles()))
  await handler(request, response)
}
