const fs = require('fs');
let s = fs.readFileSync('app/page.tsx', 'utf8');
s = s.replace(/p-6 lg:p-8/g, 'p-4 sm:p-6 lg:p-8');
s = s.replace(/ore-panel-light p-8/g, 'ore-panel-light p-5 sm:p-8');
s = s.replace(/ore-panel p-8/g, 'ore-panel p-5 mx-2 sm:mx-0 sm:p-8');
s = s.replace(/ore-panel p-12/g, 'ore-panel p-6 sm:p-12');
s = s.replace(/ore-panel p-6/g, 'ore-panel p-4 sm:p-6');
s = s.replace(/text-4xl lg:text-5xl/g, 'text-3xl sm:text-4xl lg:text-5xl');
s = s.replace(/text-3xl lg:text-4xl/g, 'text-2xl sm:text-3xl lg:text-4xl');
s = s.replace(/text-2xl lg:text-3xl/g, 'text-xl sm:text-2xl lg:text-3xl');
s = s.replace(/text-2xl md:text-3xl/g, 'text-xl md:text-2xl lg:text-3xl');
s = s.replace(/gap-8/g, 'gap-4 sm:gap-8');
s = s.replace(/gap-6 lg:gap-8/g, 'gap-4 sm:gap-6 lg:gap-8');
// Fix input padding shrinking on mobile
s = s.replace(/px-8 py-4/g, 'px-4 sm:px-8 py-3 sm:py-4');
s = s.replace(/w-96 h-96/g, 'w-64 h-64 sm:w-96 sm:h-96');
// Fix map height
s = s.replace(/h-\[500px\]/g, 'h-[300px] sm:h-[400px] md:h-[500px]');
fs.writeFileSync('app/page.tsx', s, 'utf8');
