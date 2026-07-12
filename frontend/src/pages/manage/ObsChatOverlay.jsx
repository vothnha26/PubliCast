import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import socketClient from '../../services/socket';

// SVG Icons chuẩn đồng bộ từ LivestreamChat
const YouTubeIcon = () => (
  <svg className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" fill="#FF0000"/>
    <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFF"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

export function ObsChatOverlay() {
  const { livestreamId } = useParams();
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!livestreamId) return;

    const token = localStorage.getItem('token') || 'dummy-token';
    socketClient.connect(token);

    socketClient.emit('join_livestream', { livestreamId });

    const handleNewComment = (comment) => {
      // Add comment with a unique temporary local id and expiration timestamp
      const localComment = {
        ...comment,
        localId: `${comment.id || Date.now()}-${Math.random()}`,
        visible: true
      };

      setComments((prev) => [...prev, localComment]);

      // Set timeout to hide the comment after 8 seconds (fade out)
      setTimeout(() => {
        setComments((prev) =>
          prev.map((c) => (c.localId === localComment.localId ? { ...c, visible: false } : c))
        );
      }, 8000);

      // Clean up fully removed comments from state after 9 seconds (after fade transition)
      setTimeout(() => {
        setComments((prev) => prev.filter((c) => c.localId !== localComment.localId));
      }, 9000);
    };

    socketClient.on('new_livestream_comment', handleNewComment);

    return () => {
      socketClient.emit('leave_livestream', { livestreamId });
      socketClient.off('new_livestream_comment', handleNewComment);
    };
  }, [livestreamId]);

  return (
    <div 
      className="fixed inset-0 flex flex-col justify-end p-5 pointer-events-none overflow-hidden" 
      style={{ background: 'transparent' }}
    >
      <div className="space-y-3 max-w-md w-full flex flex-col justify-end items-start transition-all duration-300">
        {comments.map((comment) => (
          <div
            key={comment.localId}
            className={`flex items-start bg-[#0F0F16]/95 border border-[#1A1A24] p-3 rounded-2xl shadow-2xl transition-all duration-500 transform ${
              comment.visible 
                ? 'opacity-100 translate-y-0 scale-100' 
                : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
            }`}
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
            }}
          >
            <img
              src={comment.authorAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.authorName}`}
              alt=""
              className="w-8 h-8 rounded-xl border border-[#2D2D3D] object-cover mr-3 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-0.5">
                {comment.platform === 'youtube' ? <YouTubeIcon /> : <FacebookIcon />}
                <span className="font-bold text-gray-100 text-xs truncate">
                  {comment.authorName}
                </span>
              </div>
              <p className="text-gray-300 text-sm font-medium leading-relaxed break-words">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ObsChatOverlay;
