import { usePostCreatorFormContext } from "../../context/PostCreatorFormContext";
import { PLATFORMS } from "../../constants/platforms";

export function useFacebookPresetComposer() {
  const {
    facebookOpen,
    setFacebookOpen,
    facebookTitle,
    setFacebookTitle,
    facebookReelThumbnail,
    setFacebookReelThumbnail,
    selectedAccountIds,
    activeBrand,
    networkCustom,
    activeNetworkAccountId,
    updateNetworkSetting,
  } = usePostCreatorFormContext();

  const facebookAccounts = (activeBrand?.socialAccounts || []).filter(
    sa => (sa.platform || '').toUpperCase() === PLATFORMS.FACEBOOK.toUpperCase() && selectedAccountIds.includes(sa.id)
  );

  // accountId must be null for the single-account case — matches the
  // convention every other write path uses (updateNetworkMedia/
  // updateNetworkCaption). Falling back to the account's real id here
  // instead of null would write settings into entry.perAccount[id] while
  // media/caption stay on the top-level entry — buildNetworkOverrides's
  // effectiveEntryFor prefers perAccount[id] when present, so it would then
  // read that shadow slot's empty useTemplate/mediaUrls instead of the real
  // customized content.
  const targetAccountId = facebookAccounts.length > 1 ? activeNetworkAccountId : null;

  const fbEntry = networkCustom?.[PLATFORMS.FACEBOOK];
  const accountSettings = targetAccountId
    ? (fbEntry?.perAccount?.[targetAccountId]?.settings || fbEntry?.settings || {})
    : (fbEntry?.settings || {});

  const effectiveTitle = accountSettings.title !== undefined ? accountSettings.title : facebookTitle;
  const effectiveReelThumbnail = accountSettings.reelThumbnail !== undefined ? accountSettings.reelThumbnail : facebookReelThumbnail;

  const handleSettingChange = (key, flatSetter, value) => {
    updateNetworkSetting(PLATFORMS.FACEBOOK, key, value, targetAccountId);
    if (!targetAccountId && flatSetter) flatSetter(value);
  };

  return {
    isOpen: facebookOpen,
    onToggleOpen: () => setFacebookOpen(!facebookOpen),
    title: { value: effectiveTitle, onChange: (v) => handleSettingChange('title', setFacebookTitle, v) },
    reelThumbnail: { value: effectiveReelThumbnail, onChange: (v) => handleSettingChange('reelThumbnail', setFacebookReelThumbnail, v) },
  };
}
