class HoursDashboardManager {
    constructor() {
        this.aircraftData = [];
        this.hoursData = [];
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.searchTerm = '';
        this.chart = null;
        this.isFirstLoad = true;
        this.cachedData = {}; // เก็บข้อมูลที่ดึงมาแล้ว
        this.init();
    }

    getAircraftImage(modelName) {
        if (!modelName || modelName === 'Unknown Aircraft' || modelName === 'N/A') {
            return 'img/engine.jpg';
        }

        const name = modelName.toLowerCase().trim();

        if (name.includes('ska') || name.includes('ska-350')) return 'img/SuperKingAir350.jpg';
        if (name.includes('l410ng') || name.includes('l 410')) return 'img/L410NG.jpg';
        if (name.includes('caravan')) return 'img/Caravan.jpg';
        if (name.includes('as350') || name.includes('as 350')) return 'img/AS350 B2.jpg';
        if (name.includes('bell 206')) return 'img/BELL 206B3.jpg';
        if (name.includes('bell 407')) return 'img/BELL 407.jpg';
        if (name.includes('bell 412')) return 'img/BELL 412 EP.jpg';
        if (name.includes('ec130') || name.includes('h130')) return 'img/EC130 (H130 T2).png';
        if (name.includes('king air') || name.includes('kingair') || name.includes('super')) return 'img/SuperKingAir350.jpg';
        if (name.includes('casa') || name.includes('nc212') || name.includes('212')) return 'img/Casa_NC212i.jpg';
        if (name.includes('cn235') || name.includes('cn 235') || name.includes('cn-235')) return 'img/CN235.jpg';

        return 'img/engine.jpg';
    }

    init() {
        this.setupEventListeners();
        this.setDateInputToToday();
        this.loadData();
    }

    setupEventListeners() {
        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector) {
            dateSelector.addEventListener('change', (e) => {
                // เฉพาะเมื่อผู้ใช้เปลี่ยนวัน ค่อยโหลดข้อมูล
                this.selectedDate = e.target.value;
                this.isFirstLoad = false; // ไม่ใช่การโหลดครั้งแรก
                this.loadData();
            });
        }

        const resetDateBtn = document.getElementById('resetDateBtn');
        if (resetDateBtn) {
            resetDateBtn.addEventListener('click', () => {
                this.setDateInputToToday();
                this.selectedDate = new Date().toISOString().split('T')[0];
                this.isFirstLoad = false; // ไม่ใช่การโหลดครั้งแรก
                this.loadData();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateTable();
            });
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    setDateInputToToday() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateSelector').value = today;
    }

    async loadData() {
        console.log('📡 กำลังโหลดข้อมูลชั่วโมงบิน...');
        this.showLoading();
        
        try {
            if (typeof flightStatusService !== 'undefined') {
                let data;
                if (this.isFirstLoad) {
                    // ครั้งแรก: โหลดวันล่าสุด (ไม่ระบุ date) เพื่อให้เร็ว
                    console.log('🚀 การโหลดครั้งแรก - ดึงข้อมูลวันล่าสุด');
                    data = await flightStatusService.fetchAircraftData(null);
                    this.isFirstLoad = false;
                } else {
                    // หลังจากนั้น: โหลดข้อมูลวันที่เลือก (จะดึงจาก cache)
                    console.log(`📅 โหลดข้อมูลวันที่: ${this.selectedDate}`);
                    data = await flightStatusService.fetchAircraftData(this.selectedDate);
                }
                
                this.aircraftData = data || [];
                console.log(`✅ โหลดข้อมูลสำเร็จ: ${this.aircraftData.length} เครื่องบิน`);
                console.log('📊 Sample aircraft data:', this.aircraftData.slice(0, 3));
            } else {
                console.warn('⚠️ flightStatusService ไม่พบ');
                this.loadSampleData();
            }
            
            await this.generateHoursData();
            console.log('📋 Generated hours data:', this.hoursData.slice(0, 3));
            await this.updateSummary();
            this.updateTable();
            this.updateChart();
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            this.loadSampleData();
        } finally {
            this.hideLoading();
        }
    }

