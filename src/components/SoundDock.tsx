import { useState } from "react";
import { sound } from "../lib/sound";

export function SoundDock() {
  const [enabled, setEnabled] = useState(sound.enabled);
  const [volume, setVolume] = useState(sound.volume);

  return (
    <aside className="sound-dock" aria-label="Sound controls">
      <button
        type="button"
        className={`sound-dock-toggle ${enabled ? "sound-on" : "sound-off"}`}
        onClick={() => {
          const nextEnabled = !enabled;
          sound.setEnabled(nextEnabled);
          setEnabled(nextEnabled);
          if (nextEnabled) sound.playClick();
        }}
        title={enabled ? "Mute sound" : "Enable sound"}
      >
        {enabled ? "SOUND ON" : "SOUND OFF"}
      </button>
      <label className="sound-dock-volume">
        <span>VOL</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => {
            const nextVolume = Number(event.target.value);
            sound.setVolume(nextVolume);
            setVolume(sound.volume);
          }}
        />
      </label>
    </aside>
  );
}
