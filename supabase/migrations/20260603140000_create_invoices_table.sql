-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  billing_address TEXT,
  seller_name TEXT,
  seller_details TEXT,
  product_name TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  final_total_cents INTEGER NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  logo_url TEXT,
  gst_details TEXT,
  custom_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Staff members can perform all operations
DROP POLICY IF EXISTS invoices_all_staff ON public.invoices;
CREATE POLICY invoices_all_staff ON public.invoices 
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Customers can view their own invoices by email match
DROP POLICY IF EXISTS invoices_read_customer ON public.invoices;
CREATE POLICY invoices_read_customer ON public.invoices 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND email = customer_email
    )
  );

NOTIFY pgrst, 'reload schema';
