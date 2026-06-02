import { getSupabase } from "../supabase-client";

const supabase = getSupabase()!;

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  attachment_url?: string;
};

/** Send a message in a thread */
export async function sendMessage(params: {
  threadId: string;
  senderId: string;
  body: string;
  attachmentFile?: File;
}) {
  let attachmentUrl: string | undefined;
  if (params.attachmentFile) {
    const fileName = `${Date.now()}_${params.attachmentFile.name}`;
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(`attachments/${fileName}`, params.attachmentFile);
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(`attachments/${fileName}`);
    attachmentUrl = publicUrl;
  }

  const { data, error } = await supabase.from("messages").insert({
    thread_id: params.threadId,
    sender_id: params.senderId,
    body: params.body,
    attachment_url: attachmentUrl,
  }).select().single();

  if (error) throw error;
  return data as Message;
}

/** Fetch messages for a thread */
export async function fetchMessages(threadId: string, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  
  if (error) throw error;
  return data as Message[];
}

/** Subscribe to realtime updates for a thread */
export function subscribeToThread(
  threadId: string,
  onMessage: (msg: Message) => void
) {
  const channel = supabase
    .channel(`public:messages:thread_id=eq.${threadId}`)
    .on(
      "postgres_changes",
      { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `thread_id=eq.${threadId}` 
      },
      (payload: any) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
