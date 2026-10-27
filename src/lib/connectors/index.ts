/**
 * Clients for the systems MentOS talks to. In this case they're mocks running
 * inside the app (see docs/apis.md), but treat them like the real thing: they
 * can reject a request, and each one has its own quirks.
 */
export { adminApp } from './admin-app';
export { ConnectorError } from './http';
export { kleer } from './kleer';
export { salesforce } from './salesforce';
export { slack } from './slack';
export { stripe } from './stripe';
