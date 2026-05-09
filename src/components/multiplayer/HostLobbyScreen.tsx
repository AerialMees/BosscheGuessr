import { useEffect, useMemo, useState } from "react";
import { clampTimedViewSeconds, modes } from "../../data/modes";
import { selectableZones } from "../../data/zones";
import { getHostInfo, type HostInfo } from "../../lib/socket";
import type { MultiplayerLobbyState, MultiplayerSettings } from "../../shared/types";
import type { ModeId } from "../../types/game";
import { RetroButton } from "../RetroButton";

interface HostLobbyScreenProps {
  lobby: MultiplayerLobbyState;
  playerId?: string;
  loading?: boolean;
  onSettingsChange: (patch: Partial<MultiplayerSettings>) => void;
  onStart: () => void;
  onBack: () => void;
}

export function HostLobbyScreen({ lobby, playerId, loading, onSettingsChange, onStart, onBack }: HostLobbyScreenProps) {
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const isHost = lobby.players.find((player) => player.id === playerId)?.isHost;
  const joinOptions = useMemo(() => {
    const options: { label: string; helper: string; url: string }[] = [];
    const withLobby = (url: string) => `${url.replace(/\/$/, "")}/?lobby=${lobby.code}`;
    if (hostInfo?.localDomainUrl) {
      options.push({ label: "Try this first", helper: ".local Bonjour name", url: withLobby(hostInfo.localDomainUrl) });
    }
    for (const url of hostInfo?.lanFrontendUrls ?? []) {
      options.push({ label: "IP fallback", helper: "Same Wi-Fi only", url: withLobby(url) });
    }
    options.push({ label: "This Mac only", helper: "Local browser tabs", url: withLobby(hostInfo?.localFrontendUrl ?? window.location.origin) });
    return options;
  }, [hostInfo, lobby.code]);
  const firstJoinLink = joinOptions[0]?.url ?? `${window.location.origin}/?lobby=${lobby.code}`;

  useEffect(() => {
    void getHostInfo().then(setHostInfo).catch(() => setHostInfo(null));
  }, []);

  return (
    <main className="screen multiplayer-lobby-screen">
      <section className="panel lobby-hero">
        <p className="eyebrow">LAN lobby</p>
        <h1>Lobby {lobby.code}</h1>
        <p>Friends on the same Wi-Fi can join with one of these links.</p>
        <div className="join-options">
          {joinOptions.map((option) => (
            <div className="join-option" key={`${option.label}-${option.url}`}>
              <div>
                <strong>{option.label}</strong>
                <small>{option.helper}</small>
                <code>{option.url}</code>
              </div>
              <RetroButton type="button" tone="solid-blue" onClick={() => navigator.clipboard.writeText(option.url)}>Copy</RetroButton>
            </div>
          ))}
        </div>
        <div className="button-row">
          <RetroButton type="button" tone="solid-orange" onClick={() => navigator.clipboard.writeText(firstJoinLink)}>Copy Best Link</RetroButton>
          <RetroButton type="button" tone="secondary" onClick={() => navigator.clipboard.writeText(lobby.code)}>Copy Code</RetroButton>
          <RetroButton type="button" tone="secondary" onClick={onBack}>Leave</RetroButton>
        </div>
        <p className="text-muted">Same Wi-Fi required. If .local fails, use the IP fallback.</p>
      </section>

      <section className="panel">
        <h2>Players</h2>
        <div className="player-list">
          {lobby.players.map((player) => (
            <div className="player-pill" key={player.id}>
              <span>{player.name}</span>
              <small>{player.removedAt ? "REMOVED" : player.isHost ? "HOST" : player.connected ? "READY" : "DISCONNECTED"}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel lobby-settings">
        <h2>Competition Settings</h2>
        {!isHost && <p className="text-muted">Waiting for host to start the competition...</p>}
        <label>
          Map
          <select disabled={!isHost} value={lobby.settings.zoneId} onChange={(event) => onSettingsChange({ zoneId: event.target.value })}>
            {selectableZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.displayName}</option>)}
          </select>
        </label>
        <label>
          Mode
          <select
            disabled={!isHost}
            value={lobby.settings.modeId}
            onChange={(event) => {
              const modeId = event.target.value as ModeId;
              const mode = modes[modeId];
              onSettingsChange({
                modeId,
                allowMove: mode.allowMove,
                allowPan: mode.allowPan,
                allowZoom: mode.allowZoom,
                viewTimeLimitSeconds: modeId === "timed-view" ? lobby.settings.viewTimeLimitSeconds ?? 10 : null,
              });
            }}
          >
            {Object.values(modes).map((mode) => <option key={mode.id} value={mode.id}>{mode.displayName}</option>)}
          </select>
        </label>
        <label>
          Rounds: {lobby.settings.rounds}
          <input disabled={!isHost} type="range" min={1} max={20} value={lobby.settings.rounds} onChange={(event) => onSettingsChange({ rounds: Number(event.target.value) })} />
        </label>
        <label>
          Round timer
          <select
            disabled={!isHost}
            value={lobby.settings.roundTimeLimitSeconds ?? "off"}
            onChange={(event) => onSettingsChange({ roundTimeLimitSeconds: event.target.value === "off" ? null : Number(event.target.value) })}
          >
            <option value="off">Off</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={90}>90s</option>
            <option value={120}>120s</option>
          </select>
        </label>
        {lobby.settings.modeId === "timed-view" && (
          <label>
            View time: {lobby.settings.viewTimeLimitSeconds ?? 10}s
            <input
              disabled={!isHost}
              type="range"
              min={0.1}
              max={60}
              step={0.1}
              value={lobby.settings.viewTimeLimitSeconds ?? 10}
              onChange={(event) => onSettingsChange({ viewTimeLimitSeconds: clampTimedViewSeconds(Number(event.target.value)) })}
            />
          </label>
        )}
        <label className="sound-toggle">
          <input disabled={!isHost} type="checkbox" checked={lobby.settings.allowMove} onChange={(event) => onSettingsChange({ allowMove: event.target.checked })} />
          Movement allowed
        </label>
        {isHost && (
          <RetroButton type="button" onClick={onStart} disabled={loading || lobby.players.filter((player) => player.connected && !player.removedAt).length === 0}>
            {loading ? "Preparing Rounds..." : "Start Competition"}
          </RetroButton>
        )}
      </section>
    </main>
  );
}
