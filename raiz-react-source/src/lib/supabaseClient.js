import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hjpbvfcmhuhhpwvlhewv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGJ2ZmNtaHVoaHB3dmxoZXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjc2MjgsImV4cCI6MjEwMDIwMzYyOH0.hr2s_L6m476s6zaR67rGsdl1mJoaPidRmrD6a1AMk2o';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
