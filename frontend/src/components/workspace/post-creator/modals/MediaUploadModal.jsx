import * as React from "react";
import { useState, useRef } from "react";
import { X, Upload, Link2, File, Image as ImageIcon, Video, CheckCircle2, Loader2, Search, Folder, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { uploadMediaFile } from "../../../../services/mediaUpload.service";
import { useMediaLibrary } from "../../../../hooks/useMediaLibrary";

import { 
  MEDIA_FILTER_TYPES, 
  resolveMediaAcceptString, 
  resolveMediaPromptText 
} from "../../../../constants/mediaAcceptStrategy";

export function MediaUploadModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  brandId, 
  initialTab = "computer", 
  multiple = false, 
  mediaTypeFilter = MEDIA_FILTER_TYPES.ALL 
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'computer' | 'url' | 'library'
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileUrlInput, setFileUrlInput] = useState("");
  const [fileUrlsInput, setFileUrlsInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Library management using custom hook
  const {
    filters,
    updateFilters,
    searchTerm,
    setSearchTerm,
    loading: isLoadingLibrary,
    filteredMedia: libraryFiles,
    folders,
    loadingFolders
  } = useMediaLibrary();

  // Strategy-driven filter update without if-else branching
  React.useEffect(() => {
    if (isOpen) {
      const targetFilterType = MEDIA_FILTER_TYPES[mediaTypeFilter.toUpperCase()] || mediaTypeFilter;
      updateFilters({ type: targetFilterType });
    }
  }, [isOpen, mediaTypeFilter, updateFilters]);

  const [selectedLibraryFile, setSelectedLibraryFile] = useState(null);
  const [selectedLibraryFiles, setSelectedLibraryFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Sync tab if initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Reset states on open/close
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setSelectedFiles([]);
      setSelectedLibraryFile(null);
      setSelectedLibraryFiles([]);
      setFileUrlInput("");
      setFileUrlsInput("");
      setUploadProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple) {
        const files = Array.from(e.dataTransfer.files);
        setSelectedFiles(prev => [...prev, ...files]);
      } else {
        setSelectedFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
      } else {
        setSelectedFile(e.target.files[0]);
      }
    }
  };

  const handleSelectLibraryItem = (file) => {
    if (multiple) {
      setSelectedLibraryFiles(prev => {
        const exists = prev.some(item => item.id === file.id);
        if (exists) {
          return prev.filter(item => item.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
    } else {
      setSelectedLibraryFile(file);
    }
  };

  const handleAccept = async () => {
    if (activeTab === "computer") {
      if (multiple) {
        if (selectedFiles.length === 0) {
          toast.error("Please select at least one file");
          return;
        }
        // Hoãn upload: Tạo previewUrl blob: đồng bộ, path = null (sẽ upload khi Submit)
        const items = selectedFiles.map((file) => ({
          file,
          path: null,
          previewUrl: URL.createObjectURL(file),
        }));
        onAccept(items);
        onClose();
        setSelectedFiles([]);
      } else {
        if (!selectedFile) {
          toast.error("Please select a file first");
          return;
        }
        
        setIsUploading(true);
        setUploadProgress(0);
        const toastId = toast.loading(`Preparing ${selectedFile.name}...`);

        try {
          toast.loading(`Uploading ${selectedFile.name}... 0%`, { id: toastId });

          const finalUrl = await uploadMediaFile(selectedFile, brandId, (percent) => {
            setUploadProgress(percent);
            toast.loading(`Uploading ${selectedFile.name}... ${percent}%`, { id: toastId });
          });

          onAccept(selectedFile, finalUrl);
          toast.success("File uploaded successfully", { id: toastId });
          onClose();
          setSelectedFile(null);
        } catch (err) {
          const errorMessage = err.response?.data?.message || err.message || "Failed to upload file";
          toast.error(errorMessage, { id: toastId });
          console.error(err);
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    } else if (activeTab === "library") {
      if (multiple) {
        if (selectedLibraryFiles.length === 0) {
          toast.error("Please select at least one file from the library");
          return;
        }
        const items = selectedLibraryFiles.map(file => ({
          file: null,
          path: file.url,
          previewUrl: file.thumbnail || file.url
        }));
        onAccept(items);
        toast.success(`${items.length} file(s) selected from library`);
        onClose();
        setSelectedLibraryFiles([]);
      } else {
        if (!selectedLibraryFile) {
          toast.error("Please select a file from the library");
          return;
        }
        onAccept(null, selectedLibraryFile.url);
        toast.success("File selected from library");
        onClose();
        setSelectedLibraryFile(null);
      }
    } else {
      if (multiple) {
        const urls = fileUrlsInput
          .split("\n")
          .map(url => url.trim())
          .filter(url => url.length > 0);

        if (urls.length === 0) {
          toast.error("Please enter at least one URL");
          return;
        }

        const invalidUrl = urls.find(url => !url.startsWith("http://") && !url.startsWith("https://"));
        if (invalidUrl) {
          toast.error(`Invalid URL: ${invalidUrl}. Must start with http:// or https://`);
          return;
        }

        const items = urls.map(url => ({
          file: null,
          path: url,
          previewUrl: url
        }));

        onAccept(items);
        toast.success(`${items.length} media link(s) accepted`);
        onClose();
        setFileUrlsInput("");
      } else {
        if (!fileUrlInput.trim()) {
          toast.error("Please enter a valid URL");
          return;
        }
        if (!fileUrlInput.startsWith("http://") && !fileUrlInput.startsWith("https://")) {
          toast.error("URL must start with http:// or https://");
          return;
        }
        
        onAccept(null, fileUrlInput.trim());
        toast.success("Media link accepted");
        onClose();
        setFileUrlInput("");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-[560px] w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#2D1D35] hover:bg-black text-white flex items-center justify-center shadow-md transition-all cursor-pointer z-50 group"
        >
          <X size={16} className="group-hover:rotate-90 transition-transform duration-300 text-yellow-300" />
        </button>

        {/* Modal Title */}
        <div className="pt-6 px-6 pb-4">
          <h2 className="text-xl font-bold text-gray-800">Media upload</h2>
        </div>

        {/* Custom Tab Header */}
        <div className="bg-[#2D1D35] flex items-end px-4 h-12 gap-1">
          {[
            { id: 'computer', label: 'Computer', icon: <Upload size={14} /> },
            { id: 'library', label: 'Library', icon: <ImageIcon size={14} /> },
            { id: 'url', label: 'URL', icon: <Link2 size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-gray-800"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 min-h-[260px] flex flex-col justify-center">
          
          {activeTab === "computer" && (
            <div className="space-y-4">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] ${
                  dragActive 
                    ? "border-[#2D1D35] bg-purple-50/30" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept={resolveMediaAcceptString(mediaTypeFilter)} 
                  multiple={multiple}
                  className="hidden" 
                />
                
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mx-auto">
                    <Upload size={20} />
                  </div>
                  <p className="text-xs font-bold text-gray-500">
                    {resolveMediaPromptText(mediaTypeFilter)}
                  </p>
                </div>
              </div>

              {multiple && selectedFiles.length > 0 && (
                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Selected Files ({selectedFiles.length})
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm text-xs font-bold text-gray-700">
                      <div className="flex items-center gap-2 truncate max-w-[320px]">
                        {file.type.startsWith("image/") ? (
                          <ImageIcon size={14} className="text-purple-600" />
                        ) : (
                          <Video size={14} className="text-blue-500" />
                        )}
                        <span className="truncate">{file.name}</span>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!multiple && selectedFile && (
                <div className="space-y-3 p-4 border border-gray-100 rounded-2xl bg-gray-50/50 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-[#2D1D35] mx-auto">
                    {selectedFile.type.startsWith("image/") ? (
                      <ImageIcon size={24} />
                    ) : (
                      <Video size={24} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 truncate max-w-[280px] mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">
                    <CheckCircle2 size={12} />
                    Selected Successfully
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "library" && (
            <div className="w-full flex flex-col gap-4">
              {/* Library Toolbar */}
              <div className="flex items-center gap-3">
                 <div className="relative flex-1">
                   <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input 
                     placeholder="Search library..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium focus:bg-white focus:border-purple-200 outline-none transition-all"
                   />
                 </div>
              </div>

              {/* Breadcrumbs for folder navigation */}
              {filters.folderId && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                   <button 
                     onClick={() => updateFilters({ folderId: null })}
                     className="hover:text-purple-600 transition-colors cursor-pointer"
                   >
                     Media Library
                   </button>
                   <ChevronLeft size={10} className="rotate-180" />
                   <span className="text-gray-800">Folder</span>
                </div>
              )}

              {isLoadingLibrary || loadingFolders ? (
                <div className="flex items-center justify-center py-20">
                   <Loader2 size={24} className="animate-spin text-purple-600" />
                </div>
              ) : libraryFiles.length === 0 && folders.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No results found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1 scrollbar-thin pr-2">
                   {/* Render Folders first (only if not searching) */}
                   {!searchTerm && folders.map((folder) => (
                     <button
                       key={folder.id}
                       onClick={() => updateFilters({ folderId: folder.id })}
                       className="aspect-square rounded-2xl bg-white border border-gray-100 p-3 flex flex-col items-center justify-center gap-2 hover:border-purple-200 hover:shadow-md transition-all group cursor-pointer"
                     >
                        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                           <Folder size={20} fill="currentColor" fillOpacity={0.2} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center">{folder.name}</span>
                     </button>
                   ))}

                   {/* Render Media Files */}
                   {libraryFiles.map(file => {
                     const isSelected = multiple
                       ? selectedLibraryFiles.some(item => item.id === file.id)
                       : selectedLibraryFile?.id === file.id;

                     return (
                       <button
                         key={file.id}
                         onClick={() => handleSelectLibraryItem(file)}
                         className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative group ${
                           isSelected ? 'border-purple-600 ring-4 ring-purple-100' : 'border-transparent hover:border-gray-200'
                         }`}
                       >
                          {file.thumbnail ? (
                            <img src={file.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center text-3xl">
                               {file.emoji}
                            </div>
                          )}
                          
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                               <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                 <CheckCircle2 size={16} className="text-white" />
                               </div>
                            </div>
                          )}

                          {file.type === 'video' && (
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded text-[8px] font-black text-white uppercase tracking-tighter">
                              Video
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-[9px] font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity">
                             {file.name}
                          </div>
                       </button>
                     );
                   })}
                </div>
              )}
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  {multiple ? "Media URL Links (one per line)" : "Media URL Link"}
                </label>
                <div className="relative">
                  {multiple ? (
                    <textarea
                      value={fileUrlsInput}
                      onChange={(e) => setFileUrlsInput(e.target.value)}
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none resize-none min-h-[100px]"
                    />
                  ) : (
                    <input
                      type="url"
                      value={fileUrlInput}
                      onChange={(e) => setFileUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none"
                    />
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-medium leading-normal">
                  {multiple 
                    ? "Provide direct URLs to photos (.png, .jpg) or videos (.mp4), each on a separate line."
                    : "Provide a direct URL to a photo (.png, .jpg) or video (.mp4)."}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="px-6 pb-3 -mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Uploading...</span>
              <span className="text-[10px] font-black text-gray-600">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2D1D35] rounded-full transition-[width] duration-200 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-black border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isUploading}
            className="px-6 py-2.5 text-xs font-bold bg-[#2D1D35] hover:bg-black text-yellow-300 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? `Uploading ${uploadProgress}%` : "Accept"}
          </button>
        </div>

      </div>
    </div>
  );
}
