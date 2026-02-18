import { createMollieClient, MollieClient } from '@mollie/api-client';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.MOLLIE_API_KEY;

if (!apiKey) {
  throw new Error('MOLLIE_API_KEY is not defined in environment variables');
}

if (!apiKey.startsWith('live_') && !apiKey.startsWith('test_')) {
  throw new Error('MOLLIE_API_KEY format is invalid. Must start with "live_" or "test_"');
}

export const mollieClient: MollieClient = createMollieClient({ apiKey });
