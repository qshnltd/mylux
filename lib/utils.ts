import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanMCColors(text: string) {
  if (!text) return '';
  let normalized = text
    .replace(/Â§/g, '§')
    .replace(/\\u00A7/gi, '§')
    .replace(/\\x1b\[[0-9;]*m/gi, '')
    .replace(/\x1b\[[0-9;]*m/gi, '')
    .replace(/&([0-9a-fk-orgx])/ig, '§$1')
    .replace(/&#([0-9a-f]{6})/ig, '');
  return normalized.replace(/§x(§[0-9a-f]){6}/ig, '').replace(/§./g, '');
}

export function parseMCColors(text: string) {
  if (!text) return '';
  const codes: Record<string, string> = {
    '0': 'color: #000000', '1': 'color: #0000aa', '2': 'color: #00aa00', '3': 'color: #00aaaa',
    '4': 'color: #aa0000', '5': 'color: #aa00aa', '6': 'color: #ffaa00', '7': 'color: #aaaaaa',
    '8': 'color: #555555', '9': 'color: #5555ff', 'a': 'color: #55ff55', 'b': 'color: #55ffff',
    'c': 'color: #ff5555', 'd': 'color: #ff55ff', 'e': 'color: #ffff55', 'f': 'color: #ffffff',
    'g': 'color: #ddd605',
    'l': 'font-weight: bold', 'm': 'text-decoration: line-through',
    'n': 'text-decoration: underline', 'o': 'font-style: italic',
  };

  let html = '';
  let spans = 0;
  
  let escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let normalized = escaped
    .replace(/Â§/g, '§')
    .replace(/\\u00A7/gi, '§')
    .replace(/\\x1b\[[0-9;]*m/gi, '')
    .replace(/\x1b\[[0-9;]*m/gi, '') 
    .replace(/&([0-9a-fk-orgx])/ig, '§$1');
    
  normalized = normalized.replace(/&#([0-9a-f]{6})/ig, (_, hex) => `§#${hex}`);
  normalized = normalized.replace(/§x(§[0-9a-f]){6}/ig, (match) => {
    const hex = match.replace(/§x|§/ig, '');
    return `§#${hex}`;
  });

  const regex = /(§#[0-9a-fA-F]{6}|§[0-9a-fk-orgx])/ig;
  const tokens = normalized.split(regex);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    
    if (token.toLowerCase().startsWith('§#')) {
      const hex = token.substring(2);
      html += `<span style="color: #${hex}">`;
      spans++;
    } else if (token.toLowerCase().startsWith('§') && token.length === 2) {
      const code = token.toLowerCase().charAt(1);
      if (code === 'r') {
        while (spans > 0) {
          html += '</span>';
          spans--;
        }
      } else if (codes[code]) {
        html += `<span style="${codes[code]}">`;
        spans++;
      }
    } else {
      html += token.replace(/§./g, '');
    }
  }
  
  while (spans > 0) {
    html += '</span>';
    spans--;
  }
  
  return html;
}
