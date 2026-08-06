import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export const supabase = createClient(
    ENV.SUPABASE_URL || 'https://placeholder.supabase.co',
    ENV.SUPABASE_SECRET_KEY || 'placeholder'
);

export default supabase;
