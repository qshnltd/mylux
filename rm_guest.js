const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');
code = code.replace(/<button\s*onClick=\{handleGuestLogin\}[\s\S]*?<\/button>/, '{/* Guest Login Removed */}');
fs.writeFileSync('app/page.tsx', code);
