class ProgressBarHelper {
    static getMaxHours(aircraft, aircraftType) {
        const modelName = (aircraft.name || '').toUpperCase();
        if (aircraftType === 'helicopter') {
            if (aircraft.remainingHours100 && aircraft.remainingHours100 !== '-') {
                return 100;
            }
            if (aircraft.remainingHours150 && aircraft.remainingHours150 !== '-') {
                return 150;
            }
            if (aircraft.remainingHours300 && aircraft.remainingHours300 !== '-') {
                return 300;
            }
            return 300;
        }
        if (modelName.includes('CARAVAN')) return 100;
        if (modelName.includes('CN-235') || modelName.includes('CN235') || modelName.includes('SKA-350') || modelName.includes('SKA350')) return 200;
        return 150;
    }
    
    static convertHHMMToHours(timeStr) {
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
    
    static calculateProgressBar(aircraft, aircraftType) {
        const maxHours = this.getMaxHours(aircraft, aircraftType);
        let remainingHours;
        
        if (aircraftType === 'helicopter') {
            let remainingHoursStr = '-';
            if (aircraft.remainingHours100 && aircraft.remainingHours100 !== '-') {
                remainingHoursStr = aircraft.remainingHours100;
            } else if (aircraft.remainingHours150 && aircraft.remainingHours150 !== '-') {
                remainingHoursStr = aircraft.remainingHours150;
            } else if (aircraft.remainingHours300 && aircraft.remainingHours300 !== '-') {
                remainingHoursStr = aircraft.remainingHours300;
            }
            
            if (remainingHoursStr === '-') {
                return { percentage: 0, remaining: '-', status: 'unknown' };
            }
            
            const remainingDecimal = this.convertHHMMToHours(remainingHoursStr);
            if (remainingDecimal === '-') {
                return { percentage: 0, remaining: '-', status: 'unknown' };
            }
            remainingHours = parseFloat(remainingDecimal);
        } else {
            const aCheckDecimal = this.convertHHMMToHours(aircraft.checkStatus);
            const flightHoursDecimal = this.convertHHMMToHours(aircraft.flightHours);
            if (aCheckDecimal === '-' || flightHoursDecimal === '-') {
                return { percentage: 0, remaining: '-', status: 'unknown' };
            }
            const aCheckVal = parseFloat(aCheckDecimal);
            const flightHoursVal = parseFloat(flightHoursDecimal);
            remainingHours = aCheckVal - flightHoursVal;
        }
        
        const percentage = Math.max(0, Math.min(100, ((maxHours - remainingHours) / maxHours) * 100));
        let status = 'ok';
        if (percentage >= 80) status = 'warning';
        if (percentage >= 95) status = 'critical';
        return { percentage: Math.round(percentage), remaining: remainingHours.toFixed(1), maxHours: maxHours, status: status };
    }
    
    static getProgressBarHTML(progressData) {
        if (progressData.status === 'unknown') return '';
        const color = progressData.status === 'critical' ? '#ff3b30' : progressData.status === 'warning' ? '#ff9500' : '#34c759';
        return `<div class="progress-bar-container"><div class="progress-bar"><div class="progress-bar-fill" style="width: ${progressData.percentage}%; background-color: ${color};"></div></div><span class="progress-percentage">${progressData.percentage}%</span></div>`;
    }
    
    static getProgressBarDetailHTML(progressData) {
        if (progressData.status === 'unknown') return 'ไม่มีข้อมูล';
        const statusText = progressData.status === 'critical' ? 'วิกฤต' : progressData.status === 'warning' ? 'เตือน' : 'ปกติ';
        return `<div><div style="margin-bottom: 8px;">${this.getProgressBarHTML(progressData)}</div><div style="font-size: 12px; color: #666;"><div>ชั่วโมงคงเหลือ: <strong>${progressData.remaining}</strong> ชม.</div><div>ชั่วโมงสูงสุด: <strong>${progressData.maxHours}</strong> ชม.</div><div>สถานะ: <strong>${statusText}</strong></div></div></div>`;
    }
}

class ProgressBarHelperStatus {
    static getMaxHours(aircraft, aircraftType) {
        const modelName = (aircraft.name || '').toUpperCase();
        if (aircraftType === 'helicopter') {
            if (aircraft.remainingHours100 && aircraft.remainingHours100 !== '-') {
                return 100;
            }
            if (aircraft.remainingHours150 && aircraft.remainingHours150 !== '-') {
                return 150;
            }
            if (aircraft.remainingHours300 && aircraft.remainingHours300 !== '-') {
                return 300;
            }
            return 300;
        }
        if (modelName.includes('CARAVAN')) return 100;
        if (modelName.includes('CN-235') || modelName.includes('CN235') || modelName.includes('SKA-350') || modelName.includes('SKA350')) return 200;
        return 150;
    }
    
