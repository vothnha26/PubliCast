import React from "react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { useFacebookPresetComposer } from "../../../../hooks/presets/useFacebookPresetComposer";
import { FacebookPresetFields } from "./fields/FacebookPresetFields";

export function FacebookPresets() {
  const { facebookType } = usePostCreatorFormContext();
  const preset = useFacebookPresetComposer();
  return <FacebookPresetFields preset={preset} contentType={facebookType} />;
}
