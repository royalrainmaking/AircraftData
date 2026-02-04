class ADsManager {
    constructor() {
        this.spreadsheetId = '1UBO001k9GKw1nBov1i1CzL5kwhSz6jWnIcmii0mwNGk';
        this.adsContent = document.getElementById('adsContent');
        this.sheetTabs = document.getElementById('sheetTabs');
        this.searchInput = document.getElementById('adsSearchInput');
        
        this.allAdsData = [];
        this.currentSheetData = [];
        this.sheets = [];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSheets();
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filterData(e.target.value);
            });
        }
    }

    async loadSheets() {
        try {
            this.adsContent.innerHTML = '<div class="loading">กำลังโหลดข้อมูล ADs จาก Google Sheets...</div>';
            if (this.sheetTabs) this.sheetTabs.innerHTML = '<div class="loading">กำลังค้นหาชีท...</div>';

            // Discover sheets dynamically
            const discoveredSheets = await this.discoverSheets();
            
            if (discoveredSheets.length === 0) {
                // Fallback to these names if discovery fails initially
                const fallbackSheets = [
                    { name: '2411', gid: '0' },
                    { name: '18301', gid: '176926189' },
                    { name: '21111', gid: '977682484' }
                ];
                discoveredSheets.push(...fallbackSheets);
            }

            this.sheets = [];
            const fetchPromises = discoveredSheets.map(async (sheetInfo) => {
                try {
                    console.log(`Fetching sheet: ${sheetInfo.name} (GID: ${sheetInfo.gid})`);
                    const csvData = await this.fetchSheetCSV(sheetInfo.gid);
                    if (csvData) {
                        const rows = this.parseCSV(csvData);
                        // Filter out truly empty sheets (usually just headers or empty)
                        if (rows.length > 1) {
                            return { 
                                name: sheetInfo.name, 
                                gid: sheetInfo.gid, 
                                data: rows 
                            };
                        } else {
                            console.warn(`Sheet ${sheetInfo.name} appears empty.`);
                        }
                    } else {
                        console.error(`Failed to get CSV data for sheet: ${sheetInfo.name}`);
                    }
                } catch (err) {
                    console.error(`Error fetching/parsing sheet ${sheetInfo.name}:`, err);
                }
                return null;
            });

            const results = await Promise.all(fetchPromises);
            this.sheets = results.filter(s => s !== null);

            console.log('Loaded sheets:', this.sheets.map(s => s.name));

            if (this.sheets.length > 0) {
                this.renderTabs();
                this.loadSheetData(this.sheets[0].name);
                this.updateExternalLink(this.sheets[0].gid);
            } else {
                this.adsContent.innerHTML = '<div class="error">ไม่พบข้อมูลใน Google Sheets หรือเกิดปัญหาในการเชื่อมต่อ</div>';
                if (this.sheetTabs) this.sheetTabs.innerHTML = '';
            }
        } catch (error) {
            console.error('Error loading ADs data:', error);
            this.adsContent.innerHTML = `<div class="error">เกิดข้อผิดพลาด: ${error.message}</div>`;
        }
    }

    async discoverSheets() {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const html = await response.text();
            
            // Look for the specific JSON structure that contains sheet metadata
            const match = html.match(/bootstrapData\s*=\s*({.+?});/);
            if (!match) return [];
            
            const data = JSON.parse(match[1]);
            // Search for sheets in the common paths Google uses
            const sheetsData = data?.changes?.root?.spreadsheet?.sheets || 
                               data?.initialData?.sheets || [];
            
            if (!sheetsData || sheetsData.length === 0) return [];

            const discovered = sheetsData.map(s => ({
                name: (s.name || '').trim(),
                gid: (s.id || s.sheetId || '').toString()
            })).filter(s => s.name && s.gid);

            console.log('Successfully discovered sheets:', discovered);
            return discovered;
        } catch (err) {
            console.error('Sheet discovery failed:', err);
            return [];
        }
    }

    updateExternalLink(gid) {
        const externalLink = document.querySelector('.btn-spreadsheet');
        if (externalLink) {
            externalLink.href = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit?gid=${gid}#gid=${gid}`;
        }
    }

    async fetchSheetCSV(gid) {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=${gid}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.text();
        } catch (err) {
            console.error('Fetch error:', err);
            return null;
        }
    }

    parseCSV(csvData) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvData.length; i++) {
            const char = csvData[i];
            const nextChar = csvData[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                currentRow.push(currentField.trim());
                currentField = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                // End of row
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
        
        // Push last row if exists
        if (currentRow.length > 0 || currentField) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
        }

        return rows;
    }

    renderTabs() {
        if (!this.sheetTabs) return;
        this.sheetTabs.innerHTML = '';
        this.sheets.forEach((sheet, index) => {
            const tab = document.createElement('div');
            tab.className = 'aircraft-tab' + (index === 0 ? ' active' : '');
            tab.textContent = sheet.name;
            tab.dataset.sheetname = sheet.name; // Use sheet name as identifier
            
            tab.addEventListener('click', () => {
                // Update UI
                const allTabs = this.sheetTabs.querySelectorAll('.aircraft-tab');
                allTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update external link button
                this.updateExternalLink(sheet.gid);
                
                // Load Data
                this.loadSheetData(sheet.name);
            });
            
            this.sheetTabs.appendChild(tab);
        });
    }

    loadSheetData(name) {
        const sheet = this.sheets.find(s => s.name === name);
        if (!sheet) return;

        const rows = sheet.data;
        
        // Find header row (usually row 4, index 3)
        // We look for a row containing "Organization", "ADs", or "Applicability"
        let headerRowIndex = 3; // Default
        for (let i = 0; i < Math.min(rows.length, 12); i++) {
            const row = rows[i];
            if (row && row.some(cell => {
                if (!cell) return false;
                const c = cell.toLowerCase();
                return c.includes('organization') || c.includes('ads') || c.includes('applicability');
            })) {
                headerRowIndex = i;
                break;
            }
        }

        const headers = rows[headerRowIndex] || [];
        const colMap = {};
        
        // Create a mapping from header name to column index
        headers.forEach((h, idx) => {
            if (!h) return;
            const header = h.toLowerCase().trim();
            
            if (header.includes('doc')) colMap.docNo = idx;
            else if (header.includes('org')) colMap.org = idx;
            else if (header.includes('biweekly')) colMap.biweekly = idx;
            else if (header.includes('affected')) colMap.affectedAds = idx;
            else if (header === 'ad' || header === 'ads') colMap.ads = idx;
            else if ((header.includes('ad ') || header.includes('ad-') || header.startsWith('ad')) && colMap.ads === undefined) colMap.ads = idx;
            else if (header.includes('effective')) colMap.effectiveDate = idx;
            else if (header.includes('subject')) colMap.subject = idx;
            else if (header.includes('applicability')) colMap.applicability = idx;
            else if (header.includes('reason')) colMap.reason = idx;
            else if (header.includes('compliance')) colMap.compliance = idx;
            else if (header.includes('one time')) colMap.oneTime = idx;
            else if (header.includes('recur')) colMap.recur = idx;
            else if (header.includes('next due')) colMap.nextDue = idx;
            else if (header.includes('remark')) colMap.remark = idx;
        });

        const dataRows = rows.slice(headerRowIndex + 1).filter(row => {
            if (!row || row.length === 0) return false;
            // Check if it has an organization or ADs number
            const org = colMap.org !== undefined ? (row[colMap.org] || '') : '';
            const ads = colMap.ads !== undefined ? (row[colMap.ads] || '') : '';
            return (org.trim() !== '') || (ads.trim() !== '');
        });
        
        this.currentSheetData = dataRows.map(row => {
            const getValue = (idx) => (idx !== undefined && row[idx]) ? row[idx].trim() : '';
            return {
                docNo: getValue(colMap.docNo),
                org: getValue(colMap.org),
                biweekly: getValue(colMap.biweekly),
                ads: getValue(colMap.ads),
                effectiveDate: getValue(colMap.effectiveDate),
                subject: getValue(colMap.subject),
                affectedAds: getValue(colMap.affectedAds),
                applicability: getValue(colMap.applicability),
                reason: getValue(colMap.reason),
                compliance: getValue(colMap.compliance),
                oneTime: getValue(colMap.oneTime),
                recur: getValue(colMap.recur),
                nextDue: getValue(colMap.nextDue),
                remark: getValue(colMap.remark)
            };
        });

        this.renderTable(this.currentSheetData);
    }

    renderTable(data) {
        if (data.length === 0) {
            this.adsContent.innerHTML = '<div class="no-data">ไม่พบข้อมูล ADs</div>';
            return;
        }

        let html = `<table>
            <thead>
                <tr>
                    <th>Doc No.</th>
                    <th>Org</th>
                    <th>ADs No.</th>
                    <th>Effective Date</th>
                    <th>Subject / Applicability</th>
                    <th>Reason</th>
                    <th>Compliance / Record</th>
                    <th>Next Due</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody>`;

        data.forEach(item => {
            const isCompleted = item.remark && item.remark.includes('กษ');
            const rowClass = isCompleted ? 'row-completed' : 'row-pending';
            
            html += `<tr class="${rowClass}">
                <td><small>${item.docNo || '-'}</small></td>
                <td><span class="ads-org-badge">${item.org || '-'}</span></td>
                <td>
                    <span class="ads-no">${item.ads || '-'}</span>
                    ${item.biweekly ? `<br><small style="color:#666">Biweekly: ${item.biweekly}</small>` : ''}
                </td>
                <td><strong>${item.effectiveDate || '-'}</strong></td>
                <td>
                    <div class="ads-subject">${item.subject || '-'}</div>
                    ${item.applicability ? `<div class="ads-applicability"><small><strong>Applicability:</strong> ${item.applicability}</small></div>` : ''}
                </td>
                <td><div class="ads-reason-text">${item.reason || '-'}</div></td>
                <td>
                    <div class="ads-compliance-text">${item.compliance || ''}</div>
                    <div class="ads-badges">
                        ${item.oneTime ? `<span class="ads-status-badge status-one-time" title="One Time">One Time</span> <small>${item.oneTime}</small><br>` : ''}
                        ${item.recur ? `<span class="ads-status-badge status-recur" title="Recur">Recur</span> <small>${item.recur}</small>` : ''}
                    </div>
                </td>
                <td><strong>${item.nextDue || '-'}</strong></td>
                <td>${item.remark || '-'}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        this.adsContent.innerHTML = html;
    }

    filterData(query) {
        if (!query) {
            this.renderTable(this.currentSheetData);
            return;
        }
        
        const q = query.toLowerCase();
        const filtered = this.currentSheetData.filter(item => {
            return (
                (item.org && item.org.toLowerCase().includes(q)) ||
                (item.ads && item.ads.toLowerCase().includes(q)) ||
                (item.subject && item.subject.toLowerCase().includes(q)) ||
                (item.applicability && item.applicability.toLowerCase().includes(q)) ||
                (item.docNo && item.docNo.toLowerCase().includes(q)) ||
                (item.compliance && item.compliance.toLowerCase().includes(q))
            );
        });
        
        this.renderTable(filtered);
    }

    exportToPDF() {
        const activeTab = this.sheetTabs ? this.sheetTabs.querySelector('.active') : null;
        if (!activeTab) return;
        
        const sheetName = activeTab.dataset.sheetname;
        const sheet = this.sheets.find(s => s.name === sheetName);
        const gid = sheet ? sheet.gid : '0';

        // Construct the Google Sheets PDF export URL using GID (required by Google)
        const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=pdf&gid=${gid}&size=A4&portrait=false&fitw=true&gridlines=false`;
        window.open(url, '_blank');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adsManager = new ADsManager();
});
