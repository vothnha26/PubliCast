import { usePostCreatorFormContext } from "../../context/PostCreatorFormContext";
import { PLATFORMS } from "../../constants/platforms";

export function useTikTokPresetComposer() {
  const {
    tiktokOpen,
    setTiktokOpen,
    tiktokPrivacy,
    setTiktokPrivacy,
    tiktokAllowComments,
    setTiktokAllowComments,
    tiktokAllowDuet,
    setTiktokAllowDuet,
    tiktokAllowStitch,
    setTiktokAllowStitch,
    tiktokAiGenerated,
    setTiktokAiGenerated,
    tiktokCommercialContent,
    setTiktokCommercialContent,
    selectedAccountIds,
    activeBrand,
    networkCustom,
    activeNetworkAccountId,
    updateNetworkSetting,
  } = usePostCreatorFormContext();

  const tiktokAccounts = (activeBrand?.socialAccounts || []).filter(
    sa => (sa.platform || '').toUpperCase() === PLATFORMS.TIKTOK.toUpperCase() && selectedAccountIds.includes(sa.id)
  );

  // accountId must be null for the single-account case — matches the
  // convention every other write path uses (updateNetworkMedia/
  // updateNetworkCaption). Falling back to the account's real id here
  // instead of null would write settings into entry.perAccount[id] while
  // media/caption stay on the top-level entry — buildNetworkOverrides's
  // effectiveEntryFor prefers perAccount[id] when present, so it would then
  // read that shadow slot's empty useTemplate/mediaUrls instead of the real
  // customized content.
  const targetAccountId = tiktokAccounts.length > 1 ? activeNetworkAccountId : null;

  const ttEntry = networkCustom?.[PLATFORMS.TIKTOK];
  const accountSettings = targetAccountId
    ? (ttEntry?.perAccount?.[targetAccountId]?.settings || ttEntry?.settings || {})
    : (ttEntry?.settings || {});

  const effectivePrivacy = accountSettings.privacy !== undefined ? accountSettings.privacy : tiktokPrivacy;
  const effectiveAllowComments = accountSettings.allowComments !== undefined ? accountSettings.allowComments : tiktokAllowComments;
  const effectiveAllowDuet = accountSettings.allowDuet !== undefined ? accountSettings.allowDuet : tiktokAllowDuet;
  const effectiveAllowStitch = accountSettings.allowStitch !== undefined ? accountSettings.allowStitch : tiktokAllowStitch;
  const effectiveAiGenerated = accountSettings.aiGenerated !== undefined ? accountSettings.aiGenerated : tiktokAiGenerated;
  const effectiveCommercialContent = accountSettings.commercialContent !== undefined ? accountSettings.commercialContent : tiktokCommercialContent;

  const handleSettingChange = (key, flatSetter, value) => {
    updateNetworkSetting(PLATFORMS.TIKTOK, key, value, targetAccountId);
    if (!targetAccountId && flatSetter) flatSetter(value);
  };

  return {
    isOpen: tiktokOpen,
    onToggleOpen: () => setTiktokOpen(!tiktokOpen),
    privacy: { value: effectivePrivacy, onChange: (v) => handleSettingChange('privacy', setTiktokPrivacy, v) },
    allowComments: { value: effectiveAllowComments, onChange: (v) => handleSettingChange('allowComments', setTiktokAllowComments, v) },
    allowDuet: { value: effectiveAllowDuet, onChange: (v) => handleSettingChange('allowDuet', setTiktokAllowDuet, v) },
    allowStitch: { value: effectiveAllowStitch, onChange: (v) => handleSettingChange('allowStitch', setTiktokAllowStitch, v) },
    aiGenerated: { value: effectiveAiGenerated, onChange: (v) => handleSettingChange('aiGenerated', setTiktokAiGenerated, v) },
    commercialContent: { value: effectiveCommercialContent, onChange: (v) => handleSettingChange('commercialContent', setTiktokCommercialContent, v) },
  };
}