    loadSampleData() {
        this.aircraftData = [
            {
                aircraftNumber: 'KA350-001',
                name: 'King Air 350',
                type: 'aircraft',
                base: 'Bangkok',
                status: 'active'
            },
            {
                aircraftNumber: 'AS350-002',
                name: 'AS350 B2',
                type: 'helicopter',
                base: 'Chiang Mai',
                status: 'active'
            },
            {
                aircraftNumber: 'BELL-003',
                name: 'BELL 407',
                type: 'helicopter',
                base: 'Udon Thani',
                status: 'active'
            },
            {
                aircraftNumber: 'CN212-004',
                name: 'Casa NC212i',
                type: 'aircraft',
                base: 'Bangkok',
                status: 'active'
            },
            {
                aircraftNumber: 'CARAVAN-005',
                name: 'Caravan',
                type: 'aircraft',
                base: 'Nakhon Ratchasima',
                status: 'active'
            }
        ];
    }

    convertHHMMToHours(timeStr) {
        if (!timeStr || timeStr === '-' || typeof timeStr !== 'string') return '-';
        
        const match = timeStr.match(/^(\d+):(\d+)$/);
        if (!match) {
            const num = parseFloat(timeStr);
            return isNaN(num) ? '-' : num.toFixed(2);
        }
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const totalHours = (hours + minutes / 60).toFixed(2);
        return totalHours;
    }

    decimalToHHMM(hours) {
        if (!hours || hours === '-') return '-';
        const hoursStr = String(hours).trim();
        
        if (hoursStr.includes(':')) {
            return hoursStr;
        }
        
        const num = parseFloat(hoursStr);
        if (isNaN(num)) return '-';
        
        const hh = Math.floor(num);
        const mm = Math.round((num - hh) * 60);
        return `${hh}:${String(mm).padStart(2, '0')}`;
    }

    hoursToHHMM(decimalHours) {
        if (!decimalHours || decimalHours === '-') return '-';
        const isNegative = decimalHours < 0;
        const absHours = Math.abs(decimalHours);
        const hours = Math.floor(absHours);
        const minutes = Math.round((absHours - hours) * 60);
        const sign = isNegative ? '-' : '';
        return `${sign}${hours}:${String(minutes).padStart(2, '0')}`;
    }

