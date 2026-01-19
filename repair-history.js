document.addEventListener('DOMContentLoaded', () => {
    const flightStatusService = new FlightStatusService();
    const logbookContent = document.getElementById('logbookContent');
    const loading = document.getElementById('loading');
    const searchInput = document.getElementById('searchInput');

    let allGroupedHistory = {};

    async function init() {
        try {
            const data = await flightStatusService.fetchAllHistoryData();
            processHistory(data);
            renderHistory();
            loading.style.display = 'none';
        } catch (error) {
            console.error('Error initializing repair history:', error);
            logbookContent.innerHTML = '<div class="no-data"><span class="material-icons" style="font-size: 48px; margin-bottom: 10px;">error_outline</span><br>เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
            loading.style.display = 'none';
        }
    }

    // ฟังก์ชันคำนวณความคล้ายคลึงของข้อความ (Levenshtein Distance)
    function similarity(s1, s2) {
        if (!s1 || !s2) return 0;
        if (s1 === s2) return 1.0;
        
        let longer = s1;
        let shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        let longerLength = longer.length;
        if (longerLength === 0) {
            return 1.0;
        }
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    function editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        let costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0)
                    costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue),
                                costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    function processHistory(data) {
        // กรองเฉพาะสถานะ inactive และมีหมายเหตุ
        const inactiveEntries = data.filter(ac => 
            ac.status === 'inactive' && 
            ac.remarks && 
            ac.remarks !== '-' && 
            ac.remarks.trim() !== ''
        );

        // จัดกลุ่มตามหมายเลขเครื่อง
        const grouped = {};
        inactiveEntries.forEach(entry => {
            if (!grouped[entry.aircraftNumber]) {
                grouped[entry.aircraftNumber] = {
                    number: entry.aircraftNumber,
                    name: entry.name,
                    history: []
                };
            }
            
            const remarks = entry.remarks.trim();
            const date = entry.date;
            
            const isDuplicate = grouped[entry.aircraftNumber].history.some(h => 
                h.date === date && h.remarks === remarks
            );
            
            if (!isDuplicate) {
                grouped[entry.aircraftNumber].history.push({
                    date: date,
                    remarks: remarks
                });
            }
        });

        // จัดกลุ่มวันที่ต่อเนื่องที่มีหมายเหตุคล้ายกัน
        for (const acNum in grouped) {
            const ac = grouped[acNum];
            ac.history.sort((a, b) => new Date(a.date) - new Date(b.date));

            const ranges = [];
            if (ac.history.length === 0) continue;

            let currentRange = {
                startDate: ac.history[0].date,
                endDate: ac.history[0].date,
                remarks: ac.history[0].remarks
            };

            for (let i = 1; i < ac.history.length; i++) {
                const entry = ac.history[i];
                
                const currentDate = new Date(entry.date);
                const lastRangeEndDate = new Date(currentRange.endDate);
                const diffTime = Math.abs(currentDate - lastRangeEndDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const isSimilar = entry.remarks === currentRange.remarks || similarity(entry.remarks, currentRange.remarks) >= 0.8;

                if (diffDays <= 3 && isSimilar) {
                    currentRange.endDate = entry.date;
                    if (entry.remarks.length > currentRange.remarks.length) {
                        currentRange.remarks = entry.remarks;
                    }
                } else {
                    ranges.push(currentRange);
                    currentRange = {
                        startDate: entry.date,
                        endDate: entry.date,
                        remarks: entry.remarks
                    };
                }
            }
            ranges.push(currentRange);
            ac.history = ranges.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        }

        allGroupedHistory = grouped;
    }

    function renderDateBox(dateStr, isEnd = false) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return `<div class="date-box">${dateStr}</div>`;
        
        const months = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = (date.getFullYear() + 543).toString().slice(-2);

        return `
            <div class="date-box ${isEnd ? 'range-end' : ''}">
                <span class="date-text"><b>${day}</b> ${month} ${year}</span>
            </div>
        `;
    }

    function renderHistory(searchTerm = '') {
        logbookContent.innerHTML = '';
        const term = searchTerm.toLowerCase();

        const filteredAircraft = Object.values(allGroupedHistory).filter(ac => 
            ac.number.toLowerCase().includes(term) || 
            ac.name.toLowerCase().includes(term) ||
            ac.history.some(h => h.remarks.toLowerCase().includes(term))
        );

        if (filteredAircraft.length === 0) {
            logbookContent.innerHTML = '<div class="no-data"><span class="material-icons" style="font-size: 48px; margin-bottom: 10px; color: #ccc;">search_off</span><br>ไม่พบข้อมูลประวัติการซ่อมที่คุณต้องการ</div>';
            return;
        }

        filteredAircraft.sort((a, b) => a.number.localeCompare(b.number));

        filteredAircraft.forEach(ac => {
            const displayHistory = term ? ac.history.filter(h => 
                h.remarks.toLowerCase().includes(term) || 
                ac.number.toLowerCase().includes(term) || 
                ac.name.toLowerCase().includes(term)
            ) : ac.history;

            if (displayHistory.length === 0) return;

            const aircraftLog = document.createElement('div');
            aircraftLog.className = 'aircraft-log';
            
            let tableRows = displayHistory.map(range => {
                let dateDisplay = '';
                if (range.startDate === range.endDate) {
                    dateDisplay = `
                        <div class="date-container">
                            ${renderDateBox(range.startDate)}
                        </div>`;
                } else {
                    dateDisplay = `
                        <div class="date-container">
                            ${renderDateBox(range.startDate)}
                            <span class="date-sep">➔</span>
                            ${renderDateBox(range.endDate, true)}
                        </div>`;
                }

                return `
                    <tr>
                        <td class="date-col">${dateDisplay}</td>
                        <td class="remarks-col">${range.remarks}</td>
                    </tr>
                `;
            }).join('');

            const isHelicopter = ac.name.toLowerCase().includes('bell') || ac.name.toLowerCase().includes('as350') || ac.name.toLowerCase().includes('ec130');
            const icon = isHelicopter ? 'helicopter' : 'plane';
            
            // กำหนดชื่อไฟล์รูปภาพตามรุ่น (อ้างอิงจากไฟล์จริงในโฟลเดอร์ img)
            let imgName = 'plane-default.png'; // ไฟล์สำรอง
            const model = ac.name.toUpperCase();
            
            if (model.includes('BELL 412')) imgName = 'BELL 412 EP.jpg';
            else if (model.includes('BELL 206')) imgName = 'BELL 206B3.jpg';
            else if (model.includes('AS350')) imgName = 'AS350 B2.jpg';
            else if (model.includes('EC130')) imgName = 'EC130 (H130 T2).png';
            else if (model.includes('CASA') || model.includes('NC 212I') || model.includes('NC-212I')) imgName = 'Casa_NC212i.jpg';
            else if (model.includes('CARAVAN')) imgName = 'Caravan.jpg';
            else if (model.includes('CN235') || model.includes('CN-235')) imgName = 'CN235.jpg';
            else if (model.includes('L410')) imgName = 'L410NG.jpg';
            else if (model.includes('KING AIR') || model.includes('SKA-350')) imgName = 'SuperKingAir350.jpg';
            else if (model.includes('BELL 407')) imgName = 'BELL 407.jpg';
            
            // หมายเหตุ: สำหรับรุ่นอื่นๆ ที่ไม่มีในรายการจะใช้ plane-default.png หรือรูปที่ใกล้เคียง

            aircraftLog.innerHTML = `
                <div class="aircraft-header">
                    <img src="img/${imgName}" class="header-bg-img" alt="aircraft-bg">
                    <div class="aircraft-title-wrapper">
                        <div class="aircraft-photo-box">
                            <img src="img/${imgName}" alt="${ac.name}" onerror="this.src='img/plane-default.png'">
                        </div>
                        <div class="aircraft-info-text">
                            <h3>${ac.number}</h3>
                            <span class="aircraft-model">${ac.name}</span>
                        </div>
                    </div>
                    <div class="status-badge-pill" style="position: relative; z-index: 1;">
                        <i class="fas fa-book" style="font-size: 10px;"></i>
                        Technical Log
                    </div>
                </div>
                <table class="log-table">
                    <thead>
                        <tr>
                            <th class="date-col">วันที่ / ช่วงเวลา</th>
                            <th class="remarks-col">รายการซ่อมบำรุงและหมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
            logbookContent.appendChild(aircraftLog);
        });
    }

    searchInput.addEventListener('input', (e) => {
        renderHistory(e.target.value);
    });

    init();
});
