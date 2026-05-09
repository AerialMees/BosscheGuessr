import { useCallback, useEffect, useState } from "react";
import { FinalResults } from "./components/FinalResults";
import { GameScreen } from "./components/GameScreen";
import { GuessMap } from "./components/GuessMap";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { ModeSelectScreen } from "./components/ModeSelectScreen";
import { CreateLobbyScreen } from "./components/multiplayer/CreateLobbyScreen";
import { HostLobbyScreen } from "./components/multiplayer/HostLobbyScreen";
import { JoinMultiplayerScreen } from "./components/multiplayer/JoinMultiplayerScreen";
import { MultiplayerGameScreen } from "./components/multiplayer/MultiplayerGameScreen";
import { MultiplayerResultsScreen } from "./components/multiplayer/MultiplayerResultsScreen";
import { RoundResultOverlay } from "./components/RoundResultOverlay";
import { SoundDock } from "./components/SoundDock";
import { modes } from "./data/modes";
import { concreteZoneIds, zones } from "./data/zones";
import { distanceMeters } from "./lib/geo";
import { loadGoogleMaps, setGoogleMapsAuthFailureHandler } from "./lib/googleMapsLoader";
import { explainGoogleMapsError } from "./lib/googleMapsDiagnostics";
import { createLeaderboardEntry, getLeaderboard, saveLeaderboardEntry } from "./lib/leaderboard";
import { calculateScore, ratingForDistance } from "./lib/scoring";
import { findRandomPanoramaInZone } from "./lib/streetView";
import { pickRandom } from "./lib/random";
import { getSocket, type SocketResponse } from "./lib/socket";
import type { ConcreteZoneId, CurrentRound, GameState, LatLngLiteral, LeaderboardEntry, ModeId, ZoneId } from "./types/game";
import type { GoogleMapsLoadError } from "./lib/googleMapsDiagnostics";
import type { MultiplayerLobbyState, MultiplayerSettings, PreparedRound, RoundResultPayload } from "./shared/types";
import { sound } from "./lib/sound";

const initialState: GameState = {
  status: "home",
  selectedZoneId: "empel",
  selectedMode: "classic",
  viewSeconds: 10,
  playerName: "PLAYER 1",
  currentRoundIndex: 0,
  totalRounds: modes.classic.rounds,
  totalScore: 0,
  usedPanoIds: new Set<string>(),
  roundResults: [],
};

type EntryMode = "menu" | "single" | "host" | "join" | "multiplayer";

