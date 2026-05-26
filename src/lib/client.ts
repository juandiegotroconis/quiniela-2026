import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase";

const client = createClient<Database, "public">(
  import.meta.env.VITE_DB_URL,
  import.meta.env.VITE_DB_PUBLISHABLE_KEY,
);

export const getClient = () => client;
