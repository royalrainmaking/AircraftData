class HoursDashboardManager {
    constructor() {
        this.aircraftData = [];
        this.hoursData = [];
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.searchTerm = '';
        this.chart = null;
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
                this.selectedDate = e.target.value;
                this.loadData();
            });
        }

        const resetDateBtn = document.getElementById('resetDateBtn');
        if (resetDateBtn) {
            resetDateBtn.addEventListener('click', () => {
                this.setDateInputToToday();
                this.selectedDate = new Date().toISOString().split('T')[0];
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

    setDateInputToToday() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateSelector').value = today;
    }

    async loadData() {
        console.log('📡 กำลังโหลดข้อมูลชั่วโมงบิน...');
        
        try {
            if (typeof flightStatusService !== 'undefined') {
                const data = await flightStatusService.fetchAircraftData(this.selectedDate);
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
        this.hoursData = await Promise.all(this.aircraftData.map(async (aircraft, index) => {
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
            const checkStatus = this.convertHHMMToHours(aircraft.checkStatus);
            
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
            
            let previousHours = await this.getAircraftPreviousDayHours(aircraft.aircraftNumber);
            let hoursDifference = '-';
            
            if (flightHours !== '-' && previousHours !== '-') {
                let currentHoursDecimal;
                
                if (isSuperKingAir) {
                    currentHoursDecimal = parseFloat(flightHours);
                } else {
                    const parts = flightHours.split(':');
                    currentHoursDecimal = parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
                }
                
                const prevHours = parseFloat(previousHours);
                const difference = currentHoursDecimal - prevHours;
                
                if (isSuperKingAir) {
                    hoursDifference = difference.toFixed(2);
                } else {
                    hoursDifference = this.hoursToHHMM(difference);
                }
            }
            
            console.log(`🖼️ Aircraft: ${modelName}, Image: ${imagePath}, Difference: ${hoursDifference}`);
            
            return {
                aircraftNumber: aircraft.aircraftNumber,
                name: aircraft.name,
                modelName: modelName,
                hours: flightHours,
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
                imagePath: imagePath
            };
        }));
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
        if (this.selectedDate) {
            const previousDate = this.getPreviousDate(this.selectedDate);
            console.log(`📅 Date: ${this.selectedDate}, Previous: ${previousDate}`);
            
            if (typeof flightStatusService !== 'undefined') {
                try {
                    const previousData = await flightStatusService.fetchAircraftData(previousDate);
                    if (previousData && previousData.length > 0) {
                        let previousTotalHours = 0;
                        previousData.forEach(aircraft => {
                            const hours = this.convertHHMMToHours(aircraft.flightHours);
                            if (hours !== '-') {
                                previousTotalHours += parseFloat(hours);
                            }
                        });
                        flightDifference = totalHours - previousTotalHours;
                        console.log(`📊 Today: ${totalHours.toFixed(2)}, Previous: ${previousTotalHours.toFixed(2)}, Difference: ${flightDifference.toFixed(2)}`);
                    }
                } catch (error) {
                    console.warn('⚠️ Cannot fetch previous day data:', error);
                }
            }
        }

        document.getElementById('activeCount').textContent = activeCount;
        document.getElementById('inactiveCount').textContent = inactiveCount;
        document.getElementById('todayHours').textContent = totalHours.toFixed(2);
        document.getElementById('flightDifference').textContent = flightDifference.toFixed(2);
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
            tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-search"></i><br>ไม่พบข้อมูล</td></tr>';
            return;
        }

        filteredData.forEach((item, index) => {
            const rowId = `row-${index}`;
            const detailId = `detail-${index}`;
            
            const statusIcon = item.isActive 
                ? '<span class="status-badge active"><span class="material-symbols-outlined">check_circle</span></span>'
                : '<span class="status-badge inactive"><span class="material-symbols-outlined">cancel</span></span>';
            
            const hoursDisplay = item.hours === '-' ? '-' : item.hours + ' ชม.';
            let differenceDisplay = '';
            if (item.hoursDifference && item.hoursDifference !== '-' && item.hoursDifference !== '0:00' && item.hoursDifference !== '-0:00' && item.hoursDifference !== '0.00' && item.hoursDifference !== '-0.00') {
                const diffText = item.hoursDifference.startsWith('-') ? item.hoursDifference : `+${item.hoursDifference}`;
                differenceDisplay = ` <span class="hours-difference">${diffText}</span>`;
            }
            
            const mainRow = document.createElement('tr');
            mainRow.className = 'expandable-row';
            mainRow.id = rowId;
            mainRow.style.cursor = 'pointer';
            mainRow.innerHTML = `
                <td class="expand-cell">
                    <span class="expand-btn-icon">
                        <span class="material-symbols-outlined">expand_more</span>
                    </span>
                </td>
                <td>${index + 1}</td>
                <td><span class="aircraft-number">${item.aircraftNumber || 'N/A'}</span></td>
                <td>
                    <div class="aircraft-info">
                        <img src="${item.imagePath || 'img/engine.jpg'}" alt="${item.modelName}" class="aircraft-thumb" onerror="this.src='img/engine.jpg';this.style.opacity='0.5';">
                        <span class="aircraft-name">${item.modelName || 'N/A'}</span>
                    </div>
                </td>
                <td><span class="hours-value">${hoursDisplay}${differenceDisplay}</span></td>
                <td>${item.base || 'N/A'}</td>
                <td class="status-cell">${statusIcon}</td>
            `;
            
            mainRow.addEventListener('click', (e) => {
                if (e.target.closest('.expand-btn-icon, .expand-btn-icon span') || e.currentTarget === mainRow) {
                    const detailRow = document.getElementById(detailId);
                    const expandIcon = mainRow.querySelector('.expand-btn-icon');
                    if (detailRow) {
                        detailRow.classList.toggle('hidden');
                        expandIcon.classList.toggle('expanded');
                    }
                }
            });
            
            tbody.appendChild(mainRow);
            
            const detailRow = document.createElement('tr');
            detailRow.id = detailId;
            detailRow.className = 'detail-row hidden';
            
            let detailHTML = '';
            
            if (item.type === 'helicopter') {
                detailHTML = `
                    <td colspan="7">
                        <div class="detail-content">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">ชั่วโมงเครื่องยนต์ ย1:</span>
                                    <span class="detail-value">${item.engineHours1 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ชั่วโมงเครื่องยนต์ ย2:</span>
                                    <span class="detail-value">${item.engineHours2 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ชั่วโมงบินคงเหลือครบซ่อม 100:</span>
                                    <span class="detail-value">${item.remainingHours100 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ชั่วโมงบินคงเหลือครบซ่อม 150:</span>
                                    <span class="detail-value">${item.remainingHours150 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ชั่วโมงบินคงเหลือครบซ่อม 300:</span>
                                    <span class="detail-value">${item.remainingHours300 || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ภารกิจ/ฐานที่ตั้ง:</span>
                                    <span class="detail-value">${item.mission || item.base || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ผู้ควบคุมงานช่าง:</span>
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
                    <td colspan="7">
                        <div class="detail-content">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">เครื่องยนต์:</span>
                                    <span class="detail-value">${item.engineHours || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">A CHECK:</span>
                                    <span class="detail-value">${item.checkStatus === '-' ? '-' : item.checkStatus + ' ชม.'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ผู้ควบคุมงานช่าง:</span>
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

document.addEventListener('DOMContentLoaded', () => {
    new HoursDashboardManager();
});
