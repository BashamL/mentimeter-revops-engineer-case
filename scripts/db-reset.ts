/** `npm run db:reset`: puts every mock system back to the seed data. */
import { resetDb } from '../src/lib/db';

resetDb();
console.log('Every mock system is back to the seed data.');