    static convertHHMMToHours(timeStr) {
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
    
    static calculateProgressBar(aircraft, aircraftType) {
        const maxHours = this.getMaxHours(aircraft, aircraftType);
        let remainingHours;
        
        if (aircraftType === 'helicopter') {
            let remainingHoursStr = '-';
            if (aircraft.remainingHours100 && aircraft.remainingHours100 !== '-') {
                remainingHoursStr = aircraft.remainingHours100;
            } else if (aircraft.remainingHours150 && aircraft.remainingHours150 !== '-') {
                remainingHoursStr = aircraft.remainingHours150;
            } else if (aircraft.remainingHours300 && aircraft.remainingHours300 !== '-') {
                remainingHoursStr = aircraft.remainingHours300;
            }
            
            if (remainingHoursStr === '-') {
                return { percentage: 0, remaining: '-', status: 'unknown' };
            }
            
            const remainingDecimal = this.convertHHMMToHours(remainingHoursStr);
            if (remainingDecimal === '-') {
                return { percentage: 0, remaining: '-', status: 'unknown' };
            }
            remainingHours = parseFloat(remainingDecimal);
        } else {
            const aCheckDecimal = this.convertHHMMToHours(aircraft.checkStatus);
            const flightHoursDecimal = this.convertHHMMToHours(aircraft.flightHours);
            if (aCheckDecimal === '-' || flightHoursDecimal === '-') {
                return { percentage: 0, remaining: '-', status: 'unknown' };
            }
            const aCheckVal = parseFloat(aCheckDecimal);
            const flightHoursVal = parseFloat(flightHoursDecimal);
            remainingHours = aCheckVal - flightHoursVal;
        }
        
        const percentage = Math.max(0, Math.min(100, ((maxHours - remainingHours) / maxHours) * 100));
        let status = 'ok';
        if (percentage >= 80) status = 'warning';
        if (percentage >= 95) status = 'critical';
        return { percentage: Math.round(percentage), remaining: remainingHours.toFixed(1), maxHours: maxHours, status: status };
    }
}

class StatusTrackingManager {
    constructor() {
        this.map = null;
        this.markers = {};
        this.markerData = {};
        this.aircraftData = [];
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.currentFilter = 'all';
        this.baseFilter = 'all';
        this.searchTerm = '';
        this.isLoading = false;
        this.selectedAircraft = null;
        this.lines = [];
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.setupEventListeners();
        this.setDateInputToToday();
        this.loadAircraftData();
    }

    setDateInputToToday() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateSelector').value = today;
    }

    initializeMap() {
        this.map = L.map('map').setView([13.7367, 100.5231], 7);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 5
        }).addTo(this.map);

