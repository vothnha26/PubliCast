import React from "react";
import { useYouTubePresetComposer } from "../../../../hooks/presets/useYouTubePresetComposer";
import { YouTubePresetFields } from "./fields/YouTubePresetFields";

export function YouTubePresets() {
  const preset = useYouTubePresetComposer();
  return <YouTubePresetFields preset={preset} />;
}
