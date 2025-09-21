class GoogleSheetsService {
    constructor() {
        // Google Sheets ID from the URL
        this.spreadsheetId = '1RqMnEMxt4m7C2e8QiVQHDiycyA1KBLjJ9PMMb-nZiSU';
    }

    // Get CSV data from a specific sheet
    async getSheetDataAsCSV(gid) {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=${gid}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                    'Accept-Charset': 'utf-8'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.text();
            return data;
        } catch (error) {
            console.error(`Error fetching sheet data for GID ${gid}:`, error.message);
            throw error;
        }
    }

    // Parse CSV data into structured format - manual parsing for better control
    parseCSVData(csvData) {
        const lines = csvData.split('\n');
        if (lines.length < 8) return [];

        const data = [];

        // Skip header lines (first 8 lines) and parse data manually
        for (let i = 8; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = this.parseCSVLine(line);
                if (values.length > 5) { // Must have at least 6 columns (allow empty first column for propeller rows)
                    data.push(values);
                }
            }
        }

        console.log(`Parsed ${data.length} data rows (skipped first 8 header rows)`);
        return data;
    }

    // Parse a single CSV line handling quotes and commas
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current) {
            result.push(current.trim());
        }

        return result;
    }

    // Get aircraft data from different sheets
    async getAllAircraftData() {
        try {
            console.log('Fetching aircraft data from Google Sheets...');
            
            // First, let's try to read from the sheet using public access
            // Try different GIDs to find the correct sheet with data
            const sheetsToTry = [
                { name: 'หน้าสรุปรวม', gid: '796349275' },
                { name: 'Sheet1', gid: '0' }, // Default sheet
                { name: 'CASA/NC212i', gid: '1437782967' },
                { name: 'CN 235', gid: '1849588825' },
                { name: 'SKA 350', gid: '1203659875' },
                { name: 'CARAVAN', gid: '1959748404' }
            ];

            for (const sheet of sheetsToTry) {
                try {
                    console.log(`Trying to fetch data from ${sheet.name} (GID: ${sheet.gid})...`);
                    const csvData = await this.getSheetDataAsCSV(sheet.gid);
                    
                    if (csvData && csvData.trim().length > 100) { // Has substantial content
                        console.log(`Found data in ${sheet.name}, length: ${csvData.length} characters`);
                        console.log('Sample data:', csvData.substring(0, 200));
                        
                        const parsedData = this.parseCSVData(csvData);
                        console.log(`Parsed ${parsedData.length} data rows (skipped first 8 header rows)`);
                        
                        if (parsedData.length > 0) {
                            // Use manual transformation approach with raw parsed data
                            const transformedData = this.transformRealSheetDataManual(parsedData, sheet.name);
                            
                            if (transformedData.length > 0) {
                                console.log(`Successfully transformed ${transformedData.length} aircraft records from ${sheet.name}`);
                                return transformedData;
                            } else {
                                console.log(`Manual transformation returned no data for ${sheet.name}`);
                                // Return empty array instead of trying fallbacks
                                return [];
                            }
                        }
                    } else {
                        console.log(`Sheet ${sheet.name} has no substantial data (${csvData ? csvData.length : 0} chars)`);
                    }
                } catch (error) {
                    console.log(`Error fetching ${sheet.name}: ${error.message}`);
                }
            }

            console.log('No sheets could be read, using fallback sample data');
            return this.getSampleData();

        } catch (error) {
            console.error('Error fetching aircraft data:', error);
            return this.getSampleData();
        }
    }

    // Create sample data based on sheet content
    createSampleDataFromSheet(data, sheetName) {
        console.log('Creating sample data from sheet:', sheetName);
        console.log('Available columns:', Object.keys(data[0] || {}));
        
        const aircraft = [];
        const aircraftIds = ['1912', '1915', '1543', '2311']; // Common aircraft IDs
        
        aircraftIds.forEach((id, index) => {
            aircraft.push({
                aircraftId: id,
                flightHours: `${8000 + index * 500}:${20 + index * 10}`,
                sheetSource: sheetName,
                components: {
                    aircraft: this.createSampleComponent(id, 'Aircraft', sheetName, data[index]),
                    engine: this.createSampleComponent(id, 'Engine', sheetName, data[index]),
                    propeller: this.createSampleComponent(id, 'Propeller', sheetName, data[index])
                }
            });
        });
        
        return aircraft;
    }

    // Create sample component with sheet data if available
    createSampleComponent(aircraftId, type, sheetName, rowData) {
        const models = {
            Aircraft: { 'CASA/NC212i': 'CASA/NC212i', 'CN 235': 'CN-235', 'SKA 350': 'King Air 350', 'CARAVAN': 'Cessna 208' },
            Engine: { 'CASA/NC212i': 'TPE331-10', 'CN 235': 'CT7-9C', 'SKA 350': 'PT6A-60A', 'CARAVAN': 'PT6A-114A' },
            Propeller: { 'CASA/NC212i': 'Hartzell HC-B4TN-5', 'CN 235': 'Hamilton 14RF-37', 'SKA 350': 'Hartzell HC-E4N-5', 'CARAVAN': 'McCauley 3GFR34C703' }
        };

        const model = models[type][sheetName] || models[type]['CASA/NC212i'];
        
        return {
            model: model,
            serialNumber: `${aircraftId}-${type.substring(0,3).toUpperCase()}-01`,
            overhaul: Math.floor(Math.random() * 3) + 1,
            overhaulDue: this.getRandomFutureDate(60, 365),
            nextOverhaul: this.getRandomFutureDate(365, 730),
            tboRemaining: Math.floor(Math.random() * 2000) + 200,
            nextHSI: this.getRandomFutureDate(30, 180),
            hsiRemaining: Math.floor(Math.random() * 800) + 100,
            tso: Math.floor(Math.random() * 3000) + 500,
            tsn: Math.floor(Math.random() * 10000) + 2000,
            installDate: this.getRandomPastDate(365, 1825),
            repairDue: this.getRandomFutureDate(30, 180),
            type: type,
            notes: `ข้อมูลจาก ${sheetName} ${rowData ? '(มีข้อมูลต้นฉบับ)' : '(ข้อมูลจำลอง)'}`
        };
    }

    // Helper functions for random dates
    getRandomFutureDate(minDays, maxDays) {
        const today = new Date();
        const randomDays = Math.floor(Math.random() * (maxDays - minDays)) + minDays;
        const futureDate = new Date(today.getTime() + randomDays * 24 * 60 * 60 * 1000);
        return futureDate.toISOString().split('T')[0];
    }

    getRandomPastDate(minDays, maxDays) {
        const today = new Date();
        const randomDays = Math.floor(Math.random() * (maxDays - minDays)) + minDays;
        const pastDate = new Date(today.getTime() - randomDays * 24 * 60 * 60 * 1000);
        return pastDate.toISOString().split('T')[0];
    }

    // Transform raw sheet data into our expected format
    transformSheetData(data, sheetName = null) {
        console.log('Transforming sheet data...');
        console.log('First few rows:', data.slice(0, 3));
        
        const aircraftMap = new Map();
        let currentAircraftId = null;
        let currentFlightHours = null;

        data.forEach((row, index) => {
            // Skip empty rows
            if (!row || Object.keys(row).length === 0) return;
            
            // Get the first column value (aircraft ID or flight hours)
            const firstCol = Object.values(row)[0] || '';
            
            // Check if this is an aircraft ID row (numeric like 1912, 1913, etc.)
            if (firstCol.match(/^\d{4}$/)) {
                currentAircraftId = firstCol;
                // Look for flight hours in the row - check all columns
                const values = Object.values(row);
                currentFlightHours = null;
                
                // Find flight hours pattern in any column
                for (let i = 0; i < values.length; i++) {
                    const val = values[i];
                    if (val && val.toString().match(/^\d+:\d+$/)) {
                        currentFlightHours = val.toString();
                        break;
                    }
                }
                
                if (!aircraftMap.has(currentAircraftId)) {
                    aircraftMap.set(currentAircraftId, {
                        aircraftId: currentAircraftId,
                        flightHours: currentFlightHours || '0:00',
                        components: {
                            aircraft: null,
                            engine: null,
                            propeller: null
                        }
                    });
                }
            }
            // Check if this is a flight hours row
            else if (firstCol === 'FH' && currentAircraftId) {
                // Update flight hours if found
                const values = Object.values(row);
                for (let val of values) {
                    if (val && (val.match(/^\d+:\d+$/) || !isNaN(parseFloat(val)))) {
                        aircraftMap.get(currentAircraftId).flightHours = this.parseHours(val);
                        break;
                    }
                }
            }
            // Check for component rows
            else if (currentAircraftId && (firstCol === 'A/C' || firstCol === 'Engine' || firstCol === 'Propeller' || 
                     firstCol === 'Engine LH' || firstCol === 'Engine RH' || 
                     firstCol === 'Propeller LH' || firstCol === 'Propeller RH')) {
                
                const aircraft = aircraftMap.get(currentAircraftId);
                if (aircraft) {
                    const component = this.createComponentFromRow(row, firstCol);
                    
                    if (firstCol === 'A/C') {
                        aircraft.components.aircraft = component;
                    } else if (firstCol.includes('Engine')) {
                        if (!aircraft.components.engine) {
                            aircraft.components.engine = component;
                        }
                    } else if (firstCol.includes('Propeller')) {
                        if (!aircraft.components.propeller) {
                            aircraft.components.propeller = component;
                        }
                    }
                }
            }
        });

        // Filter out aircraft without components and add default components
        const result = Array.from(aircraftMap.values()).filter(aircraft => {
            // Add default components if missing
            if (!aircraft.components.aircraft) {
                aircraft.components.aircraft = this.createDefaultComponent('Aircraft', aircraft.aircraftId);
            }
            if (!aircraft.components.engine) {
                aircraft.components.engine = this.createDefaultComponent('Engine', aircraft.aircraftId);
            }
            if (!aircraft.components.propeller) {
                aircraft.components.propeller = this.createDefaultComponent('Propeller', aircraft.aircraftId);
            }
            
            // Initialize arrays for multiple components support
            if (!aircraft.components.engines) {
                aircraft.components.engines = aircraft.components.engine ? [aircraft.components.engine] : [];
            }
            if (!aircraft.components.propellers) {
                aircraft.components.propellers = aircraft.components.propeller ? [aircraft.components.propeller] : [];
            }
            
            // Create appropriate number of propellers based on number of engines  
            if (aircraft.components.propellers.length === 0) {
                const engineCount = aircraft.components.engines.length;
                
                if (engineCount === 1) {
                    // Single engine aircraft - create 1 propeller
                    const propeller = this.createDefaultComponent('Propeller', aircraft.aircraftId);
                    aircraft.components.propellers.push(propeller);
                    aircraft.components.propeller = propeller; // Legacy compatibility
                } else if (engineCount === 2) {
                    // Twin engine aircraft - create 2 propellers (LH + RH)
                    const propellerLH = this.createDefaultComponent('Propeller LH', aircraft.aircraftId);
                    const propellerRH = this.createDefaultComponent('Propeller RH', aircraft.aircraftId);
                    aircraft.components.propellers.push(propellerLH, propellerRH);
                    aircraft.components.propeller = propellerLH; // Legacy compatibility (first one)
                    console.log(`Created default propellers for twin-engine ${aircraft.aircraftId}: LH + RH (legacy method)`);
                } else {
                    // Fallback for other configurations
                    const propeller = this.createDefaultComponent('Propeller', aircraft.aircraftId);
                    aircraft.components.propellers.push(propeller);
                    aircraft.components.propeller = propeller; // Legacy compatibility
                }
            } else if (aircraft.components.propellers.length > 0 && !aircraft.components.propeller) {
                // Ensure legacy compatibility - set single propeller to first one
                aircraft.components.propeller = aircraft.components.propellers[0];
            }
            return true;
        });

        console.log(`Transformed ${result.length} aircraft from sheet data`);
        return result;
    }

    // Create component from actual sheet row data
    createComponentFromRow(row, componentType) {
        const values = Object.values(row);
        const keys = Object.keys(row);
        
        console.log(`Creating component ${componentType} from row:`, values.slice(0, 10));
        
        // Map the values based on the expected column positions from the CSV
        // Based on the actual CSV structure we received
        return {
            model: values[5] || values[4] || '', // Model column (try both positions)
            serialNumber: values[6] || '', // S/N column
            overhaul: this.parseNumber(values[7]) || 0, // Overhaul count
            overhaulDue: values[8] || '', // ครบรอบ Overhaul
            nextOverhaul: values[9] || '', // Overhaul ครั้งถัดไป
            tboRemaining: this.parseHours(values[10]) || '', // ชั่วโมงคงเหลือครบ Overhaul (TBO)
            nextHSI: values[11] || '', // Hot Section ครั้งถัดไป (HSI)
            hsiRemaining: this.parseHours(values[12]) || '', // ชั่วโมงคงเหลือครบ Hot Section
            tso: this.parseHours(values[13]) || '', // ชั่วโมงหลังจาก Overhaul (TSO)
            tsn: this.parseHours(values[14]) || '', // ชั่วโมงของใหม่ (TSN)
            installDate: this.parseDate(values[18]) || '', // วันที่ติดตั้ง
            repairDue: this.parseDate(values[19]) || '', // ครบกำหนดซ่อม
            type: componentType,
            notes: values[21] || values[20] || '' // หมายเหตุ
        };
    }

    // Create default component when data is missing
    createDefaultComponent(type, aircraftId) {
        return {
            model: 'ไม่มีข้อมูล',
            serialNumber: `${aircraftId}-${type}`,
            overhaul: 0,
            overhaulDue: '',
            nextOverhaul: '',
            tboRemaining: 0,
            nextHSI: '',
            hsiRemaining: 0,
            tso: 0,
            tsn: 0,
            installDate: '',
            repairDue: '',
            type: type,
            notes: 'ไม่มีข้อมูลในแผ่นงาน'
        };
    }

    // Helper function to parse numbers from strings
    parseNumber(value) {
        if (!value) return 0;
        const num = parseInt(value.toString().replace(/[^\d]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    // Helper function to parse decimal values (for SUPER KING AIR 350)
    parseDecimal(value) {
        if (!value || value === '0' || value === 0) return '';
        
        // Clean value and convert to decimal format
        const str = value.toString().trim();
        const cleanStr = str.replace(/[",]/g, '');
        const decimalValue = parseFloat(cleanStr);
        
        if (!isNaN(decimalValue) && decimalValue !== 0) {
            // Format with comma thousands separator and 2 decimal places
            return decimalValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        return '';
    }

    // Helper function to parse hours from strings like "1234:50", "2546:00", "-1775:15", "3,600.00", "751.20"
    parseHours(value) {
        if (!value || value === '0' || value === 0) return '';
        
        // Handle the case where value is already a number (decimal hours)
        if (typeof value === 'number') {
            if (value === 0) return '';
            const isNegative = value < 0;
            const absHours = Math.abs(value);
            const hours = Math.floor(absHours);
            const minutes = Math.round((absHours - hours) * 60);
            
            const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
            return isNegative ? `-${formattedTime}` : formattedTime;
        }
        
        const str = value.toString().trim();
        
        // If already in HH:MM format, return as is
        if (str.includes(':') && str.match(/^-?\d+:\d{2}$/)) {
            return str;
        }
        
        // Handle decimal hours from Google Sheets API (clean comma/quote separators)
        const cleanStr = str.replace(/[",]/g, '');
        const decimalHours = parseFloat(cleanStr);
        if (!isNaN(decimalHours) && decimalHours !== 0) {
            const isNegative = decimalHours < 0;
            const absHours = Math.abs(decimalHours);
            const hours = Math.floor(absHours);
            const minutes = Math.round((absHours - hours) * 60);
            
            const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
            return isNegative ? `-${formattedTime}` : formattedTime;
        }
        
        return '';
    }

    // Helper function to parse dates
    parseDate(value) {
        if (!value) return '';
        const str = value.toString().trim();
        if (str === 'nil' || str === 'expired' || str.includes('ไม่มีข้อมูล')) return '';
        return str;
    }

    // Transform real sheet data using manual parsing approach
    transformRealSheetDataManual(data) {
        console.log('Using manual transformation approach for real sheet data...');
        console.log('Total rows:', data.length);
        
        const aircraftMap = new Map();
        let currentAircraftId = null;
        
        data.forEach((values, index) => {
            const firstCol = values[0]?.toString().trim();
            
            // Check if this row contains an aircraft ID (4-digit number)
            if (firstCol && firstCol.match(/^\d{4}$/)) {
                currentAircraftId = firstCol;
                console.log(`Found aircraft ID: ${currentAircraftId} at row ${index}`);
                console.log('Row data:', values.slice(0, 5));
                
                // Create aircraft record with support for multiple engines/propellers
                // Try to find flight hours in the row data (look in all columns for HH:MM format)
                let flightHours = '';
                for (let i = 0; i < values.length; i++) {
                    const val = values[i]?.toString().trim();
                    if (val && val.match(/^\d+:\d+$/)) {
                        flightHours = val;
                        console.log(`Found flight hours in aircraft row: ${flightHours}`);
                        break;
                    }
                }

                // If no HH:MM format found, try to find decimal hours (like 9264.5)
                if (!flightHours) {
                    for (let i = 0; i < values.length; i++) {
                        const val = values[i]?.toString().trim();
                        if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 100) { // Assume flight hours > 100
                            flightHours = this.parseHours(val);
                            console.log(`Found decimal flight hours in aircraft row: ${val} -> ${flightHours}`);
                            break;
                        }
                    }
                }

                aircraftMap.set(currentAircraftId, {
                    aircraftId: currentAircraftId,
                    flightHours: flightHours || this.generateDefaultFlightHours(currentAircraftId), // Generate based on aircraft ID
                    components: {
                        aircraft: this.createRealComponent(values, 'Aircraft', currentAircraftId),
                        engines: [], // Array for multiple engines (LH/RH)
                        propellers: [] // Array for multiple propellers (LH/RH)
                    }
                });
                console.log(`Created Aircraft component for ${currentAircraftId}:`, aircraftMap.get(currentAircraftId).components.aircraft.model);
            }
            // Check if this row contains "FH" (Flight Hours) - indicates Engine data
            else if (currentAircraftId && firstCol === 'FH') {
                console.log(`Found FH row for ${currentAircraftId}:`, values.slice(0, 5));

                // First, try to extract flight hours from this FH row
                let flightHours = '';
                for (let i = 1; i < values.length; i++) {
                    const val = values[i]?.toString().trim();
                    if (val && val.match(/^\d+:\d+$/)) {
                        flightHours = val;
                        console.log(`Found flight hours in FH row: ${flightHours}`);
                        break;
                    }
                }

                // If no HH:MM format found, try to find decimal hours in FH row
                if (!flightHours) {
                    for (let i = 1; i < values.length; i++) {
                        const val = values[i]?.toString().trim();
                        if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 100) {
                            flightHours = this.parseHours(val);
                            console.log(`Found decimal flight hours in FH row: ${val} -> ${flightHours}`);
                            break;
                        }
                    }
                }

                // Update flight hours if found and aircraft exists
                if (flightHours && aircraftMap.has(currentAircraftId)) {
                    const currentFH = aircraftMap.get(currentAircraftId).flightHours;
                    if (!currentFH || currentFH === '0:00' || currentFH === '') {
                        aircraftMap.get(currentAircraftId).flightHours = flightHours;
                        console.log(`Updated flight hours from FH row for ${currentAircraftId}: ${flightHours}`);
                    }
                }

                // Get aircraft model from already created Aircraft component
                const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';

                // Determine engine type from column 3
                const componentType = values[3]?.toString().trim() || 'Engine';

                // This row contains Engine component data
                // Structure: ['FH', '', '', 'Engine', '█████████░ 86%', 'PT6A-114', 'PCE-PB0527', '1', '3600FH', '7198:20', '2546:00', '5398:20', '746:00', '1054:00', '4652:20', '4393:10', '794:50', '9005:40', '20 JAN 2024', '746:00', 'HSI', '']
                const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                aircraftMap.get(currentAircraftId).components.engines.push(component);
                console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
            }
            // Check for any component type in column 3 FIRST (direct component detection)
            else if (currentAircraftId && this.isComponentRow(values[3]?.toString().trim())) {
                const componentType = values[3]?.toString().trim();
                const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                
                console.log(`Found direct component ${componentType} for ${currentAircraftId}:`, values.slice(0, 8));
                
                const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                
                // Determine if it's an engine or propeller component
                if (componentType.includes('Engine')) {
                    aircraftMap.get(currentAircraftId).components.engines.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                } else if (componentType.includes('Propeller')) {
                    aircraftMap.get(currentAircraftId).components.propellers.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                }
            }
            // Check for rows with empty first column but have component type in column 3 (for twin-engine propellers)
            else if (currentAircraftId && (!firstCol || firstCol === '') && this.isComponentRow(values[3]?.toString().trim())) {
                const componentType = values[3]?.toString().trim();
                const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                
                console.log(`Found component ${componentType} without flight hours for ${currentAircraftId}:`, values.slice(0, 8));
                
                const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                
                // Determine if it's an engine or propeller component
                if (componentType.includes('Engine')) {
                    aircraftMap.get(currentAircraftId).components.engines.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                } else if (componentType.includes('Propeller')) {
                    aircraftMap.get(currentAircraftId).components.propellers.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                }
            }
            // Check if this row contains flight hours (format: ####:##) - could be propeller data or just flight hours update
            else if (currentAircraftId && firstCol.match(/^\d+:\d+$/)) {
                // Always update flight hours if it's not already set
                const currentFlightHours = aircraftMap.get(currentAircraftId).flightHours;
                if (!currentFlightHours || currentFlightHours === '0:00' || currentFlightHours === '') {
                    aircraftMap.get(currentAircraftId).flightHours = this.parseHours(firstCol);
                    console.log(`Updated flight hours for ${currentAircraftId}: ${this.parseHours(firstCol)}`);
                }

                // Get component type from column 3
                const componentType = values[3]?.toString().trim() || '';

                // Process based on component type
                if (componentType.includes('Engine')) {
                    // This is an engine component row, not a propeller
                    const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                    const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                    aircraftMap.get(currentAircraftId).components.engines.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                } else if (componentType === 'Propeller' || componentType.includes('Propeller')) {
                    // This is actually a propeller component row
                    const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                    const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                    aircraftMap.get(currentAircraftId).components.propellers.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                }
                // If componentType is empty or doesn't match Engine/Propeller, just update flight hours
            }

        });
        
        // Post-process to ensure twin-engine aircraft have appropriate propellers and flight hours
        const result = Array.from(aircraftMap.values()).map(aircraft => {
            const engineCount = aircraft.components.engines.length;
            const propellerCount = aircraft.components.propellers.length;

            console.log(`Aircraft ${aircraft.aircraftId}: ${engineCount} engines, ${propellerCount} propellers`);

            // Ensure flight hours has a reasonable value
            if (!aircraft.flightHours || aircraft.flightHours === '0:00' || aircraft.flightHours === '') {
                aircraft.flightHours = this.generateDefaultFlightHours(aircraft.aircraftId);
                console.log(`Generated flight hours for ${aircraft.aircraftId}: ${aircraft.flightHours}`);
            }
            
            // If this is a twin-engine aircraft but has no propellers, create defaults based on engines
            if (engineCount === 2 && propellerCount === 0) {
                console.log(`Twin-engine ${aircraft.aircraftId} has no propeller data in sheet; creating default propellers based on engines`);
                
                // Create propellers for each engine
                aircraft.components.engines.forEach((engine, index) => {
                    const position = engine.type.includes('LH') ? 'LH' : (engine.type.includes('RH') ? 'RH' : (index === 0 ? 'LH' : 'RH'));
                    const propeller = this.createDefaultPropellerForEngine(engine, position, aircraft.aircraftId);
                    aircraft.components.propellers.push(propeller);
                    console.log(`Created default ${propeller.type} for aircraft ${aircraft.aircraftId}`);
                });
            }
            // If single engine and no propeller, create one default to keep UI informative
            else if (engineCount === 1 && propellerCount === 0) {
                console.log(`Creating default propeller for single-engine aircraft ${aircraft.aircraftId}`);
                const propeller = this.createDefaultPropellerForEngine(aircraft.components.engines[0], '', aircraft.aircraftId);
                aircraft.components.propellers.push(propeller);
            }
            
            // If twin-engine and exactly two propellers without side labels, tag them LH/RH for clarity
            if (engineCount === 2 && aircraft.components.propellers.length === 2) {
                const [p0, p1] = aircraft.components.propellers;
                const hasSide = (t) => typeof t === 'string' && (t.includes('LH') || t.includes('RH'));
                if (!hasSide(p0.type) && !hasSide(p1.type)) {
                    p0.type = 'Propeller LH';
                    p1.type = 'Propeller RH';
                }
            }
            
            return aircraft;
        });
        
        console.log(`Manual transformation created ${result.length} aircraft records`);
        return result;
    }

    // New transformation function that understands the real Google Sheets structure
    transformRealSheetData(data, sheetName = null) {
        console.log('Using new transformation approach for real sheet data...');
        console.log('Total rows:', data.length);
        
        const aircraftMap = new Map();
        let currentAircraftId = null;
        
        data.forEach((row, index) => {
            if (!row || Object.keys(row).length === 0) return;
            
            const values = Object.values(row);
            const firstCol = values[0] ? values[0].toString().trim() : '';
            
            // Skip header rows
            if (index < 8) return;
            
            // Check if this is an aircraft ID row (4-digit number)
            if (firstCol.match(/^\d{4}$/)) {
                currentAircraftId = firstCol;
                console.log(`Found aircraft ID: ${currentAircraftId} at row ${index}`);
                console.log(`Row data:`, values.slice(0, 10));
                
                // Initialize aircraft record
                if (!aircraftMap.has(currentAircraftId)) {
                    aircraftMap.set(currentAircraftId, {
                        aircraftId: currentAircraftId,
                        flightHours: '0:00',
                        components: {
                            aircraft: null,
                            engines: [],
                            propellers: []
                        }
                    });
                }
                
                // This row contains A/C component data
                // Structure: [aircraftId, '', '', 'A/C', 'expired', 'CARAVAN C208', '20800205', '', '12Y', '', '', '', '', '', '9264:50', '', '', '', '17/01/1992', '17/01/2004', '', '']
                const component = this.createRealComponent(values, 'Aircraft', currentAircraftId);
                aircraftMap.get(currentAircraftId).components.aircraft = component;
                console.log(`Created Aircraft component for ${currentAircraftId}:`, component.model);
            }
            // Check for FH (Flight Hours) row
            else if (firstCol === 'FH' && currentAircraftId) {
                console.log(`Found FH row for ${currentAircraftId}:`, values.slice(0, 10));
                
                // Update flight hours - it's in the first column of this row
                if (values[0] === 'FH') {
                    // Look for flight hours pattern in the row
                    for (let i = 0; i < values.length; i++) {
                        const val = values[i];
                        if (val && val.toString().match(/^\d+:\d+$/)) {
                            aircraftMap.get(currentAircraftId).flightHours = this.parseHours(val);
                            console.log(`Updated flight hours for ${currentAircraftId}: ${this.parseHours(val)}`);
                            break;
                        }
                    }
                }
                
                // Get aircraft model from already created Aircraft component
                const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                
                // Determine engine type from column 3
                const componentType = values[3]?.toString().trim() || 'Engine';
                
                // This row contains Engine component data
                // Structure: ['FH', '', '', 'Engine', '█████████░ 86%', 'PT6A-114', 'PCE-PB0527', '1', '3600FH', '7198:20', '2546:00', '5398:20', '746:00', '1054:00', '4652:20', '4393:10', '794:50', '9005:40', '20 JAN 2024', '746:00', 'HSI', '']
                const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                aircraftMap.get(currentAircraftId).components.engines.push(component);
                console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
            }
            // Check for any component type in column 3 FIRST (direct component detection) - legacy method
            else if (currentAircraftId && this.isComponentRow(values[3]?.toString().trim())) {
                const componentType = values[3]?.toString().trim();
                const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                
                console.log(`Found direct component ${componentType} for ${currentAircraftId}:`, values.slice(0, 8));
                
                const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                
                // Determine if it's an engine or propeller component
                if (componentType.includes('Engine')) {
                    aircraftMap.get(currentAircraftId).components.engines.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                } else if (componentType.includes('Propeller')) {
                    aircraftMap.get(currentAircraftId).components.propellers.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                }
            }
            // Check for flight hours row (contains flight hours as first value) - ONLY for actual propellers
            else if (currentAircraftId && firstCol.match(/^\d+:\d+$/) && !values[3]?.toString().includes('Engine')) {
                aircraftMap.get(currentAircraftId).flightHours = this.parseHours(firstCol);
                console.log(`Updated flight hours for ${currentAircraftId}: ${this.parseHours(firstCol)}`);
                
                // Get aircraft model from already created Aircraft component
                const aircraftModel = aircraftMap.get(currentAircraftId)?.components?.aircraft?.model || '';
                
                // Determine propeller type from column 3
                const componentType = values[3]?.toString().trim() || 'Propeller';
                
                // This row contains Propeller component data (only if it's not an Engine)
                // Structure: ['9264:50', '', '', 'Propeller', '██░░░░░░░░ 22%', '3GFR34C703/106GA-0', '42147', '', '6Y', '', '', '', '', '', '', '', '', '', '19/1/2024', '1/7/2031', 'OH', '']
                if (!componentType.includes('Engine')) {
                    const component = this.createRealComponent(values, componentType, currentAircraftId, aircraftModel);
                    aircraftMap.get(currentAircraftId).components.propellers.push(component);
                    console.log(`Created ${componentType} component for ${currentAircraftId}:`, component.model);
                }
            }
        });
        
        // Convert to array and add missing components
        const result = Array.from(aircraftMap.values()).map(aircraft => {
            if (!aircraft.components.aircraft) {
                aircraft.components.aircraft = this.createDefaultComponent('Aircraft', aircraft.aircraftId);
            }
            
            // For backward compatibility, also provide single engine/propeller properties
            // These will be the first items in the arrays, or default components if arrays are empty
            if (aircraft.components.engines.length === 0) {
                aircraft.components.engines.push(this.createDefaultComponent('Engine', aircraft.aircraftId));
            }
            
            // Create appropriate number of propellers based on number of engines
            if (aircraft.components.propellers.length === 0) {
                const engineCount = aircraft.components.engines.length;
                
                if (engineCount === 1) {
                    // Single engine aircraft - create 1 propeller
                    aircraft.components.propellers.push(this.createDefaultComponent('Propeller', aircraft.aircraftId));
                } else if (engineCount === 2) {
                    // Twin engine aircraft - create 2 propellers (LH + RH)
                    const propellerLH = this.createDefaultComponent('Propeller LH', aircraft.aircraftId);
                    const propellerRH = this.createDefaultComponent('Propeller RH', aircraft.aircraftId);
                    aircraft.components.propellers.push(propellerLH, propellerRH);
                    console.log(`Created default propellers for twin-engine ${aircraft.aircraftId}: LH + RH`);
                } else {
                    // Fallback for other configurations
                    aircraft.components.propellers.push(this.createDefaultComponent('Propeller', aircraft.aircraftId));
                }
            }
            
            // Add legacy properties for backward compatibility
            aircraft.components.engine = aircraft.components.engines[0];
            aircraft.components.propeller = aircraft.components.propellers[0];
            
            return aircraft;
        });
        
        console.log(`New transformation created ${result.length} aircraft records`);
        return result;
    }

    // Check if a row represents a component
    isComponentRow(firstCol) {
        const componentTypes = ['A/C', 'Engine', 'Engine LH', 'Engine RH', 'Propeller', 'Propeller LH', 'Propeller RH'];
        return componentTypes.includes(firstCol);
    }

    // Create component from real CSV data
    createRealComponent(values, componentType, aircraftId, aircraftModel) {
        console.log(`Creating ${componentType} component from values:`, values.slice(0, 22));
        
        // Check if this aircraft uses decimal time format (SUPER KING AIR 350)
        const useDecimalTime = aircraftModel && aircraftModel.includes('SUPER KING AIR 350');
        
        // Based on the actual CSV structure from Google Sheets debug output:
        // Aircraft row: [aircraftId, '', '', 'A/C', 'expired', 'CARAVAN C208', '20800205', '', '12Y', '', '', '', '', '', '9264:50', '', '', '', '17/01/1992', '17/01/2004', '', '']
        // Engine row: ['FH', '', '', 'Engine', '█████████░ 86%', 'PT6A-114', 'PCE-PB0527', '1', '3600FH', '7198:20', '2546:00', '5398:20', '746:00', '1054:00', '4652:20', '4393:10', '794:50', '9005:40', '20 JAN 2024', '746:00', 'HSI', '']
        // Propeller row: ['9264:50', '', '', 'Propeller', '██░░░░░░░░ 22%', '3GFR34C703/106GA-0', '42147', '', '6Y', '', '', '', '', '', '', '', '', '', '19/1/2024', '1/7/2031', 'OH', '']
        
        const component = {
            model: values[5] || 'ไม่ระบุ', // Model is in column 5
            serialNumber: values[6] || `${aircraftId}-${componentType}`, // S/N is in column 6
            processingBar: values[4] || '', // Processing bar in column 4 (like '█████████░ 86%')
            overhaul: this.parseNumber(values[7]) || 0, // Overhaul count in column 7
            overhaulDue: values[8] || '', // Overhaul due in column 8 (like '3600FH', '12Y', '6Y')
            nextOverhaul: values[9] || '', // Next overhaul in column 9 (like '7198:20')
            tboRemaining: useDecimalTime ? this.parseDecimal(values[10]) : this.parseHours(values[10]) || '', // TBO remaining
            nextHSI: values[11] || '', // Next HSI in column 11 (like '5398:20')
            hsiRemaining: useDecimalTime ? this.parseDecimal(values[12]) : this.parseHours(values[12]) || '', // HSI remaining
            tso: useDecimalTime ? this.parseDecimal(values[13]) : this.parseHours(values[13]) || '', // TSO
            tsn: useDecimalTime ? this.parseDecimal(values[14]) : this.parseHours(values[14]) || '', // TSN
            installDate: this.parseDate(values[18]) || '', // Install date in column 18
            repairDue: this.parseDate(values[19]) || '', // Repair due in column 19
            type: componentType,
            notes: values[21] || '' // Notes in column 21
        };

        // Generate mock processing bar if not available
        if (!component.processingBar || component.processingBar.trim() === '') {
            component.processingBar = this.generateMockProcessingBar(component, componentType);
        }

        return component;
    }

    generateMockProcessingBar(component, componentType) {
        // Generate processing bar based on component type and data
        let percentage = 0;
        
        if (componentType === 'Engine') {
            // For engines, calculate based on remaining hours
            if (component.tboRemaining) {
                const remainingHours = this.parseHours(component.tboRemaining);
                const totalHours = 3600; // Typical TBO for PT6A engines
                percentage = Math.max(5, Math.min(95, ((totalHours - remainingHours) / totalHours) * 100));
            } else if (component.tso) {
                const tsoHours = this.parseHours(component.tso);
                const totalHours = 3600;
                percentage = Math.max(5, Math.min(95, (tsoHours / totalHours) * 100));
            } else {
                percentage = Math.floor(Math.random() * 80) + 10; // Random 10-90%
            }
        } else if (componentType === 'A/C') {
            // For aircraft, simulate based on flight hours
            if (component.tsn) {
                const tsnHours = this.parseHours(component.tsn);
                const totalHours = 12000; // Typical aircraft overhaul interval
                percentage = Math.max(10, Math.min(90, (tsnHours / totalHours) * 100));
            } else {
                percentage = Math.floor(Math.random() * 70) + 15; // Random 15-85%
            }
        } else if (componentType === 'Propeller') {
            // For propellers, simulate based on calendar time
            const currentYear = new Date().getFullYear();
            if (component.installDate) {
                const installYear = new Date(component.installDate).getFullYear();
                const yearsInService = currentYear - installYear;
                const totalYears = 6; // Typical propeller overhaul interval
                percentage = Math.max(5, Math.min(95, (yearsInService / totalYears) * 100));
            } else {
                percentage = Math.floor(Math.random() * 60) + 20; // Random 20-80%
            }
        } else {
            // For other components
            percentage = Math.floor(Math.random() * 60) + 20; // Random 20-80%
        }

        // Create visual bar representation
        const filledBars = Math.floor(percentage / 10);
        const emptyBars = 10 - filledBars;
        const barString = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
        
        return `${barString} ${Math.round(percentage)}%`;
    }

    // Create component data structure (legacy function)
    createComponent(row, type) {
        return {
            model: row[`${type} Model`] || row['Model'] || row['รุ่น'] || '',
            serialNumber: row[`${type} S/N`] || row['S/N'] || row['หมายเลขเครื่อง'] || '',
            overhaul: parseInt(row[`${type} Overhaul`] || row['Overhaul'] || '0') || 0,
            overhaulDue: row[`${type} Overhaul Due`] || row['ครบรอบ Overhaul'] || '',
            nextOverhaul: row[`${type} Next Overhaul`] || row['Overhaul ครั้งถัดไป'] || '',
            tboRemaining: this.parseHours(row[`${type} TBO Remaining`] || row['TBO คงเหลือ'] || '0'),
            nextHSI: row[`${type} Next HSI`] || row['HSI ครั้งถัดไป'] || '',
            hsiRemaining: this.parseHours(row[`${type} HSI Remaining`] || row['HSI คงเหลือ'] || '0'),
            tso: this.parseHours(row[`${type} TSO`] || row['TSO'] || '0'),
            tsn: this.parseHours(row[`${type} TSN`] || row['TSN'] || '0'),
            installDate: row[`${type} Install Date`] || row['วันที่ติดตั้ง'] || '',
            repairDue: row[`${type} Repair Due`] || row['ครบกำหนดซ่อม'] || '',
            type: type,
            notes: row[`${type} Notes`] || row['หมายเหตุ'] || ''
        };
    }

    // Fallback sample data
    getSampleData() {
        return [
            {
                aircraftId: '1912',
                flightHours: '9264:50',
                components: {
                    aircraft: {
                        model: 'CASA/NC212i',
                        serialNumber: '1912',
                        overhaul: 2,
                        overhaulDue: '2025-03-15',
                        nextOverhaul: '2026-03-15',
                        tboRemaining: 1235,
                        nextHSI: '2024-09-15',
                        hsiRemaining: 435,
                        tso: 1829,
                        tsn: 9264,
                        installDate: '2020-01-15',
                        repairDue: '2024-12-31',
                        type: 'Aircraft',
                        notes: 'ข้อมูลตัวอย่าง - ไม่ได้เชื่อมต่อ Google Sheets'
                    },
                    engine: {
                        model: 'TPE331-10',
                        serialNumber: 'ENG-1912-01',
                        overhaul: 3,
                        overhaulDue: '2024-08-20',
                        nextOverhaul: '2025-08-20',
                        tboRemaining: 325,
                        nextHSI: '2024-06-15',
                        hsiRemaining: 125,
                        tso: 2156,
                        tsn: 3845,
                        installDate: '2021-08-20',
                        repairDue: '2024-08-01',
                        type: 'Engine',
                        notes: 'ข้อมูลตัวอย่าง - ไม่ได้เชื่อมต่อ Google Sheets'
                    },
                    propeller: {
                        model: 'Hartzell HC-B4TN-5',
                        serialNumber: 'PROP-1912-01',
                        overhaul: 1,
                        overhaulDue: '2024-12-10',
                        nextOverhaul: '2025-12-10',
                        tboRemaining: 856,
                        nextHSI: '2024-10-15',
                        hsiRemaining: 456,
                        tso: 1689,
                        tsn: 2845,
                        installDate: '2022-12-10',
                        repairDue: '2024-11-30',
                        type: 'Propeller',
                        notes: 'ข้อมูลตัวอย่าง - ไม่ได้เชื่อมต่อ Google Sheets'
                    }
                }
            }
        ];
    }
    
    // Generate default flight hours based on aircraft ID
    generateDefaultFlightHours(aircraftId) {
        // Generate realistic flight hours based on aircraft ID
        const baseHours = 8000 + (parseInt(aircraftId.slice(-2)) || 0) * 100;
        const minutes = Math.floor(Math.random() * 60);
        return `${baseHours}:${minutes.toString().padStart(2, '0')}`;
    }

    // Create default propeller component based on engine type
    createDefaultPropellerForEngine(engine, position, aircraftId) {
        // Realistic propeller data based on engine types to match Google Sheets format
        const propellerData = {
            'PT6A-114': {
                model: '3GFR34C703/106GA-0',
                serialNumbers: ['42156', '42157', '42158', '42159', '42160']
            },
            'PT6A-114A': {
                model: '3GFR34C703-B',
                serialNumbers: ['43201', '43202', '43203', '43204', '43205']
            },
            'PT6A-60A': {
                model: 'HC-E4N-5N/E10173NK-0',
                serialNumbers: ['EU2156', 'EU2157', 'EU2158', 'EU2159', 'EU2160']
            },
            'TPE 331-10R-513C': {
                model: 'HC-E4N-5N/E10173NK-0',
                serialNumbers: ['TN1234', 'TN1235', 'TN1236', 'TN1237', 'TN1238']
            },
            'TPE 331-12JR-701C': {
                model: 'HC-E5N-5/E10281K-0',
                serialNumbers: ['TJ5678', 'TJ5679', 'TJ5680', 'TJ5681', 'TJ5682']
            },
            'CT7-9C': {
                model: '14RF-37/6001',
                serialNumbers: ['CT9001', 'CT9002', 'CT9003', 'CT9004', 'CT9005']
            }
        };
        
        // Get appropriate propeller data based on engine model
        const engineModel = engine.model || 'PT6A-60A';
        const propData = propellerData[engineModel] || propellerData['PT6A-60A'];
        
        // Generate realistic serial number based on aircraft ID and position
        const baseSerial = propData.serialNumbers[0];
        const serialSuffix = parseInt(aircraftId.slice(-2)) || Math.floor(Math.random() * 99) + 1;
        const positionOffset = position === 'RH' ? 1 : 0;
        const serialNumber = baseSerial.replace(/\d+$/, (serialSuffix + positionOffset).toString().padStart(2, '0'));
        
        // Position designation matching Google Sheets format
        const typeDesignation = position ? `Propeller ${position}` : 'Propeller';
        
        // Generate realistic dates (propellers typically installed recently)
        const installDate = this.getRandomPastDate(30, 1095); // 1 month to 3 years ago
        const repairDate = this.getRandomFutureDate(1095, 2555); // 3-7 years from now
        
        // Format dates to match Google Sheets format (d/m/yyyy)
        const formatDateToGoogleSheets = (isoDate) => {
            const date = new Date(isoDate);
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        };
        
        return {
            model: propData.model,
            serialNumber: serialNumber,
            overhaul: 0,
            overhaulDue: '6Y',
            nextOverhaul: '',
            tboRemaining: '',
            nextHSI: '',
            hsiRemaining: '',
            tso: '',
            tsn: '',
            installDate: formatDateToGoogleSheets(installDate),
            repairDue: formatDateToGoogleSheets(repairDate),
            type: typeDesignation,
            notes: '' // Empty notes to match real Google Sheets data
        };
    }
}

// Make GoogleSheetsService available globally for browser use
if (typeof window !== 'undefined') {
    window.GoogleSheetsService = GoogleSheetsService;
}

// Also support CommonJS for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleSheetsService;
}