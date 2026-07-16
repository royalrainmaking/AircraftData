class MissionHoursManager {
    constructor() {
        this.rawData = [];
        this.processedData = {}; // structure: { FY: { aircraftNum: { support: 0, rain: 0, dust: 0, hail: 0, other: 0 } } }
        this.availableFYs = [];
        this.selectedFY = null;
        this.searchTerm = '';
        this.anomalies = [];
        this.chart = null;
        this.pieChart = null;
        this.currentTotals = null;
        this.flightStatusService = new FlightStatusService();
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
    }

    setupEventListeners() {
        const fySelector = document.getElementById('fySelector');
        if (fySelector) {
            fySelector.addEventListener('change', (e) => {
                this.selectedFY = e.target.value;
                this.updateUI();
            });
        }

        const typeSelector = document.getElementById('aircraftTypeSelector');
        if (typeSelector) {
            typeSelector.addEventListener('change', () => this.updateUI());
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateTable();
                this.updateChart();
            });
        }

        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }

        const printBtn = document.getElementById('printReportBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }

        const showAnomaliesBtn = document.getElementById('showAnomaliesBtn');
        if (showAnomaliesBtn) {
            showAnomaliesBtn.addEventListener('click', () => this.showAnomaliesModal());
        }

        const closeAnomaliesBtn = document.getElementById('closeAnomaliesBtn');
        const closeAnomaliesBtnBottom = document.getElementById('closeAnomaliesBtnBottom');
        const anomaliesModal = document.getElementById('anomaliesModal');
        
        const closeModal = () => {
            const m = document.getElementById('anomaliesModal');
            if (m) m.classList.add('hidden');
        };

        if (closeAnomaliesBtn) closeAnomaliesBtn.addEventListener('click', closeModal);
        if (closeAnomaliesBtnBottom) closeAnomaliesBtnBottom.addEventListener('click', closeModal);
        if (anomaliesModal) {
            anomaliesModal.addEventListener('click', (e) => {
                // Close if clicking the overlay itself (not the content inside)
                if (e.target === anomaliesModal) closeModal();
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
        this.showLoading();
        try {
            console.log('📡 กำลังโหลดข้อมูลประวัติทั้งหมด...');
            // We use the new instance created in constructor
            this.rawData = await this.flightStatusService.fetchAllHistoryData();
            console.log(`✅ โหลดข้อมูลสำเร็จ: ${this.rawData.length} รายการ`);
            
            this.processData();
            this.populateFYSelector();
            this.updateUI();
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
            // Fallback or error handling
        } finally {
            this.hideLoading();
        }
    }

    getFiscalYear(dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        
        const yearAD = date.getFullYear();
        const month = date.getMonth() + 1; // 1-12
        const yearBE = yearAD + 543;
        
        // Fiscal Year starts Oct 1
        if (month >= 10) {
            return yearBE + 1;
        }
        return yearBE;
    }

    convertHoursToDecimal(val) {
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

    formatToHHMM(decimalHours, defaultVal = '-') {
        if (decimalHours === undefined || decimalHours === null || isNaN(decimalHours) || decimalHours === 0) return defaultVal;
        const sign = decimalHours < 0 ? '-' : '';
        const absHours = Math.abs(decimalHours);
        const hours = Math.floor(absHours);
        let minutes = Math.round((absHours - hours) * 60);
        let finalHours = hours;
        if (minutes === 60) {
            finalHours += 1;
            minutes = 0;
        }
        const minsStr = minutes.toString().padStart(2, '0');
        return `${sign}${finalHours}:${minsStr}`;
    }

    categorizeMission(missionStr) {
        if (!missionStr) return 'unknown';
        const str = String(missionStr).toLowerCase();
        
        if (str.includes('ไฟป่า') || str.includes('ดับไฟ')) return 'fire';
        if (str.includes('ฝนหลวง') || str.includes('นหลวง') || str.includes('ฝนหลว')) return 'rain';
        if (str.includes('ฝุ่น') || str.includes('ดัดแปร') || str.includes('ดัดแป')) return 'dust';
        if (str.includes('ลูกเห็บ') || str.includes('พายุูก')) return 'hail';
        if (str.includes('ทดสอบ') || str.includes('ซ่อม') || str.includes('นครสวรรค์') || str.includes('คลองหลวง')) return 'test';
        if (str.includes('ฝึกบิน')) return 'training';
        if (str.includes('สนับสนุน') || str.includes('สนับสนุบ') || str.includes('vip') || str.includes('บริการ') || str.includes('ผู้บริหาร')) return 'support';
        
        return 'unknown';
    }

    processData() {
        if (!this.rawData || this.rawData.length === 0) return;

        this.processedData = {};
        this.anomalies = [];
        const fySet = new Set();
        
        // Group data by aircraft
        const aircraftMap = {};
        this.rawData.forEach(record => {
            if (!record.date || !record.aircraftNumber) return;
            const ac = record.aircraftNumber;
            if (!aircraftMap[ac]) aircraftMap[ac] = [];
            aircraftMap[ac].push(record);
        });

        const aircraftRecords = {};
        const fyBounds = {};
        
        // Pass 1: Collect chronological flight records per aircraft
        for (const [ac, records] of Object.entries(aircraftMap)) {
            // Sort records chronologically and by hours ascending for same date
            records.sort((a, b) => {
                const dateDiff = new Date(a.date) - new Date(b.date);
                if (dateDiff !== 0) return dateDiff;
                const hoursA = this.convertHoursToDecimal(a.flightHours);
                const hoursB = this.convertHoursToDecimal(b.flightHours);
                return hoursA - hoursB;
            });
            
            let prevHours = null;
            let prevDateRecord = null;
            aircraftRecords[ac] = [];
            
            records.forEach(record => {
                const currentHours = this.convertHoursToDecimal(record.flightHours);
                const fy = this.getFiscalYear(record.date);
                
                if (currentHours > 0 && fy) {
                    if (!fyBounds[fy]) fyBounds[fy] = {};
                    if (!fyBounds[fy][ac]) fyBounds[fy][ac] = { start: currentHours, end: currentHours };
                    else fyBounds[fy][ac].end = currentHours;
                }
                
                if (currentHours > 0) {
                    if (prevHours !== null) {
                        const delta = currentHours - prevHours;
                        if (delta > 24) {
                            this.anomalies.push({
                                aircraft: ac,
                                prevDate: prevDateRecord || 'Unknown',
                                currentDate: record.date,
                                prevHours: prevHours,
                                currentHours: currentHours,
                                delta: delta
                            });
                        }
                        if (delta > 0 && delta < 300) { // valid flight, relaxed threshold to handle skipped log days
                            const fy = this.getFiscalYear(record.date);
                            const prevFy = this.getFiscalYear(prevDateRecord);
                            
                            if (fy === prevFy) {
                                const initialCat = this.categorizeMission(record.mission);
                                
                                aircraftRecords[ac].push({
                                    date: record.date,
                                    fy: fy,
                                    delta: delta,
                                    category: initialCat,
                                    originalMission: record.mission,
                                    name: record.name,
                                    type: record.type
                                });
                            }
                        }
                    }
                    prevHours = currentHours;
                    prevDateRecord = record.date;
                }
            });
        }
        
        // Pass 2: Contextual Interpolation
        for (const ac of Object.keys(aircraftRecords)) {
            const records = aircraftRecords[ac];
            for (let i = 0; i < records.length; i++) {
                if (records[i].category === 'unknown') {
                    // Find previous flight category
                    let prevCat = null;
                    for (let j = i - 1; j >= 0; j--) {
                        if (records[j].category !== 'unknown') {
                            prevCat = records[j].category;
                            break;
                        }
                    }
                    
                    // Find next flight category
                    let nextCat = null;
                    for (let k = i + 1; k < records.length; k++) {
                        if (records[k].category !== 'unknown') {
                            nextCat = records[k].category;
                            break;
                        }
                    }
                    
                    // Interpolate if prev and next match and are not general
                    if (prevCat && nextCat && prevCat === nextCat) {
                        records[i].category = prevCat;
                    }
                }
            }
        }
        
        // Pass 3: Aggregate by Fiscal Year & Store detailed records
        this.detailedRecords = [];
        
        for (const ac of Object.keys(aircraftRecords)) {
            const records = aircraftRecords[ac];
            records.forEach(rec => {
                
                // Store for export
                this.detailedRecords.push({
                    fy: rec.fy,
                    date: rec.date,
                    aircraft: ac,
                    name: rec.name || 'Unknown Aircraft',
                    hours: rec.delta,
                    originalMission: rec.originalMission || '-',
                    category: rec.category
                });

                if (rec.fy) {
                    fySet.add(rec.fy);
                    if (!this.processedData[rec.fy]) this.processedData[rec.fy] = {};
                    if (!this.processedData[rec.fy][ac]) {
                        const bounds = (fyBounds[rec.fy] && fyBounds[rec.fy][ac]) || { start: 0, end: 0 };
                        this.processedData[rec.fy][ac] = { 
                            name: rec.name, 
                            type: rec.type || 'unknown',
                            startHours: bounds.start,
                            endHours: bounds.end,
                            support: 0, rain: 0, dust: 0, hail: 0, fire: 0, test: 0, training: 0, unknown: 0, total: 0 
                        };
                    }
                    
                    this.processedData[rec.fy][ac][rec.category] += rec.delta;
                    this.processedData[rec.fy][ac].total += rec.delta;
                }
            });
        }
        
        
        this.availableFYs = Array.from(fySet).sort((a, b) => b - a); // Descending
        
        if (this.availableFYs.length > 0) {
            // Default to most recent FY
            this.selectedFY = this.availableFYs[0];
        } else {
            // Fallback if no data
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear() + 543;
            this.selectedFY = currentMonth >= 10 ? currentYear + 1 : currentYear;
            this.availableFYs.push(this.selectedFY);
        }
    }

    populateFYSelector() {
        const selector = document.getElementById('fySelector');
        if (!selector) return;
        
        selector.innerHTML = '';
        this.availableFYs.forEach(fy => {
            const option = document.createElement('option');
            option.value = fy;
            option.textContent = `ปีงบประมาณ ${fy}`;
            if (fy === this.selectedFY) option.selected = true;
            selector.appendChild(option);
        });
    }

    updateUI() {
        this.updateSummary();
        this.updateTable();
        this.updateChart();
    }

    getFilteredData() {
        const dataForFY = this.processedData[this.selectedFY] || {};
        const term = this.searchTerm ? this.searchTerm.toLowerCase() : '';
        const typeSelector = document.getElementById('aircraftTypeSelector');
        const typeFilter = typeSelector ? typeSelector.value : 'all';

        const filtered = Object.entries(dataForFY).filter(([ac, val]) => {
            const matchSearch = ac.toLowerCase().includes(term) || (val.name && val.name.toLowerCase().includes(term));
            const matchType = typeFilter === 'all' || val.type === typeFilter;
            return matchSearch && matchType;
        });

        let arr = filtered.map(([ac, val]) => {
            return {
                aircraft: ac,
                ...val
            };
        });

        // Sort by total descending
        arr.sort((a, b) => b.total - a.total);
        
        return arr;
    }

    updateSummary() {
        const filteredData = this.getFilteredData();
        let totals = { support: 0, rain: 0, dust: 0, hail: 0, fire: 0, test: 0, training: 0, unknown: 0, total: 0 };
        
        for (const ac of filteredData) {
            totals.support += ac.support || 0;
            totals.rain += ac.rain || 0;
            totals.dust += ac.dust || 0;
            totals.hail += ac.hail || 0;
            totals.fire += ac.fire || 0;
            totals.test += ac.test || 0;
            totals.training += ac.training || 0;
            totals.unknown += ac.unknown || 0;
            totals.total += ac.total || 0;
        }

        this.currentTotals = totals;

        document.getElementById('supportHours').textContent = this.formatToHHMM(totals.support, '0:00');
        document.getElementById('rainHours').textContent = this.formatToHHMM(totals.rain, '0:00');
        document.getElementById('dustHours').textContent = this.formatToHHMM(totals.dust, '0:00');
        document.getElementById('hailHours').textContent = this.formatToHHMM(totals.hail, '0:00');
        document.getElementById('fireHours').textContent = this.formatToHHMM(totals.fire, '0:00');
        document.getElementById('testHours').textContent = this.formatToHHMM(totals.test, '0:00');
        document.getElementById('trainingHours').textContent = this.formatToHHMM(totals.training, '0:00');
        
        const totalSpan = document.getElementById('totalHours');
        if (totalSpan) totalSpan.textContent = this.formatToHHMM(totals.total, '0:00');
    }

    updateTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        const data = this.getFilteredData();
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="no-data"><i class="fas fa-info-circle"></i> ไม่พบข้อมูลชั่วโมงบินในปีงบประมาณนี้</td></tr>`;
            return;
        }
        
        data.forEach(item => {
            const tr = document.createElement('tr');
            const displayName = item.name && item.name !== 'Unknown Aircraft' ? `${item.name} ${item.aircraft}` : item.aircraft;
            const imgSrc = this.getAircraftImage(item.name);
            
            tr.innerHTML = `
                <td class="aircraft-cell">
                    <img src="${imgSrc}" class="aircraft-thumb" alt="Aircraft">
                    <span>${displayName}</span>
                </td>
                <td class="text-right" style="color: #666;">${this.formatToHHMM(item.startHours)}</td>
                <td class="text-right" style="color: #666;">${this.formatToHHMM(item.endHours)}</td>
                <td class="text-right" style="color: #333; font-weight: bold;">${this.formatToHHMM(item.total, '0:00')}</td>
                <td class="text-right" style="color: #2980b9;">${this.formatToHHMM(item.support)}</td>
                <td class="text-right" style="color: #27ae60;">${this.formatToHHMM(item.rain)}</td>
                <td class="text-right" style="color: #d4ac0d;">${this.formatToHHMM(item.dust)}</td>
                <td class="text-right" style="color: #8e44ad;">${this.formatToHHMM(item.hail)}</td>
                <td class="text-right" style="color: #c0392b;">${this.formatToHHMM(item.fire)}</td>
                <td class="text-right" style="color: #d35400;">${this.formatToHHMM(item.test)}</td>
                <td class="text-right" style="color: #2980b9;">${this.formatToHHMM(item.training)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    updateChart() {
        const canvas = document.getElementById('missionChart');
        if (!canvas || !window.Chart) return;
        
        const data = this.getFilteredData();
        
        // Take top 15 aircraft for chart to avoid overcrowding
        const chartData = data.slice(0, 15);
        
        const labels = chartData.map(d => d.name && d.name !== 'Unknown Aircraft' ? `${d.name} ${d.aircraft}` : d.aircraft);
        
        const datasets = [
            {
                label: 'สนับสนุน',
                data: chartData.map(d => d.support),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            },
            {
                label: 'ฝนหลวง',
                data: chartData.map(d => d.rain),
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1
            },
            {
                label: 'ฝุ่น',
                data: chartData.map(d => d.dust),
                backgroundColor: 'rgba(241, 196, 15, 0.7)',
                borderColor: 'rgba(241, 196, 15, 1)',
                borderWidth: 1
            },
            {
                label: 'ลูกเห็บ',
                data: chartData.map(d => d.hail),
                backgroundColor: 'rgba(155, 89, 182, 0.7)',
                borderColor: 'rgba(155, 89, 182, 1)',
                borderWidth: 1
            },
            {
                label: 'ไฟป่า',
                data: chartData.map(d => d.fire || 0),
                backgroundColor: 'rgba(231, 76, 60, 0.7)',
                borderColor: 'rgba(231, 76, 60, 1)',
                borderWidth: 1
            },
            {
                label: 'ทดสอบ',
                data: chartData.map(d => d.test || 0),
                backgroundColor: 'rgba(230, 126, 34, 0.7)',
                borderColor: 'rgba(230, 126, 34, 1)',
                borderWidth: 1
            },
            {
                label: 'ฝึกบิน',
                data: chartData.map(d => d.training || 0),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }
        ];

        const ctx = canvas.getContext('2d');
        
        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets = datasets;
            this.chart.update();
        } else {
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#333333',
                                font: { family: "'B612', sans-serif" }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const val = context.raw;
                                    if (val === 0) return null;
                                    return ` ${context.dataset.label}: ${this.formatToHHMM(val)} ชม.`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true }
                    }
                }
            });
        }

        this.updatePieChart();
    }

    updatePieChart() {
        const canvas = document.getElementById('proportionChart');
        if (!canvas || !window.Chart || !this.currentTotals) return;

        const t = this.currentTotals;
        const labels = ['สนับสนุน', 'ฝนหลวง', 'ฝุ่น', 'ลูกเห็บ', 'ไฟป่า', 'ทดสอบ', 'ฝึกบิน'];
        const data = [t.support, t.rain, t.dust, t.hail, t.fire, t.test, t.training];
        const colors = [
            'rgba(52, 152, 219, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(231, 76, 60, 0.8)',
            'rgba(230, 126, 34, 0.8)',
            'rgba(52, 152, 219, 0.8)'
        ];

        const ctx = canvas.getContext('2d');
        if (this.pieChart) {
            this.pieChart.data.datasets[0].data = data;
            this.pieChart.update();
        } else {
            this.pieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#333333',
                                font: { family: "'B612', sans-serif" },
                                boxWidth: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const val = context.raw;
                                    if (val === 0) return null;
                                    
                                    let sum = 0;
                                    context.chart.data.datasets[0].data.forEach(data => sum += data);
                                    let percentage = sum > 0 ? ((val * 100) / sum).toFixed(1) + "%" : "0%";
                                    
                                    const labelStr = context.label || '';
                                    return ` ${labelStr}: ${this.formatToHHMM(val)} ชม. (${percentage})`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    getCategoryName(catKey) {
        const map = {
            'support': 'ภารกิจสนับสนุน',
            'rain': 'ปฏิบัติการฝนหลวง',
            'dust': 'บรรเทาปัญหาฝุ่น',
            'hail': 'ยับยั้งพายุลูกเห็บ',
            'fire': 'ดับไฟป่า',
            'test': 'บินทดสอบ',
            'training': 'ฝึกบิน',
            'unknown': 'ไม่ทราบ (ทั่วไป)'
        };
        return map[catKey] || catKey;
    }

    getAircraftImage(name) {
        if (!name || name === 'Unknown Aircraft') return 'img/engine.jpg';
        const lower = name.toLowerCase();
        if (lower.includes('ska') || lower.includes('king')) return 'img/SuperKingAir350.jpg';
        if (lower.includes('caravan')) return 'img/Caravan.jpg';
        if (lower.includes('casa') || lower.includes('nc')) return 'img/Casa_NC212i.jpg';
        if (lower.includes('cn-235') || lower.includes('cn235')) return 'img/CN235.jpg';
        if (lower.includes('l410') || lower.includes('l-410')) return 'img/L410NG.jpg';
        if (lower.includes('skycourier') || lower.includes('2512')) return 'img/SkyCourier.jpg';
        if (lower.includes('412')) return 'img/BELL 412 EP.jpg';
        if (lower.includes('407')) return 'img/BELL 407.jpg';
        if (lower.includes('206')) return 'img/BELL 206B3.jpg';
        if (lower.includes('350')) return 'img/AS350 B2.jpg';
        if (lower.includes('130')) return 'img/EC130 (H130 T2).png';
        return 'img/engine.jpg';
    }

    exportToExcel() {
        const data = this.getFilteredData();
        if (!data || data.length === 0) {
            alert('ไม่พบข้อมูลสำหรับส่งออก');
            return;
        }

        // CSV Header matching the summary table
        let csvContent = '\uFEFF'; // BOM for Excel Thai support
        csvContent += 'ปีงบประมาณ,หมายเลขเครื่องบิน,แบบเครื่องบิน,ชั่วโมงยกมา,ชั่วโมงล่าสุด,รวม (ชม.),สนับสนุน,ฝนหลวง,ฝุ่น,ลูกเห็บ,ไฟป่า,ทดสอบ,ฝึกบิน\n';

        data.forEach(item => {
            const name = item.name && item.name !== 'Unknown Aircraft' ? item.name : '';
            const startHrs = this.formatToHHMM(item.startHours, '');
            const endHrs = this.formatToHHMM(item.endHours, '');
            
            csvContent += `"${this.selectedFY}","${item.aircraft}","${name}","${startHrs}","${endHrs}","${this.formatToHHMM(item.total, '0:00')}","${this.formatToHHMM(item.support, '')}","${this.formatToHHMM(item.rain, '')}","${this.formatToHHMM(item.dust, '')}","${this.formatToHHMM(item.hail, '')}","${this.formatToHHMM(item.fire, '')}","${this.formatToHHMM(item.test, '')}","${this.formatToHHMM(item.training, '')}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Mission_Hours_Summary_FY${this.selectedFY}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showAnomaliesModal() {
        const modal = document.getElementById('anomaliesModal');
        const tbody = document.getElementById('anomaliesTableBody');
        
        if (!modal || !tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.anomalies.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 20px; color: #27ae60;"><i class="fas fa-check-circle"></i> ไม่พบความผิดปกติของชั่วโมงบินที่กระโดดเกิน 24 ชม.</td></tr>`;
        } else {
            // Sort anomalies by date descending
            this.anomalies.sort((a, b) => new Date(b.currentDate) - new Date(a.currentDate));
            
            this.anomalies.forEach(anomaly => {
                // Determine if it was ignored (if delta > 300, it was skipped)
                const isIgnored = anomaly.delta >= 300;
                const statusHtml = isIgnored 
                    ? `<span style="color: #e74c3c; font-size: 0.8rem; display: block;">(ถูกตัดทิ้ง)</span>` 
                    : '';
                    
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="font-weight-bold" style="color: #2980b9;">${anomaly.aircraft}</td>
                    <td>${anomaly.prevDate}</td>
                    <td>${anomaly.currentDate}</td>
                    <td class="text-right">${anomaly.prevHours.toFixed(1)}</td>
                    <td class="text-right">${anomaly.currentHours.toFixed(1)}</td>
                    <td class="text-right font-weight-bold" style="color: ${isIgnored ? '#e74c3c' : '#f39c12'};">+${anomaly.delta.toFixed(1)} ${statusHtml}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        modal.classList.remove('hidden');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.missionHoursManager = new MissionHoursManager();
});
