-- Create search_queries table to track all searches
CREATE TABLE IF NOT EXISTS public.search_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

-- Anyone can insert search queries (both authenticated and guests)
CREATE POLICY "Anyone can insert search queries"
ON public.search_queries
FOR INSERT
WITH CHECK (true);

-- Only admins can view all search queries for analytics
CREATE POLICY "Admins can view all search queries"
ON public.search_queries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster trending search queries
CREATE INDEX idx_search_queries_query ON public.search_queries(query);
CREATE INDEX idx_search_queries_created_at ON public.search_queries(created_at DESC);

-- Create a function to get trending searches
CREATE OR REPLACE FUNCTION public.get_trending_searches(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    query,
    COUNT(*) as search_count
  FROM search_queries
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY query
  ORDER BY search_count DESC, MAX(created_at) DESC
  LIMIT limit_count;
$$;