-- Add reading progress columns to books table
-- These columns track the user's reading position in eBooks

-- Add current_page column (where user is currently reading)
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT NULL;

-- Add total_pages column (total pages in the book)
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT NULL;

-- Add total_reading_minutes column (total time spent reading this book)
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS total_reading_minutes INTEGER DEFAULT 0;

-- Add indexes for faster queries on reading progress
CREATE INDEX IF NOT EXISTS idx_books_current_page ON public.books(current_page);
CREATE INDEX IF NOT EXISTS idx_books_reading_minutes ON public.books(total_reading_minutes);

-- Update RLS policies to allow these fields to be updated
-- (existing update policy should already cover this since we're adding columns to existing table)

COMMENT ON COLUMN public.books.current_page IS 'Current page the user is reading (for eBooks)';
COMMENT ON COLUMN public.books.total_pages IS 'Total pages in the book (for progress tracking)';
COMMENT ON COLUMN public.books.total_reading_minutes IS 'Total minutes spent reading this book';
