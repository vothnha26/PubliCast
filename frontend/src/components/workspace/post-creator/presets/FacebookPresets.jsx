import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { FACEBOOK_TYPE } from "../../../../constants/postTypes";

export function FacebookPresets() {
  const { t } = useTranslation(["planner"]);
  const {
    facebookOpen,
    setFacebookOpen,
    facebookType,
    facebookTitle,
    setFacebookTitle,
    facebookReelCollaboratorId,
    setFacebookReelCollaboratorId,
    facebookReelPlaceId,
    setFacebookReelPlaceId,
    facebookReelThumbnail,
    setFacebookReelThumbnail
  } = usePostCreatorFormContext();

  return (
    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
      <div 
        onClick={() => setFacebookOpen(!facebookOpen)}
        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <svg className="w-[18px] h-[18px] text-[#1877F2] fill-[#1877F2]" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-[12px] font-bold text-gray-700 font-sans">{t("planner:postCreator.presets.facebook.title")}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${facebookOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${facebookOpen ? 'max-h-[600px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">{t("planner:postCreator.presets.facebook.titleLabel")}</label>
            <input 
              type="text"
              value={facebookTitle}
              onChange={(e) => setFacebookTitle(e.target.value)}
              placeholder={t("planner:postCreator.presets.facebook.titlePlaceholder")}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
            />
          </div>

          {facebookType === FACEBOOK_TYPE.REEL && (
            <>
              {/* Custom Thumbnail URL */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">{t("planner:postCreator.presets.facebook.customThumbnailUrl")}</label>
                <input 
                  type="text"
                  value={facebookReelThumbnail}
                  onChange={(e) => setFacebookReelThumbnail(e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
                />
              </div>

              {/* Collaborator Page ID */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">{t("planner:postCreator.presets.facebook.collaboratorPageId")}</label>
                <input 
                  type="text"
                  value={facebookReelCollaboratorId}
                  onChange={(e) => setFacebookReelCollaboratorId(e.target.value)}
                  placeholder="e.g., 1029384756"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
                />
              </div>

              {/* Place ID */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">{t("planner:postCreator.presets.facebook.placeId")}</label>
                <input 
                  type="text"
                  value={facebookReelPlaceId}
                  onChange={(e) => setFacebookReelPlaceId(e.target.value)}
                  placeholder="e.g., 987654321"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
