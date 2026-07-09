import React, { useState, useRef } from 'react';
import { X, Calendar, Upload, Loader2 } from 'lucide-react';
import apiService from '@/services/api';
import { toast } from 'sonner';

export function IcsImportModal({ isOpen, onClose, activeBrand, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.ics')) {
      setFile(droppedFile);
    } else {
      toast.error('Please upload a valid .ics file');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.ics')) {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a valid .ics file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !activeBrand) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brandId', activeBrand.id);

    try {
      const res = await apiService.post('/calendar-events/import-ics', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Imported calendar events successfully!');
      if (onImportSuccess) onImportSuccess();
      onClose();
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to import ICS file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#0A0A0A]" />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Import Google Calendar (.ics)</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDragOver ? 'border-[#0A0A0A] bg-gray-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".ics"
              className="hidden"
            />
            
            <div className="p-3 bg-gray-50 rounded-full text-gray-400">
              <Upload size={20} />
            </div>

            {file ? (
              <div className="text-center space-y-1">
                <p className="text-xs font-black text-gray-900 truncate max-w-[280px]">{file.name}</p>
                <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB - Click to replace</p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-gray-700">Drag & drop your .ics file here</p>
                <p className="text-[10px] text-gray-400">or click to browse from device</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400 leading-normal">
            * Supports standard iCalendar format (.ics) exported from Google Calendar, Outlook, or Apple Calendar.
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-600 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="px-4 py-2 bg-[#0A0A0A] text-white hover:bg-black disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              <span>Import Events</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
