import { hashPin } from '../server/auth.js'
const pin = process.argv[2]
if (!pin || !/^\d{4,12}$/.test(pin)) { console.error('Użycie: npm run hash-pin -- <PIN>'); process.exit(1) }
// Deliberate CLI output for copying into a secret setting. Never print the PIN.
process.stdout.write(hashPin(pin) + '\n')
