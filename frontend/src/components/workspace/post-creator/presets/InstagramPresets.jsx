import React from "react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { useInstagramPresetComposer } from "../../../../hooks/presets/useInstagramPresetComposer";
import { InstagramPresetFields } from "./fields/InstagramPresetFields";

export function InstagramPresets() {
  const { instagramType } = usePostCreatorFormContext();
  const preset = useInstagramPresetComposer();
  return <InstagramPresetFields preset={preset} instagramType={instagramType} />;
}
