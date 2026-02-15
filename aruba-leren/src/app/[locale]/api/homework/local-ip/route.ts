/**
 * Local IP API (development only)
 *
 * GET /[locale]/api/homework/local-ip
 *
 * Returns the local network IP of the server so phones on the same
 * WiFi network can reach the dev server. Only works in development.
 */

import { NextRequest } from 'next/server';
import os from 'os';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ ip: null });
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return Response.json({ ip: iface.address });
      }
    }
  }

  return Response.json({ ip: null });
}