export default function App() {
  const initialLobbyCode = new URLSearchParams(window.location.search).get("lobby")?.toUpperCase() ?? "";
  const [entryMode, setEntryMode] = useState<EntryMode>(initialLobbyCode ? "join" : "menu");
  const [game, setGame] = useState<GameState>(initialState);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [finalEntry, setFinalEntry] = useState<LeaderboardEntry | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<GoogleMapsLoadError | undefined>();
  const [multiplayerLobby, setMultiplayerLobby] = useState<MultiplayerLobbyState | null>(null);
  const [multiplayerPlayerId, setMultiplayerPlayerId] = useState<string | undefined>();
  const [multiplayerError, setMultiplayerError] = useState<string | undefined>();
  const [multiplayerResults, setMultiplayerResults] = useState<RoundResultPayload | undefined>();
  const [multiplayerLoading, setMultiplayerLoading] = useState(false);

  const selectRoundZone = useCallback((selectedZoneId: ZoneId): ConcreteZoneId => {
    return selectedZoneId === "mixed" ? pickRandom(concreteZoneIds) : selectedZoneId;
  }, []);

  useEffect(() => {
    if (entryMode !== "host" && entryMode !== "join" && entryMode !== "multiplayer") return;
    const socket = getSocket();
    const handleLobbyState = (state: MultiplayerLobbyState) => {
      setMultiplayerLobby(state);
      setEntryMode("multiplayer");
      if (state.status === "in-round") setMultiplayerResults(undefined);
    };
    const handleLobbyError = (message: string) => setMultiplayerError(message);
    const handleRoundResults = (payload: RoundResultPayload) => {
      setMultiplayerResults(payload);
      sound.playGoodScore();
    };
    const handleConnectError = () => {
      setMultiplayerError("Could not connect to the BosscheGuessr multiplayer server. Run npm run dev and make sure the server is reachable on this network.");
    };

    socket.on("lobby:state", handleLobbyState);
    socket.on("lobby:error", handleLobbyError);
    socket.on("round:results", handleRoundResults);
    socket.on("connect_error", handleConnectError);
    return () => {
      socket.off("lobby:state", handleLobbyState);
      socket.off("lobby:error", handleLobbyError);
      socket.off("round:results", handleRoundResults);
      socket.off("connect_error", handleConnectError);
    };
  }, [entryMode]);

  const startRound = useCallback(
    async (state: GameState) => {
      setGame((current) => ({ ...current, status: "loading-round", errorMessage: undefined }));
      try {
        await loadGoogleMaps();
        setMapsLoaded(true);
        setMapsError(undefined);
        const zoneId = selectRoundZone(state.selectedZoneId);
        const location = await findRandomPanoramaInZone(zones[zoneId], { usedPanoIds: state.usedPanoIds });
        const currentRound: CurrentRound = {
          ...location,
          roundNumber: state.currentRoundIndex + 1,
          zoneId,
        };
        setGame((current) => ({
          ...current,
          status: "playing",
          currentRound,
          usedPanoIds: new Set([...current.usedPanoIds, location.panoId]),
        }));
        sound.playRoundStart();
      } catch (error) {
        const mappedError = explainGoogleMapsError(error);
        setMapsError(mappedError);
        setGame((current) => ({
          ...current,
          status: "home",
          errorMessage: mappedError.message,
        }));
      }
    },
    [selectRoundZone],
  );

  function startGame(options: { playerName: string; zoneId: ZoneId; modeId: ModeId; viewSeconds: number }) {
    const mode = modes[options.modeId];
    const nextState: GameState = {
      ...initialState,
      status: "loading-round",
      playerName: options.playerName,
      selectedZoneId: options.zoneId,
      selectedMode: options.modeId,
      viewSeconds: options.viewSeconds,
      totalRounds: mode.rounds,
      usedPanoIds: new Set<string>(),
    };
    setFinalEntry(null);
    setGame(nextState);
    void startRound(nextState);
  }

  function submitGuess(guessLocation: LatLngLiteral, timeRemainingSeconds?: number | null) {
    if (!game.currentRound) return;
    const distance = distanceMeters(guessLocation, game.currentRound.actualLocation);
    const scoringScaleMeters = game.selectedZoneId === "mixed" ? 1000 : zones[game.currentRound.zoneId].scoringScaleMeters;
    const score = calculateScore(distance, scoringScaleMeters ?? false, timeRemainingSeconds);
    const completedRound: CurrentRound = {
      ...game.currentRound,
      guessLocation,
      distanceMeters: distance,
      score,
      rating: ratingForDistance(distance),
    };
    setGame((current) => ({
      ...current,
      status: "round-result",
      currentRound: completedRound,
      totalScore: current.totalScore + score,
      roundResults: [
        ...current.roundResults,
        {
          roundNumber: completedRound.roundNumber,
          zoneId: completedRound.zoneId,
          distanceMeters: distance,
          score,
        },
      ],
    }));
    sound.playSubmitGuess();
    if (distance <= 25) sound.playPerfectScore();
    else if (score > 3500) sound.playGoodScore();
    else if (score < 1000) sound.playBadScore();
  }

  function nextRound() {
    const isFinalRound = game.currentRoundIndex + 1 >= game.totalRounds;
    if (isFinalRound) {
      const entry = createLeaderboardEntry({
        playerName: game.playerName,
        totalScore: game.totalScore,
        mode: game.selectedMode,
        zone: game.selectedZoneId,
        rounds: game.totalRounds,
        viewSeconds: game.selectedMode === "timed-view" ? game.viewSeconds : undefined,
        roundResults: game.roundResults,
      });
      const entries = saveLeaderboardEntry(entry);
      setLeaderboard(entries);
      setFinalEntry(entry);
      setGame((current) => ({ ...current, status: "game-over" }));
      sound.playGameOver();
      return;
    }

    const nextState = { ...game, currentRoundIndex: game.currentRoundIndex + 1, currentRound: undefined };
    setGame(nextState);
    void startRound(nextState);
  }

  function resetView() {
    if (!game.currentRound) return;
    setGame((current) => ({ ...current, currentRound: current.currentRound ? { ...current.currentRound } : undefined }));
  }

  async function debugGenerate() {
    if (!game.currentRound) return;
    for (let i = 0; i < 10; i += 1) {
      console.log(await findRandomPanoramaInZone(zones[game.currentRound.zoneId], { usedPanoIds: game.usedPanoIds }));
    }
  }

  function createMultiplayerLobby(playerName: string) {
    setMultiplayerLoading(true);
    setMultiplayerError(undefined);
    void sound.unlock();
    const socket = getSocket();
    socket.timeout(6000).emit("lobby:create", { playerName }, (error: Error | null, response?: SocketResponse) => {
      setMultiplayerLoading(false);
      if (error || !response?.ok || !response.state || !response.playerId) {
        setMultiplayerError(response?.error ?? "Could not create a lobby. Is the multiplayer server running?");
        return;
      }
      setMultiplayerPlayerId(response.playerId);
      setMultiplayerLobby(response.state);
      setEntryMode("multiplayer");
      sound.playStartGame();
    });
  }

  function joinMultiplayerLobby(playerName: string, code: string) {
    setMultiplayerLoading(true);
    setMultiplayerError(undefined);
    void sound.unlock();
    const socket = getSocket();
    socket.timeout(6000).emit("lobby:join", { playerName, code }, (error: Error | null, response?: SocketResponse) => {
      setMultiplayerLoading(false);
      if (error || !response?.ok || !response.state || !response.playerId) {
        setMultiplayerError(response?.error ?? "Could not join that lobby. Check the code and network.");
        return;
      }
      setMultiplayerPlayerId(response.playerId);
      setMultiplayerLobby(response.state);
      setEntryMode("multiplayer");
      sound.playStartGame();
    });
  }

  function updateMultiplayerSettings(settingsPatch: Partial<MultiplayerSettings>) {
    if (!multiplayerLobby) return;
    getSocket().emit("lobby:update-settings", { code: multiplayerLobby.code, settingsPatch });
  }

  async function startMultiplayerGame() {
    if (!multiplayerLobby) return;
    setMultiplayerLoading(true);
    setMultiplayerError(undefined);
    try {
      await loadGoogleMaps();
      setMapsLoaded(true);
      const preparedRounds = await prepareMultiplayerRounds(multiplayerLobby.settings);
      getSocket().emit("game:start", { code: multiplayerLobby.code, preparedRounds });
      sound.playStartGame();
    } catch (error) {
      const mappedError = explainGoogleMapsError(error);
      setMapsError(mappedError);
      setMultiplayerError(mappedError.message);
    } finally {
      setMultiplayerLoading(false);
    }
  }

  function submitMultiplayerGuess(roundId: string, guessLocation: LatLngLiteral) {
    if (!multiplayerLobby) return;
    getSocket().emit("round:submit-guess", { code: multiplayerLobby.code, roundId, guessLocation });
    sound.playSubmitGuess();
  }

  function nextMultiplayerRound() {
    if (!multiplayerLobby) return;
    setMultiplayerResults(undefined);
    getSocket().emit("round:next", { code: multiplayerLobby.code });
    sound.playRoundStart();
  }

  function leaveMultiplayer() {
    if (multiplayerLobby) {
      getSocket().emit("lobby:leave", { code: multiplayerLobby.code });
    }
    setMultiplayerLobby(null);
    setMultiplayerPlayerId(undefined);
    setMultiplayerResults(undefined);
    setMultiplayerError(undefined);
    setMultiplayerLoading(false);
    setEntryMode("menu");
  }

  async function prepareMultiplayerRounds(settings: MultiplayerSettings): Promise<PreparedRound[]> {
    const usedPanoIds = new Set<string>();
    const selectedZoneId = normalizePlayableZoneId(settings.zoneId);
    const rounds: PreparedRound[] = [];
    for (let index = 0; index < settings.rounds; index += 1) {
      const zoneId = selectRoundZone(selectedZoneId);
      const location = await findRandomPanoramaInZone(zones[zoneId], { usedPanoIds });
      usedPanoIds.add(location.panoId);
      rounds.push({
        zoneId,
        panoId: location.panoId,
        actualLocation: location.actualLocation,
        initialPov: location.initialPov,
      });
    }
    return rounds;
  }

  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, [finalEntry]);

  useEffect(() => {
    setGoogleMapsAuthFailureHandler((error) => {
      setMapsLoaded(false);
      setMapsError(error);
      setGame((current) => ({ ...current, status: "home", errorMessage: error.message }));
    });
  }, []);

  if (entryMode === "menu") {
    return (
      <>
        <ModeSelectScreen
          onSinglePlayer={() => setEntryMode("single")}
          onHost={() => {
            setMultiplayerError(undefined);
            setEntryMode("host");
          }}
          onJoin={() => {
            setMultiplayerError(undefined);
            setEntryMode("join");
          }}
        />
        <SoundDock />
      </>
    );
  }

  if (entryMode === "host") {
    return (
      <>
        <CreateLobbyScreen
          onCreate={createMultiplayerLobby}
          onBack={() => setEntryMode("menu")}
          error={multiplayerLoading ? "Creating lobby..." : multiplayerError}
        />
        <SoundDock />
      </>
    );
  }

  if (entryMode === "join") {
    return (
      <>
        <JoinMultiplayerScreen
          initialCode={initialLobbyCode}
          onJoin={joinMultiplayerLobby}
          onBack={() => setEntryMode("menu")}
          error={multiplayerLoading ? "Joining lobby..." : multiplayerError}
        />
        <SoundDock />
      </>
    );
  }

  if (entryMode === "multiplayer") {
    if (!multiplayerLobby) {
      return (
        <>
          <LoadingScreen message="Opening multiplayer lobby..." />
          <SoundDock />
        </>
      );
    }

    if (multiplayerLobby.status === "waiting") {
      return (
        <>
          <HostLobbyScreen
            lobby={multiplayerLobby}
            playerId={multiplayerPlayerId}
            loading={multiplayerLoading}
            onSettingsChange={updateMultiplayerSettings}
            onStart={startMultiplayerGame}
            onBack={leaveMultiplayer}
          />
          <SoundDock />
        </>
      );
    }

    if (multiplayerLobby.status === "in-round") {
      return (
        <>
          <MultiplayerGameScreen lobby={multiplayerLobby} playerId={multiplayerPlayerId} onSubmitGuess={submitMultiplayerGuess} />
          <SoundDock />
        </>
      );
    }

    return (
      <>
        <MultiplayerResultsScreen
          lobby={multiplayerLobby}
          results={multiplayerResults}
          playerId={multiplayerPlayerId}
          onNextRound={nextMultiplayerRound}
          onLeave={leaveMultiplayer}
        />
        <SoundDock />
      </>
    );
  }

  if (game.status === "loading-round") {
    return (
      <>
        <LoadingScreen />
        <SoundDock />
      </>
    );
  }
  if (game.status === "playing" && game.currentRound) {
    return (
      <>
        <GameScreen
          round={game.currentRound}
          modeId={game.selectedMode}
          viewSeconds={game.viewSeconds}
          totalRounds={game.totalRounds}
          totalScore={game.totalScore}
          onSubmitGuess={submitGuess}
          onResetView={resetView}
          onDebugGenerate={debugGenerate}
        />
        <SoundDock />
      </>
    );
  }
  if (game.status === "round-result" && game.currentRound) {
    return (
      <>
        <main className="game-screen">
          <div className="result-map-shell">
            <GuessMap
              zoneId={game.currentRound.zoneId}
              guessLocation={game.currentRound.guessLocation}
              actualLocation={game.currentRound.actualLocation}
              onGuessChange={() => undefined}
              onSubmit={() => undefined}
              resultMode
            />
          </div>
          <RoundResultOverlay
            round={game.currentRound}
            isFinalRound={game.currentRoundIndex + 1 >= game.totalRounds}
            onNext={nextRound}
          />
        </main>
        <SoundDock />
      </>
    );
  }
  if (game.status === "game-over" && finalEntry) {
    return (
      <>
        <FinalResults
          entry={finalEntry}
          leaderboard={leaderboard}
          onPlayAgain={() => setGame(initialState)}
          onLeaderboardChanged={() => setLeaderboard(getLeaderboard())}
        />
        <SoundDock />
      </>
    );
  }

  return (
    <>
      <HomeScreen onStart={startGame} mapsLoaded={mapsLoaded} mapsError={mapsError} onBackToMenu={() => setEntryMode("menu")} />
      <SoundDock />
    </>
  );
}

function normalizePlayableZoneId(zoneId: string): ZoneId {
  if (zoneId === "mixed") return "mixed";
  return zoneId in zones ? (zoneId as ConcreteZoneId) : "den-bosch";
}
