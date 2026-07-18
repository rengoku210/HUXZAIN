-- Update channels for staff notification events to include email
UPDATE public.notification_events
SET channels = ARRAY['in_app', 'email']
WHERE event_key IN (
  'staff.payment_verification',
  'staff.dispute_review',
  'staff.withdrawal_request',
  'staff.listing_review',
  'staff.support_ticket'
);

-- Update templates for staff.support_ticket
UPDATE public.notification_events
SET 
  template_title = 'New Support Ticket: {title}',
  template_body = 'Support ticket #{ticketId} was opened by {userEmail}. Please review.'
WHERE event_key = 'staff.support_ticket';

-- Upsert staff.ticket_assigned event
INSERT INTO public.notification_events (event_key, title, description, category, priority, channels, template_title, template_body, link_pattern)
VALUES (
  'staff.ticket_assigned',
  'Ticket Assigned',
  'Internal: support ticket assigned to staff member',
  'platform',
  'normal',
  ARRAY['in_app', 'email'],
  'Ticket Assigned: #{ticketId}',
  'Support ticket #{ticketId} has been assigned to employee {assigneeName}.',
  '/admin/tickets'
)
ON CONFLICT (event_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  channels = EXCLUDED.channels,
  template_title = EXCLUDED.template_title,
  template_body = EXCLUDED.template_body,
  link_pattern = EXCLUDED.link_pattern;
