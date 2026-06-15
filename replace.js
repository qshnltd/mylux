const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// Replace p-6 lg:p-8 with p-4 sm:p-6 lg:p-8
content = content.replace(/p-6 lg:p-8/g, 'p-4 sm:p-6 lg:p-8');
// Replace p-8 with p-5 sm:p-8 (careful with exact match)
content = content.replace(/ore-panel-light p-8/g, 'ore-panel-light p-5 sm:p-8');
content = content.replace(/ore-panel p-8/g, 'ore-panel p-5 mx-2 sm:mx-0 sm:p-8');
content = content.replace(/ore-panel p-12/g, 'ore-panel p-6 sm:p-12');
content = content.replace(/ore-panel p-6/g, 'ore-panel p-4 sm:p-6');

// Replace large text sizes that break mobile layout
content = content.replace(/text-4xl lg:text-5xl/g, 'text-3xl sm:text-4xl lg:text-5xl');
content = content.replace(/text-3xl lg:text-4xl/g, 'text-2xl sm:text-3xl lg:text-4xl');
content = content.replace(/text-2xl lg:text-3xl/g, 'text-xl sm:text-2xl lg:text-3xl');
content = content.replace(/text-2xl md:text-3xl/g, 'text-xl md:text-2xl lg:text-3xl');

// Responsive gaps
content = content.replace(/gap-8/g, 'gap-4 sm:gap-8');
content = content.replace(/gap-6 lg:gap-8/g, 'gap-4 max-sm:gap-3 sm:gap-6 lg:gap-8');

fs.writeFileSync('app/page.tsx', content, 'utf8');
console.log('Replacements applied successfully');
