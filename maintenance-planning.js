class MaintenancePlanningManager {
    constructor() {
        this.aircraftData = [];
        this.engineData = [];
        this.propellerData = [];
        this.aircraftDetails = [];
        this.dailyHoursMap = new Map();
        this.defaultDailyHours = 0;
        this.currentYear = new Date().getFullYear();
        
        this.init();
    }

    async init() {
        this.showLoading();
        this.setupEventListeners();
        await this.loadData();
        this.hideLoading();
    }

    setupEventListeners() {
        const recalculateBtn = document.getElementById('recalculateBtn');
        if (recalculateBtn) {
            recalculateBtn.addEventListener('click', () => {
                this.defaultDailyHours = parseFloat(document.getElementById('defaultDailyHours').value) || 1.5;
                this.renderTable();
            });
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

    parseTimeToDecimal(timeStr) {
        if (!timeStr || timeStr === '-' || typeof timeStr !== 'string') return null;
        if (timeStr.includes(':')) {
            const [hh, mm] = timeStr.split(':').map(Number);
            return hh + (mm / 60);
        }
        const val = parseFloat(timeStr);
        return isNaN(val) ? null : val;
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
        const useActual = document.getElementById('useActualIncrease').checked;
        if (useActual && this.dailyHoursMap.has(aircraftNumber)) {
            return this.dailyHoursMap.get(aircraftNumber);
        }
        return this.defaultDailyHours;
    }

    projectYear(remainingHours, dailyHours) {
        if (remainingHours <= 0) return this.currentYear;
        if (!dailyHours || dailyHours <= 0) return null;
        
        const daysRemaining = remainingHours / dailyHours;
        const projectedDate = new Date();
        projectedDate.setDate(projectedDate.getDate() + daysRemaining);
        return projectedDate.getFullYear();
    }

    getBEYear(adYear) {
        return adYear ? adYear + 543 : null;
    }

    renderTable() {
        const tbody = document.getElementById('planningTableBody');
        tbody.innerHTML = '';

        // --- 1. Render Aircraft Section ---
        const acHeader = document.createElement('tr');
        acHeader.innerHTML = '<td colspan="11" class="category-header">อากาศยาน (Aircraft) - อ้างอิงจาก A CHECK</td>';
        tbody.appendChild(acHeader);

        this.aircraftData.forEach(ac => {
            const currentHours = this.parseTimeToDecimal(ac.flightHours);
            let targetHours = this.parseTimeToDecimal(ac.checkStatus);
            let remaining = (targetHours && currentHours) ? targetHours - currentHours : null;
            let projectedYear = null;
            const dailyHours = this.getDailyHours(ac.aircraftNumber);

            // Try to get "Repair Due" date or hours from detailed aircraft info (A CHECK)
            if (this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acDetail = this.aircraftDetails.find(ad => ad.aircraftId === ac.aircraftNumber);
                if (acDetail && acDetail.components && acDetail.components.aircraft) {
                    const repairDue = acDetail.components.aircraft.repairDue;
                    if (repairDue && repairDue !== '-') {
                        // Check if it's a date (e.g., 17/01/2004 or 2024-12-31)
                        const dateParts = repairDue.split('/');
                        if (dateParts.length === 3 || repairDue.includes('-')) {
                            let year = null;
                            if (dateParts.length === 3) {
                                year = parseInt(dateParts[2]);
                                if (year < 100) year += (year > 50 ? 1900 : 2000);
                                if (year > 2500) year -= 543;
                            } else {
                                const d = new Date(repairDue);
                                if (!isNaN(d.getTime())) year = d.getFullYear();
                            }
                            
                            if (year) {
                                projectedYear = year;
                                // If it's a date, we don't necessarily have remaining hours, 
                                // but we show the target year directly.
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
                    current: currentHours.toFixed(1),
                    target: targetHours ? targetHours.toFixed(1) : '-',
                    remaining: remaining !== null ? remaining.toFixed(1) : '-',
                    daily: dailyHours.toFixed(2),
                    projectedYear: projectedYear,
                    type: 'aircraft'
                });
            }
        });

        // --- 2. Render Engine Section ---
        const enHeader = document.createElement('tr');
        enHeader.innerHTML = '<td colspan="11" class="category-header">เครื่องยนต์ (Engine) - อ้างอิงจาก Overhaul Due</td>';
        tbody.appendChild(enHeader);

        // Map engines to aircraft hours
        const aircraftHoursMap = new Map();
        this.aircraftData.forEach(ac => {
            aircraftHoursMap.set(ac.aircraftNumber, this.parseTimeToDecimal(ac.flightHours));
        });

        this.engineData.forEach((row, idx) => {
            if (idx === 0 || row.length < 3 || !row[1] || row[1] === 'S/N') return;

            const model = row[0];
            const sn = row[1];
            const overhaulDue = parseFloat(row[2]?.replace(/,/g, ''));
            const installedIn = row[6]; // Column G (INSTALL IN)

            // Use aircraft hours from daily report if available, otherwise fallback to TSN from sheet
            let currentHours = parseFloat(row[3]?.replace(/,/g, ''));
            if (installedIn && aircraftHoursMap.has(installedIn)) {
                currentHours = aircraftHoursMap.get(installedIn);
            }

            // --- IMPROVED CALCULATION FOR ENGINE ---
            // If the engine is installed in an aircraft, try to get the "ครบกำหนดซ่อม" (remaining hours)
            // from the aircraft detailed data (from aircraft-information.html source)
            let remaining = null;
            if (installedIn && this.aircraftDetails && this.aircraftDetails.length > 0) {
                const acDetail = this.aircraftDetails.find(ad => ad.aircraftId === installedIn);
                if (acDetail && acDetail.components && acDetail.components.engines) {
                    // Find the matching engine by S/N or just the correct index if multiple
                    // We'll try to match S/N first
                    let engineDetail = acDetail.components.engines.find(ed => 
                        ed.serialNumber && sn && (ed.serialNumber.includes(sn) || sn.includes(ed.serialNumber))
                    );
                    
                    // If not found by S/N, and it's a single engine aircraft or first engine row for this AC
                    if (!engineDetail) {
                        // Find how many engines of this model are in engineData for this aircraft so far
                        const enginesForThisAC = this.engineData.slice(0, idx + 1).filter(r => r[6] === installedIn);
                        const engineIndex = enginesForThisAC.length - 1;
                        engineDetail = acDetail.components.engines[engineIndex];
                    }

                    if (engineDetail && engineDetail.repairDue && engineDetail.repairDue !== '-') {
                        remaining = this.parseTimeToDecimal(engineDetail.repairDue);
                        if (remaining !== null) {
                            console.log(`🔧 Engine ${sn} in ${installedIn}: ใช้ค่า "ครบกำหนดซ่อม" จากข้อมูลละเอียด = ${remaining} ชม.`);
                        }
                    }
                }
            }

            if (!isNaN(overhaulDue) && !isNaN(currentHours)) {
                // If we didn't get remaining hours from aircraft details, calculate it
                if (remaining === null) {
                    const usedInCycle = currentHours % overhaulDue;
                    remaining = overhaulDue - usedInCycle;
                }
                
                const dailyHours = this.getDailyHours(installedIn);
                let projectedYear = this.projectYear(remaining, dailyHours);

                // If engine remaining < 100 and not installed, set to current year
                if (remaining < 100 && (!installedIn || installedIn === '-' || installedIn.trim() === '')) {
                    projectedYear = this.currentYear;
                }

                // If already expired, set to current year
                if (projectedYear !== null && projectedYear < this.currentYear) {
                    projectedYear = this.currentYear;
                }

                this.appendRow(tbody, {
                    name: `Engine ${model} (In: ${installedIn || 'N/A'})`,
                    sn: sn,
                    current: currentHours.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                    target: overhaulDue.toLocaleString(),
                    remaining: remaining.toFixed(1),
                    daily: dailyHours.toFixed(2),
                    projectedYear: projectedYear,
                    type: 'engine'
                });
            }
        });

        // --- 3. Render Propeller Section ---
        const propHeader = document.createElement('tr');
        propHeader.innerHTML = '<td colspan="11" class="category-header">ใบพัด (Propeller) - อ้างอิงจาก Overhaul Hours</td>';
        tbody.appendChild(propHeader);

        this.propellerData.forEach((row, idx) => {
            if (idx === 0 || row.length < 3 || !row[1] || row[1] === 'S/N') return;

            const model = row[0];
            const sn = row[1];
            const overhaulDue = parseFloat(row[2]?.replace(/,/g, ''));
            const dueDateStr = row[4]; // Column E (ครบกำหนดซ่อม)
            const remark = row[5] || '';
            
            // Try to find aircraft number in remark
            let installedIn = null;
            const acMatch = remark.match(/\d{4}/);
            if (acMatch) installedIn = acMatch[0];

            // Propeller overhaul calculation based on year from dueDateStr (Column E)
            let projectedYear = null;
            if (dueDateStr && dueDateStr !== '-') {
                // Extract year from date string (e.g., "15/01/2571" or "2028-05-20")
                const yearMatch = dueDateStr.match(/\d{4}/);
                if (yearMatch) {
                    projectedYear = parseInt(yearMatch[0]);
                    if (projectedYear > 2500) projectedYear -= 543; // Convert BE to AD
                } else {
                    const parts = dueDateStr.split('/');
                    if (parts.length === 3) {
                        let year = parseInt(parts[2]);
                        if (year < 100) year += (year > 50 ? 1900 : 2000);
                        if (year > 2500) year -= 543;
                        projectedYear = year;
                    }
                }
            }

            const dailyHours = this.getDailyHours(installedIn);

            // If already expired, set to current year
            if (projectedYear !== null && projectedYear < this.currentYear) {
                projectedYear = this.currentYear;
            }

            this.appendRow(tbody, {
                name: `Propeller ${model} (In: ${installedIn || 'N/A'})`,
                sn: sn,
                current: '-',
                target: overhaulDue ? overhaulDue.toLocaleString() : '-',
                remaining: '-',
                daily: dailyHours.toFixed(2),
                projectedYear: projectedYear,
                type: 'propeller'
            });
        });
    }

    appendRow(tbody, data) {
        const row = document.createElement('tr');
        row.className = 'type-' + data.type;
        
        const isNumericRemaining = !isNaN(parseFloat(data.remaining));
        const remainingVal = isNumericRemaining ? parseFloat(data.remaining) : 9999;

        let cells = `
            <td style="text-align: left; font-weight: bold;">${data.name}</td>
            <td>${data.sn}</td>
            <td>${data.current}</td>
            <td>${data.target}</td>
            <td style="color: ${remainingVal < 50 ? '#ff3b30' : 'inherit'}; font-weight: ${remainingVal < 50 ? 'bold' : 'normal'}">${data.remaining}</td>
            <td>${data.daily}</td>
        `;

        for (let year = 2026; year <= 2030; year++) {
            if (data.projectedYear === year) {
                const beYear = year + 543;
                cells += `<td><div class="due-indicator">Due ${beYear}</div></td>`;
            } else if (data.projectedYear < year && data.projectedYear !== null) {
                cells += `<td style="opacity: 0.3; color: #ccc;">-</td>`;
            } else {
                cells += `<td></td>`;
            }
        }

        row.innerHTML = cells;
        tbody.appendChild(row);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.planningManager = new MaintenancePlanningManager();
});
