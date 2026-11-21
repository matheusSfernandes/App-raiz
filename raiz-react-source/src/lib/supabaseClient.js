import { createClient } from '@supabase/supabase-js';
import { createOfflineFetch } from './offline';

const SUPABASE_URL = 'https://hjpbvfcmhuhhpwvlhewv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGJ2ZmNtaHVoaHB3dmxoZXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjc2MjgsImV4cCI6MjEwMDIwMzYyOH0.hr2s_L6m476s6zaR67rGsdl1mJoaPidRmrD6a1AMk2o';

export const STORAGE_KEY = 'sb-hjpbvfcmhuhhpwvlhewv-auth-token';

const offlineFetch = createOfflineFetch({
  key: SUPABASE_ANON_KEY,
  token: async () => (await sb.auth.getSession()).data.session?.access_token,
});

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: offlineFetch } });

// Sem internet, o login vencido não consegue se renovar e a biblioteca responde "sem sessão".
// Nesse caso usamos a sessão guardada no aparelho; ela se renova quando a internet voltar.
export function storedSession() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return s && s.user && s.refresh_token ? s : null;
  } catch { return null; }
}
