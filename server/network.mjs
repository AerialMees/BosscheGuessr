import os from "node:os";

export function sanitizeLocalHostname(value = os.hostname()) {
  const hostname = String(value)
    .trim()
    .replace(/\.local$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return hostname || null;
}

export function getLanUrls(port) {
  const hostnames = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      hostnames.push(address.address);
    }
  }

  return {
    hostnames,
    lanUrls: hostnames.map((host) => `http://${host}:${port}`),
    port,
  };
}

export function getHostInfo({ frontendPort, socketPort = frontendPort } = {}) {
  const localIps = getLanUrls(frontendPort).hostnames;
  const hostname = sanitizeLocalHostname();
  const localDomainUrl = hostname ? `http://${hostname}.local:${frontendPort}` : null;
  const lanFrontendUrls = localIps.map((host) => `http://${host}:${frontendPort}`);
  const localFrontendUrl = `http://localhost:${frontendPort}`;
  const preferredJoinUrls = [
    ...(localDomainUrl ? [localDomainUrl] : []),
    ...lanFrontendUrls,
    localFrontendUrl,
  ];

  return {
    localIps,
    hostname,
    localDomainUrl,
    preferredJoinUrls,
    frontendPort,
    socketPort,
    localFrontendUrl,
    lanFrontendUrls,
    localSocketUrl: `http://localhost:${socketPort}`,
    lanSocketUrls: localIps.map((host) => `http://${host}:${socketPort}`),
  };
}
