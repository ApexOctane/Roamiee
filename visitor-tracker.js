// Visitor Tracking System for Default API Key Usage
class VisitorTracker {
    constructor() {
        this.maxWeeklyRuns = 2;
        this.cookieName = 'travel_planner_visitor_id';
        this.localStorageKey = 'travel_planner_shared_visitor_id';
        this.cookieExpireDays = 365; // Cookie lasts 1 year
        this.visitorId = null;
        
        // Initialize with default data to prevent null errors
        this.visitorData = {
            visitorId: null,
            totalRuns: 0,
            weeklyUsage: [],
            firstVisit: new Date().toISOString(),
            lastVisit: new Date().toISOString()
        };
        
        this.init();
    }

    // Initialize visitor tracking
    async init() {
        console.log('🔍 Initializing visitor tracking...');
        
        // Get or create visitor ID
        this.visitorId = this.getOrCreateVisitorId();
        console.log('👤 Visitor ID:', this.visitorId);
        
        // Update the default visitorData with the correct ID
        this.visitorData.visitorId = this.visitorId;
        
        // Load visitor data from server
        try {
            await this.loadVisitorData();
        } catch (error) {
            console.error('❌ Error loading visitor data:', error);
            // We already have default data, so we can continue
        }
        
        // Clean old usage data (older than 7 days)
        this.cleanOldUsage();
        
        console.log('✅ Visitor tracking initialized');
    }