        this.map.on('click', () => this.deselectAircraft());
        this.map.on('zoomend', () => this.updateMarkerSizes());
    }
    
    getMarkerSizeByZoom(zoom) {
        if (zoom <= 6) return { circle: 18, icon: 9, label: 6, offsetX: 5, offsetY: 5 };
        if (zoom <= 7) return { circle: 22, icon: 11, label: 6.5, offsetX: 10, offsetY: 10 };
        if (zoom <= 8) return { circle: 24, icon: 12, label: 7, offsetX: 18, offsetY: 18 };
        if (zoom <= 10) return { circle: 28, icon: 14, label: 7.5, offsetX: 28, offsetY: 28 };
        if (zoom <= 12) return { circle: 32, icon: 16, label: 8, offsetX: 40, offsetY: 40 };
        if (zoom <= 14) return { circle: 36, icon: 18, label: 8.5, offsetX: 50, offsetY: 50 };
        return { circle: 40, icon: 20, label: 9, offsetX: 60, offsetY: 60 };
    }
    
    updateMarkerSizes() {
        const currentZoom = this.map.getZoom();
        const sizes = this.getMarkerSizeByZoom(currentZoom);
        
        Object.keys(this.markers).forEach(aircraftNumber => {
            const marker = this.markers[aircraftNumber];
            
            const iconElement = marker.getElement();
            if (iconElement) {
                const statusDiv = iconElement.querySelector('.marker-status');
                const iconSpan = iconElement.querySelector('.marker-icon');
                const labelDiv = iconElement.querySelector('.marker-label');
                
                if (statusDiv) {
                    statusDiv.style.width = `${sizes.circle}px`;
                    statusDiv.style.height = `${sizes.circle}px`;
                }
                if (iconSpan) {
                    iconSpan.style.fontSize = `${sizes.icon}px`;
                }
                if (labelDiv) {
                    labelDiv.style.fontSize = `${sizes.label}px`;
                    labelDiv.style.top = `${sizes.circle + 4}px`;
                }
            }
        });
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAircraft();
            });
        }

        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector) {
            dateSelector.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                this.loadAircraftData();
            });
        }

        const resetDateBtn = document.getElementById('resetDateBtn');
        if (resetDateBtn) {
            resetDateBtn.addEventListener('click', () => {
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('dateSelector').value = today;
                this.selectedDate = today;
                this.loadAircraftData();
            });
        }



        document.getElementById('filterAll').addEventListener('click', () => {
            this.setActiveFilter('all');
        });

        document.getElementById('filterAircraft').addEventListener('click', () => {
            this.setActiveFilter('aircraft');
        });

        document.getElementById('filterHelicopter').addEventListener('click', () => {
            this.setActiveFilter('helicopter');
        });
    }

    setActiveFilter(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-type="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.currentFilter = filter;
        this.filterAircraft();
    }

    async loadAircraftData() {
        console.log('📡 กำลังโหลดข้อมูลอากาศยาน...');
        
        this.isLoading = true;
        
        try {
            if (typeof flightStatusService !== 'undefined') {
                const data = await flightStatusService.fetchAircraftData(this.selectedDate);
                this.aircraftData = data || [];
                console.log(`✅ โหลดข้อมูลสำเร็จ: ${this.aircraftData.length} เครื่องบิน`);
            } else {
                console.warn('⚠️ flightStatusService ไม่พบ');
                this.loadSampleData();
            }
            
            if (!this.aircraftData || this.aircraftData.length === 0) {
                console.warn('⚠️ ไม่พบข้อมูลอากาศยาน กำลังใช้ข้อมูลตัวอย่าง');
                this.loadSampleData();
            }
            
            this.baseFilter = 'all';
            this.updateMap();
            this.updateSidebar();
            this.updateStatusSummary();
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            this.loadSampleData();
            this.baseFilter = 'all';
        } finally {
            this.isLoading = false;
        }
    }

    loadSampleData() {
        this.aircraftData = [
            {
                aircraftNumber: 'KA350-001',
                name: 'King Air 350',
                type: 'aircraft',
                base: 'Bangkok',
                status: 'ใช้งานได้',
                latitude: 13.7367,
                longitude: 100.5231,
                flightHours: '8520:30',
                checkStatus: '1250:15',
                engineHours: '7840:45',
                mission: 'Bangkok'
            },
            {
                aircraftNumber: 'AS350-002',
                name: 'AS350 B2',
                type: 'helicopter',
                base: 'เชียงใหม่',
                status: 'ใช้งานได้',
                latitude: 18.7666,
                longitude: 98.9620,
                flightHours: '6200:20',
                checkStatus: '980:00',
                engineHours: '5640:30',
                mission: 'เชียงใหม่'
            },
            {
                aircraftNumber: 'BELL-003',
                name: 'BELL 407',
                type: 'helicopter',
                base: 'อุดรธานี',
                status: 'ไม่ใช้งาน',
                latitude: 17.3869,
                longitude: 102.7883,
                flightHours: '4500:15',
                checkStatus: '750:00',
                engineHours: '4100:45',
                mission: 'อุดรธานี'
            }
        ];
        
        console.log('📊 Sample Data Loaded:', this.aircraftData);
        this.aircraftData.forEach(aircraft => {
            console.log(`✈️ ${aircraft.aircraftNumber}:`, {
                name: aircraft.name,
                base: aircraft.base,
                lat: aircraft.latitude,
                lng: aircraft.longitude
            });
        });
    }

    updateMap() {
        this.clearMarkers();
        this.clearLines();
        
        const filtered = this.getFilteredAircraft();
        
        filtered.forEach(aircraft => {
            if (aircraft.latitude && aircraft.longitude) {
                this.addMarker(aircraft);
            }
        });

        this.spiderifyOverlappingMarkers();

        if (filtered.length > 0 && !this.selectedAircraft) {
            const firstAircraft = filtered[0];
            const lat = firstAircraft.latitude || 13.7367;
            const lng = firstAircraft.longitude || 100.5231;
            this.map.setView([lat, lng], 10);
        }
    }

    addMarker(aircraft) {
        console.log(`🗺️ Adding marker for ${aircraft.aircraftNumber}:`, {
            base: aircraft.base,
            latitude: aircraft.latitude,
            longitude: aircraft.longitude
        });
        
        const status = String(aircraft.status).toLowerCase().trim();
        const isActive = status === 'active' || status.includes('ใช้งาน');
        
        const iconName = aircraft.type === 'helicopter' ? 'helicopter' : 'flight';
        
        const progressData = ProgressBarHelper.calculateProgressBar(aircraft, aircraft.type || 'aircraft');
        const hasWarning = progressData.status === 'warning' || progressData.status === 'critical';
        
        const markerHtml = `
            <div class="marker-container">
                <div class="marker-status ${isActive ? 'active' : 'inactive'}">
                    <span class="material-symbols-outlined marker-icon">${iconName}</span>
                    ${hasWarning ? '<div class="marker-notification-badge">!</div>' : ''}
                </div>
                <div class="marker-label">${aircraft.aircraftNumber}</div>
            </div>
        `;

        const customIcon = L.divIcon({
            html: markerHtml,
            className: 'custom-icon',
            iconSize: [34, 38],
            iconAnchor: [17, 38],
            popupAnchor: [0, -38]
        });

        const marker = L.marker([aircraft.latitude, aircraft.longitude], {
            icon: customIcon,
            title: aircraft.name
        });
        
        marker.on('click', () => {
            this.showDetailPanel(aircraft);
        });

        marker.addTo(this.map);
        this.markers[aircraft.aircraftNumber] = marker;
    }

    getStatusText(status) {
        if (!status) return 'ไม่ทราบสถานะ';
        
        const statusStr = String(status).toLowerCase().trim();
        
        if (statusStr === 'active' || statusStr.includes('ใช้งาน')) {
            return '✅ ใช้งานได้';
        } else if (statusStr === 'inactive' || statusStr.includes('ไม่ใช้งาน')) {
            return '❌ ไม่ใช้งาน';
        }
        
        return String(status);
    }

    clearMarkers() {
        Object.values(this.markers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = {};
    }

    clearLines() {
        this.lines.forEach(line => {
            this.map.removeLayer(line);
        });
        this.lines = [];
    }

    spiderifyOverlappingMarkers() {
        const locationGroups = {};
        const threshold = 1.0;
        
        Object.entries(this.markers).forEach(([aircraftNumber, marker]) => {
            const latlng = marker.getLatLng();
            
            let found = false;
            for (const key in locationGroups) {
                const [groupLat, groupLng] = key.split(',').map(Number);
                if (Math.abs(latlng.lat - groupLat) < threshold && Math.abs(latlng.lng - groupLng) < threshold) {
                    locationGroups[key].push({
                        aircraftNumber,
                        marker,
                        lat: latlng.lat,
                        lng: latlng.lng
                    });
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                const key = `${latlng.lat},${latlng.lng}`;
                locationGroups[key] = [{
                    aircraftNumber,
                    marker,
                    lat: latlng.lat,
                    lng: latlng.lng
                }];
            }
        });

        Object.entries(locationGroups).forEach(([key, group]) => {
            if (group.length > 1) {
                this.spiderifyGroup(group);
            }
        });
    }

    spiderifyGroup(group) {
        const centerLat = group[0].lat;
        const centerLng = group[0].lng;
        const radius = 20000;
        const count = group.length;
        
        group.forEach((item, index) => {
            const angle = (index * 360 / count) * Math.PI / 180;
            const offsetLat = centerLat + (radius / 111320) * Math.sin(angle);
            const offsetLng = centerLng + (radius / 111320 / Math.cos(centerLat * Math.PI / 180)) * Math.cos(angle);
            
            item.marker.setLatLng([offsetLat, offsetLng]);
            
            const line = L.polyline(
                [[centerLat, centerLng], [offsetLat, offsetLng]],
                {
                    color: '#999',
                    weight: 1,
                    opacity: 0.5,
                    dashArray: '2, 2'
                }
            ).addTo(this.map);
            
            this.lines.push(line);
        });
    }

    updateSidebar() {
        const filtered = this.getFilteredAircraft();
        const list = document.getElementById('aircraftList');
        
        console.log(`📋 Updating sidebar with ${filtered.length} aircraft:`, filtered);
        
        list.innerHTML = '';
        
        filtered.forEach(aircraft => {
            const li = document.createElement('li');
            li.className = 'aircraft-item';
            
            const status = String(aircraft.status).toLowerCase().trim();
            const isActive = status === 'active' || status.includes('ใช้งาน');
            const statusColor = isActive ? '#34c759' : '#ff3b30';
            const statusText = isActive ? 'ใช้งาน' : 'ไม่ใช้งาน';
            
            console.log(`📌 Sidebar item ${aircraft.aircraftNumber}: base=${aircraft.base}, lat=${aircraft.latitude}, lng=${aircraft.longitude}`);
            
            li.innerHTML = `
                <div class="aircraft-item-content">
                    <div class="aircraft-status-indicator" style="background-color: ${statusColor};"></div>
                    <div class="aircraft-item-info">
                        <div class="aircraft-item-name">${aircraft.aircraftNumber}</div>
                        <div class="aircraft-item-status">${statusText}</div>
                    </div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                this.showDetailPanel(aircraft);
            });
            
            list.appendChild(li);
        });
    }

    updateStatusSummary() {
        const active = this.aircraftData.filter(a => {
            const status = String(a.status).toLowerCase().trim();
            return status === 'active' || status.includes('ใช้งาน');
        }).length;

        const inactive = this.aircraftData.length - active;
        
        const summary = document.getElementById('statusSummary');
        if (summary) {
            summary.innerHTML = `
                <p>
                    <span class="status-icon-text">✅ ใช้งานได้</span>
                    <span class="count-badge green">${active}</span>
                </p>
                <p>
                    <span class="status-icon-text">❌ ไม่ใช้งาน</span>
                    <span class="count-badge red">${inactive}</span>
                </p>
            `;
        }
        
        this.updateNavNotification();
    }

    updateNavNotification() {
        const warningCount = this.aircraftData.filter(aircraft => {
            const progressData = ProgressBarHelperStatus.calculateProgressBar(aircraft, aircraft.type || 'aircraft');
            return progressData.status === 'warning' || progressData.status === 'critical';
        }).length;
        
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

    getFilteredAircraft() {
        let filtered = this.aircraftData;

        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(a => a.type === this.currentFilter);
        }

        if (this.baseFilter !== 'all') {
            filtered = filtered.filter(a => a.base === this.baseFilter);
        }

        if (this.searchTerm) {
            filtered = filtered.filter(a => 
                a.name.toLowerCase().includes(this.searchTerm) ||
                a.aircraftNumber.toLowerCase().includes(this.searchTerm) ||
                (a.base && a.base.toLowerCase().includes(this.searchTerm))
            );
        }

        return filtered;
    }

    setBaseFilter(base) {
        this.baseFilter = base;
        this.filterAircraft();
    }

    filterAircraft() {
        this.updateMap();
        this.updateSidebar();
    }

    showDetailPanel(aircraft) {
        console.log(`📍 Showing detail for ${aircraft.aircraftNumber}:`, {
            base: aircraft.base,
            latitude: aircraft.latitude,
            longitude: aircraft.longitude
        });
        
        this.selectedAircraft = aircraft;
        
        document.querySelectorAll('.aircraft-item').forEach(item => {
            item.classList.remove('active');
        });

        const items = document.querySelectorAll('.aircraft-item');
        items.forEach(item => {
            if (item.querySelector('.aircraft-item-name').textContent === aircraft.aircraftNumber) {
                item.classList.add('active');
            }
        });

        this.updateAircraftDetailPanel(aircraft);

        if (this.markers[aircraft.aircraftNumber]) {
            const lat = aircraft.latitude || 13.7367;
            const lng = aircraft.longitude || 100.5231;
            console.log(`🔍 Setting map view to [${lat}, ${lng}]`);
            this.map.setView([lat, lng], this.map.getZoom());
        }
    }

    updateAircraftDetailPanel(aircraft) {
        const status = String(aircraft.status).toLowerCase().trim();
        const isActive = status === 'active' || status.includes('ใช้งาน');
        const statusText = isActive ? 'ใช้งานได้' : 'ไม่ใช้งาน';
        
        const panel = document.getElementById('aircraftDetailPanel');
        
        const imageUrl = flightStatusService.getAircraftImageUrl(aircraft.name);
        const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="${aircraft.name}" style="width: 60px; height: 60px; object-fit: contain; margin-right: 12px;">` : '';
        
        const progressData = ProgressBarHelperStatus.calculateProgressBar(aircraft, aircraft.type || 'aircraft');
        const criticalNotification = (progressData.status === 'critical' || progressData.status === 'warning') 
            ? `<span class="detail-panel-critical-badge" title="สถานะ: เตือน">⚠️ เตือน</span>`
            : '';
        
        panel.innerHTML = `
            <div class="detail-panel-header">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                        ${imageHtml}
                        <div>
                            <h3 style="margin: 0;">${aircraft.aircraftNumber}</h3>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #999;">${aircraft.name}</p>
                            ${criticalNotification}
                        </div>
                    </div>
                    <div class="popup-status-badge ${isActive ? 'active' : 'inactive'}" style="margin-left: 8px;">
                        ${isActive ? '✅' : '❌'} ${statusText}
                    </div>
                </div>
            </div>
            <div class="detail-panel-body">
                <div class="detail-section">
                    <h4>ข้อมูลการบิน</h4>
                    <div class="detail-row">
                        <span class="detail-label">ชั่วโมงเครื่องบิน:</span>
                        <span class="detail-value">${aircraft.flightHours || '-'}</span>
                    </div>
                    ${aircraft.type !== 'helicopter' ? `
                    <div class="detail-row">
                        <span class="detail-label">ช.ม.ครบ "A" CHECK:</span>
                        <span class="detail-value">${aircraft.checkStatus || '-'}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="detail-section">
                    <h4>ชั่วโมงเครื่องยนต์</h4>
                    ${aircraft.engineHours1 && aircraft.engineHours1 !== '-' ? `
                    <div class="detail-row">
                        <span class="detail-label">เครื่องยนต์ ย1:</span>
                        <span class="detail-value">${aircraft.engineHours1}</span>
                    </div>
                    ` : ''}
                    ${aircraft.engineHours2 && aircraft.engineHours2 !== '-' ? `
                    <div class="detail-row">
                        <span class="detail-label">เครื่องยนต์ ย2:</span>
                        <span class="detail-value">${aircraft.engineHours2}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="detail-section">
                    <h4>ชั่วโมงบินคงเหลือ</h4>
                    ${(() => {
                        const progressData = ProgressBarHelper.calculateProgressBar(aircraft, aircraft.type || 'aircraft');
                        if (progressData.status !== 'unknown') {
                            return `<div class="detail-row"><div style="width: 100%;">${ProgressBarHelper.getProgressBarDetailHTML(progressData)}</div></div>`;
                        }
                        return `${aircraft.remainingHours100 && aircraft.remainingHours100 !== '-' ? `
                        <div class="detail-row">
                            <span class="detail-label">ครบซ่อม 100 ชั่วโมง:</span>
                            <span class="detail-value">${aircraft.remainingHours100}</span>
                        </div>
                        ` : ''}
                        ${aircraft.remainingHours150 && aircraft.remainingHours150 !== '-' ? `
                        <div class="detail-row">
                            <span class="detail-label">ครบซ่อม 150 ชั่วโมง:</span>
                            <span class="detail-value">${aircraft.remainingHours150}</span>
                        </div>
                        ` : ''}
                        ${aircraft.remainingHours300 && aircraft.remainingHours300 !== '-' ? `
                        <div class="detail-row">
                            <span class="detail-label">ครบซ่อม 300 ชั่วโมง:</span>
                            <span class="detail-value">${aircraft.remainingHours300}</span>
                        </div>
                        ` : ''}`;
                    })()}
                </div>
                <div class="detail-section">
                    <h4>ข้อมูลฐาน</h4>
                    <div class="detail-row">
                        <span class="detail-label">ฐานที่ตั้ง:</span>
                        <span class="detail-value">${aircraft.base || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">ภารกิจ:</span>
                        <span class="detail-value">${aircraft.mission || '-'}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>ข้อมูลบำรุงรักษา</h4>
                    <div class="detail-row">
                        <span class="detail-label">ผู้ควบคุมงาน:</span>
                        <span class="detail-value">${aircraft.mechanic || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">หมายเหตุ:</span>
                        <span class="detail-value">${aircraft.remarks || '-'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    selectAircraft(aircraft) {
        this.showDetailPanel(aircraft);
    }

    deselectAircraft() {
        this.selectedAircraft = null;
        
        document.querySelectorAll('.aircraft-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const panel = document.getElementById('aircraftDetailPanel');
        panel.innerHTML = `
            <div class="detail-panel-header">
                <h3>ข้อมูลเครื่องบิน</h3>
            </div>
        `;
        
        Object.values(this.markers).forEach(marker => {
            marker.closePopup();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StatusTrackingManager();
});
