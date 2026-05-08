import os from "node:os";

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