    // Generate unique visitor ID
    generateVisitorId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `visitor_${timestamp}_${random}`;
    }

    // Get visitor ID from localStorage or cookie, or create new one
    getOrCreateVisitorId() {
        // Try to get ID from localStorage first (shared across browsers)
        let visitorId = localStorage.getItem(this.localStorageKey);
        
        if (!visitorId) {
            // Try to get from cookie as fallback
            visitorId = this.getCookie(this.cookieName);
            
            if (visitorId) {
                // If found in cookie but not localStorage, save to localStorage
                localStorage.setItem(this.localStorageKey, visitorId);
                console.log('🔄 Migrated visitor ID to localStorage:', visitorId);
            } else {
                // Create new ID if not found in either storage
                visitorId = this.generateVisitorId();
                localStorage.setItem(this.localStorageKey, visitorId);
                this.setCookie(this.cookieName, visitorId, this.cookieExpireDays);
                console.log('🆕 New visitor created:', visitorId);
            }
        } else {
            // Ensure cookie is in sync with localStorage
            const cookieId = this.getCookie(this.cookieName);
            if (cookieId !== visitorId) {
                this.setCookie(this.cookieName, visitorId, this.cookieExpireDays);
                console.log('🔄 Synchronized cookie with localStorage ID:', visitorId);
            }
            console.log('👋 Returning visitor:', visitorId);
        }
        
        return visitorId;
    }

    // Cookie helper functions
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
        console.log(`🍪 Cookie set: ${name} = ${value}`);
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        return null;
    }

    // Load visitor data from server
    async loadVisitorData() {
        try {
            console.log('📡 Loading visitor data from server...');
            const response = await fetch('/api/visitor-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitorId: this.visitorId
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Visitor data loaded:', data);
                
                // Update visitor data with server data
                this.visitorData = {
                    visitorId: this.visitorId,
                    totalRuns: data.totalRuns || 0,
                    weeklyUsage: data.weeklyUsage || [],
                    firstVisit: data.firstVisit || this.visitorData.firstVisit,
                    lastVisit: data.lastVisit || this.visitorData.lastVisit
                };
                
                // Update local cookie with current run count
                this.updateLocalCookie();
            } else {
                console.log('⚠️ No existing visitor data, creating new record');
                // Keep using default data set in constructor
                // Already has the correct visitorId
            }
        } catch (error) {
            console.error('❌ Failed to load visitor data:', error);
            // Keep using default data set in constructor
            // Already has the correct visitorId
        }
    }

    // Update local storage and cookie with current run count
    updateLocalCookie() {
        const currentWeekRuns = this.getCurrentWeekRuns();
        const storageData = {
            visitorId: this.visitorId,
            totalRuns: this.visitorData.totalRuns,
            currentWeekRuns: currentWeekRuns,
            remainingRuns: Math.max(0, this.maxWeeklyRuns - currentWeekRuns)
        };
        
        // Update both localStorage and cookie for cross-browser sync
        localStorage.setItem('travel_planner_runs', JSON.stringify(storageData));
        this.setCookie('travel_planner_runs', JSON.stringify(storageData), this.cookieExpireDays);
        console.log('🔄 Local storage and cookie updated:', storageData);
    }

    // Get current week's run count
    getCurrentWeekRuns() {
        const now = new Date();
        const weekStart = this.getWeekStart(now);
        
        // Ensure weeklyUsage exists and is an array
        const weeklyUsage = this.visitorData.weeklyUsage || [];
        
        return weeklyUsage.filter(usage => {
            const usageDate = new Date(usage.timestamp);
            return usageDate >= weekStart;
        }).length;
    }

    // Get start of current week (Monday)
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
        return new Date(d.setDate(diff));
    }

    // Clean usage data older than 7 days
    cleanOldUsage() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        
        // Ensure weeklyUsage exists and is an array
        if (!this.visitorData.weeklyUsage) {
            this.visitorData.weeklyUsage = [];
            return;
        }
        
        const originalLength = this.visitorData.weeklyUsage.length;
        this.visitorData.weeklyUsage = this.visitorData.weeklyUsage.filter(usage => {
            return new Date(usage.timestamp) > cutoffDate;
        });
        
        const cleaned = originalLength - this.visitorData.weeklyUsage.length;
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} old usage records`);
        }
    }

    // Check if visitor can use default key
    canUseDefaultKey() {
        const currentWeekRuns = this.getCurrentWeekRuns();
        const remaining = this.maxWeeklyRuns - currentWeekRuns;
        
        console.log(`📊 Usage check: ${currentWeekRuns}/${this.maxWeeklyRuns} runs this week, ${remaining} remaining`);
        
        return {
            canUse: remaining > 0,
            currentWeekRuns: currentWeekRuns,
            totalRuns: this.visitorData.totalRuns,
            remainingRuns: Math.max(0, remaining),
            maxWeeklyRuns: this.maxWeeklyRuns
        };
    }

    // Record a new default key usage
    async recordUsage() {
        const usageCheck = this.canUseDefaultKey();
        
        if (!usageCheck.canUse) {
            throw new Error('Weekly usage limit reached. Please try again next week.');
        }

        // Add new usage record
        const newUsage = {
            timestamp: new Date().toISOString(),
            id: Date.now() // Simple unique ID
        };

        this.visitorData.weeklyUsage.push(newUsage);
        this.visitorData.totalRuns++;
        this.visitorData.lastVisit = new Date().toISOString();

        console.log('📝 Recording new usage:', newUsage);

        // Save to server
        await this.saveVisitorData();
        
        // Update local cookie
        this.updateLocalCookie();

        console.log('✅ Usage recorded successfully');
        
        return {
            success: true,
            totalRuns: this.visitorData.totalRuns,
            currentWeekRuns: this.getCurrentWeekRuns(),
            remainingRuns: this.maxWeeklyRuns - this.getCurrentWeekRuns()
        };
    }

    // Save visitor data to server
    async saveVisitorData() {
        try {
            console.log('💾 Saving visitor data to server...');
            
            // Create a proper save request with visitorId
            const saveData = {
                visitorId: this.visitorId,
                ...this.visitorData
            };
            
            const response = await fetch('/api/save-visitor-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Visitor data saved successfully:', result);
            
            // Update our local data if the server returned updated data
            if (result.visitorData) {
                this.visitorData = {
                    visitorId: this.visitorId,
                    ...result.visitorData
                };
                console.log('📊 Updated visitor data from server:', this.visitorData);
            }
        } catch (error) {
            console.error('❌ Failed to save visitor data:', error);
            throw error;
        }
    }

    // Get visitor statistics
    getVisitorStats() {
        const usageCheck = this.canUseDefaultKey();
        
        return {
            visitorId: this.visitorId,
            totalRuns: this.visitorData.totalRuns,
            currentWeekRuns: usageCheck.currentWeekRuns,
            remainingRuns: usageCheck.remainingRuns,
            maxWeeklyRuns: this.maxWeeklyRuns,
            canUse: usageCheck.canUse,
            firstVisit: this.visitorData.firstVisit,
            lastVisit: this.visitorData.lastVisit,
            recentUsage: this.visitorData.weeklyUsage.slice(-5) // Last 5 uses
        };
    }

    // Get local storage or cookie data
    getLocalCookieData() {
        // Try localStorage first
        const storageData = localStorage.getItem('travel_planner_runs');
        if (storageData) {
            try {
                return JSON.parse(storageData);
            } catch (e) {
                console.warn('⚠️ Invalid localStorage data, trying cookie');
            }
        }
        
        // Fallback to cookie
        const cookieData = this.getCookie('travel_planner_runs');
        if (cookieData) {
            try {
                const data = JSON.parse(cookieData);
                // Sync to localStorage if cookie data is valid
                localStorage.setItem('travel_planner_runs', cookieData);
                return data;
            } catch (e) {
                console.warn('⚠️ Invalid cookie data, will refresh');
                return null;
            }
        }
        return null;
    }

    // Reset visitor data (for testing purposes)
    async resetVisitorData() {
        console.log('🔄 Resetting visitor data...');
        
        this.visitorData = {
            visitorId: this.visitorId,
            totalRuns: 0,
            weeklyUsage: [],
            firstVisit: new Date().toISOString(),
            lastVisit: new Date().toISOString()
        };

        await this.saveVisitorData();
        this.updateLocalCookie();
        
        console.log('✅ Visitor data reset successfully');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisitorTracker;
}
