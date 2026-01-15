class MaintenancePlanningManager {
    constructor() {
        this.aircraftData = [];
        this.engineData = [];
        this.propellerData = [];
        this.aircraftDetails = [];
        this.dailyHoursMap = new Map();
        this.defaultDailyHours = 0;
        this.currentYear = new Date().getFullYear();
        this.aircraftModelMap = new Map();
        
        this.init();
    }

    async init() {
        this.showLoading();
        this.setupEventListeners();
        this.setupModalListeners();
        await this.loadData();
        this.hideLoading();
        this.adjustStickyHeaders();
    }

    adjustStickyHeaders() {
        const firstHeaderRow = document.querySelector('#planningTable thead tr:first-child');
        if (firstHeaderRow) {
            const h1 = firstHeaderRow.offsetHeight;
            document.documentElement.style.setProperty('--header-row1-height', h1 + 'px');
            
            const secondHeaderRow = document.querySelector('#planningTable thead tr:nth-child(2)');
            if (secondHeaderRow) {
                const h2 = secondHeaderRow.offsetHeight;
                document.documentElement.style.setProperty('--header-total-height', (h1 + h2) + 'px');
            }
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.adjustStickyHeaders());
    }

    setupModalListeners() {
        const modal = document.getElementById('detailsModal');
        const closeBtn = document.querySelector('.close-modal');
        const closeBtnBottom = document.querySelector('.close-btn');

        if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
        if (closeBtnBottom) closeBtnBottom.onclick = () => modal.style.display = "none";
        
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = "none";
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    async loadData() {
        console.log('📡 กำลังโหลดข้อมูลสำหรับการวางแผน...');
        try {
            // 1. Load Aircraft Data and calculate daily hours (60-day average)
            const flightService = new FlightStatusService();
            const today = new Date().toISOString().split('T')[0];
            
            const todayData = await flightService.fetchAircraftData(today);
            this.aircraftData = todayData || [];
            
            try {
                // Get data from 1 year ago or oldest available for average calculation
                const oneYearAgoDate = new Date();
                oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 365);
                const oneYearAgoStr = oneYearAgoDate.toISOString().split('T')[0];
                
                console.log(`📊 กำลังคำนวณค่าเฉลี่ย (ย้อนหลังไม่เกิน 1 ปี หรือเท่าที่มีข้อมูล)`);
                const historicalResult = await flightService.fetchHistoricalData(oneYearAgoStr);
                
                if (todayData && historicalResult && historicalResult.data) {
                    const pastData = historicalResult.data;
                    const pastDateStr = historicalResult.date;
                    
                    const date1 = new Date(today);
                    const date2 = new Date(pastDateStr);
                    const diffDays = Math.max(1, Math.round(Math.abs((date1 - date2) / (24 * 60 * 60 * 1000))));
                    
                    console.log(`📅 ช่วงเวลาที่ใช้คำนวณ: ${pastDateStr} ถึง ${today} (รวม ${diffDays} วัน)`);

                    todayData.forEach(ac => {
                        const pastAc = pastData.find(p => p.aircraftNumber === ac.aircraftNumber);
                        if (pastAc) {
                            const todayHours = this.parseTimeToDecimal(ac.flightHours);
                            const pastHours = this.parseTimeToDecimal(pastAc.flightHours);
                            
                            if (todayHours !== null && pastHours !== null) {
                                const hoursDiff = todayHours - pastHours;
                                if (hoursDiff >= 0) {
                                    // Average over actual days difference
                                    const avgDaily = hoursDiff / diffDays;
                                    this.dailyHoursMap.set(ac.aircraftNumber, avgDaily);
                                    console.log(`✈️ ${ac.aircraftNumber}: เฉลี่ย ${diffDays} วัน = ${avgDaily.toFixed(3)} ชม./วัน (รวม ${hoursDiff.toFixed(1)} ชม.)`);
                                }
                            }
                        }
                    });
                }
            } catch (err) {
                console.warn('⚠️ ไม่สามารถโหลดข้อมูลย้อนหลังได้:', err);
            }

            // 2. Load Engine Data
            const sheetService = new GoogleSheetsService();
            
            // Fetch detailed aircraft data for 'repairDue' info (like in aircraft-information.html)
            try {
                console.log('📊 กำลังโหลดข้อมูลรายละเอียดอากาศยานเพื่อดึงค่า "ครบกำหนดซ่อม" ของเครื่องยนต์...');
                this.aircraftDetails = await sheetService.getAllAircraftData();
            } catch (err) {
                console.warn('⚠️ ไม่สามารถโหลดข้อมูลรายละเอียดอากาศยานได้:', err);
            }

            const engineCSV = await sheetService.getSheetDataAsCSV('1198442843');
            this.engineData = this.cleanCSVData(this.parseCSV(engineCSV));

            // 3. Load Propeller Data
            const propCSV = await sheetService.getSheetDataAsCSV('1236353937');
            this.propellerData = this.cleanCSVData(this.parseCSV(propCSV));

            console.log(`✅ โหลดข้อมูลสำเร็จ: AC=${this.aircraftData.length}, EN=${this.engineData.length}, PR=${this.propellerData.length}`);
            this.renderTable();
        } catch (error) {
            console.error('❌ Error loading data:', error);
        }
    }

    getPreviousDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }

    cleanCSVData(rows) {
        if (!rows || rows.length === 0) return [];
        
        // Find the actual header row (e.g., contains 'Model' or 'S/N')
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const rowStr = rows[i].join(',').toLowerCase();
            if (rowStr.includes('model') && (rowStr.includes('s/n') || rowStr.includes('serial'))) {
                headerIdx = i;
                break;
            }
        }
        
        if (headerIdx === -1) return rows;
        
        // Return rows after header and filter empty rows
        return rows.slice(headerIdx + 1).filter(row => {
            return row.some(cell => cell && cell.trim().length > 0);
        });
    }

    parseTimeToDecimal(timeStr, isSKA = false) {
        if (!timeStr || timeStr === '-' || typeof timeStr !== 'string') return null;
        
        // Remove commas from numbers like 2,724.24
        const cleanStr = timeStr.replace(/,/g, '');

        if (cleanStr.includes(':')) {
            const [hh, mm] = cleanStr.split(':').map(Number);
            return hh + (mm / 60);
        }
        
        const val = parseFloat(cleanStr);
        if (isNaN(val)) return null;

        // Special handling for SKA-350: .24 means 24 minutes
        if (isSKA && cleanStr.includes('.')) {
            const parts = cleanStr.split('.');
            const hh = parseInt(parts[0]);
            const mm = parseInt(parts[1].substring(0, 2)); // Take only first 2 digits of decimal as minutes
            return hh + (mm / 60);
        }

        return val;
    }

    parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/);
        const result = [];
        let inQuotes = false;
        let currentField = '';
        let currentRow = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line && i === lines.length - 1) break;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            
            if (!inQuotes) {
                currentRow.push(currentField.trim());
                result.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += '\n';
            }
        }
        return result;
    }

    getDailyHours(aircraftNumber) {
        // Since settings-panel was removed, we default to using actual increase if available
        const useActual = true;
        if (useActual && this.dailyHoursMap.has(aircraftNumber)) {
            return this.dailyHoursMap.get(aircraftNumber);
        }
        return this.defaultDailyHours;
    }

    projectYear(remainingHours, dailyHours) {
        if (remainingHours <= 0) return this.currentYear;
        
        // If daily hours is 0 but remaining is very low, assume it's due this year
        if (!dailyHours || dailyHours <= 0) {
            return (remainingHours < 50) ? this.currentYear : null;
        }
        
        const daysRemaining = remainingHours / dailyHours;
        const projectedDate = new Date();
        projectedDate.setDate(projectedDate.getDate() + daysRemaining);
        return projectedDate.getFullYear();
    }

    getBEYear(adYear) {
        return adYear ? adYear + 543 : null;
    }

    normalizeYear(year) {
        if (!year) return null;
        let y = parseInt(year);
        if (isNaN(y)) return null;
        if (y < 100) y += (y > 50 ? 1900 : 2000);
        if (y > 2400) y -= 543;
        return y;
    }

    formatDecimalToTime(decimal, isSKA = false, isPropeller = false) {
        if (decimal === null || isNaN(decimal)) return '-';
        
        // Special case: Propeller TBO often uses Year format (e.g., 6:00 = 6 Years)
        if (isPropeller && decimal >= 1 && decimal <= 12 && (decimal % 1 === 0)) {
            return `${Math.floor(decimal)} Y`;
        }

        const absDecimal = Math.abs(decimal);
        const hh = Math.floor(absDecimal);
        const mm = Math.round((absDecimal - hh) * 60);
        const sign = decimal < 0 ? '-' : '';
        
        if (isSKA) {
            // SKA format uses .MM (e.g., 4628.24)
            return `${sign}${hh.toLocaleString()}.${mm.toString().padStart(2, '0')}`;
        }
        
        return `${sign}${hh.toLocaleString()}:${mm.toString().padStart(2, '0')}`;
    }

    renderTable() {
        const tbody = document.getElementById('planningTableBody');
        tbody.innerHTML = '';

        // Update table headers to show dynamic years
        this.updateTableHeaders();

        // --- 1. Render Aircraft Section ---
        const acHeader = document.createElement('tr');
        acHeader.innerHTML = '<td colspan="11" class="category-header category-aircraft"><i class="fas fa-plane"></i> อากาศยาน (Aircraft) - อ้างอิงจาก A CHECK</td>';
        tbody.appendChild(acHeader);

        this.aircraftData.forEach(ac => {
            this.aircraftModelMap.set(ac.aircraftNumber, ac.model);
            const isSKA = ac.model?.includes('SKA') || ac.model?.includes('King Air');
            const currentHours = this.parseTimeToDecimal(ac.flightHours, isSKA);
            let targetHours = this.parseTimeToDecimal(ac.checkStatus, isSKA);
            let remaining = (targetHours && currentHours) ? targetHours - currentHours : null;
            let projectedYear = null;
            const dailyHours = this.getDailyHours(ac.aircraftNumber);

            let tbo = '-';
            let hsi = '-';
            let remark = ac.remarks || '';

            // Try to get "Repair Due" date or hours from detailed aircraft info (A CHECK)
            if (this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acDetail = this.aircraftDetails.find(ad => ad.aircraftId === ac.aircraftNumber);
                if (acDetail && acDetail.components && acDetail.components.aircraft) {
                    const comp = acDetail.components.aircraft;
                    tbo = comp.tboRemaining || '-';
                    hsi = comp.hsiRemaining || '-';
                    if (comp.notes) remark = comp.notes;
                    
                    const repairDue = comp.repairDue;
                    if (repairDue && repairDue !== '-') {
                        // Check if it's a date (e.g., 17/01/2004 or 2024-12-31)
                        const dateParts = repairDue.split('/');
                        if (dateParts.length === 3 || repairDue.includes('-')) {
                            if (dateParts.length === 3) {
                                projectedYear = this.normalizeYear(dateParts[2]);
                            } else {
                                const d = new Date(repairDue);
                                if (!isNaN(d.getTime())) projectedYear = d.getFullYear();
                            }
                        } else {
                            // Try as remaining hours
                            const remainingFromDetail = this.parseTimeToDecimal(repairDue);
                            if (remainingFromDetail !== null) {
                                remaining = remainingFromDetail;
                                projectedYear = this.projectYear(remaining, dailyHours);
                            }
                        }
                    }
                }
            }

            // Fallback to hours-based calculation if not determined by repairDue date
            if (projectedYear === null && remaining !== null) {
                projectedYear = this.projectYear(remaining, dailyHours);
            }

            // If already expired or reached target, set to current year
            if (projectedYear !== null && projectedYear < this.currentYear) {
                projectedYear = this.currentYear;
            }

            if (currentHours !== null) {
                this.appendRow(tbody, {
                    name: ac.name + ' (' + ac.aircraftNumber + ')',
                    sn: ac.aircraftNumber,
                    current: currentHours,
                    target: targetHours,
                    remaining: remaining,
                    daily: dailyHours,
                    projectedYear: projectedYear,
                    type: 'aircraft',
                    tbo: tbo,
                    hsi: hsi,
                    remark: remark,
                    installedIn: ac.aircraftNumber,
                    isSKA: isSKA
                });
            }
        });

        // --- 2. Render Engine Section ---
        const enHeader = document.createElement('tr');
        enHeader.innerHTML = '<td colspan="11" class="category-header category-engine"><i class="fas fa-cogs"></i> เครื่องยนต์ (Engine) - อ้างอิงจาก Overhaul Due</td>';
        tbody.appendChild(enHeader);

        const aircraftHoursMap = new Map();
        this.aircraftData.forEach(ac => {
            const isSKA = ac.model?.includes('SKA') || ac.model?.includes('King Air');
            aircraftHoursMap.set(ac.aircraftNumber, this.parseTimeToDecimal(ac.flightHours, isSKA));
        });

        this.engineData.forEach((row, idx) => {
            if (idx === 0 || row.length < 3 || !row[1] || row[1] === 'S/N') return;

            const model = row[0] || '';
            const sn = row[1] || '';
            let installedIn = row[6] || '';
            
            const acModel = this.aircraftModelMap.get(installedIn);
            const isSKA = (acModel?.includes('SKA') || acModel?.includes('King Air') || model.includes('PT6A-60A'));
            
            const overhaulDue = this.parseTimeToDecimal(row[2], isSKA);
            
            // Try to find which aircraft this engine belongs to from aircraftDetails
            if (this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acWithThisEngine = this.aircraftDetails.find(ac => 
                    ac.components && ac.components.engines && 
                    ac.components.engines.some(e => e.serialNumber && sn && (e.serialNumber.includes(sn) || sn.includes(e.serialNumber)))
                );
                if (acWithThisEngine) {
                    installedIn = acWithThisEngine.aircraftId;
                }
            }

            let currentHours = this.parseTimeToDecimal(row[3], isSKA);
            if (installedIn && aircraftHoursMap.has(installedIn)) {
                currentHours = aircraftHoursMap.get(installedIn);
            }

            let tbo = '-';
            let hsi = '-';
            let remarkFromDetails = '';
            let remaining = null;

            if (installedIn && this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acDetail = this.aircraftDetails.find(ad => ad.aircraftId === installedIn);
                if (acDetail && acDetail.components && acDetail.components.engines) {
                    let engineDetail = acDetail.components.engines.find(ed => 
                        ed.serialNumber && sn && (ed.serialNumber.includes(sn) || sn.includes(ed.serialNumber))
                    );
                    
                    if (!engineDetail) {
                        const enginesForThisAC = this.engineData.slice(0, idx + 1).filter(r => r[6] === installedIn);
                        const engineIndex = enginesForThisAC.length - 1;
                        engineDetail = acDetail.components.engines[engineIndex];
                    }

                    if (engineDetail) {
                        tbo = engineDetail.tboRemaining || '-';
                        hsi = engineDetail.hsiRemaining || '-';
                        remarkFromDetails = engineDetail.notes || '';

                        if (engineDetail.repairDue && engineDetail.repairDue !== '-') {
                            remaining = this.parseTimeToDecimal(engineDetail.repairDue);
                        }
                    }
                }
            }

            if (!isNaN(overhaulDue) && !isNaN(currentHours)) {
                if (remaining === null) {
                    const usedInCycle = currentHours % overhaulDue;
                    remaining = overhaulDue - usedInCycle;
                }
                
                const dailyHours = this.getDailyHours(installedIn);
                let projectedYear = this.projectYear(remaining, dailyHours);

                if (remaining < 100 && (!installedIn || installedIn === '-' || installedIn.trim() === '')) {
                    projectedYear = this.currentYear;
                }

                if (projectedYear !== null && projectedYear < this.currentYear) {
                    projectedYear = this.currentYear;
                }

                this.appendRow(tbody, {
                    name: `Engine ${model} [in ${installedIn || '-'}]`,
                    sn: sn,
                    current: currentHours,
                    target: overhaulDue,
                    remaining: remaining,
                    daily: dailyHours,
                    projectedYear: projectedYear,
                    type: 'engine',
                    tbo: tbo,
                    hsi: hsi,
                    remark: remarkFromDetails || row[21] || '',
                    installedIn: installedIn,
                    isSKA: isSKA
                });
            }
        });

        // --- 3. Render Propeller Section ---
        const propHeader = document.createElement('tr');
        propHeader.innerHTML = '<td colspan="11" class="category-header category-propeller"><i class="fas fa-fan"></i> ใบพัด (Propeller) - อ้างอิงจาก Overhaul Hours</td>';
        tbody.appendChild(propHeader);

        this.propellerData.forEach((row, idx) => {
            if (idx === 0 || row.length < 3 || !row[1] || row[1] === 'S/N') return;

            let projectedYear = null;
            const model = row[0];
            const sn = row[1];
            
            let remark = row[5] || '';
            let installedIn = null;
            
            // Try to find which aircraft this propeller belongs to from aircraftDetails first (more reliable)
            if (this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acWithThisProp = this.aircraftDetails.find(ac => 
                    ac.components && ac.components.propellers && 
                    ac.components.propellers.some(p => p.serialNumber && sn && (p.serialNumber.includes(sn) || sn.includes(p.serialNumber)))
                );
                if (acWithThisProp) {
                    installedIn = acWithThisProp.aircraftId;
                }
            }

            // Fallback: extract from remark, but avoid common years like 2567 or 2024
            if (!installedIn) {
                const acMatch = remark.match(/\d{4}/);
                if (acMatch) {
                    const matchedId = acMatch[0];
                    const currentYearBE = new Date().getFullYear() + 543;
                    const currentYearAD = new Date().getFullYear();
                    
                    // Only accept if it's not a year and it exists in our aircraft list
                    if (parseInt(matchedId) !== currentYearBE && parseInt(matchedId) !== currentYearAD) {
                        if (this.aircraftDetails && this.aircraftDetails.some(ac => ac.aircraftId === matchedId)) {
                            installedIn = matchedId;
                        }
                    }
                }
            }

            const acModel = this.aircraftModelMap.get(installedIn);
            const isSKA = (acModel?.includes('SKA') || acModel?.includes('King Air') || model.includes('Hartzell HC-E4N-5'));
            const overhaulDue = this.parseTimeToDecimal(row[2], isSKA);
            const dueDateStr = row[4];

            let tbo = '-';
            let remaining = null;
            let remarkFromDetails = '';

            if (installedIn && this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acDetail = this.aircraftDetails.find(ad => ad.aircraftId === installedIn);
                if (acDetail && acDetail.components && acDetail.components.propellers) {
                    let propellerDetail = acDetail.components.propellers.find(pd => 
                        pd.serialNumber && sn && (pd.serialNumber.includes(sn) || sn.includes(pd.serialNumber))
                    );

                    if (propellerDetail) {
                        tbo = propellerDetail.tboRemaining || '-';
                        remarkFromDetails = propellerDetail.notes || '';
                        if (propellerDetail.repairDue && propellerDetail.repairDue !== '-') {
                            const repairDue = propellerDetail.repairDue;
                            // Check if it's a date
                            const dateParts = repairDue.split('/');
                            if (dateParts.length === 3 || repairDue.includes('-')) {
                                if (dateParts.length === 3) {
                                    projectedYear = this.normalizeYear(dateParts[2]);
                                } else {
                                    const d = new Date(repairDue);
                                    if (!isNaN(d.getTime())) projectedYear = d.getFullYear();
                                }
                            } else {
                                // Try as remaining hours
                                const val = this.parseTimeToDecimal(repairDue);
                                if (val !== null) remaining = val;
                            }
                        }
                    }
                }
            }

            if (dueDateStr && dueDateStr !== '-' && !dueDateStr.includes('ไม่พบข้อมูล')) {
                // Try to parse as date first (e.g. 25/7/2030)
                const dateParts = dueDateStr.split('/');
                if (dateParts.length === 3) {
                    projectedYear = this.normalizeYear(dateParts[2]);
                } else {
                    const yearMatch = dueDateStr.match(/\d{4}/);
                    if (yearMatch) {
                        projectedYear = this.normalizeYear(yearMatch[0]);
                    } else {
                        const shortYearMatch = dueDateStr.match(/\d{2}/);
                        if (shortYearMatch) {
                            projectedYear = this.normalizeYear(shortYearMatch[0]);
                        }
                    }
                }
            }

            const dailyHours = this.getDailyHours(installedIn);
            
            // If we have remaining hours, we can calculate/override projectedYear
            if (remaining !== null) {
                const calcYear = this.projectYear(remaining, dailyHours);
                if (calcYear) projectedYear = calcYear;
            }

            if (projectedYear !== null && projectedYear < this.currentYear) {
                projectedYear = this.currentYear;
            }

            this.appendRow(tbody, {
                name: `Propeller ${model} [in ${installedIn || '-'}]`,
                sn: sn,
                current: null,
                target: overhaulDue,
                remaining: remaining,
                daily: dailyHours,
                projectedYear: projectedYear,
                type: 'propeller',
                tbo: tbo,
                remark: remarkFromDetails || remark,
                installedIn: installedIn,
                isSKA: isSKA
            });
        });

        // Ensure sticky headers are correctly positioned after table is populated
        setTimeout(() => this.adjustStickyHeaders(), 0);
    }

    updateTableHeaders() {
        const headerRow = document.querySelector('#planningTable thead tr:nth-child(2)');
        if (!headerRow) return;

        const yearHeaders = headerRow.querySelectorAll('.year-col');
        for (let i = 0; i < yearHeaders.length; i++) {
            const adYear = this.currentYear + i;
            const beYear = adYear + 543;
            yearHeaders[i].innerHTML = `${beYear} (${adYear})`;
        }
    }

    appendRow(tbody, data) {
        const row = document.createElement('tr');
        row.className = 'type-' + data.type;
        
        const remainingVal = (data.remaining !== null && !isNaN(data.remaining)) ? data.remaining : 9999;
        const dailyVal = (data.daily !== null && !isNaN(data.daily)) ? data.daily : 0;
        const isSKA = data.isSKA || false;
        const isPropeller = data.type === 'propeller';

        let cells = `
            <td style="text-align: left; font-weight: bold;">${data.name}</td>
            <td>${data.sn}</td>
            <td>${this.formatDecimalToTime(data.current, isSKA, isPropeller)}</td>
            <td>${this.formatDecimalToTime(data.target, isSKA, isPropeller)}</td>
            <td style="color: ${remainingVal < 200 ? '#ff3b30' : 'inherit'}; font-weight: ${remainingVal < 200 ? 'bold' : 'normal'}">${this.formatDecimalToTime(data.remaining, isSKA, isPropeller)}</td>
            <td>${this.formatDecimalToTime(data.daily, isSKA, false)}</td>
        `;

        for (let i = 0; i < 5; i++) {
            const year = this.currentYear + i;
            if (data.projectedYear === year) {
                const beYear = year + 543;
                // Escape both double and single quotes for safe use in HTML attributes
                const dataJson = JSON.stringify(data)
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                
                let dueLabel = 'OH';
                if (data.type === 'engine') {
                    const hsiVal = parseFloat(data.hsi);
                    if (!isNaN(hsiVal) && hsiVal >= 0) {
                        dueLabel = 'HSI';
                    } else {
                        dueLabel = 'OH';
                    }
                }
                
                cells += `<td class="year-col"><div class="due-indicator" onclick='window.planningManager.showDetails(${dataJson})'>${dueLabel} ${beYear}</div></td>`;
            } else if (data.projectedYear < year && data.projectedYear !== null) {
                cells += `<td class="year-col" style="opacity: 0.3; color: #ccc;">-</td>`;
            } else {
                cells += `<td class="year-col"></td>`;
            }
        }

        row.innerHTML = cells;
        tbody.appendChild(row);
    }

    showDetails(data) {
        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.innerText = `รายละเอียด: ${data.name}`;
        
        let content = '';
        
        if (data.type === 'engine') {
            const isInstalled = data.installedIn && data.installedIn !== '-' && data.installedIn !== 'N/A' && data.installedIn !== 'ไม่ระบุ';
            content += `<div class="detail-item"><div class="detail-label">S/N:</div><div class="detail-value">${data.sn}</div></div>`;
            if (isInstalled) {
                content += `<div class="detail-item"><div class="detail-label">ติดตั้งใน:</div><div class="detail-value">${data.installedIn}</div></div>`;
                content += `<div class="detail-item"><div class="detail-label">TBO คงเหลือ:</div><div class="detail-value">${data.tbo || '-'}</div></div>`;
                content += `<div class="detail-item"><div class="detail-label">HSI คงเหลือ:</div><div class="detail-value">${data.hsi || '-'}</div></div>`;
            } else {
                content += `<div class="detail-item"><div class="detail-label">สถานะ:</div><div class="detail-value">ไม่ได้ติดตั้ง</div></div>`;
            }
        } else if (data.type === 'aircraft') {
            content += `<div class="detail-item"><div class="detail-label">S/N:</div><div class="detail-value">${data.sn}</div></div>`;
        } else if (data.type === 'propeller') {
            content += `<div class="detail-item"><div class="detail-label">S/N:</div><div class="detail-value">${data.sn}</div></div>`;
        }

        // Always show Remark for all types, as requested
        content += `<div class="detail-item"><div class="detail-label">หมายเหตุ:</div><div class="detail-value">${data.remark || '-'}</div></div>`;

        body.innerHTML = content;
        modal.style.display = "block";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.planningManager = new MaintenancePlanningManager();
});
