import os from "node:os";

export function getLanUrls(port: number): { hostnames: string[]; lanUrls: string[]; port: number } {
  const hostnames: string[] = [];
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
