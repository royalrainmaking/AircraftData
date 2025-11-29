class NotificationUtils {
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

    static updateNavNotificationBadge(aircraftData) {
        if (!aircraftData || aircraftData.length === 0) {
            const notificationBadge = document.getElementById('hoursNavNotification');
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
            return;
        }

        const warningCount = aircraftData.filter(aircraft => {
            const progressData = this.calculateProgressBar(aircraft, aircraft.type || 'aircraft');
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
}
