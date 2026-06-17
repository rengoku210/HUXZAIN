import React, { useEffect, useState, useRef } from "react";
import { Message, sendMessage, fetchMessages, subscribeToThread } from "@/lib/marketplace/messagingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { useSignedUrl } from "@/components/SignedImage";

interface ChatWindowProps {
  threadId: string;
  userId: string;
}

// Chat attachments live in the private chat-attachments bucket; resolve a
// short-lived signed URL. Legacy absolute URLs pass through unchanged.
function AttachmentLink({ stored, isOwn }: { stored: string; isOwn: boolean }) {
  const href = useSignedUrl(stored, "chat-attachments");
  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-2 p-2 rounded-lg border ${
        isOwn
          ? 'bg-black/10 border-black/20 text-black'
          : 'bg-black/40 border-white/10 text-gold'
      }`}
    >
      <FileIcon size={16} />
      <span className="text-xs font-semibold truncate max-w-[150px]">View Attachment</span>
    </a>
  );
}

export function ChatWindow({ threadId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const msgs = await fetchMessages(threadId);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [threadId]);

  useEffect(() => {
    const unsubscribe = subscribeToThread(threadId, (msg) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsubscribe;
  }, [threadId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !attachment) return;
    
    const body = newMessage;
    const file = attachment;
    
    setNewMessage("");
    setAttachment(null);

    try {
      await sendMessage({
        threadId,
        senderId: userId,
        body,
        attachmentFile: file ?? undefined,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      // Optional: restore text if failed
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl">
      <div 
        className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gold/20" 
        ref={scrollRef}
      >
        <div className="space-y-4">
          {loading && <div className="text-center text-gray-500 py-10">Loading conversation...</div>}
          {!loading && messages.length === 0 && (
            <div className="text-center text-gray-500 py-10 italic">No messages yet. Say hello!</div>
          )}
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_id === userId ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  msg.sender_id === userId 
                    ? 'bg-[#D4AF37] text-black rounded-tr-none' 
                    : 'bg-[#151515] text-white border border-[#333] rounded-tl-none'
                }`}
              >
                {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                
                {msg.attachment_url && (
                  <AttachmentLink stored={msg.attachment_url} isOwn={msg.sender_id === userId} />
                )}
                
                <span className={`text-[10px] mt-1 block opacity-60 ${
                  msg.sender_id === userId ? 'text-black' : 'text-gray-400'
                }`}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[#0F0F0F] border-t border-[#1A1A1A]">
        {attachment && (
          <div className="mb-2 p-2 bg-gold/10 border border-gold/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold text-xs font-medium">
              <FileIcon size={14} />
              <span className="truncate max-w-[200px]">{attachment.name}</span>
            </div>
            <button 
              onClick={() => setAttachment(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="file"
              id="chat-file"
              className="hidden"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-[#333] bg-transparent hover:bg-[#1A1A1A] text-gray-400"
              onClick={() => document.getElementById('chat-file')?.click()}
            >
              <Paperclip size={18} />
            </Button>
          </div>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-[#151515] border-[#333] text-white focus:ring-gold"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button 
            onClick={handleSend}
            disabled={!newMessage.trim() && !attachment}
            className="bg-[#D4AF37] text-black hover:bg-[#B8962E] font-bold"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
