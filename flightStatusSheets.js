class FlightStatusService {
    constructor() {
        this.sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";
        this.aircraftSheetGID = "705816349";
        this.flightData = [];
        this.cacheKey = 'flightStatusCache';
        this.cacheTimestampKey = 'flightStatusCacheTimestamp';
        this.CACHE_EXPIRATION = 0;
        this.positionCounts = {};
        this.initProvinceCoordinates();
    }

    initProvinceCoordinates() {
        this.provinceCoordinates = {
            "กรุงเทพมหานคร": [13.9126, 100.6068],
            "กระบี่": [8.0993, 98.9786],
            "กาญจนบุรี": [14.0039, 99.5501],
            "กาฬสินธุ์": [16.4380, 103.5060],
            "กำแพงเพชร": [16.4828, 99.5220],
            "ขอนแก่น": [16.4666, 102.7836],
            "จันทบุรี": [12.6180, 102.1063],
            "ฉะเชิงเทรา": [13.6904, 101.0779],
            "ชลบุรี": [12.6799, 101.0046],
            "ชัยนาท": [15.1856, 100.1250],
            "ชัยภูมิ": [15.8052, 102.0310],
            "ชุมพร": [10.7112, 99.3616],
            "เชียงราย": [19.9553, 99.8829],
            "เชียงใหม่": [18.7666, 98.9620],
            "ตรัง": [7.5086, 99.6166],
            "ตราด": [12.2746, 102.3190],
            "ตาก": [16.8961, 99.2530],
            "นครนายก": [14.0859, 101.2311],
            "นครปฐม": [13.8198, 100.0401],
            "นครพนม": [17.3973, 104.7754],
            "นครราชสีมา": [14.9498, 102.3130],
            "นครศรีธรรมราช": [8.5396, 99.9447],
            "นครสวรรค์": [15.7112, 100.1153],
            "นนทบุรี": [13.9074, 100.5211],
            "นราธิวาส": [6.5206, 101.7431],
            "น่าน": [18.7727, 100.7857],
            "บึงกาฬ": [18.4462, 103.0605],
            "บุรีรัมย์": [15.2295, 103.2532],
            "ปทุมธานี": [14.0011, 100.5159],
            "ประจวบคีรีขันธ์": [11.7886, 99.7989],
            "ปราจีนบุรี": [13.9385, 101.4190],
            "ปัตตานี": [6.8670, 101.2500],
            "พระนครศรีอยุธยา": [14.3550, 100.5663],
            "พังงา": [8.4225, 98.4878],
            "พัทลุง": [7.6164, 100.0772],
            "พิจิตร": [16.4480, 100.3530],
            "พิษณุโลก": [16.7829, 100.2789],
            "เพชรบุรี": [12.9687, 99.9573],
            "เพชรบูรณ์": [16.6762, 101.1945],
            "แพร่": [18.1322, 100.1657],
            "มหาสารคาม": [15.3836, 103.2956],
            "มุกดาหาร": [16.5400, 104.7107],
            "แม่ฮ่องสอน": [19.3013, 97.9750],
            "ยะลา": [6.5510, 101.2855],
            "ยโสธร": [15.7921, 104.1452],
            "ร้อยเอ็ด": [16.1164, 103.7736],
            "ระนอง": [9.7776, 98.5855],
            "ระยอง": [12.6799, 101.0046],
            "ราชบุรี": [13.5427, 99.8151],
            "ลพบุรี": [14.8027, 100.6116],
            "ลำปาง": [18.2726, 99.5042],
            "ลำพูน": [18.5785, 98.5314],
            "ศรีสะเกษ": [15.1228, 104.3245],
            "สกลนคร": [17.1960, 104.1185],
            "สงขลา": [6.9320, 100.3927],
            "สมุทรปราการ": [13.6894, 100.7500],
            "สมุทรสงคราม": [13.4149, 99.9803],
            "สมุทรสาคร": [13.5659, 100.2833],
            "สระแก้ว": [13.8251, 102.0691],
            "สระบุรี": [14.5313, 100.8839],
            "สิงห์บุรี": [14.8920, 100.3960],
            "สุโขทัย": [17.2380, 99.8181],
            "สุพรรณบุรี": [14.4696, 100.1135],
            "สุราษฎร์ธานี": [9.1326, 99.1356],
            "สุรินทร์": [14.8683, 103.4983],
            "หนองคาย": [17.8707, 102.7415],
            "หนองบัวลำภู": [17.2137, 102.4067],
            "อำนาจเจริญ": [15.8692, 104.6513],
            "อุดรธานี": [17.3869, 102.7883],
            "อุตรดิตถ์": [17.6317, 100.0950],
            "อุทัยธานี": [15.3796, 99.9066],
            "สนามบินคลองหลวง": [14.11994317780348, 100.62058030298614],
            "ฝนหลวง": [14.11994317780348, 100.62058030298614],
            "Bangkok": [13.9126, 100.6068]
        };
    }

    async fetchAircraftData(selectedDate = null) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const isToday = !selectedDate || selectedDate === today;
            
            console.log(`📅 วันที่ที่เลือก: ${selectedDate || 'ไม่ระบุ'}, วันนี้: ${today}, คือวันนี้หรือไม่: ${isToday}`);
            
            if (!isToday) {
                const cachedData = this.getCachedData(selectedDate);
                if (cachedData) {
                    console.log(`✅ ใช้ข้อมูล cache สำหรับวันที่: ${selectedDate}`);
                    this.flightData = cachedData;
                    return this.flightData;
                }
            } else {
                console.log('🔄 วันนี้ - เอาข้อมูลใหม่เสมอ (ไม่ใช้ cache)');
            }
            
            console.log('📡 กำลังดึงข้อมูลอากาศยานจาก Google Sheets...');
            
            let aircraftURL = `https://docs.google.com/spreadsheets/d/${this.sheetID}/gviz/tq?tqx=out:json&gid=${this.aircraftSheetGID}`;
            
            if (selectedDate) {
                aircraftURL += `&date=${selectedDate}`;
                console.log(`📅 ดึงข้อมูลสำหรับวันที่: ${selectedDate}`);
            }

            console.log('🔗 URL:', aircraftURL);

            const fetchOptions = {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            };

            const response = await fetch(aircraftURL, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            
            console.log('📝 Response length:', text.length);
            console.log('📝 First 200 chars:', text.substring(0, 200));
            
            if (!text || text.length < 50) {
                throw new Error("ข้อมูลที่ได้รับไม่ถูกต้อง");
            }

            let json;
            const startIdx = text.indexOf('{');
            const endIdx = text.lastIndexOf('}');
            
            if (startIdx !== -1 && endIdx !== -1) {
                const jsonStr = text.substring(startIdx, endIdx + 1);
                console.log('📝 Extracted JSON length:', jsonStr.length);
                json = JSON.parse(jsonStr);
            } else {
                throw new Error('ไม่สามารถหา JSON ในข้อมูลที่ได้รับ');
            }
            
            if (!json || !json.table || !json.table.rows) {
                console.error('❌ JSON structure:', json);
                throw new Error("โครงสร้าง JSON ไม่ถูกต้อง");
            }

            console.log('📊 Total rows:', json.table.rows.length);

            this.flightData = this.parseFlightData(json.table.rows, selectedDate);
            console.log(`✅ ดึงข้อมูลสำเร็จ: ${this.flightData.length} เครื่องบิน`);

            if (!isToday) {
                this.cacheData(this.flightData, selectedDate);
            }

            return this.flightData;

        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            console.error('❌ Error details:', error.message);
            return [];
        }
    }

    parseFlightData(rows, selectedDate = null) {
        const aircraft = [];

        console.log('🔍 Starting to parse', rows.length, 'rows');
        
        let foundRow = null;
        let lastValidRow = null;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            if (!row.c) {
                console.log(`Row ${i}: no columns (c) property`);
                continue;
            }

            console.log(`Row ${i}: ${row.c.length} columns`);
            
            if (row.c.length < 2) continue;

            const dateValue = row.c[0]?.v || '';
            const jsonValue = row.c[1]?.v || '';
            
            console.log(`📅 Date: ${dateValue}, Has JSON: ${!!jsonValue}`);

            if (!jsonValue) {
                console.log(`Row ${i}: no JSON data in column B`);
                continue;
            }

            lastValidRow = row;

            if (selectedDate) {
                const rowDate = this.normalizeDate(dateValue);
                if (rowDate === selectedDate) {
                    console.log(`✅ Date match found: ${rowDate}`);
                    foundRow = row;
                    break;
                } else {
                    console.log(`Skipping row - date mismatch: ${rowDate} !== ${selectedDate}`);
                }
            } else {
                console.log(`No date filter, using first valid row`);
                foundRow = row;
                break;
            }
        }

        if (!foundRow) {
            if (lastValidRow) {
                console.log('⚠️ No date match found, using last valid row');
                foundRow = lastValidRow;
            } else {
                console.error('❌ No valid rows found with JSON data');
                return aircraft;
            }
        }

        const jsonValue = foundRow.c[1]?.v || '';
        
        try {
            const jsonData = JSON.parse(jsonValue);
            console.log('📄 Parsed JSON successfully');

            const sheet1Data = jsonData.ข้อมูลSheet1 || [];
            const sheet2Data = jsonData.ข้อมูลSheet2 || [];
            
            console.log(`📊 Sheet1: ${sheet1Data.length} aircraft, Sheet2: ${sheet2Data.length} helicopters`);

            this.processSheet1Data(sheet1Data, aircraft);
            this.processSheet2Data(sheet2Data, aircraft);

        } catch (error) {
            console.error(`❌ Failed to parse JSON:`, error.message);
        }

        console.log('📊 Total parsed aircraft:', aircraft.length);
        return aircraft;
    }

    processSheet1Data(aircraftArray, resultArray) {
        if (!Array.isArray(aircraftArray)) {
            console.log('Sheet1 is not an array:', typeof aircraftArray);
            return;
        }

        console.log('Processing Sheet1 data, first item keys:', Object.keys(aircraftArray[0] || {}));

        aircraftArray.forEach((item, index) => {
            try {
                if (!item || typeof item !== 'object') {
                    console.log(`Sheet1 row ${index}: not an object`);
                    return;
                }

                console.log(`Sheet1 row ${index}:`, Object.keys(item));
                console.log(`Sheet1 row ${index} full data:`, JSON.stringify(item, null, 2));

                const aircraftNum = this.getFieldValue(item, ['เครื่องบิน', 'หมายเลข', 'number', 'aircraft_number', 'id']);
                const baseRaw = this.getFieldValue(item, ['ภารกิจ/ฐานที่ตั้ง', 'ฐานที่ตั้ง', 'base', 'location']) || 'Bangkok';
                const baseLocation = this.parseLocation(baseRaw);
                const statusRaw = this.getFieldValue(item, ['สภาพ', 'สถานะ', 'status', 'state']) || 'active';
                const statusNormalized = this.normalizeStatus(statusRaw);

                const coordinates = this.getCoordinatesForProvince(baseLocation);

                const aircraft = {
                    aircraftNumber: String(aircraftNum) || `AC-${index}`,
                    name: this.getFieldValue(item, ['แบบเครื่องบิน', 'name', 'model', 'type']) || 'Unknown Aircraft',
                    base: baseLocation,
                    status: statusNormalized,
                    latitude: parseFloat(this.getFieldValue(item, ['latitude', 'lat']) || coordinates[0]),
                    longitude: parseFloat(this.getFieldValue(item, ['longitude', 'lng', 'lon']) || coordinates[1]),
                    type: 'aircraft',
                    flightHours: this.getFieldValue(item, ['ชั่วโมง', 'ชั่วโมงเครื่องบิน', 'flight hours', 'flightHours']) || '-',
                    checkStatus: this.getFieldValue(item, ['A cHEcK ', 'ช.ม.ครบ"A" CHECK', 'A CHECK', 'checkStatus']) || '-',
                    remainingCheckHours: this.getFieldValue(item, ['ครบซ่อม A cHEcK ', 'ชั่วโมงบินคงเหลือ A CHECK']) || '-',
                    engineHours: this.getFieldValue(item, ['ชั่วโมงเครื่องยนต์', 'engine hours', 'engineHours']) || '-',
                    engineHours1: this.getFieldValue(item, ['No.1 /LH', 'ชั่วโมงเครื่องยนต์ ย1', 'ชั่วโมงเครื่องยนต์ 1', 'engine hours 1']) || '-',
                    engineHours2: this.getFieldValue(item, ['No.2 /RH', 'ชั่วโมงเครื่องยนต์ ย2', 'ชั่วโมงเครื่องยนต์ 2', 'engine hours 2']) || '-',
                    remainingHours100: this.getFieldValue(item, ['ชั่วโมงบินคงเหลือครบซ่อม 100', 'remaining hours 100']) || '-',
                    remainingHours150: this.getFieldValue(item, ['ชั่วโมงบินคงเหลือครบซ่อม 150', 'remaining hours 150']) || '-',
                    remainingHours300: this.getFieldValue(item, ['ชั่วโมงบินคงเหลือครบซ่อม 300', 'remaining hours 300']) || '-',
                    mission: this.getFieldValue(item, ['ภารกิจ/ฐานที่ตั้ง', 'mission', 'ภารกิจ']) || baseLocation,
                    mechanic: this.getFieldValue(item, ['ผู้ควบคุมงานช่าง', 'mechanic', 'maintenance']) || '-',
                    remarks: this.getFieldValue(item, ['หมายเหตุ', 'remarks', 'notes']) || '-',
                    rawData: item
                };

                if (aircraft.aircraftNumber && aircraft.name) {
                    resultArray.push(aircraft);
                    console.log(`✈️ Added aircraft: ${aircraft.name} (${aircraft.aircraftNumber})`);
                } else {
                    console.log(`Sheet1 row ${index}: missing required fields`, {number: aircraft.aircraftNumber, name: aircraft.name});
                }
            } catch (error) {
                console.error(`Error processing aircraft ${index}:`, error, item);
            }
        });
    }

    processSheet2Data(helicopterArray, resultArray) {
        if (!Array.isArray(helicopterArray)) {
            console.log('Sheet2 is not an array:', typeof helicopterArray);
            return;
        }

        console.log('Processing Sheet2 data, first item keys:', Object.keys(helicopterArray[0] || {}));

        helicopterArray.forEach((item, index) => {
            try {
                if (!item || typeof item !== 'object') {
                    console.log(`Sheet2 row ${index}: not an object`);
                    return;
                }

                console.log(`Sheet2 row ${index}:`, Object.keys(item));
                console.log(`Sheet2 row ${index} full data:`, JSON.stringify(item, null, 2));

                const helicopterNum = this.getFieldValue(item, ['เฮลิคอปเตอร์', 'หมายเลข', 'number', 'helicopter_number', 'id']);
                const baseRaw = this.getFieldValue(item, ['ภารกิจ/ฐานที่ตั้ง', 'ฐานที่ตั้ง', 'base', 'location']) || 'Bangkok';
                const baseLocation = this.parseLocation(baseRaw);
                const statusRaw = this.getFieldValue(item, ['สภาพ', 'สถานะ', 'status', 'state']) || 'active';
                const statusNormalized = this.normalizeStatus(statusRaw);

                const coordinates = this.getCoordinatesForProvince(baseLocation);

                let helicopterName = this.getFieldValue(item, ['แบบเครื่องบิน', 'แบบเฮลิคอปเตอร์', 'เฮลิคอปเตอร์', 'BELL', 'name', 'model', 'type']);
                
                console.log(`Sheet2 row ${index} helicopter number: ${helicopterNum}, helicopter name: ${helicopterName}`);
                
                if (!helicopterName || helicopterName === 'Unknown Helicopter') {
                    helicopterName = this.findHelicopterModel(item) || 'Unknown Helicopter';
                }

                const helicopter = {
                    aircraftNumber: String(helicopterNum) || `HE-${index}`,
                    name: helicopterName,
                    base: baseLocation,
                    status: statusNormalized,
                    latitude: parseFloat(this.getFieldValue(item, ['latitude', 'lat']) || coordinates[0]),
                    longitude: parseFloat(this.getFieldValue(item, ['longitude', 'lng', 'lon']) || coordinates[1]),
                    type: 'helicopter',
                    flightHours: this.getFieldValue(item, ['ชั่วโมง', 'ชั่วโมงเครื่องบิน', 'flight hours', 'flightHours']) || '-',
                    checkStatus: this.getFieldValue(item, ['ช.ม.ครบ"A" CHECK', 'A CHECK', 'checkStatus']) || '-',
                    engineHours: this.getFieldValue(item, ['ชั่วโมงเครื่องยนต์', 'engine hours', 'engineHours']) || '-',
                    engineHours1: this.getFieldValue(item, ['ชั่วโมงเครื่องยนต์ ย1', 'ชั่วโมงเครื่องยนต์ 1', 'engine hours 1']) || '-',
                    engineHours2: this.getFieldValue(item, ['ชั่วโมงเครื่องยนต์ ย2', 'ชั่วโมงเครื่องยนต์ 2', 'engine hours 2']) || '-',
                    remainingHours100: this.getFieldValue(item, ['ชั่วโมงบินคงเหลือครบซ่อม 100', 'remaining hours 100']) || '-',
                    remainingHours150: this.getFieldValue(item, ['ชั่วโมงบินคงเหลือครบซ่อม 150', 'remaining hours 150']) || '-',
                    remainingHours300: this.getFieldValue(item, ['ชั่วโมงบินคงเหลือครบซ่อม 300', 'remaining hours 300']) || '-',
                    mission: this.getFieldValue(item, ['ภารกิจ/ฐานที่ตั้ง', 'mission', 'ภารกิจ']) || baseLocation,
                    mechanic: this.getFieldValue(item, ['ผู้ควบคุมงานช่าง', 'mechanic', 'maintenance']) || '-',
                    remarks: this.getFieldValue(item, ['หมายเหตุ', 'remarks', 'notes']) || '-',
                    rawData: item
                };

                if (helicopter.aircraftNumber && helicopter.name) {
                    resultArray.push(helicopter);
                    console.log(`🚁 Added helicopter: ${helicopter.name} (${helicopter.aircraftNumber})`);
                } else {
                    console.log(`Sheet2 row ${index}: missing required fields`, {number: helicopter.aircraftNumber, name: helicopter.name});
                }
            } catch (error) {
                console.error(`Error processing helicopter ${index}:`, error, item);
            }
        });
    }

    getFieldValue(obj, fieldNames) {
        if (!obj || typeof obj !== 'object') return null;
        
        for (const fieldName of fieldNames) {
            const value = obj[fieldName];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
        return null;
    }

    getCoordinatesForProvince(province) {
        if (!province) return this.provinceCoordinates['นครสวรรค์'] || [15.7112, 100.1153];
        
        const prov = String(province).trim();
        
        if (this.provinceCoordinates[prov]) {
            return this.provinceCoordinates[prov];
        }
        
        for (const [key, coords] of Object.entries(this.provinceCoordinates)) {
            if (key.toLowerCase() === prov.toLowerCase()) {
                return coords;
            }
        }
        
        console.warn(`⚠️ ไม่พบจังหวัด: "${province}" - ใช้พิกัด นครสวรรค์ เป็นค่าเริ่มต้น`);
        console.warn('📍 ชื่อจังหวัดที่มี:', Object.keys(this.provinceCoordinates));
        
        return this.provinceCoordinates['นครสวรรค์'] || [15.7112, 100.1153];
    }

    findHelicopterModel(item) {
        if (!item || typeof item !== 'object') return null;
        
        const helicopterPatterns = ['BELL', 'AS350', 'SIKORSKY', 'AW', 'EC', 'SA', 'UH'];
        
        for (const [key, value] of Object.entries(item)) {
            if (!value) continue;
            
            const valueStr = String(value).toUpperCase().trim();
            
            for (const pattern of helicopterPatterns) {
                if (valueStr.includes(pattern)) {
                    return String(value);
                }
            }
        }
        
        return null;
    }

    normalizeStatus(statusValue) {
        if (!statusValue) return 'active';
        
        const status = String(statusValue).toLowerCase().trim();
        
        if (status === 'yes' || status === '1' || status === 'true' || 
            status === 'active' || status === 'ใช้งาน' || status === 'ใช้งานได้') {
            return 'active';
        } else if (status === 'no' || status === '0' || status === 'false' || 
                   status === 'inactive' || status === 'ไม่ใช้งาน') {
            return 'inactive';
        }
        
        return 'active';
    }

    parseLocation(locationString) {
        if (!locationString) return 'Bangkok';
        
        let location = String(locationString).trim();
        
        location = location.replace(/ฝนหลวง/g, '').trim();
        location = location.replace(/ดัดแปรสภาพอากาศ/g, '').trim();
        
        const provinceList = Object.keys(this.provinceCoordinates);
        let firstProvinceFound = null;
        let firstProvinceIndex = location.length;
        
        for (const province of provinceList) {
            const prefixIndex = location.indexOf(`จ.${province}`);
            if (prefixIndex !== -1 && prefixIndex < firstProvinceIndex) {
                firstProvinceIndex = prefixIndex;
                firstProvinceFound = province;
            }
            
            const alternativePrefixIndex = location.indexOf(`จ. ${province}`);
            if (alternativePrefixIndex !== -1 && alternativePrefixIndex < firstProvinceIndex) {
                firstProvinceIndex = alternativePrefixIndex;
                firstProvinceFound = province;
            }
            
            const provinceIndex = location.indexOf(province);
            if (provinceIndex !== -1 && provinceIndex < firstProvinceIndex) {
                const beforeChar = provinceIndex > 0 ? location[provinceIndex - 1] : ' ';
                const afterChar = provinceIndex + province.length < location.length ? location[provinceIndex + province.length] : ' ';
                
                if (/[\s,]/.test(beforeChar) && /[\s,]/.test(afterChar)) {
                    firstProvinceIndex = provinceIndex;
                    firstProvinceFound = province;
                }
            }
        }
        
        if (firstProvinceFound) {
            return firstProvinceFound;
        }
        
        location = location.replace(/^จ\./g, '').trim();
        location = location.replace(/^จ\. /g, '').trim();
        
        if (location.includes(' ')) {
            const parts = location.split(' ');
            const firstPart = parts[0];
            
            if (firstPart.match(/^\d+/) || firstPart.match(/^[0-9]/)) {
                const restParts = parts.slice(1).join(' ').trim();
                if (restParts) {
                    return restParts;
                }
            }
            
            if (firstPart.includes('เม.ย') || firstPart.includes('พ.ค')) {
                return 'Bangkok';
            }
            
            if (firstPart.trim()) {
                return firstPart.trim();
            }
        }
        
        return location || 'Bangkok';
    }

    normalizeDate(dateValue) {
        if (!dateValue) return '';

        const dateStr = String(dateValue);
        
        if (dateStr instanceof Date) {
            const year = dateStr.getFullYear();
            const month = String(dateStr.getMonth() + 1).padStart(2, '0');
            const day = String(dateStr.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        if (dateStr.includes('Date(')) {
            try {
                const dateStr_cleaned = dateStr.replace('Date(', '').replace(')', '');
                const dateParts = dateStr_cleaned.split(',').map(p => p.trim());
                if (dateParts.length >= 3) {
                    const year = parseInt(dateParts[0]);
                    const month = String(parseInt(dateParts[1]) + 1).padStart(2, '0');
                    const day = String(parseInt(dateParts[2])).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            } catch (e) {
                console.warn('Cannot parse Date() format:', e);
            }
        }

        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                let day = parts[0].padStart(2, '0');
                let month = parts[1].padStart(2, '0');
                let year = parts[2];
                if (year.length === 2) year = `20${year}`;
                return `${year}-${month}-${day}`;
            }
        }

        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return dateStr;
                } else {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    let year = parts[2];
                    if (year.length === 2) year = `20${year}`;
                    return `${year}-${month}-${day}`;
                }
            }
        }

        return dateStr;
    }

    normalizeAircraftType(type) {
        const typeLower = type.toLowerCase();
        
        if (typeLower.includes('helicopter') || typeLower.includes('เฮลิคอปเตอร์')) {
            return 'helicopter';
        }
        
        return 'aircraft';
    }

    cacheData(data, date = null) {
        try {
            const cacheObj = JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
            const timestamp = new Date().getTime();
            
            cacheObj[date || 'latest'] = {
                data: data,
                timestamp: timestamp
            };
            
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheObj));
            console.log(`💾 บันทึกข้อมูลลงใน cache สำหรับวันที่: ${date || 'latest'}`);
        } catch (error) {
            console.error('❌ ไม่สามารถบันทึก cache:', error);
        }
    }

    getCachedData(date = null) {
        try {
            const cacheObj = JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
            const cacheEntry = cacheObj[date || 'latest'];
            
            if (!cacheEntry) {
                console.log(`📋 ไม่พบ cache สำหรับวันที่: ${date || 'latest'}`);
                return null;
            }

            const currentTime = new Date().getTime();
            const age = currentTime - cacheEntry.timestamp;
            const CACHE_DURATION = 24 * 60 * 60 * 1000;

            if (age < CACHE_DURATION) {
                console.log(`📋 ใช้ข้อมูล cache สำหรับวันที่: ${date || 'latest'} (อายุ: ${Math.round(age / 1000)}วินาที)`);
                return cacheEntry.data;
            } else {
                console.log(`⏰ ข้อมูล cache หมดอายุแล้ว สำหรับวันที่: ${date || 'latest'}`);
                delete cacheObj[date || 'latest'];
                localStorage.setItem(this.cacheKey, JSON.stringify(cacheObj));
                return null;
            }
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการอ่าน cache:', error);
            return null;
        }
    }

    clearCache(date = null) {
        try {
            if (date) {
                const cacheObj = JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
                delete cacheObj[date];
                localStorage.setItem(this.cacheKey, JSON.stringify(cacheObj));
                console.log(`🗑️ ล้าง cache สำหรับวันที่: ${date}`);
            } else {
                localStorage.removeItem(this.cacheKey);
                console.log('🗑️ ล้าง cache ทั้งหมด');
            }
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการล้าง cache:', error);
        }
    }

    getAircraftByFilter(filter = 'all') {
        if (filter === 'all') {
            return this.flightData;
        }
        
        return this.flightData.filter(a => a.type === filter);
    }

    searchAircraft(searchTerm) {
        if (!searchTerm) {
            return this.flightData;
        }

        const term = searchTerm.toLowerCase();
        return this.flightData.filter(a =>
            a.aircraftNumber.toLowerCase().includes(term) ||
            a.name.toLowerCase().includes(term) ||
            (a.base && a.base.toLowerCase().includes(term)) ||
            a.status.toLowerCase().includes(term)
        );
    }

    getStatusSummary() {
        const active = this.flightData.filter(a => {
            const status = String(a.status).toLowerCase().trim();
            return status === 'active';
        }).length;

        const inactive = this.flightData.length - active;

        return {
            total: this.flightData.length,
            active: active,
            inactive: inactive
        };
    }

    getAircraftByNumber(aircraftNumber) {
        return this.flightData.find(a => a.aircraftNumber === aircraftNumber);
    }

    getAircraftImageUrl(aircraftName) {
        if (!aircraftName) return null;

        const name = String(aircraftName).toUpperCase().trim();
        
        if (name.includes('CASA-300') || name.includes('CASA-400') || 
            (name.includes('CASA') && name.includes('NC')) || name.includes('NC 212I') || 
            name.includes('NC212I') || name.includes('CASA NC212I')) {
            return 'img/Casa_NC212i.jpg';
        }
        
        if (name.includes('SKA-350') || name.includes('SKA350')) {
            return 'img/SuperKingAir350.jpg';
        }
        
        if (name.includes('CN-235') || name.includes('CN235')) {
            return 'img/CN235.jpg';
        }
        
        if (name.includes('H130T2') || name.includes('H130 T2')) {
            return 'img/EC130 (H130 T2).png';
        }

        if (name.includes('L410')) {
            return 'img/L410NG.jpg';
        }

        const aircraftImages = {
            'AS350': 'AS350 B2.jpg',
            'AS350 B2': 'AS350 B2.jpg',
            'BELL 206B3': 'BELL 206B3.jpg',
            'BELL 206': 'BELL 206B3.jpg',
            'BELL 407': 'BELL 407.jpg',
            'BELL 412 EP': 'BELL 412 EP.jpg',
            'BELL 412': 'BELL 412 EP.jpg',
            'CARAVAN': 'Caravan.jpg',
            'EC130': 'EC130 (H130 T2).png',
            'H130': 'EC130 (H130 T2).png',
            'SUPER KING AIR 350': 'SuperKingAir350.jpg'
        };

        for (const [key, filename] of Object.entries(aircraftImages)) {
            if (name.includes(key)) {
                return `img/${filename}`;
            }
        }
        
        return null;
    }
}

const flightStatusService = new FlightStatusService();