    async getAircraftPreviousDayHours(aircraftNumber) {
        if (!this.selectedDate || typeof flightStatusService === 'undefined') return '-';
        
        try {
            const previousDate = this.getPreviousDate(this.selectedDate);
            const previousData = await flightStatusService.fetchAircraftData(previousDate);
            if (previousData && previousData.length > 0) {
                const aircraft = previousData.find(a => a.aircraftNumber === aircraftNumber);
                if (aircraft) {
                    return this.convertHHMMToHours(aircraft.flightHours);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Cannot fetch previous day data for ${aircraftNumber}`);
        }
        return '-';
    }

    async generateHoursData() {
        let previousDayData = {};
        try {
            const previousDate = this.getPreviousDate(this.selectedDate);
            const prevData = await flightStatusService.fetchAircraftData(previousDate);
            if (prevData && prevData.length > 0) {
                previousDayData = Object.fromEntries(prevData.map(a => [a.aircraftNumber, a]));
            }
        } catch (error) {
            console.warn('⚠️ Cannot fetch previous day data');
        }

        this.hoursData = this.aircraftData.map((aircraft) => {
            const modelName = aircraft.name || 'N/A';
            const isSuperKingAir = modelName.toLowerCase().includes('king air') || modelName.toLowerCase().includes('kingair') || modelName.toLowerCase().includes('super') || modelName.toLowerCase().includes('ska');
            
            const rawHours = aircraft.flightHours;
            let flightHours;
            
            if (isSuperKingAir) {
                flightHours = typeof rawHours === 'number' ? rawHours.toFixed(2) : rawHours;
            } else {
                flightHours = this.decimalToHHMM(rawHours);
            }
            
            const engineHours1Decimal = this.convertHHMMToHours(aircraft.engineHours1);
            const engineHours2Decimal = aircraft.engineHours2 && aircraft.engineHours2 !== '-' 
                ? this.convertHHMMToHours(aircraft.engineHours2) 
                : '-';
            const checkStatusDecimal = this.convertHHMMToHours(aircraft.checkStatus);
            const checkStatus = checkStatusDecimal !== '-' ? this.hoursToHHMM(parseFloat(checkStatusDecimal)) : '-';
            
            const engineHours1 = engineHours1Decimal !== '-' ? this.hoursToHHMM(parseFloat(engineHours1Decimal)) : '-';
            const engineHours2 = engineHours2Decimal !== '-' ? this.hoursToHHMM(parseFloat(engineHours2Decimal)) : '-';
            
            let engineDisplay = '';
            if (engineHours1 !== '-') {
                engineDisplay = engineHours1;
                if (engineHours2 !== '-') {
                    engineDisplay += ` / ${engineHours2}`;
                }
            } else {
                engineDisplay = '-';
            }
            
            const imagePath = this.getAircraftImage(modelName);
            
            // ใช้ previousDayData ที่ดึงมาแล้ว แทนที่จะเรียก fetchAircraftData ซ้ำ
            let previousHours = '-';
            if (previousDayData[aircraft.aircraftNumber]) {
                const prevAircraft = previousDayData[aircraft.aircraftNumber];
                previousHours = this.convertHHMMToHours(prevAircraft.flightHours);
            }
            
            let hoursDifference = '-';
            let formattedHours = flightHours;
            
            if (flightHours !== '-' && previousHours !== '-') {
                let currentHoursDecimal;
                
                if (flightHours.includes(':')) {
                    const parts = flightHours.split(':');
                    currentHoursDecimal = parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
                } else {
                    currentHoursDecimal = parseFloat(flightHours);
                }
                
                const prevHours = parseFloat(previousHours);
                const difference = currentHoursDecimal - prevHours;
                
                if (isSuperKingAir) {
                    hoursDifference = difference.toFixed(2);
                    if (parseFloat(hoursDifference) !== 0) {
                        const sign = difference >= 0 ? '+' : '';
                        formattedHours = `${flightHours} ${sign}${hoursDifference}`;
                    }
                } else {
                    hoursDifference = this.hoursToHHMM(difference);
                    const cleanDifference = hoursDifference.replace(/^-/, '');
                    if (cleanDifference !== '0:00' && difference !== 0) {
                        const sign = difference >= 0 ? '+' : '';
                        formattedHours = `${flightHours} ${sign}${hoursDifference}`;
                    }
                }
            }
            
            const progressData = ProgressBarHelper.calculateProgressBar(aircraft, aircraft.type || 'aircraft', this.convertHHMMToHours.bind(this));
            
            return {
                aircraftNumber: aircraft.aircraftNumber,
                name: aircraft.name,
                modelName: modelName,
                hours: flightHours,
                formattedHours: formattedHours,
                hoursDifference: hoursDifference,
                engineHours: engineDisplay,
                engineHours1: aircraft.engineHours1 || '-',
                engineHours2: aircraft.engineHours2 || '-',
                checkStatus: checkStatus,
                base: aircraft.base || 'N/A',
                status: aircraft.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน',
                isActive: aircraft.status === 'active',
                mechanic: aircraft.mechanic || '-',
                remarks: aircraft.remarks || '-',
                mission: aircraft.mission || aircraft.base || 'N/A',
                remainingHours100: aircraft.remainingHours100 || '-',
                remainingHours150: aircraft.remainingHours150 || '-',
                remainingHours300: aircraft.remainingHours300 || '-',
                type: aircraft.type || 'aircraft',
                imagePath: imagePath,
                progressData: progressData
            };
        });
    }

    async updateSummary() {
        const activeCount = this.hoursData.filter(item => item.isActive).length;
        const inactiveCount = this.hoursData.length - activeCount;

        let totalHours = 0;
        this.hoursData.forEach(item => {
            if (item.hours !== '-') {
                const hours = parseFloat(item.hours);
                if (!isNaN(hours)) {
                    totalHours += hours;
                }
            }
        });

        let flightDifference = 0;
        this.hoursData.forEach(item => {
            if (item.hoursDifference !== '-') {
                const diff = parseFloat(item.hoursDifference);
                if (!isNaN(diff)) {
                    flightDifference += diff;
                }
            }
        });

        document.getElementById('activeCount').textContent = activeCount;
        document.getElementById('inactiveCount').textContent = inactiveCount;
        document.getElementById('todayHours').textContent = totalHours.toFixed(2);
        document.getElementById('flightDifference').textContent = flightDifference.toFixed(2);
        
        this.updateNavNotification();
    }

    updateNavNotification() {
        const warningCount = this.hoursData.filter(item => 
            item.progressData.status === 'warning' || item.progressData.status === 'critical'
        ).length;
        
        const notificationBadge = document.getElementById('hoursNavNotification');
        if (notificationBadge) {
            if (warningCount > 0) {
                notificationBadge.textContent = warningCount;
                notificationBadge.style.display = 'inline-flex';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }

    getPreviousDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }

    updateTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) {
            console.error('tableBody element not found');
            return;
        }

        tbody.innerHTML = '';

        let filteredData = this.hoursData;

        if (this.searchTerm) {
            filteredData = filteredData.filter(item =>
                (item.name && item.name.toLowerCase().includes(this.searchTerm)) ||
                (item.aircraftNumber && item.aircraftNumber.toLowerCase().includes(this.searchTerm)) ||
                (item.base && item.base.toLowerCase().includes(this.searchTerm))
            );
        }

        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data"><i class="fas fa-search"></i><br>ไม่พบข้อมูล</td></tr>';
            this.updateNavNotification();
            return;
        }
        
        this.updateNavNotification();

        filteredData.forEach((item, index) => {
            const rowId = `row-${index}`;
            const detailId = `detail-${index}`;
            
            const statusIcon = item.isActive 
                ? '<span class="status-badge active"><span class="material-symbols-outlined">check_circle</span></span>'
                : '<span class="status-badge inactive"><span class="material-symbols-outlined">cancel</span></span>';
            
            const hoursDisplay = item.formattedHours === '-' ? '-' : item.formattedHours;
            const progressBar = ProgressBarHelper.getProgressBarHTML(item.progressData);
            
            const mainRow = document.createElement('tr');
            mainRow.className = `expandable-row ${item.isActive ? 'active' : 'inactive'}`;
            mainRow.id = rowId;
            mainRow.style.cursor = 'pointer';
            const criticalNotification = (item.progressData.status === 'critical' || item.progressData.status === 'warning') 
                ? `<span class="critical-notification-icon" title="สถานะ: เตือน"></span>`
                : '';
            mainRow.innerHTML = `
                <td class="expand-cell">
                    <span class="expand-btn-icon">
                        <span class="material-symbols-outlined">expand_more</span>
                    </span>
                </td>
                <td>
                    <div class="aircraft-with-image">
                        <img src="${item.imagePath}" alt="aircraft" class="aircraft-thumb">
                        <span class="aircraft-number">${item.aircraftNumber || 'N/A'}</span>
                    </div>
                </td>
                <td>
                    <div class="hours-with-mission">
                        <div><span class="hours-value">${hoursDisplay}</span></div>
                        <div class="mission-info">${item.mission || '-'}</div>
                        ${progressBar}
                    </div>
                </td>
                <td class="status-cell">${statusIcon}</td>
            `;
            
            if (criticalNotification) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'critical-notification-icon';
                iconSpan.title = 'สถานะ: เตือน';
                mainRow.appendChild(iconSpan);
            }
            
            mainRow.addEventListener('click', (e) => {
                if (e.target.closest('.expand-btn-icon') || e.target.closest('.expand-btn-icon span') || e.currentTarget === mainRow) {
                    const detailRow = document.getElementById(detailId);
                    const expandIcon = mainRow.querySelector('.expand-btn-icon');
                    if (detailRow) {
                        detailRow.classList.toggle('expanded');
                        expandIcon.classList.toggle('expanded');
                    }
                }
            });
            
            tbody.appendChild(mainRow);
            
            const detailRow = document.createElement('tr');
            detailRow.id = detailId;
            detailRow.className = 'detail-row';
            
            let detailHTML = '';
            
            if (item.type === 'helicopter') {
                detailHTML = `
                    <td colspan="4">
                        <div class="detail-content">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">แบบเครื่องบิน:</span>
                                    <span class="detail-value">${item.modelName || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ฐานที่ตั้ง:</span>
                                    <span class="detail-value">${item.base || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">เครื่องยนต์ ย1:</span>
                                    <span class="detail-value">${item.engineHours1 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">เครื่องยนต์ ย2:</span>
                                    <span class="detail-value">${item.engineHours2 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">คงเหลือ 100:</span>
                                    <span class="detail-value">${item.remainingHours100 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">คงเหลือ 150:</span>
                                    <span class="detail-value">${item.remainingHours150 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">คงเหลือ 300:</span>
                                    <span class="detail-value">${item.remainingHours300 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Progress Bar:</span>
                                    <span class="detail-value"><div class="progress-detail">${ProgressBarHelper.getProgressBarDetailHTML(item.progressData)}</div></span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ช่าง:</span>
                                    <span class="detail-value">${item.mechanic || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">หมายเหตุ:</span>
                                    <span class="detail-value">${item.remarks || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            } else {
                detailHTML = `
                    <td colspan="4">
                        <div class="detail-content">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">แบบเครื่องบิน:</span>
                                    <span class="detail-value">${item.modelName || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ฐานที่ตั้ง:</span>
                                    <span class="detail-value">${item.base || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">เครื่องยนต์:</span>
                                    <span class="detail-value">${item.engineHours || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">A CHECK:</span>
                                    <span class="detail-value">${item.checkStatus === '-' ? '-' : item.checkStatus + ' ชม.'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Progress Bar:</span>
                                    <span class="detail-value"><div class="progress-detail">${ProgressBarHelper.getProgressBarDetailHTML(item.progressData)}</div></span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ช่าง:</span>
                                    <span class="detail-value">${item.mechanic || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">หมายเหตุ:</span>
                                    <span class="detail-value">${item.remarks || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            }
            
            detailRow.innerHTML = detailHTML;
            tbody.appendChild(detailRow);
        });
    }

    updateChart() {
        const canvasElement = document.getElementById('hoursChart');
        if (!canvasElement || !window.Chart) {
            console.error('Chart element or Chart library not found');
            return;
        }

        const ctx = canvasElement.getContext('2d');

        const chartData = {
            labels: this.hoursData.map(item => item.aircraftNumber || 'N/A'),
            datasets: [
                {
                    label: 'ชั่วโมงบิน (ชม.)',
                    data: this.hoursData.map(item => {
                        if (item.hours === '-') return 0;
                        const hours = parseFloat(item.hours);
                        return isNaN(hours) ? 0 : hours;
                    }),
                    backgroundColor: 'rgba(0, 122, 255, 0.5)',
                    borderColor: 'rgba(0, 122, 255, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    tension: 0.3
                }
            ]
        };

        if (this.chart) {
            this.chart.data = chartData;
            this.chart.update();
        } else {
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                font: {
                                    family: "'B612', 'Roboto Condensed', sans-serif",
                                    size: 13
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    family: "'Source Code Pro', monospace",
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    family: "'Source Code Pro', monospace",
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

class DailyHistoryManager {
    constructor() {
        this.dailyHistoryData = [];
        this.cache = {};
        this.dateRange = null;
        this.cacheKeyPrefix = 'dailyHistory_';
        this.isLoading = false;
        this.selectedAircraft = null;
        this.init();
    }

    init() {
        const section = document.getElementById('dailyHistorySection');
        const fromDateInput = document.getElementById('historyFromDate');
        const toDateInput = document.getElementById('historyToDate');
        const loadBtn = document.getElementById('loadHistoryBtn');
        const exportBtn = document.getElementById('exportHistoryBtn');

        if (!section || !fromDateInput || !toDateInput || !loadBtn) {
            console.warn('⚠️ Daily history elements not found');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        fromDateInput.value = sevenDaysAgo;
        toDateInput.value = today;

        loadBtn.addEventListener('click', () => this.handleLoadClick());
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }

        this.setVisible(true);
        this.loadAllAircraft();
    }

    setVisible(visible) {
        const section = document.getElementById('dailyHistorySection');
        if (section) {
            if (visible) {
                section.classList.add('visible');
            } else {
                section.classList.remove('visible');
            }
        }
    }

    async loadAllAircraft() {
        try {
            if (typeof flightStatusService === 'undefined') {
                console.warn('⚠️ flightStatusService not available');
                return;
            }
            
            const today = new Date().toISOString().split('T')[0];
            const data = await flightStatusService.fetchAircraftData(today);
            
            if (data && Array.isArray(data) && data.length > 0) {
                const aircraftList = [];
                const aircraftMap = new Map();
                
                for (const aircraft of data) {
                    if (!aircraftMap.has(aircraft.aircraftNumber)) {
                        aircraftMap.set(aircraft.aircraftNumber, {
                            aircraftNumber: aircraft.aircraftNumber,
                            name: aircraft.name || 'N/A'
                        });
                    }
                }
                
                for (const [, aircraft] of aircraftMap) {
                    aircraftList.push(aircraft);
                }
                
                aircraftList.sort((a, b) => a.aircraftNumber.localeCompare(b.aircraftNumber));
                this.populateAircraftSelector(aircraftList);
                console.log('✅ Loaded aircraft list:', aircraftList.length);
            }
        } catch (error) {
            console.warn('⚠️ Error loading aircraft:', error.message);
        }
    }

    populateAircraftSelector(aircraftList) {
        const wrapper = document.getElementById('aircraftSelectorWrapper');
        const list = document.getElementById('aircraftSelectorList');

        if (!wrapper || !list) {
            console.error('❌ Aircraft selector elements not found');
            return;
        }

        list.innerHTML = '';
        
        if (aircraftList.length === 0) {
            list.innerHTML = '<div style="padding: 12px; color: #999; font-size: 13px;">ยังไม่มีข้อมูลเครื่องบิน</div>';
            return;
        }

        for (const aircraft of aircraftList) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'aircraft-radio-item';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'aircraft-selector';
            radio.value = aircraft.aircraftNumber;
            radio.id = `aircraft-${aircraft.aircraftNumber}`;
            radio.addEventListener('change', (e) => this.handleAircraftSelection(e));

            const label = document.createElement('label');
            label.htmlFor = `aircraft-${aircraft.aircraftNumber}`;
            label.textContent = `${aircraft.aircraftNumber} - ${aircraft.name}`;

            itemDiv.appendChild(radio);
            itemDiv.appendChild(label);
            list.appendChild(itemDiv);
        }

        if (aircraftList.length > 0) {
            const firstRadio = document.getElementById(`aircraft-${aircraftList[0].aircraftNumber}`);
            if (firstRadio) {
                firstRadio.checked = true;
                this.selectedAircraft = aircraftList[0].aircraftNumber;
                console.log('✅ Selected first aircraft:', this.selectedAircraft);
            }
        }
    }

    async handleLoadClick() {
        const fromDate = document.getElementById('historyFromDate').value;
        const toDate = document.getElementById('historyToDate').value;

        if (!fromDate || !toDate) {
            this.showError('กรุณาเลือกวันที่');
            return;
        }

        if (!this.validateDateRange(fromDate, toDate)) {
            return;
        }

        await this.loadDateRange(fromDate, toDate);
    }

    validateDateRange(fromDate, toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (from > to) {
            this.showError('วันที่เริ่มต้นต้องน้อยกว่าวันสิ้นสุด');
            return false;
        }

        const daysDiff = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 90) {
            this.showError('ช่วงวันต้องไม่เกิน 90 วัน');
            return false;
        }

        return true;
    }

    getDateRange(fromDate, toDate) {
        const dates = [];
        const currentDate = new Date(fromDate + 'T00:00:00');
        const endDate = new Date(toDate + 'T00:00:00');

        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    async loadDateRange(fromDate, toDate) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            const dates = this.getDateRange(fromDate, toDate);
            this.dailyHistoryData = [];
            console.log(`📅 Loading data for ${dates.length} dates:`, dates.slice(0, 3), '...');
            console.log('🔍 flightStatusService available:', typeof flightStatusService !== 'undefined');

            for (const date of dates) {
                try {
                    let data = this.getCacheData(date);
                    
                    if (!data && typeof flightStatusService !== 'undefined') {
                        console.log(`🔄 Fetching data from service for ${date}`);
                        data = await flightStatusService.fetchAircraftData(date);
                        console.log(`📦 Service returned for ${date}:`, data ? `${data.length} aircraft` : 'null');
                        if (data) {
                            this.setCacheData(date, data);
                        }
                    } else if (!data) {
                        console.warn(`⚠️ flightStatusService not available for ${date}`);
                    }

                    if (data && Array.isArray(data)) {
                        console.log(`✅ Added ${data.length} aircraft for ${date}`);
                        console.log('Sample aircraft:', data.slice(0, 1));
                        this.dailyHistoryData.push({
                            date: date,
                            aircraftData: data
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ Error loading data for ${date}:`, error.message);
                }
            }

            console.log(`✅ Total loaded: ${this.dailyHistoryData.length} days with data`);
            if (this.dailyHistoryData.length > 0) {
                console.log('📊 Sample day data:', this.dailyHistoryData[0]);
            } else {
                console.warn('⚠️ No data loaded from any date');
            }
            
            this.buildAircraftSelector();
            this.showSuccess(`โหลดข้อมูล ${this.dailyHistoryData.length} วัน สำเร็จ`);
        } catch (error) {
            console.error('❌ Error loading date range:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    getCacheData(date) {
        const cacheKey = this.cacheKeyPrefix + date;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    console.log(`📦 Cache hit for ${date}`);
                    return parsed.data;
                }
            }
        } catch (e) {
            console.warn('⚠️ Cache retrieval error:', e.message);
        }
        return null;
    }

    setCacheData(date, data) {
        const cacheKey = this.cacheKeyPrefix + date;
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('⚠️ Cache storage error:', e.message);
        }
    }

    updateTable() {
        const tbody = document.getElementById('dailyHistoryBody');

        if (!tbody) {
            console.error('Table body not found');
            return;
        }

        if (!this.selectedAircraft) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">กรุณาเลือกเครื่องบิน</td></tr>';
            return;
        }

        if (this.dailyHistoryData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">ไม่มีข้อมูล</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        for (const dailyData of this.dailyHistoryData) {
            const foundAircraft = dailyData.aircraftData.find(a => a.aircraftNumber === this.selectedAircraft);
            
            const row = document.createElement('tr');

            const dateCell = document.createElement('td');
            dateCell.className = 'date-col';
            dateCell.textContent = this.formatDateLong(dailyData.date);
            row.appendChild(dateCell);

            const flightHoursCell = document.createElement('td');
            flightHoursCell.textContent = foundAircraft ? (foundAircraft.flightHours || '-') : '-';
            row.appendChild(flightHoursCell);

            const engineHours1Cell = document.createElement('td');
            engineHours1Cell.textContent = foundAircraft ? (foundAircraft.engineHours1 || '-') : '-';
            row.appendChild(engineHours1Cell);

            const engineHours2Cell = document.createElement('td');
            engineHours2Cell.textContent = foundAircraft ? (foundAircraft.engineHours2 || '-') : '-';
            row.appendChild(engineHours2Cell);

            const checkStatusCell = document.createElement('td');
            checkStatusCell.textContent = foundAircraft ? (foundAircraft.checkStatus || '-') : '-';
            row.appendChild(checkStatusCell);

            const baseCell = document.createElement('td');
            baseCell.textContent = foundAircraft ? (foundAircraft.base || '-') : '-';
            row.appendChild(baseCell);

            const mechanicCell = document.createElement('td');
            mechanicCell.textContent = foundAircraft ? (foundAircraft.mechanic || '-') : '-';
            row.appendChild(mechanicCell);

            const remarksCell = document.createElement('td');
            remarksCell.textContent = foundAircraft ? (foundAircraft.remarks || '-') : '-';
            row.appendChild(remarksCell);

            tbody.appendChild(row);
        }
    }

    getAllAircraftList() {
        const aircraftMap = new Map();

        for (const dailyData of this.dailyHistoryData) {
            for (const aircraft of dailyData.aircraftData) {
                if (!aircraftMap.has(aircraft.aircraftNumber)) {
                    aircraftMap.set(aircraft.aircraftNumber, {
                        aircraftNumber: aircraft.aircraftNumber,
                        name: aircraft.name || 'N/A'
                    });
                }
            }
        }

        const aircraftList = Array.from(aircraftMap.values());
        aircraftList.sort((a, b) => a.aircraftNumber.localeCompare(b.aircraftNumber));
        
        return aircraftList;
    }

    buildAircraftSelector() {
        const wrapper = document.getElementById('aircraftSelectorWrapper');
        const list = document.getElementById('aircraftSelectorList');

        console.log('🔍 buildAircraftSelector called');
        console.log('📦 dailyHistoryData length:', this.dailyHistoryData.length);
        
        if (!wrapper || !list) {
            console.error('❌ Aircraft selector elements not found');
            return;
        }

        const allAircraft = this.getAllAircraftList();
        console.log('✈️ Found aircraft:', allAircraft);

        list.innerHTML = '';
        
        if (allAircraft.length === 0) {
            console.warn('⚠️ No aircraft found');
            list.innerHTML = '<div style="padding: 12px; color: #999; font-size: 13px;">ยังไม่มีข้อมูลเครื่องบิน</div>';
            return;
        }

        for (const aircraft of allAircraft) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'aircraft-radio-item';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'aircraft-selector';
            radio.value = aircraft.aircraftNumber;
            radio.id = `aircraft-${aircraft.aircraftNumber}`;
            radio.addEventListener('change', (e) => this.handleAircraftSelection(e));

            const label = document.createElement('label');
            label.htmlFor = `aircraft-${aircraft.aircraftNumber}`;
            label.textContent = `${aircraft.aircraftNumber} - ${aircraft.name}`;

            itemDiv.appendChild(radio);
            itemDiv.appendChild(label);
            list.appendChild(itemDiv);
        }

        console.log('✅ Aircraft selector populated');

        if (allAircraft.length > 0) {
            const firstRadio = document.getElementById(`aircraft-${allAircraft[0].aircraftNumber}`);
            if (firstRadio) {
                firstRadio.checked = true;
                this.selectedAircraft = allAircraft[0].aircraftNumber;
                console.log('✅ Selected first aircraft:', this.selectedAircraft);
                this.updateTable();
            }
        }
    }

    handleAircraftSelection(event) {
        this.selectedAircraft = event.target.value;
        this.updateTable();
    }

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('th-TH', options);
    }

    formatDateLong(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        console.error('Error:', message);
        const tbody = document.getElementById('dailyHistoryBody');
        if (tbody) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'history-error-message';
            errorDiv.textContent = message;
            
            const section = document.getElementById('dailyHistorySection');
            if (section) {
                const existingError = section.querySelector('.history-error-message');
                if (existingError) {
                    existingError.remove();
                }
                section.insertBefore(errorDiv, section.querySelector('.history-controls').nextElementSibling);
                
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 5000);
            }
        }
    }

    showSuccess(message) {
        console.log('Success:', message);
        const section = document.getElementById('dailyHistorySection');
        if (section) {
            const successDiv = document.createElement('div');
            successDiv.className = 'history-success-message';
            successDiv.textContent = message;
            
            const existingSuccess = section.querySelector('.history-success-message');
            if (existingSuccess) {
                existingSuccess.remove();
            }
            section.insertBefore(successDiv, section.querySelector('.history-controls').nextElementSibling);
            
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.remove();
                }
            }, 4000);
        }
    }

    exportToExcel() {
        if (!this.selectedAircraft) {
            this.showError('กรุณาเลือกเครื่องบิน');
            return;
        }

        if (this.dailyHistoryData.length === 0) {
            this.showError('ไม่มีข้อมูลที่จะส่งออก');
            return;
        }

        try {
            const csvContent = this.generateCSV();
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            const fromDate = document.getElementById('historyFromDate').value;
            const toDate = document.getElementById('historyToDate').value;
            const filename = `Daily_History_${this.selectedAircraft}_${fromDate}_to_${toDate}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('ส่งออกข้อมูลสำเร็จ');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
        }
    }

    generateCSV() {
        let csv = 'วันที่,ชั่วโมงบิน,เครื่องยนต์ ย1,เครื่องยนต์ ย2,ฐานที่ตั้ง,ช่าง,หมายเหตุ\n';

        for (const dailyData of this.dailyHistoryData) {
            const foundAircraft = dailyData.aircraftData.find(a => a.aircraftNumber === this.selectedAircraft);
            
            csv += `"${this.formatDateLong(dailyData.date)}"`;
            csv += `,"${foundAircraft ? (foundAircraft.flightHours || '-') : '-'}"`;
            csv += `,"${foundAircraft ? (foundAircraft.engineHours1 || '-') : '-'}"`;
            csv += `,"${foundAircraft ? (foundAircraft.engineHours2 || '-') : '-'}"`;
            csv += `,"${foundAircraft ? (foundAircraft.base || '-') : '-'}"`;
            csv += `,"${foundAircraft ? (foundAircraft.mechanic || '-') : '-'}"`;
            csv += `,"${foundAircraft ? (foundAircraft.remarks || '-') : '-'}"`;
            csv += '\n';
        }

        return csv;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HoursDashboardManager();
    new DailyHistoryManager();
});
