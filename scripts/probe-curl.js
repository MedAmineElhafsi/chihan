const { execSync } = require("child_process");
console.log(
  execSync(
    'curl.exe -s -o NUL -w "curl_http=%{http_code} time=%{time_total}\\n" -H "apikey: sb_publishable_8tUYfFX-Y-yMVGBrsURyJg_NooR3UBc" -H "Authorization: Bearer sb_publishable_8tUYfFX-Y-yMVGBrsURyJg_NooR3UBc" "https://czihcdhrzbhgsugdnyxx.supabase.co/auth/v1/settings"',
    { encoding: "utf8" }
  )
);
