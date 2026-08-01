import { useState, useRef, useEffect } from "react";
import { 
  Search, CheckCircle, Send, MoreVertical, Phone, Video, Filter,
  Paperclip, File, Image as ImageIcon, Download, Loader2
} from "lucide-react";
import { toast } from "sonner";
import ticketService from "../../services/ticket.service";
import mediaService from "../../services/media.service";
import socketClient from "../../services/socket";
import { useBrand } from "../../context/BrandContext";
import { useAuthStore } from "../../store/useAuthStore";

export function StaffChatPage() {
  const { activeBrand } = useBrand();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  // Read inside socket listeners instead of the closed-over `activeChat`
  // value from whichever render registered the listener — without this, a
  // message socket event landing in the gap between setActiveChat(newChat)
  // and this component's next render (when the listener effect re-runs and
  // re-subscribes) checks the OLD activeChat.id and drops it (#112 K5).
  const activeChatIdRef = useRef(null);
  useEffect(() => {
    activeChatIdRef.current = activeChat?.id ?? null;
  }, [activeChat?.id]);

  // Fetch all tickets for current brand
  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Staff should see all tickets across all brands to allow support chat functionality
      const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';
      const targetBrandId = (activeBrand && !isStaff) ? activeBrand.id : null;
      const res = await ticketService.getAllTickets(targetBrandId);
      const tickets = res || [];
      const formatted = tickets.map(t => ({
        id: t.id,
        brandId: t.brandId,
        name: t.user.name,
        email: t.user.email,
        preview: t.messages?.[0]?.content || "No messages yet",
        time: t.messages?.[0]?.createdAt ? new Date(t.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        unread: t.status === 'OPEN',
        status: "online",
        role: t.user.role,
        subject: t.subject,
        assignedAgentId: t.assignedAgentId,
        assignedAgent: t.assignedAgent
      }));
      setConversations(formatted);
      if (formatted.length > 0 && !activeChat) {
        setActiveChat(formatted[0]);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      toast.error("Không thể tải danh sách ticket hỗ trợ");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected ticket
  const fetchMessages = async (ticketId) => {
    try {
      const res = await ticketService.getTicketDetails(ticketId);
      const ticket = res || {};
      if (ticket && ticket.messages) {
        const formatted = ticket.messages.map(m => ({
          id: m.id,
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: (m.sender?.role === 'STAFF' || m.sender?.role === 'ADMIN') ? 'staff' : 'user',
          attachment: m.attachmentUrl ? {
            name: m.attachmentUrl.split('/').pop(),
            type: m.messageType.toLowerCase(),
            isImage: m.messageType === 'IMAGE',
            url: m.attachmentUrl
          } : null
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Connect to rooms on socket
  useEffect(() => {
    fetchTickets();
  }, [activeBrand, user]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);

      // Join ticket room on socket
      socketClient.emit('join_room', { ticketId: activeChat.id });

      // Listen for incoming messages
      const handleNewMessage = (msg) => {
        if (msg.ticketId === activeChatIdRef.current) {
          // Avoid duplicate messages if optimistically added
          setMessages(prev => {
            if (prev.some(p => p.id === msg.id)) return prev;

            // Replace the temporary optimistic message for staff (self)
            if (msg.sender === 'staff') {
              const tempIndex = prev.findIndex(p => p.id && String(p.id).startsWith('temp-'));
              if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = {
                  id: msg.id,
                  text: msg.text,
                  time: msg.time,
                  sender: 'staff',
                  attachment: msg.attachment
                };
                return updated;
              }
            }

            return [...prev, {
              id: msg.id,
              text: msg.text,
              time: msg.time,
              sender: msg.sender, // 'user' or 'staff'
              attachment: msg.attachment
            }];
          });
        }
        // Update preview in sidebar for any incoming messages from tickets
        setConversations(prevConvs => prevConvs.map(c => 
          c.id === msg.ticketId ? { ...c, preview: msg.text, time: msg.time } : c
        ));
      };

      // Listen for ticket assignment updates
      const handleTicketAssigned = (payload) => {
        if (payload.ticketId === activeChatIdRef.current) {
          setActiveChat(prev => prev && prev.id === payload.ticketId ? {
            ...prev,
            assignedAgentId: payload.assignedAgent.id,
            assignedAgent: payload.assignedAgent
          } : prev);
          
          if (payload.assignedAgent.id === user?.id) {
            toast.success("Bạn đã nhận phiên chat hỗ trợ này!");
          } else {
            toast.info(`Phiên chat đã được nhận bởi ${payload.assignedAgent.name}`);
          }
        }
        
        setConversations(prevConvs => prevConvs.map(c => 
          c.id === payload.ticketId ? { 
            ...c, 
            assignedAgentId: payload.assignedAgent.id,
            assignedAgent: payload.assignedAgent 
          } : c
        ));
      };

      socketClient.on('new_message', handleNewMessage);
      socketClient.on('ticket_assigned', handleTicketAssigned);

      return () => {
        socketClient.emit('leave_room', { ticketId: activeChat.id });
        socketClient.off('new_message', handleNewMessage);
        socketClient.off('ticket_assigned', handleTicketAssigned);
      };
    }
  }, [activeChat, user]);

  const handleClaimTicket = async () => {
    if (!activeChat) return;
    try {
      const res = await ticketService.assignTicket(activeChat.id);
      const updatedTicket = res || {};
      if (updatedTicket) {
        setActiveChat(prev => prev && prev.id === updatedTicket.id ? {
          ...prev,
          assignedAgentId: updatedTicket.assignedAgentId,
          assignedAgent: updatedTicket.assignedAgent
        } : prev);
        
        setConversations(prevConvs => prevConvs.map(c => 
          c.id === updatedTicket.id ? { 
            ...c, 
            assignedAgentId: updatedTicket.assignedAgentId,
            assignedAgent: updatedTicket.assignedAgent 
          } : c
        ));
      }
    } catch (err) {
      console.error("Failed to claim ticket:", err);
      toast.error("Không thể nhận hỗ trợ phiên chat này");
    }
  };

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Split into a shared sender plus two call sites (text vs attachment) —
  // the old single handleSend(text = input, attachmentUrl) signature meant
  // sending a file (handleSend(file.name, url)) reused the `text` param slot
  // for the filename AND unconditionally cleared the live `input` box the
  // user might have been mid-typing a caption into, even though that text
  // was never part of the sent message (#112 K9).
  const sendMessage = ({ text, attachmentUrl = null }) => {
    if (!text.trim() && !attachmentUrl) return;
    if (!activeChat) return;

    // Optimistically add staff message locally
    setMessages(prev => [...prev, {
      id: 'temp-' + Date.now(),
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'staff',
      attachment: attachmentUrl ? {
        name: text,
        isImage: true,
        url: attachmentUrl
      } : null
    }]);

    socketClient.emit('send_message', {
      ticketId: activeChat.id,
      messageType: attachmentUrl ? 'IMAGE' : 'TEXT',
      content: text,
      attachmentUrl
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSendAttachment = (fileName, attachmentUrl) => {
    sendMessage({ text: fileName, attachmentUrl });
    // Attachment sends never touch the input box — whatever caption the
    // user was typing stays exactly as they left it.
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const targetBrandId = activeChat ? activeChat.brandId : (activeBrand ? activeBrand.id : null);
    if (!file || !targetBrandId) return;

    setIsUploading(true);
    try {
      const res = await mediaService.saveDirect(targetBrandId, null, {
        filename: file.name,
        size: file.size,
        type: file.type
      });
      const url = res?.url;
      if (url) {
        handleSendAttachment(file.name, url);
        toast.success("Đã gửi tệp đính kèm!");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Không thể gửi tệp đính kèm");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar: Chat List */}
      <div className="w-[320px] border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
           <h2 className="text-lg font-bold text-[#0A0A0A]">Support Inbox</h2>
           <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400"><Filter size={18} /></button>
        </div>
        
        <div className="p-4">
           <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search conversations..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border-none text-sm outline-none" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">
           {loading ? (
             <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
           ) : conversations.length === 0 ? (
             <div className="text-center text-gray-400 text-xs py-8">No tickets active.</div>
           ) : conversations.map((chat) => (
             <button
               key={chat.id}
               onClick={() => setActiveChat(chat)}
               className={`w-full flex items-center gap-4 px-5 py-4 border-b border-gray-50 transition-all text-left ${activeChat?.id === chat.id ? "bg-gray-50" : "hover:bg-gray-50/50"}`}
             >
                <div className="relative shrink-0">
                   <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 uppercase">
                      {chat.name.split(' ').map(n => n[0]).join('')}
                   </div>
                   {chat.status === "online" && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                         <span className="text-sm font-bold text-[#0A0A0A] truncate">{chat.name}</span>
                         {!chat.assignedAgentId ? (
                           <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded shrink-0">Chưa nhận</span>
                         ) : (
                           <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-bold rounded shrink-0">Đã nhận</span>
                         )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{chat.time}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${chat.unread ? "text-[#0A0A0A] font-semibold" : "text-gray-400"}`}>{chat.preview}</p>
                      {chat.unread && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                   </div>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* Main: Chat View */}
      <div className="flex-1 flex flex-col bg-white">
         {activeChat ? (
           <>
             {/* Chat Header */}
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{activeChat.name[0]}</div>
                   <div>
                      <div className="text-sm font-bold text-[#0A0A0A]">{activeChat.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{activeChat.role} · {activeChat.subject}</div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"><Phone size={18} /></button>
                   <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"><Video size={18} /></button>
                   <button 
                     onClick={async () => {
                       await ticketService.resolveTicket(activeChat.id);
                       toast.success("Đã đóng ticket hỗ trợ thành công!");
                       fetchTickets();
                     }}
                     className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                   >
                     <CheckCircle size={18} className="text-green-500" />
                   </button>
                   <div className="w-px h-6 bg-gray-100 mx-2" />
                   <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"><MoreVertical size={18} /></button>
                </div>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'staff' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[70%] space-y-1 flex flex-col ${msg.sender === 'staff' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.sender === 'staff' ? 'bg-[#2D1D35] text-white rounded-tr-none shadow-md' : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm'}`}>
                           {msg.text && <div>{msg.text}</div>}
                           {msg.attachment && (
                              <div className={`mt-3 p-3 rounded-xl flex items-center gap-3 border ${msg.sender === 'staff' ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'}`}>
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.sender === 'staff' ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                    {msg.attachment.isImage ? <ImageIcon size={16} /> : <File size={16} />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-bold truncate">{msg.attachment.name}</div>
                                    <div className="text-[9px] opacity-60 uppercase">{msg.attachment.type}</div>
                                 </div>
                                 <button 
                                   onClick={() => window.open(msg.attachment.url, '_blank')}
                                   className="p-1.5 hover:bg-black/10 rounded-md transition-colors"
                                 >
                                   <Download size={14} />
                                 </button>
                              </div>
                           )}
                        </div>
                        <div className="text-[10px] text-gray-400 px-1 font-medium">{msg.time}</div>
                     </div>
                  </div>
                ))}
                {isUploading && (
                   <div className="flex justify-end">
                      <div className="bg-[#2D1D35] text-white px-4 py-2 rounded-xl flex items-center gap-3 shadow-md">
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                         <span className="text-xs font-medium">Sending file...</span>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
             </div>

             {/* Chat Input or Claim Banner */}
             <div className="p-6 bg-white border-t border-gray-100">
                {!activeChat.assignedAgentId ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
                    <p className="text-sm text-amber-800 font-medium mb-3">Phiên chat này chưa có nhân viên nhận hỗ trợ.</p>
                    <button 
                      onClick={handleClaimTicket}
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform hover:scale-105 active:scale-95"
                    >
                      Nhận Hỗ Trợ
                    </button>
                  </div>
                ) : activeChat.assignedAgentId !== user?.id ? (
                  <div className="flex items-center justify-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">
                      Phiên hỗ trợ này đã được nhận bởi <span className="font-bold text-gray-700">{activeChat.assignedAgent?.name || 'nhân viên khác'}</span>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-3 max-w-4xl mx-auto">
                       <div className="flex-1 relative">
                          <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            placeholder={`Reply to ${activeChat.name.split(' ')[0]}...`}
                            className="w-full pl-4 pr-12 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:border-[#2D1D35] focus:bg-white outline-none text-sm transition-all resize-none min-h-[50px] max-h-[200px]"
                            rows={1}
                          />
                          <div className="absolute right-3 bottom-3 flex gap-2">
                             <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="p-1 text-gray-400 hover:text-[#2D1D35] transition-colors"
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
                       </div>
                       <button 
                         onClick={() => handleSend()}
                         className="p-3 bg-[#2D1D35] text-white rounded-xl shadow-lg hover:opacity-90 transition-all shrink-0"
                       >
                          <Send size={20} />
                       </button>
                    </div>
                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-widest">Shift + Enter for new line</p>
                  </>
                )}
             </div>
           </>
         ) : (
           <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Chọn một cuộc hội thoại từ Sidebar để bắt đầu chat support.</div>
         )}
      </div>

      {/* Right Sidebar: Details */}
      {activeChat && (
        <div className="w-[300px] border-l border-gray-100 p-6 hidden lg:flex flex-col gap-8 shrink-0">
           <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Customer Details</h3>
              <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center font-bold text-xl text-[#0A0A0A] shadow-sm mb-3">
                   {activeChat.name.split(' ').map(n => n[0]).join('')}
                 </div>
                 <div className="font-bold text-[#0A0A0A]">{activeChat.name}</div>
                 <div className="text-xs text-gray-500 mt-1">{activeChat.email}</div>
                 <span className="mt-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">{activeChat.role}</span>
              </div>
           </div>

           <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Ticket Info</h3>
              <div className="space-y-4">
                 {[
                   { label: "Subject", value: activeChat.subject },
                   { label: "Status", value: activeChat.unread ? "OPEN" : "RESOLVED" }
                 ].map(stat => (
                   <div key={stat.label} className="flex justify-between items-center text-xs">
                      <span className="text-gray-405">{stat.label}</span>
                      <span className="font-bold text-[#0A0A0A]">{stat.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
