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

  const targetAccountId = activeNetworkAccountId || (facebookAccounts.length === 1 ? facebookAccounts[0]?.id : null);

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
