import { beforeEach } from 'vitest';
import { useMemoryDb } from '@/lib/db';

// Every test starts from the seed data, in memory, so tests never touch
// .data/db.json or each other.
beforeEach(() => {
  useMemoryDb();
});
