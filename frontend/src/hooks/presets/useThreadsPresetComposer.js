import { usePostCreatorFormContext } from "../../context/PostCreatorFormContext";

/**
 * Composer-side adapter for ThreadsPresetFields — reads Post Composer's
 * shared form context and adapts it to the generic { value, onChange }
 * preset shape ThreadsPresetFields expects.
 */
export function useThreadsPresetComposer() {
  const { threadsOpen, setThreadsOpen, threadsWhoCanReply, setThreadsWhoCanReply } = usePostCreatorFormContext();

  return {
    isOpen: threadsOpen,
    onToggleOpen: () => setThreadsOpen(!threadsOpen),
    whoCanReply: { value: threadsWhoCanReply, onChange: setThreadsWhoCanReply },
  };
}
