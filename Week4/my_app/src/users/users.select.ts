import type { Prisma } from '../generated/prisma/client.js';

// Reuse this projection whenever a response contains user information.
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;
