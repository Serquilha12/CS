const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://demo-campusstore.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'demo-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key';

// Cliente público para operações com autenticação de utilizador
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente Admin com privilégios de service role para bypass restrito quando necessário
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase, supabaseAdmin };
