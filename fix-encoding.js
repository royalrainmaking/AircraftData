const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'mission-hours.html');

for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Reverse the bad encoding
    // The content was read as Windows-1252/latin1 and written as UTF8.
    // So we turn the JS string back into a buffer using 'latin1' 
    // to get the raw bytes, then interpret those bytes as 'utf8'.
    const buffer = Buffer.from(content, 'latin1');
    const restoredContent = buffer.toString('utf8');
    
    // Check if restoration actually looks like valid Thai (has Thai characters)
    // If the original content wasn't corrupted, this might break it, 
    // so we verify if the restored text has Thai chars (0x0E00 - 0x0E7F).
    if (/[\u0E00-\u0E7F]/.test(restoredContent)) {
        fs.writeFileSync(filePath, restoredContent, 'utf8');
        console.log(`Restored ${file}`);
    } else {
        console.log(`Skipped ${file} (no Thai chars found after restoration)`);
    }
}
