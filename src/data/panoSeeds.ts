import type { ConcreteZoneId } from "../types/game";

export interface PanoSeed {
  panoId: string;
  lat: number;
  lng: number;
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
}

export const panoSeeds: Record<ConcreteZoneId, PanoSeed[]> = {
  engelen: [],
  empel: [],
  rosmalen: [],
  kerkdriel: [],
};
