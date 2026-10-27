'use server';

import { revalidatePath } from 'next/cache';
import { POST as salesforceWebhook } from '@/app/api/webhooks/salesforce/route';
import { readDb, resetDb, updateDb } from '@/lib/db';

/** Sends Salesforce events to the webhook, oldest first. */
export async function sendEvents(formData: FormData) {
  const all = formData.get('mode') === 'all';
  const db = readDb();
  const delivered = new Set(db.deliveries.map((d) => d.replayId));
  const pending = db.salesforce.events.filter((e) => !delivered.has(e.replayId));
  for (const event of all ? pending : pending.slice(0, 1)) {
    let status = 0;
    let response = '';
    try {
      const result = await salesforceWebhook(
        new Request('http://localhost/api/webhooks/salesforce', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(event),
        }),
      );
      status = result.status;
      response = await result.text();
    } catch (error) {
      status = 500;
      response = error instanceof Error ? error.message : String(error);
    }
    updateDb((next) => {
      next.deliveries.push({
        replayId: event.replayId,
        at: new Date().toISOString(),
        status,
        response: response.slice(0, 500),
      });
    });
  }
  revalidatePath('/', 'layout');
}

/** Forgets which events were sent, so they can be sent again. */
export async function clearDeliveries() {
  updateDb((db) => {
    db.deliveries = [];
  });
  revalidatePath('/dev');
}

export async function resetEverything() {
  resetDb();
  revalidatePath('/', 'layout');
}
