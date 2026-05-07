import { useCallback, useEffect, useState } from "react";
import { FinalResults } from "./components/FinalResults";
import { GameScreen } from "./components/GameScreen";
import { GuessMap } from "./components/GuessMap";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { RoundResultOverlay } from "./components/RoundResultOverlay";
import { modes } from "./data/modes";
import { concreteZoneIds, zones } from "./data/zones";
import { distanceMeters } from "./lib/geo";
import { loadGoogleMaps, setGoogleMapsAuthFailureHandler } from "./lib/googleMapsLoader";
import { explainGoogleMapsError } from "./lib/googleMapsDiagnostics";
import { createLeaderboardEntry, getLeaderboard, saveLeaderboardEntry } from "./lib/leaderboard";
import { calculateScore, ratingForDistance } from "./lib/scoring";
import { findRandomPanoramaInZone } from "./lib/streetView";
import { pickRandom } from "./lib/random";
import type { ConcreteZoneId, CurrentRound, GameState, LatLngLiteral, LeaderboardEntry, ModeId, ZoneId } from "./types/game";
import type { GoogleMapsLoadError } from "./lib/googleMapsDiagnostics";

const initialState: GameState = {
  status: "home",
  selectedZoneId: "empel",
  selectedMode: "classic",
  playerName: "PLAYER 1",
  currentRoundIndex: 0,
  totalRounds: modes.classic.rounds,
  totalScore: 0,
  usedPanoIds: new Set<string>(),
  roundResults: [],
};

export default function App() {
  const [game, setGame] = useState<GameState>(initialState);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [finalEntry, setFinalEntry] = useState<LeaderboardEntry | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<GoogleMapsLoadError | undefined>();

  const selectRoundZone = useCallback((selectedZoneId: ZoneId): ConcreteZoneId => {
    return selectedZoneId === "mixed" ? pickRandom(concreteZoneIds) : selectedZoneId;
  }, []);

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

  function startGame(options: { playerName: string; zoneId: ZoneId; modeId: ModeId }) {
    const mode = modes[options.modeId];
    const nextState: GameState = {
      ...initialState,
      status: "loading-round",
      playerName: options.playerName,
      selectedZoneId: options.zoneId,
      selectedMode: options.modeId,
      totalRounds: mode.rounds,
      usedPanoIds: new Set<string>(),
    };
    setFinalEntry(null);
    setGame(nextState);
    void startRound(nextState);
  }

  function submitGuess(guessLocation: LatLngLiteral) {
    if (!game.currentRound) return;
    const distance = distanceMeters(guessLocation, game.currentRound.actualLocation);
    const scoringScaleMeters = game.selectedZoneId === "mixed" ? 1000 : zones[game.currentRound.zoneId].scoringScaleMeters;
    const score = calculateScore(distance, scoringScaleMeters ?? false);
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
        roundResults: game.roundResults,
      });
      const entries = saveLeaderboardEntry(entry);
      setLeaderboard(entries);
      setFinalEntry(entry);
      setGame((current) => ({ ...current, status: "game-over" }));
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

  if (game.status === "loading-round") return <LoadingScreen />;
  if (game.status === "playing" && game.currentRound) {
    return (
      <GameScreen
        round={game.currentRound}
        modeId={game.selectedMode}
        totalRounds={game.totalRounds}
        totalScore={game.totalScore}
        onSubmitGuess={submitGuess}
        onResetView={resetView}
        onDebugGenerate={debugGenerate}
      />
    );
  }
  if (game.status === "round-result" && game.currentRound) {
    return (
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
    );
  }
  if (game.status === "game-over" && finalEntry) {
    return (
      <FinalResults
        entry={finalEntry}
        leaderboard={leaderboard}
        onPlayAgain={() => setGame(initialState)}
        onLeaderboardChanged={() => setLeaderboard(getLeaderboard())}
      />
    );
  }

  return <HomeScreen onStart={startGame} mapsLoaded={mapsLoaded} mapsError={mapsError} />;
}
