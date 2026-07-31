import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User, BadgeCheck, Paperclip, File, Image as ImageIcon, History } from "lucide-react";
import { toast } from "sonner";
import ticketService from "../../services/ticket.service";
import socketClient from "../../services/socket";
import { useBrand } from "../../context/BrandContext";
import { useNavigate } from "react-router-dom";

export function SupportChat() {
  const { activeBrand } = useBrand();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Fetch current active session (ticket status: OPEN)
  const fetchActiveSession = async () => {
    if (!activeBrand) return;
    try {
      const activeTicket = await ticketService.getActiveTicket(activeBrand.id);
      if (activeTicket) {
        setTicket(activeTicket);
        
        // Map messages to view
        const formatted = (activeTicket.messages || []).map(m => ({
          id: m.id,
          role: (m.sender?.role === 'STAFF' || m.sender?.role === 'ADMIN') ? "agent" : "user",
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachment: m.attachmentUrl ? {
            name: m.attachmentUrl.split('/').pop(),
            type: m.messageType.toLowerCase(),
            isImage: m.messageType === 'IMAGE',
            url: m.attachmentUrl
          } : null
        }));

        if (!activeTicket.assignedAgentId && formatted.length > 0) {
          formatted.push({
            role: "system",
            text: "Hệ thống: Vui lòng đợi trong giây lát, nhân viên hỗ trợ đang được kết nối...",
            time: ""
          });
        }
        setMessages(formatted);
      } else {
        setTicket(null);
        setMessages([
          { role: "agent", text: "Chào bạn! 👋 Mình có thể hỗ trợ gì cho bạn hôm nay? Gửi tin nhắn để bắt đầu phiên hỗ trợ mới nhé.", time: "" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching active chat session:", err);
    }
  };

  useEffect(() => {
    if (activeBrand) {
      fetchActiveSession();
    }
  }, [activeBrand, isOpen]);

  // Connect to room & listen socket
  useEffect(() => {
    if (isOpen && ticket) {
      socketClient.emit('join_room', { ticketId: ticket.id });

      const handleNewMessage = (msg) => {
        if (msg.ticketId === ticket.id) {
          setMessages(prev => {
            // Avoid duplicate messages if already present
            if (prev.some(p => p.id === msg.id)) return prev;

            // Replace the temporary optimistic message for the user
            if (msg.sender === 'user') {
              const tempIndex = prev.findIndex(p => p.id && String(p.id).startsWith('temp-'));
              if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = {
                  id: msg.id,
                  role: 'user',
                  text: msg.text,
                  time: msg.time,
                  attachment: msg.attachment
                };
                return updated;
              }
            }

            // Append new message normally
            const updatedList = [...prev, {
              id: msg.id,
              role: msg.sender === 'user' ? 'user' : 'agent',
              text: msg.text,
              time: msg.time,
              attachment: msg.attachment
            }];

            // If it is from the agent, we can remove the system waiting message if still present
            if (msg.sender === 'staff') {
              return updatedList.filter(m => m.role !== 'system');
            }
            return updatedList;
          });
        }
      };

      const handleStatusUpdated = (payload) => {
        if (payload.ticketId === ticket.id && payload.status === 'RESOLVED') {
          toast.info("Phiên hỗ trợ này đã được đóng.");
          setTicket(null);
          setMessages([
            { role: "agent", text: "Phiên chat đã kết thúc. Bạn có thể xem lại lịch sử hỗ trợ trong Cài đặt.", time: "" }
          ]);
        }
      };

      const handleTicketAssigned = (payload) => {
        if (payload.ticketId === ticket.id) {
          setTicket(prev => prev && prev.id === payload.ticketId ? {
            ...prev,
            assignedAgentId: payload.assignedAgent.id,
            assignedAgent: payload.assignedAgent
          } : prev);

          setMessages(prev => {
            // Remove waiting system message and add active system message
            const filtered = prev.filter(m => m.role !== 'system');
            return [
              ...filtered,
              {
                role: "system",
                text: `Hệ thống: Nhân viên ${payload.assignedAgent.name} đã kết nối vào cuộc trò chuyện.`,
                time: ""
              }
            ];
          });
          toast.success(`Nhân viên ${payload.assignedAgent.name} đã nhận hỗ trợ phiên chat của bạn.`);
        }
      };

      socketClient.on('new_message', handleNewMessage);
      socketClient.on('ticket_status_updated', handleStatusUpdated);
      socketClient.on('ticket_assigned', handleTicketAssigned);

      return () => {
        socketClient.emit('leave_room', { ticketId: ticket.id });
        socketClient.off('new_message', handleNewMessage);
        socketClient.off('ticket_status_updated', handleStatusUpdated);
        socketClient.off('ticket_assigned', handleTicketAssigned);
      };
    }
  }, [isOpen, ticket]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text, attachmentUrl = null) => {
    if (!text.trim() && !attachmentUrl) return;
    if (!activeBrand) return;

    let currentTicket = ticket;

    try {
      // Create new support session if none exists
      if (!currentTicket) {
        currentTicket = await ticketService.createTicket(
          activeBrand.id,
          text.substring(0, 40) || 'Hỗ trợ khách hàng'
        );
        setTicket(currentTicket);
        // Clear default greeting message
        setMessages([]);
        socketClient.emit('join_room', { ticketId: currentTicket.id });
      }

      // Optimistic update local UI messages
      setMessages(prev => {
        const updated = [...prev, {
          id: 'temp-' + Date.now(),
          role: "user",
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachment: attachmentUrl ? {
            name: text,
            isImage: true,
            url: attachmentUrl
          } : null
        }];

        if (!currentTicket.assignedAgentId) {
          const filtered = updated.filter(m => m.role !== 'system');
          filtered.push({
            role: "system",
            text: "Hệ thống: Vui lòng đợi trong giây lát, nhân viên hỗ trợ đang được kết nối...",
            time: ""
          });
          return filtered;
        }
        return updated;
      });

      socketClient.emit('send_message', {
        ticketId: currentTicket.id,
        messageType: attachmentUrl ? 'IMAGE' : 'TEXT',
        content: text,
        attachmentUrl
      });
    } catch (err) {
      console.error("Failed to send support message:", err);
      toast.error("Không thể gửi tin nhắn hỗ trợ");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const handleSendAttachment = async (fileName, attachmentUrl) => {
    await sendMessage(fileName, attachmentUrl);
    // Attachment sends never touch the input box — whatever caption the
    // user was typing stays exactly as they left it.
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeBrand) return;

    setIsUploading(true);
    try {
      const { uploadMediaFile } = await import("../../services/mediaUpload.service");
      const url = await uploadMediaFile(file, activeBrand.id);
      if (url) {
        handleSendAttachment(file.name, url);
        toast.success("Đã gửi tệp đính kèm!");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Không thể tải lên tệp");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
           {/* Header */}
           <div className="bg-[#2D1D35] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center border-2 border-white/20">
                       <User size={20} />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2D1D35]" />
                 </div>
                 <div>
                    <div className="text-sm font-bold flex items-center gap-1">
                       Support Center <BadgeCheck size={14} className="text-blue-400" />
                    </div>
                    <div className="text-[10px] text-white/60">Phiên trực tuyến</div>
                 </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Lịch sử hỗ trợ button */}
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/settings?tab=support');
                  }} 
                  title="Lịch sử hỗ trợ"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <History size={18} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X size={20} /></button>
              </div>
           </div>

           {/* Conversation */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg, i) => {
                if (msg.role === "system") {
                  return (
                    <div key={i} className="flex justify-center my-2">
                      <span className="bg-amber-50 text-amber-800 text-[10px] px-3 py-1 rounded-full font-medium border border-amber-200/50 shadow-sm text-center max-w-[90%]">
                        {msg.text}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] space-y-1 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[#2D1D35] text-white rounded-tr-none shadow-sm' : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'}`}>
                          {msg.text && <div>{msg.text}</div>}
                          {msg.attachment && (
                            <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 border ${msg.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'}`}>
                               {msg.attachment.isImage ? <ImageIcon size={16} /> : <File size={16} />}
                               <span className="text-xs truncate max-w-[150px]">{msg.attachment.name}</span>
                            </div>
                          )}
                        </div>
                        {msg.time && <div className="text-[9px] text-gray-400 px-1">{msg.time}</div>}
                     </div>
                  </div>
                );
              })}
              {isUploading && (
                <div className="flex justify-end">
                   <div className="bg-[#2D1D35]/5 px-3 py-2 rounded-lg border border-dashed border-gray-300 flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-gray-500 font-medium">Uploading file...</span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2">
                 <div className="relative flex-1">
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Nhập tin nhắn..." 
                      className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-pink-500 focus:bg-white outline-none text-sm transition-all" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors"
                    >
                       <Paperclip size={18} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                 </div>
                 <button 
                   onClick={() => handleSend()}
                   className="p-3 bg-[#2D1D35] text-white rounded-xl hover:opacity-90 transition-all shadow-lg"
                 >
                    <Send size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
        style={{ 
          background: "linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)", 
          color: "#FFF" 
        }}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
        {!isOpen && <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />}
      </button>
    </div>
  );
}
