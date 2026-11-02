import { createServer } from 'node:http'
import api from '../api/[...route].js'
createServer(api).listen(3001, '127.0.0.1', () => console.log('PinkTower API: http://127.0.0.1:3001'))
