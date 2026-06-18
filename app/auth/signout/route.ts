import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  // 303 so the browser issues a GET to the home page (proxy localizes `/`).
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
