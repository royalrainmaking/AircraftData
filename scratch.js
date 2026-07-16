const fs = require('fs');
const https = require('https');

const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";
const aircraftSheetGID = "705816349";
const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${aircraftSheetGID}`;

function convertHoursToDecimal(val) {
    if (val === undefined || val === null || val === '-') return 0;
    if (typeof val === 'number') return val;
    const strVal = String(val).trim();
    const match = strVal.match(/^(\d+):(\d+)$/);
    if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        return hours + (minutes / 60);
    }
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
}

function normalizeDate(dateValue) {
    if (!dateValue) return '';
    const dateStr = String(dateValue);
    if (dateStr.includes('Date(')) {
        try {
            const dateStr_cleaned = dateStr.replace('Date(', '').replace(')', '');
            const dateParts = dateStr_cleaned.split(',').map(p => p.trim());
            if (dateParts.length >= 3) {
                const year = parseInt(dateParts[0]);
                const month = String(parseInt(dateParts[1]) + 1).padStart(2, '0');
                const day = String(parseInt(dateParts[2])).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {}
    }
    return dateStr;
}

function getFieldValue(obj, fieldNames) {
    if (!obj || typeof obj !== 'object') return null;
    for (const fieldName of fieldNames) {
        const value = obj[fieldName];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
}

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const startIdx = data.indexOf('{');
        const endIdx = data.lastIndexOf('}');
        const json = JSON.parse(data.substring(startIdx, endIdx + 1));
        
        const records = [];
        for (const row of json.table.rows) {
            if (!row.c || row.c.length < 2) continue;
            const dateValue = row.c[0]?.v || '';
            const jsonValue = row.c[1]?.v || '';
            if (!jsonValue) continue;
            
            const normalizedDate = normalizeDate(dateValue);
            try {
                const jsonData = JSON.parse(jsonValue);
                const sheet1Data = jsonData.ข้อมูลSheet1 || [];
                for (const item of sheet1Data) {
                    const acNum = String(getFieldValue(item, ['เครื่องบิน', 'หมายเลข', 'number', 'aircraft_number', 'id']));
                    if (normalizedDate.startsWith('2026-07')) {
                        const hrs = getFieldValue(item, ['ชั่วโมง', 'ชั่วโมงเครื่องบิน', 'flight hours', 'flightHours']) || '-';
                        records.push({ date: normalizedDate, ac: acNum, hours: hrs, raw: convertHoursToDecimal(hrs), raw_item: item });
                    }
                }
            } catch (e) {}
        }
        
        records.sort((a, b) => {
            const dateDiff = new Date(a.date) - new Date(b.date);
            if (dateDiff !== 0) return dateDiff;
            return a.raw - b.raw;
        });
        
        let prevHours = null;
        let totalDelta = 0;
        
        let outputStr = '';
        for (const r of records) {
            outputStr += `${r.date} | AC: ${r.ac} | hours: ${r.hours}\n`;
        }
        fs.writeFileSync('scratch_output.txt', outputStr);
    });
});
