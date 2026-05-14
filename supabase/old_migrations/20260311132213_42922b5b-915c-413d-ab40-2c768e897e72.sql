
-- Create whatsapp_conversations table
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone text NOT NULL,
  contact_name text,
  contact_photo text,
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id text,
  from_me boolean NOT NULL DEFAULT false,
  type text NOT NULL DEFAULT 'text',
  content text DEFAULT '',
  media_url text,
  status text DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_conversations
CREATE POLICY "Authenticated users can read whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete whatsapp_conversations" ON public.whatsapp_conversations FOR DELETE TO authenticated USING (true);

-- RLS policies for whatsapp_messages
CREATE POLICY "Authenticated users can read whatsapp_messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert whatsapp_messages" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update whatsapp_messages" ON public.whatsapp_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon insert for webhook
CREATE POLICY "Anon can insert whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert whatsapp_messages" ON public.whatsapp_messages FOR INSERT TO anon WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
