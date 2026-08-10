import React from "react";
import { useThreadsPresetComposer } from "../../../../hooks/presets/useThreadsPresetComposer";
import { ThreadsPresetFields } from "./fields/ThreadsPresetFields";

/**
 * Composer-side wrapper — kept as this filename/export so PRESET_REGISTRY
 * and NetworkCustomizeScreen.jsx don't need any changes. The actual form UI
 * now lives in ThreadsPresetFields.jsx, shared with AutoList's
 * useThreadsPresetAutoList adapter.
 */
export function ThreadsPresets() {
  const preset = useThreadsPresetComposer();
  return <ThreadsPresetFields preset={preset} />;
}
