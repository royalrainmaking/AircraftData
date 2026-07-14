const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'mission-hours.html');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('<a href="mission-hours.html">')) {
        continue;
    }
    
    // Add the link right before maintenance-planning.html
    const searchStr = '<a href="maintenance-planning.html">';
    const replacementStr = '<a href="mission-hours.html">สรุปชั่วโมงภารกิจ</a>\n                <a href="maintenance-planning.html">';
    
    if (content.includes(searchStr)) {
        content = content.replace(searchStr, replacementStr);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}
