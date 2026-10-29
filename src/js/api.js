// The pages talk to the back end only through this file. Until Supabase is
// configured in src/config.js, the demo back end is used instead.

import { demoMode } from '../config.js';
import { demoBackend } from './demo-backend.js';
import { supabaseBackend } from './supabase-backend.js';

export const api = demoMode ? demoBackend : supabaseBackend;
