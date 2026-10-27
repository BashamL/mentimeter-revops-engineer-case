/**
 * Salesforce can call this URL for every Closed Won event. The Dev tools page
 * sends this week's events here, one at a time, in order.
 *
 * It does nothing yet. Whether you build on it, read the event feed
 * (GET /api/mock/salesforce/events) instead, or work from the UI is up to you.
 */
import type { SalesforceEvent } from '@/lib/systems/types';

export async function POST(request: Request) {
  const event = (await request.json()) as SalesforceEvent;
  console.log(`[webhook] ${event.type} for ${event.opportunity.Name} (replayId ${event.replayId})`);
  return Response.json({ received: true }, { status: 202 });
}
