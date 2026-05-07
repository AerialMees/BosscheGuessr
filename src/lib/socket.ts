import { io, type Socket } from "socket.io-client";
import type { MultiplayerLobbyState } from "../shared/types";

export type SocketResponse = {
  ok: boolean;
  state?: MultiplayerLobbyState;
  playerId?: string;
  error?: string;
};

let socket: Socket | null = null;

export function getSocket(): Socket {
  socket ??= io(getSocketServerUrl(), {
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function getSocketServerUrl(): string {
  return import.meta.env.VITE_MULTIPLAYER_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
}

export async function getNetworkInfo(): Promise<{ hostnames: string[]; lanUrls: string[]; port: number }> {
  const response = await fetch(`${getSocketServerUrl()}/api/network-info`);
  if (!response.ok) throw new Error("Could not load LAN network info.");
  return response.json();
}
