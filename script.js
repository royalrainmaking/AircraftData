// Aircraft Data Management System
class AircraftDataManager {
    constructor() {
        this.aircraftList = document.getElementById('aircraftList');
        this.aircraftData = []; // Store aircraft data for modal use
        this.searchInput = document.getElementById('searchInput');
        this.searchResultsCount = document.getElementById('searchResultsCount');
        this.sidebarList = document.getElementById('sidebarList');
        this.sidebarCount = document.getElementById('sidebarCount');
        
        this.allAircraftData = []; // เก็บข้อมูลทั้งหมด
        this.filteredAircraftData = []; // เก็บข้อมูลที่กรองแล้ว
        
        this.init();
    }

    init() {
        this.showLoading();
        this.setupEventListeners();
        this.loadAircraftData(); // Load data from local JSON files
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchAircraft(e.target.value);
            });

            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.searchInput.value = '';
                    this.searchAircraft('');
                    this.searchInput.blur();
                }
            });
        }
    }

    showLoading() {
        this.aircraftList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    }

    showError(message) {
        this.aircraftList.innerHTML = `<div class="error">เกิดข้อผิดพลาด: ${message}</div>`;
    }

    // Load aircraft data from Google Sheets with local JSON fallback
    async loadAircraftData() {
        try {
            console.log('Loading aircraft data from Google Sheets...');
            await this.loadFromGoogleSheets();
        } catch (error) {
            console.error('Error loading aircraft data from Google Sheets:', error);
            console.log('Falling back to local JSON files...');
            try {
                await this.loadFromLocalJSON();
            } catch (fallbackError) {
                console.error('Error loading from local JSON:', fallbackError);
                this.showError(`ไม่สามารถโหลดข้อมูลได้: ${error.message}`);
            }
        }
    }

    // Load aircraft data from Google Sheets
    async loadFromGoogleSheets() {
        try {
            console.log('Fetching data from Google Sheets...');
            
            // Create GoogleSheetsService instance
            const googleSheetsService = new GoogleSheetsService();
            const data = await googleSheetsService.getAllAircraftData();
            
            if (data && data.length > 0) {
                console.log('Aircraft data loaded from Google Sheets:', data.length, 'aircraft');
                console.log('First aircraft data from Google Sheets:', JSON.stringify(data[0], null, 2));
                this.aircraftData = data;
                this.allAircraftData = data;
                this.filteredAircraftData = [...data];
                this.renderResults();
                this.showDataSourceInfo(new Date().toISOString(), 'Google Sheets');
            } else {
                throw new Error('ไม่พบข้อมูลใน Google Sheets');
            }
        } catch (error) {
            console.error('Error loading from Google Sheets:', error);
            throw error;
        }
    }

    // Load aircraft data from local JSON file as fallback
    async loadFromLocalJSON() {
        try {
            // Try test data first for debugging
            console.log('Loading data from test-data.json...');
            let response = await fetch('./test-data.json');
            
            if (!response.ok) {
                console.log('test-data.json not found, trying updated-aircraft-data.json...');
                response = await fetch('./updated-aircraft-data.json');
                
                if (!response.ok) {
                    throw new Error('ไม่พบไฟล์ข้อมูล');
                }
            }
            
            const jsonData = await response.json();
            // Handle different JSON structures
            const data = jsonData.data || jsonData; // Support both {data: [...]} and [...] formats
            console.log('Aircraft data loaded:', data.length, 'aircraft');
            console.log('First aircraft data:', JSON.stringify(data[0], null, 2));
            this.aircraftData = data;
            this.allAircraftData = data;
            this.filteredAircraftData = [...data];
            this.renderResults();
            this.showDataSourceInfo(new Date().toISOString(), 'ไฟล์ข้อมูลท้องถิ่น');
            
        } catch (error) {
            console.error('Error loading from local JSON:', error);
            throw error;
        }
    }
    
    // Show data source information
    showDataSourceInfo(timestamp, source = 'ไฟล์ข้อมูลท้องถิ่น') {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'data-source-info';
        infoDiv.innerHTML = `
            <div class="info-content">
                <span class="info-label">ข้อมูลจาก:</span>
                <span class="info-value">${source}</span>
                <span class="info-timestamp">อัปเดตล่าสุด: ${new Date(timestamp).toLocaleString('th-TH')}</span>
                <button class="refresh-btn" onclick="location.reload()">
                    <span class="material-icons">refresh</span>รีเฟรชข้อมูล
                </button>
            </div>
        `;
        
        const container = document.querySelector('.summary-section');
        container.insertBefore(infoDiv, document.getElementById('aircraftList'));
    }

    renderAircraftData(data) {
        if (!data || data.length === 0) {
            this.aircraftList.innerHTML = '<div class="no-data">ไม่พบข้อมูลอากาศยาน</div>';
            return;
        }

        const html = data.map(aircraft => this.createAircraftCard(aircraft)).join('');
        this.aircraftList.innerHTML = html;
        this.updateNavNotification();
    }

    createAircraftCard(aircraft) {
        const aircraftImage = this.getAircraftImage(aircraft.components.aircraft?.model);
        const flightHours = aircraft.flightHours || 'ไม่ระบุ';
        const isAOG = this.isAOGHelicopter(aircraft);
        
        return `
            <div class="aircraft-row ${isAOG ? 'aog-helicopter' : ''}" data-aircraft-id="${aircraft.aircraftId}" onclick="window.aircraftManager.showDetailModal('${aircraft.aircraftId}')">
                <div class="aircraft-header" style="background-image: url('${aircraftImage}');">
                    <div class="aircraft-info">
                        <h4>อากาศยาน ${aircraft.aircraftId}</h4>
                        <div class="flight-hours">FH: ${flightHours}</div>
                    </div>
                </div>
                <div class="aircraft-progress-bars">
                    ${this.createProgressBarSection(aircraft)}
                </div>
                <div class="click-hint">
                    <span><span class="material-symbols-outlined">visibility</span>คลิกเพื่อดูรายละเอียด</span>
                </div>
            </div>
        `;
    }

    // Helper function to identify if aircraft is a helicopter
    isHelicopter(aircraft) {
        if (!aircraft || !aircraft.components || !aircraft.components.aircraft) return false;
        const modelUpper = (aircraft.components.aircraft.model || '').toUpperCase();
        const idStr = (aircraft.aircraftId || '').toString();
        return modelUpper.includes('BELL') || 
               modelUpper.includes('AS350') || 
               modelUpper.includes('EC130') || 
               modelUpper.includes('H130') || 
               idStr === '2321' || 
               idStr === '2322' ||
               idStr === '2311';
    }

    // Helper function to identify helicopters that should be shown as AOG
    isAOGHelicopter(aircraft) {
        if (!this.isHelicopter(aircraft)) return false;
        const idStr = (aircraft.aircraftId || '').toString();
        // Exception for the 3 specific helicopters
        return !(idStr === '2321' || idStr === '2322' || idStr === '2311');
    }

    getAircraftEmoji(model) {
        if (!model) return '✈️'; // default
        
        const modelUpper = model.toUpperCase();
        
        if (modelUpper.includes('CARAVAN') || modelUpper.includes('C208')) {
            return '🛩️';
        } else if (modelUpper.includes('CASA') || modelUpper.includes('NC212')) {
            return '✈️';
        } else if (modelUpper.includes('CN235') || modelUpper.includes('CN 235')) {
            return '✈️';
        } else if (modelUpper.includes('SUPERKINGAIR') || modelUpper.includes('SUPER KING AIR') || modelUpper.includes('350')) {
            return '🛩️';
        }
        
        return '✈️'; // default
    }

    getAircraftImage(model) {
        if (!model) return 'img/Caravan.jpg';
        const modelUpper = model.toUpperCase();
        
        // Check for Helicopter models
        // BELL 206B3
        if (modelUpper.includes('BELL 206') || modelUpper.includes('BELL206')) {
            return 'img/BELL 206B3.jpg';
        }
        
        // BELL 407 and BELL 407GXP
        if (modelUpper.includes('BELL 407') || modelUpper.includes('BELL407')) {
            return 'img/BELL 407.jpg';
        }
        
        // BELL 412 EP
        if (modelUpper.includes('BELL 412') || modelUpper.includes('BELL412')) {
            return 'img/BELL 412 EP.jpg';
        }
        
        // AS350 B2
        if (modelUpper.includes('AS350') || modelUpper.includes('AS 350')) {
            return 'img/AS350 B2.jpg';
        }
        
        // EC130 (H130 T2)
        if (modelUpper.includes('EC130') || modelUpper.includes('H130') || 
            modelUpper.includes('EC 130') || modelUpper.includes('H 130')) {
            return 'img/EC130 (H130 T2).png';
        }
        
        // L410NG
        if (modelUpper.includes('L410')) {
            return 'img/L410NG.jpg';
        }
        
        // Check for Caravan models
        if (modelUpper.includes('CARAVAN') || modelUpper.includes('C208')) {
            return 'img/Caravan.jpg';
        }
        
        // Check for Casa NC212i models (300, 400, NC212i)
        if (modelUpper.includes('300') || modelUpper.includes('400') || 
            modelUpper.includes('NC212I') || modelUpper.includes('NC-212I') ||
            modelUpper.includes('CASA')) {
            return 'img/Casa_NC212i.jpg';
        }
        
        // Check for CN-235 models
        if (modelUpper.includes('CN235') || modelUpper.includes('CN 235') || 
            modelUpper.includes('CN-235') || modelUpper.includes('CN - 235')) {
            return 'img/CN235.jpg';
        }
        
        // Check for Super King Air models
        if (modelUpper.includes('SUPERKINGAIR') || modelUpper.includes('SUPER KING AIR') || 
            modelUpper.includes('350') || modelUpper.includes('KING AIR')) {
            return 'img/SuperKingAir350.jpg';
        }
        
        return 'img/Caravan.jpg'; // default fallback
    }

    getComponentIcon(type) {
        switch(type) {
            case 'aircraft':
                return 'img/Caravan.jpg'; // Will be replaced by specific aircraft image
            case 'engine':
                return 'img/engine.jpg';
            case 'propeller':
                return 'img/propeller.jpeg';
            default:
                return '';
        }
    }

    createMultipleComponentsSection(title, components, type) {
        if (!components || components.length === 0) {
            return ''; // ไม่แสดงส่วนที่ไม่มีข้อมูล
        }

        // If only one component, show it with simple title
        if (components.length === 1) {
            return this.createComponentSection(title.slice(0, -1), components[0], type); // Remove 's' from title
        }

        // Multiple components - show each with its type (LH/RH)
        return components.map((component, index) => {
            const componentTitle = component.type || `${title.slice(0, -1)} ${index + 1}`;
            return this.createComponentSection(componentTitle, component, type);
        }).join('');
    }

    createComponentSection(title, component, type) {
        // Handle case where component is null
        if (!component) {
            return ''; // ไม่แสดงส่วนที่ไม่มีข้อมูล
        }

        const componentIcon = this.getComponentIcon(type);
        const dataItems = this.getFilteredDataItems(component);
        
        if (dataItems.length === 0) {
            return ''; // ไม่แสดงถ้าไม่มีข้อมูลที่มีค่า
        }

        return `
            <div class="component-section">
                <div class="component-title ${type}">
                    ${componentIcon ? `<img src="${componentIcon}" alt="${type}" class="component-icon" onerror="this.style.display='none'">` : ''}
                    ${title}
                </div>
                <div class="data-grid">
                    ${dataItems.join('')}
                </div>
            </div>
        `;
    }

    getFilteredDataItems(component) {
        const hasProcessing = this.hasValue(component.processingBar);
        const isHelicopter = component.type === 'Helicopter' || (component.model && (
            component.model.toUpperCase().includes('BELL') || 
            component.model.toUpperCase().includes('AS350') || 
            component.model.toUpperCase().includes('EC130') || 
            component.model.toUpperCase().includes('H130')
        ));

        const items = [];
        
        // Combined: Model และ S/N
        items.push(this.createCombinedItem([
            { label: 'Model', value: component.model },
            { label: 'S/N', value: component.serialNumber }
        ]));

        // Processing Bar (ถ้ามี) - ซ่อนสำหรับเฮลิคอปเตอร์ตามคำขอ
        if (hasProcessing && !isHelicopter) {
            items.push(this.createProcessingBarItem('Processing', component.processingBar, 'full', component.repairDue));
        }

        // Combined: ข้อมูล Overhaul
        items.push(this.createCombinedItem([
            { label: 'Overhaul (ครั้ง)', value: component.overhaul },
            { label: 'ครบรอบ Overhaul', value: component.overhaulDue },
            { label: 'TYPE', value: component.type }
        ]));

        // Combined: ชั่วโมงการใช้งาน
        items.push(this.createCombinedItem([
            { label: 'TSN', value: component.tsn },
            { label: 'TSO', value: component.tso }
        ]));

        // Combined: TBO และ HSI
        items.push(this.createCombinedItem([
            { label: 'TBO คงเหลือ', value: component.tboRemaining },
            { label: 'HSI คงเหลือ', value: component.hsiRemaining }
        ]));

        // Combined: วันที่
        items.push(this.createCombinedItem([
            { label: 'วันที่ติดตั้ง', value: component.installDate },
            { label: 'ครบกำหนดซ่อม', value: !hasProcessing ? component.repairDue : null }
        ]));

        // รวม Next Overhaul และ Next HSI ถ้ามีข้อมูล
        items.push(this.createCombinedItem([
            { label: 'Overhaul ครั้งถัดไป', value: component.nextOverhaul },
            { label: 'HSI ครั้งถัดไป', value: component.nextHSI }
        ]));

        // เอาเฉพาะที่มีข้อมูล
        return items.filter(item => item !== '');
    }

    hasValue(value) {
        return value !== null && 
               value !== undefined && 
               value !== '' && 
               value !== '-' && 
               value !== 0 && 
               String(value).trim() !== '';
    }

    createDataItem(label, value, statusClass = '', size = 'medium') {
        // ไม่แสดงถ้าไม่มีค่า
        if (!this.hasValue(value)) {
            return '';
        }

        return `
            <div class="data-item data-item-${size}">
                <div class="data-label">${label}</div>
                <div class="data-value ${statusClass}">${value}</div>
            </div>
        `;
    }

    createCombinedItem(items) {
        const validItems = items.filter(item => this.hasValue(item.value));
        if (validItems.length === 0) return '';
        
        const itemsHtml = validItems.map(item => 
            `<div class="combined-item">
                <div class="data-label">${item.label}</div>
                <div class="data-value ${item.statusClass || ''}">${item.value}</div>
            </div>`
        ).join('');
        
        const className = validItems.length <= 2 ? 'data-item-combined' : 'data-item-triple';
        return `\n<div class="data-item ${className}">${itemsHtml}</div>`;
    }

    createProcessingBarItem(label, value, size = 'full', repairDueText = '') {
        // ไม่แสดงถ้าไม่มีค่า
        if (!this.hasValue(value)) {
            return '';
        }

        // ตรวจสอบว่าเป็น expired หรือไม่
        if (value && value.toLowerCase().includes('expired')) {
            return `
                <div class="data-item processing-bar-item data-item-${size}">
                    <div class="data-label">${label}</div>
                    ${this.hasValue(repairDueText) ? `<div class="processing-caption">ครบกำหนดซ่อม: ${repairDueText}</div>` : ''}
                    <div class="expired-status">หมดอายุแล้ว (EXPIRED)</div>
                </div>
            `;
        }

        // Parse processing bar (e.g., "█████████░ 86%")
        const percentage = this.parseProcessingBar(value);
        
        // กำหนดสีตามเปอร์เซ็นต์เหมือนหน้าหลัก
        let statusClass;
        if (percentage >= 90) {
            statusClass = 'status-danger';  // สีแดงสำหรับค่าใกล้ 100%
        } else if (percentage >= 70) {
            statusClass = 'status-warning'; // สีส้มสำหรับค่าเตือน
        } else {
            statusClass = 'status-normal';  // สีเขียวสำหรับค่าปกติ
        }
        
        return `
            <div class="data-item processing-bar-item data-item-${size}">
                <div class="data-label">${label}</div>
                ${this.hasValue(repairDueText) ? `<div class="processing-caption">ครบกำหนดซ่อม: ${repairDueText}</div>` : ''}
                <div class="processing-bar-container">
                    <div class="processing-bar">
                        <div class="processing-bar-fill ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="processing-percentage">${percentage}%</div>
                </div>
            </div>
        `;
    }

    parseProcessingBar(value) {
        if (!value) return 0;
        
        // Extract percentage from strings like "█████████░ 86%" or "██░░░░░░░░ 22%"
        const match = value.toString().match(/(\d+)%/);
        return match ? parseInt(match[1]) : 0;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH');
    }

    formatHours(hours) {
        if (!hours && hours !== 0) return '-';
        return `${hours.toLocaleString()} ชั่วโมง`;
    }

    getStatusClass(remaining, warningThreshold) {
        if (remaining <= 0) return 'overdue';
        if (remaining <= warningThreshold) return 'warning';
        return 'normal';
    }

    // Calculate progress percentage from available data
    calculateProgressFromData(component) {
        console.log('=== calculateProgressFromData ===');
        console.log('Component type:', component.type);
        console.log('Component processingBar:', component.processingBar);
        console.log('Full component:', JSON.stringify(component, null, 2));
        
        // If processingBar exists, use it
        if (component.processingBar) {
            console.log('Found processingBar, parsing...');
            const percentage = this.parseProcessingBar(component.processingBar);
            console.log('Using processingBar:', component.processingBar, 'percentage:', percentage);
            return {
                hasData: true,
                percentage: percentage
            };
        } else {
            console.log('No processingBar found, trying other calculations...');
        }

        // Calculate from TBO remaining hours
        if (component.tboRemaining && component.tboRemaining.trim() !== '' && 
            component.overhaulDue && component.overhaulDue.trim() !== '') {
            const remaining = this.parseHours(component.tboRemaining);
            const total = this.parseHours(component.overhaulDue);
            console.log('TBO calculation - tboRemaining:', component.tboRemaining, 'overhaulDue:', component.overhaulDue);
            console.log('TBO calculation - remaining:', remaining, 'total:', total);
            
            if (remaining >= 0 && total > 0) {
                const used = total - remaining;
                const percentage = Math.round((used / total) * 100);
                console.log('TBO calculation - used:', used, 'percentage:', percentage);
                return {
                    hasData: true,
                    percentage: Math.max(0, Math.min(100, percentage))
                };
            }
        }

        // Calculate from HSI remaining hours
        if (component.hsiRemaining && component.hsiRemaining.trim() !== '' && 
            component.nextHSI && component.nextHSI.trim() !== '') {
            const remaining = this.parseHours(component.hsiRemaining);
            const total = this.parseHours(component.nextHSI);
            
            if (remaining >= 0 && total > 0) {
                const used = total - remaining;
                const percentage = Math.round((used / total) * 100);
                return {
                    hasData: true,
                    percentage: Math.max(0, Math.min(100, percentage))
                };
            }
        }

        // For aircraft, try to calculate from years
        if (component.type === 'Aircraft' && 
            component.repairDue && component.repairDue.trim() !== '' && 
            component.installDate && component.installDate.trim() !== '') {
            try {
                const installDate = new Date(component.installDate.split('/').reverse().join('-'));
                const repairDate = new Date(component.repairDue.split('/').reverse().join('-'));
                const currentDate = new Date();
                
                const totalTime = repairDate.getTime() - installDate.getTime();
                const usedTime = currentDate.getTime() - installDate.getTime();
                
                if (totalTime > 0) {
                    const percentage = Math.round((usedTime / totalTime) * 100);
                    console.log('Aircraft date calculation - installDate:', installDate, 'repairDate:', repairDate, 'percentage:', percentage);
                    return {
                        hasData: true,
                        percentage: Math.max(0, Math.min(100, percentage))
                    };
                }
            } catch (error) {
                console.log('Error calculating aircraft progress:', error);
            }
        }

        console.log('No progress data found for component, using fallback');
        
        // Fallback: if we have any maintenance-related data, show a default progress
        if (component.type === 'Engine' || component.type === 'Aircraft' || component.type === 'Propeller') {
            console.log('Using fallback progress for', component.type);
            return { hasData: true, percentage: 50 }; // Default 50% for testing
        }
        
        return { hasData: false, percentage: 0 };
    }

    // Parse hours from string format like "2546:00" or "3600FH"
    parseHours(hoursString) {
        if (!hoursString) return 0;
        
        const str = hoursString.toString().trim();
        
        // Handle format like "2546:00"
        if (str.includes(':')) {
            const parts = str.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            return hours + (minutes / 60);
        }
        
        // Handle format like "3600FH"
        if (str.includes('FH')) {
            return parseInt(str.replace('FH', '')) || 0;
        }
        
        // Handle format like "12Y" (years)
        if (str.includes('Y')) {
            return parseInt(str.replace('Y', '')) * 365 * 24 || 0; // Convert years to hours
        }
        
        // Try to parse as number
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    // Create progress bar section for main page display
    createProgressBarSection(aircraft) {
        // Check if it's a helicopter to hide Propellers section
        const isHelicopter = this.isHelicopter(aircraft);

        // If it's an AOG helicopter, return a special AOG display
        if (this.isAOGHelicopter(aircraft)) {
            return `
                <div class="aog-overlay">
                    <div class="aog-text">AOG</div>
                    <div class="aog-subtext">Aircraft On Ground - Waiting for data</div>
                </div>
            `;
        }

        let html = `
            <div class="progress-table-header">
                <div class="header-col col-comp">Component</div>
                <div class="header-col col-status">Progress Status</div>
                <div class="header-col col-percent">%</div>
                <div class="header-col col-details">Details</div>
            </div>
        `;

        // Aircraft section
        if (aircraft.components.aircraft) {
            const aircraftProgress = this.calculateProgressFromData(aircraft.components.aircraft);
            if (aircraftProgress.hasData) {
                const statusText = this.checkExpiredStatus(aircraft.components.aircraft);
                html += this.createCompactProgressBar('A/C', aircraftProgress.percentage, 'aircraft', statusText, aircraft.components.aircraft);
            }
        }

        // Engines section
        if (aircraft.components.engines && aircraft.components.engines.length > 0) {
            aircraft.components.engines.forEach((engine, index) => {
                if (engine) {
                    const engineProgress = this.calculateProgressFromData(engine);
                    if (engineProgress.hasData) {
                        const statusText = this.checkExpiredStatus(engine);
                        const title = engine.type || `Engine ${index + 1}`;
                        html += this.createCompactProgressBar(title, engineProgress.percentage, 'engine', statusText, engine);
                    }
                }
            });
        }

        // Propellers section
        if (!isHelicopter && aircraft.components.propellers && aircraft.components.propellers.length > 0) {
            aircraft.components.propellers.forEach((propeller, index) => {
                if (propeller) {
                    const propellerProgress = this.calculateProgressFromData(propeller);
                    if (propellerProgress.hasData) {
                        const statusText = this.checkExpiredStatus(propeller);
                        const title = propeller.type || `Propeller ${index + 1}`;
                        html += this.createCompactProgressBar(title, propellerProgress.percentage, 'propeller', statusText, propeller);
                    }
                }
            });
        }

        return html || '<div class="no-progress">ไม่มีข้อมูล Progress</div>';
    }

    // Check if component is expired
    checkExpiredStatus(component) {
        if (!component) return null;
        
        // Check if the processingBar contains 'expired' or if the component is marked as expired
        if (component.processingBar && component.processingBar.toLowerCase().includes('expired')) {
            return 'expired';
        }
        
        // Check other fields for expired status
        if (component.overhaulDue && component.overhaulDue.toLowerCase().includes('expired')) {
            return 'expired';
        }
        
        return null;
    }

    // Create compact progress bar for main page
    createCompactProgressBar(title, value, type, statusText, component = null) {
        const repairDueText = component && component.repairDue ? String(component.repairDue).trim() : '';
        const modelInfo = component && component.model ? component.model : '';
        const serialInfo = component && component.serialNumber ? component.serialNumber : '';
        const additionalInfo = modelInfo || serialInfo ? `<span class="info-text">${modelInfo}${serialInfo ? ` S/N: ${serialInfo}` : ''}</span>` : '';

        const percentage = typeof value === 'number' ? value : this.parseProcessingBar(value);
        const statusClass = this.getProgressStatusClass(percentage);
        const hasWarning = percentage >= 90;

        if (statusText === 'expired') {
            return `
                <div class="compact-progress-item ${type} expired">
                    <div class="comp-col col-comp">
                        <span class="title-text">${title}</span>
                    </div>
                    <div class="comp-col col-status">
                        <div class="slim-progress-bar expired">
                            <div class="slim-progress-fill status-danger" style="width: 100%; animation: none;"></div>
                        </div>
                    </div>
                    <div class="comp-col col-percent">
                        <span class="percentage-val status-danger">EXPIRED</span>
                    </div>
                    <div class="comp-col col-details">
                        ${additionalInfo}
                        ${this.hasValue(repairDueText) ? `<span class="due-text">Due: ${repairDueText}</span>` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div class="compact-progress-item ${type}">
                <div class="comp-col col-comp">
                    <span class="title-text">${title}</span>
                </div>
                <div class="comp-col col-status">
                    <div class="slim-progress-bar">
                        <div class="slim-progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="comp-col col-percent">
                    <span class="percentage-val ${statusClass}">${percentage}% ${hasWarning ? '!' : ''}</span>
                </div>
                <div class="comp-col col-details">
                    ${additionalInfo}
                    ${this.hasValue(repairDueText) ? `<span class="due-text">Due: ${repairDueText}</span>` : ''}
                </div>
            </div>
        `;
    }

    // Get compact repair due information for display (doesn't interfere with progress bar)
    getCompactRepairDueInfo(component) {
        if (!component || !component.repairDue) {
            return '';
        }
        
        const repairDue = component.repairDue.toString().trim();
        if (repairDue === '' || repairDue === '-') {
            return '';
        }
        
        // Check if it's a date format (d/m/yyyy or similar)
        const isDate = repairDue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
        
        if (isDate) {
            // Calculate days until repair due
            const repairDate = new Date(repairDue.split('/').reverse().join('-'));
            const today = new Date();
            const diffTime = repairDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let statusClass = 'repair-due-normal';
            let statusIcon = '🟢';
            
            if (diffDays < 0) {
                statusClass = 'repair-due-overdue';
                statusIcon = '🔴';
            } else if (diffDays <= 30) {
                statusClass = 'repair-due-warning';
                statusIcon = '🟠';
            } else if (diffDays <= 90) {
                statusClass = 'repair-due-caution';
                statusIcon = '🟡';
            }
            
            return `<div class="repair-due-compact ${statusClass}" title="ครบกำหนดซ่อม: ${repairDue} (${diffDays < 0 ? 'เกินกำหนด ' + Math.abs(diffDays) : 'อีก ' + diffDays} วัน)">${statusIcon}</div>`;
        } else {
            // Not a date format, just show indicator
            return `<div class="repair-due-compact repair-due-normal" title="ครบกำหนดซ่อม: ${repairDue}">🔧</div>`;
        }
    }

    // Determine progress status class based on percentage
    getProgressStatusClass(percentage) {
        if (percentage >= 90) {
            return 'status-danger';  // Red for near 100%
        } else if (percentage >= 70) {
            return 'status-warning'; // Orange for warning level
        } else {
            return 'status-normal';  // Green for normal
        }
    }

    // Show detail modal
    showDetailModal(aircraftId) {
        const aircraft = this.aircraftData.find(a => a.aircraftId === aircraftId);
        if (!aircraft) return;

        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `รายละเอียดอากาศยาน ${aircraftId}`;
        modalBody.innerHTML = this.createDetailedView(aircraft);

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    // Create detailed view for modal
    createDetailedView(aircraft) {
        const aircraftImage = this.getAircraftImage(aircraft.components.aircraft?.model);
        const flightHours = aircraft.flightHours || 'ไม่ระบุ';
        
        // Check if it's a helicopter to hide Propellers section
        const modelUpper = (aircraft.components.aircraft?.model || '').toUpperCase();
        const isHelicopter = modelUpper.includes('BELL') || modelUpper.includes('AS350') || modelUpper.includes('EC130') || modelUpper.includes('H130') || aircraft.aircraftId === '2321' || aircraft.aircraftId === '2322';

        return `
            <div class="detailed-aircraft">
                <div class="detailed-header">
                    <img src="${aircraftImage}" alt="Aircraft" class="detailed-aircraft-image" onerror="this.style.display='none'">
                    <div class="detailed-aircraft-info">
                        <h3>อากาศยาน ${aircraft.aircraftId}</h3>
                        <div class="flight-hours">Flight Hours: ${flightHours}</div>
                    </div>
                </div>
                <div class="detailed-components">
                    <div class="airframe-group">
                        ${this.createComponentSection('A/C (Airframe)', aircraft.components.aircraft, 'aircraft')}
                        ${aircraft.customComponents ? this.createCustomComponentsSection(aircraft.customComponents, 'Airframe') : ''}
                    </div>
                    <div class="engine-group">
                        ${!isHelicopter ? this.createMultipleComponentsSection('Engines', aircraft.components.engines || [], 'engine') : ''}
                        ${aircraft.customComponents ? this.createCustomComponentsSection(aircraft.customComponents, 'Engine') : ''}
                    </div>
                    ${!isHelicopter ? this.createMultipleComponentsSection('Propellers', aircraft.components.propellers || [], 'propeller') : ''}
                </div>
            </div>
        `;
    }

    createCustomComponentsSection(components, sectionFilter = 'Airframe') {
        if (!components || components.length === 0) return '';

        const filteredComponents = components.filter(c => (c.section || 'Airframe') === sectionFilter);
        if (filteredComponents.length === 0) return '';

        const isEngine = sectionFilter.toLowerCase() === 'engine';
        const title = isEngine ? 'รายการอุปกรณ์เครื่องยนต์ (ENGINE COMPONENTS)' : 'รายการอุปกรณ์เฮลิคอปเตอร์ (AIRFRAME COMPONENTS)';
        const icon = isEngine ? 'settings' : 'helicopter';
        const sectionClass = isEngine ? 'engine' : 'airframe';

        const rows = filteredComponents.map(comp => {
            const percentage = comp.percentage || 0;
            let statusClass = 'status-normal';
            if (percentage >= 90) statusClass = 'status-danger';
            else if (percentage >= 70) statusClass = 'status-warning';

            // Combined sub-info (P/N, TSN, TSO) in one line
            const subInfo = [];
            if (comp.partNumber) subInfo.push(comp.partNumber);
            if (comp.tsn) subInfo.push(`TSN: ${comp.tsn}`);
            if (comp.tso) subInfo.push(`TSO: ${comp.tso}`);

            return `
                <div class="heli-item">
                    <div class="heli-info">
                        <div class="heli-part-name">${comp.item}</div>
                        <div class="heli-part-number">${subInfo.join(' | ')}</div>
                    </div>
                    <div class="heli-remain-container">
                        <span class="heli-label">REMAIN</span>
                        <span class="heli-value numeric">${comp.remaining}</span>
                    </div>
                    <div class="heli-progress-container">
                        <div class="heli-progress-bar">
                            <div class="heli-progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                        </div>
                        <span class="heli-percentage ${statusClass}">${percentage}%</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="component-section helicopter-section">
                <div class="component-title ${sectionClass}">
                    <span class="material-icons">${icon}</span>
                    ${title}
                </div>
                <div class="helicopter-grid">
                    ${rows}
                </div>
            </div>
        `;
    }

    // ฟังก์ชันค้นหา
    searchAircraft(query) {
        if (!query.trim()) {
            this.filteredAircraftData = [...this.allAircraftData];
        } else {
            const searchTerm = query.toLowerCase().trim();
            this.filteredAircraftData = this.allAircraftData.filter(aircraft => {
                return this.searchInObject(aircraft, searchTerm);
            });
        }
        this.renderResults();
    }

    // ค้นหาใน object แบบ recursive
    searchInObject(obj, searchTerm) {
        if (typeof obj === 'string') {
            return obj.toLowerCase().includes(searchTerm);
        }
        if (typeof obj === 'number') {
            return obj.toString().includes(searchTerm);
        }
        if (Array.isArray(obj)) {
            return obj.some(item => this.searchInObject(item, searchTerm));
        }
        if (obj && typeof obj === 'object') {
            return Object.values(obj).some(value => this.searchInObject(value, searchTerm));
        }
        return false;
    }

    // เลื่อนไปยังรายการ
    scrollToAircraft(aircraftId) {
        const itemElement = document.querySelector(`[data-aircraft-id="${aircraftId}"]`);
        if (itemElement) {
            // Remove previous active states
            document.querySelectorAll('.aircraft-row').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            
            // Add active state
            itemElement.classList.add('active');
            document.querySelector(`[data-sidebar-aircraft-id="${aircraftId}"]`)?.classList.add('active');
            
            // Scroll to element
            itemElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    // สร้าง sidebar item
    createSidebarItem(aircraft) {
        const flightHours = aircraft.flightHours || 'ไม่ระบุ';
        const aircraftModel = aircraft.components.aircraft?.model || '-';
        
        return `
            <div class="sidebar-item" data-sidebar-aircraft-id="${aircraft.aircraftId}" onclick="window.aircraftManager.scrollToAircraft('${aircraft.aircraftId}')">
                <div class="sidebar-item-title">${aircraft.aircraftId}</div>
                <div class="sidebar-item-subtitle">${aircraftModel} • FH: ${flightHours}</div>
            </div>
        `;
    }

    // แสดงผล sidebar
    renderSidebar() {
        if (!this.sidebarList) return;

        if (this.filteredAircraftData.length === 0) {
            this.sidebarList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">ไม่พบข้อมูล</div>';
            if (this.sidebarCount) this.sidebarCount.textContent = '0 รายการ';
            return;
        }

        const sidebarHTML = this.filteredAircraftData.map(aircraft => 
            this.createSidebarItem(aircraft)
        ).join('');
        
        this.sidebarList.innerHTML = sidebarHTML;
        if (this.sidebarCount) this.sidebarCount.textContent = `${this.filteredAircraftData.length} รายการ`;
    }

    // แสดงผลทั้งหมด
    renderResults() {
        this.renderAircraftData(this.filteredAircraftData);
        this.renderSidebar();
        
        // อัปเดต search results count
        if (this.searchInput && this.searchResultsCount) {
            if (this.searchInput.value.trim()) {
                this.searchResultsCount.textContent = `พบ ${this.filteredAircraftData.length} รายการจากทั้งหมด ${this.allAircraftData.length} รายการ`;
            } else {
                this.searchResultsCount.textContent = '';
            }
        }
    }

    // Initialize modal functionality
    initModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = modal.querySelector('.close');

        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restore body scroll
        };

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore body scroll
            }
        };
    }

    updateNavNotification() {
        let warningCount = 0;
        
        this.allAircraftData.forEach(aircraft => {
            if (aircraft.components) {
                Object.values(aircraft.components).forEach(component => {
                    if (component && typeof component === 'object') {
                        if (Array.isArray(component)) {
                            component.forEach(item => {
                                const status = item && item.status ? String(item.status).toLowerCase().trim() : '';
                                if (status === 'expired') {
                                    warningCount++;
                                } else {
                                    const percentage = typeof item?.percentage === 'number' ? item.percentage : this.parseProcessingBar(item?.percentage);
                                    if (percentage >= 90) {
                                        warningCount++;
                                    }
                                }
                            });
                        } else {
                            const status = component.status ? String(component.status).toLowerCase().trim() : '';
                            if (status === 'expired') {
                                warningCount++;
                            } else {
                                const percentage = typeof component.percentage === 'number' ? component.percentage : this.parseProcessingBar(component.percentage);
                                if (percentage >= 90) {
                                    warningCount++;
                                }
                            }
                        }
                    }
                });
            }
        });
        
        const notificationBadge = document.getElementById('aircraftNavNotification');
        if (notificationBadge) {
            if (warningCount > 0) {
                notificationBadge.textContent = warningCount;
                notificationBadge.style.display = 'inline-flex';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aircraftManager = new AircraftDataManager();
    window.aircraftManager.initModal();
    window.aircraftManager.updateNavNotification();
});