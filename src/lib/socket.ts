import type { MultiplayerLobbyState, RoundResultPayload } from "../shared/types";

export type SocketResponse = {
  ok: boolean;
  state?: MultiplayerLobbyState;
  playerId?: string;
  results?: RoundResultPayload;
  error?: string;
};

type LobbyEvent = "lobby:state" | "lobby:error" | "round:results" | "connect_error";
type Listener = (...args: any[]) => void;
type EmitCallback = (error: Error | null, response?: SocketResponse) => void;

let client: PollingMultiplayerClient | null = null;

export function getSocket(): PollingMultiplayerClient {
  client ??= new PollingMultiplayerClient();
  return client;
}

export function getSocketServerUrl(): string {
  return import.meta.env.VITE_MULTIPLAYER_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
}

export async function getNetworkInfo(): Promise<{ hostnames: string[]; lanUrls: string[]; port: number }> {
  const response = await fetch(`${getSocketServerUrl()}/api/network-info`);
  if (!response.ok) throw new Error("Could not load LAN network info.");
  return response.json();
}

export class PollingMultiplayerClient {
  private readonly listeners = new Map<LobbyEvent, Set<Listener>>();
  private readonly clientId = getClientId();
  private lobbyCode?: string;
  private pollTimer?: number;
  private lastStateJson = "";
  private lastResultsJson = "";

  on(event: LobbyEvent, listener: Listener): void {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event: LobbyEvent, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  timeout(_ms: number): Pick<PollingMultiplayerClient, "emit"> {
    return { emit: this.emit.bind(this) };
  }

  emit(event: string, payload?: any, callback?: EmitCallback): void {
    void this.handleEmit(event, payload ?? {}, callback);
  }

  private async handleEmit(event: string, payload: any, callback?: EmitCallback): Promise<void> {
    try {
      const response = await this.requestForEvent(event, payload);
      if (response.state) {
        this.lobbyCode = response.state.code;
        this.emitLocal("lobby:state", response.state);
        this.startPolling(response.state.code);
      }
      if (response.results) {
        this.lastResultsJson = JSON.stringify(response.results);
        this.emitLocal("round:results", response.results);
      }
      callback?.(null, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reach the multiplayer server.";
      this.emitLocal(event === "lobby:create" || event === "lobby:join" ? "connect_error" : "lobby:error", message);
      callback?.(error instanceof Error ? error : new Error(message), { ok: false, error: message });
    }
  }

  private async requestForEvent(event: string, payload: any): Promise<SocketResponse> {
    switch (event) {
      case "lobby:create":
        return this.post("/api/lobby/create", { ...payload, clientId: this.clientId });
      case "lobby:join":
        return this.post("/api/lobby/join", { ...payload, clientId: this.clientId });
      case "lobby:update-settings":
        return this.post(`/api/lobby/${payload.code}/settings`, { clientId: this.clientId, settingsPatch: payload.settingsPatch });
      case "game:start":
        return this.post(`/api/lobby/${payload.code}/start`, { clientId: this.clientId, preparedRounds: payload.preparedRounds });
      case "round:submit-guess":
        return this.post(`/api/lobby/${payload.code}/guess`, { clientId: this.clientId, roundId: payload.roundId, guessLocation: payload.guessLocation });
      case "round:next":
        return this.post(`/api/lobby/${payload.code}/next`, { clientId: this.clientId });
      case "lobby:leave":
        this.stopPolling();
        return this.post(`/api/lobby/${payload.code}/leave`, { clientId: this.clientId });
      default:
        throw new Error(`Unsupported multiplayer event: ${event}`);
    }
  }

  private async post(path: string, body: object): Promise<SocketResponse> {
    const response = await fetch(`${getSocketServerUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error ?? "Multiplayer request failed.");
    return data;
  }

  private startPolling(code: string): void {
    if (this.pollTimer && this.lobbyCode === code) return;
    this.stopPolling();
    this.lobbyCode = code;
    void this.poll();
    this.pollTimer = window.setInterval(() => void this.poll(), 1000);
  }

  private stopPolling(): void {
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    this.pollTimer = undefined;
    this.lobbyCode = undefined;
    this.lastStateJson = "";
    this.lastResultsJson = "";
  }

  private async poll(): Promise<void> {
    if (!this.lobbyCode) return;
    try {
      const response = await fetch(`${getSocketServerUrl()}/api/lobby/${this.lobbyCode}/state`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false || !data.state) throw new Error(data.error ?? "Could not poll lobby state.");
      const state = data.state as MultiplayerLobbyState;
      const stateJson = JSON.stringify(state);
      if (stateJson !== this.lastStateJson) {
        this.lastStateJson = stateJson;
        this.emitLocal("lobby:state", state);
      }
      if (state.status === "round-results" || state.status === "finished") {
        await this.pollResults(state.code);
      } else {
        this.lastResultsJson = "";
      }
    } catch (error) {
      this.emitLocal("connect_error", error);
    }
  }

  private async pollResults(code: string): Promise<void> {
    const response = await fetch(`${getSocketServerUrl()}/api/lobby/${code}/results`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false || !data.results) return;
    const results = data.results as RoundResultPayload;
    const resultsJson = JSON.stringify(results);
    if (resultsJson === this.lastResultsJson) return;
    this.lastResultsJson = resultsJson;
    this.emitLocal("round:results", results);
  }

  private emitLocal(event: LobbyEvent, ...args: any[]): void {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

function getClientId(): string {
  const storageKey = "bosscheguessr_multiplayer_client_id";
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = crypto.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(storageKey, next);
    return next;
  } catch {
    return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
