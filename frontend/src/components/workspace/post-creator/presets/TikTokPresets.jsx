import React from "react";
import { useTikTokPresetComposer } from "../../../../hooks/presets/useTikTokPresetComposer";
import { TikTokPresetFields } from "./fields/TikTokPresetFields";

export function TikTokPresets() {
  const preset = useTikTokPresetComposer();
  return <TikTokPresetFields preset={preset} />;
}
