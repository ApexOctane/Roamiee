// AI Travel Planner JavaScript with Real OpenAI Integration
class TravelPlanner {
    constructor() {
        this.terminal = document.getElementById('terminal');
        this.form = document.getElementById('travelForm');
        this.planButton = document.getElementById('planTripBtn');
        this.isProcessing = false;
        this.openaiApiKey = null;
        this.openaiModel = 'gpt-3.5-turbo';
        this.usageCount = 0;
        this.maxWeeklyUses = 2;
        this.visitorTracker = new VisitorTracker();
        this.tripSessionId = null;
        
        this.initializeEventListeners();
        this.setDefaultDate();
        setTimeout(() => this.loadUsageCount(), 50);
        setTimeout(() => this.initializeApiKeySelection(), 70);
        // Don't load environment variables immediately to avoid terminal output before DOM is ready
        setTimeout(() => this.loadEnvironmentVariables(), 100);
        // Initialize visitor tracking
        setTimeout(async () => {
            await this.visitorTracker.init();
            this.updateDefaultKeyDisplay();
        }, 60);
    }

    async loadEnvironmentVariables() {
        // Load API key securely from server endpoint
        try {
            this.addTerminalLine('🔑 Loading API configuration...', 'info', false);
            
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                this.openaiApiKey = config.OPENAI_API_KEY;
                this.openaiModel = config.OPENAI_MODEL || 'gpt-3.5-turbo';
                
                if (this.openaiApiKey) {
                    this.addTerminalLine('✓ OpenAI API key loaded successfully', 'success', false);
                } else {
                    throw new Error('No API key found in environment variables');
                }
            } else {
                throw new Error('Failed to load configuration from server');
            }
        } catch (error) {
            console.warn('Failed to load from server:', error.message);
            this.addTerminalLine('⚠️ Server config failed, trying fallback methods...', 'warning', false);
            
            // Fallback to localStorage or prompt
            this.openaiApiKey = localStorage.getItem('OPENAI_API_KEY') ||
                               prompt('Please enter your OpenAI API key:');
            
            if (this.openaiApiKey) {
                localStorage.setItem('OPENAI_API_KEY', this.openaiApiKey);
                this.addTerminalLine('✓ API key loaded from fallback method', 'success', false);
            } else {
                this.addTerminalLine('❌ No API key available', 'error', false);
            }
        }
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.planTrip();
        });
    }

    setDefaultDate() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        document.getElementById('startDate').value = nextWeek.toISOString().split('T')[0];
    }

    async loadUsageCount() {
        try {
            // Try to load from server first
            console.log('Loading usage count from server...');
            const response = await fetch('/api/usage-stats');
            if (response.ok) {
                const data = await response.json();
                this.usageCount = data.usageCount || 0;
                console.log('Loaded usage count from server:', this.usageCount);
            } else {
                throw new Error('Server not available');
            }
        } catch (error) {
            console.log('Server failed, using localStorage fallback:', error.message);
            // Fallback to localStorage
            const stored = localStorage.getItem('travelPlannerUsageCount');
            this.usageCount = stored ? parseInt(stored) : 0;
            console.log('Loaded usage count from localStorage:', this.usageCount);
        }
        
        this.updateCounterDisplay();
    }

    async saveUsageCount() {
        try {
            // Try to save to server first
            console.log('Saving usage count to server:', this.usageCount);
            const response = await fetch('/api/usage-stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usageCount: this.usageCount,
                    lastUpdated: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error('Server save failed');
            }
            console.log('Successfully saved usage count to server');
        } catch (error) {
            console.log('Server save failed, using localStorage:', error.message);
            // Fallback to localStorage
            localStorage.setItem('travelPlannerUsageCount', this.usageCount.toString());
            console.log('Saved usage count to localStorage:', this.usageCount);
        }
    }

    updateCounterDisplay() {
        const countElement = document.getElementById('usageCount');
        console.log('Updating counter display. Element found:', !!countElement, 'Count:', this.usageCount);
        if (countElement) {
            countElement.textContent = this.usageCount;
            console.log('Counter display updated to:', this.usageCount);
        } else {
            console.log('usageCount element not found in DOM');
        }
    }

    async incrementUsageCount() {
        console.log('Incrementing usage count from', this.usageCount, 'to', this.usageCount + 1);
        this.usageCount++;
        this.updateCounterDisplay();
        await this.saveUsageCount();
    }

    // API Key Selection Methods
    initializeApiKeySelection() {
        const defaultKeyRadio = document.getElementById('defaultKey');
        const customKeyRadio = document.getElementById('customKey');
        const customKeyInput = document.getElementById('customKeyInput');
        const userApiKeyField = document.getElementById('userApiKey');

        // Handle radio button changes
        defaultKeyRadio.addEventListener('change', () => {
            if (defaultKeyRadio.checked) {
                customKeyInput.style.display = 'none';
                userApiKeyField.value = '';
                // Clear session storage when switching to default
                sessionStorage.removeItem('userApiKey');
                this.updateApiKeySelection();
            }
        });

        customKeyRadio.addEventListener('change', () => {
            if (customKeyRadio.checked) {
                customKeyInput.style.display = 'block';
                userApiKeyField.focus();
                this.updateApiKeySelection();
            }
        });

        // Handle user API key input
        userApiKeyField.addEventListener('input', () => {
            const key = userApiKeyField.value.trim();
            if (key) {
                // Store in session storage (will be cleared when browser closes)
                sessionStorage.setItem('userApiKey', key);
            } else {
                sessionStorage.removeItem('userApiKey');
            }
            this.updateApiKeySelection();
        });

        // Load user key from session storage if it exists
        const savedUserKey = sessionStorage.getItem('userApiKey');
        if (savedUserKey) {
            customKeyRadio.checked = true;
            customKeyInput.style.display = 'block';
            userApiKeyField.value = savedUserKey;
        }

        this.updateApiKeySelection();
    }


    updateDefaultKeyDisplay() {
        const remainingElement = document.getElementById('remainingUses');
        const statusElement = document.getElementById('defaultKeyStatus');
        
        if (remainingElement && statusElement) {
            const stats = this.visitorTracker.getVisitorStats();
            remainingElement.textContent = stats.remainingRuns;
            
            if (!stats.canUse) {
                statusElement.style.color = '#e53e3e';
                statusElement.innerHTML = 'Weekly limit reached (resets Monday)';
            } else {
                statusElement.style.color = '#38a169';
                statusElement.innerHTML = `Available uses: <span id="remainingUses">${stats.remainingRuns}</span>/${stats.maxWeeklyRuns}`;
            }
        }
    }

    updateApiKeySelection() {
        const defaultKeyRadio = document.getElementById('defaultKey');
        const customKeyRadio = document.getElementById('customKey');
        const userApiKeyField = document.getElementById('userApiKey');
        const planButton = document.getElementById('planTripBtn');

        if (defaultKeyRadio && defaultKeyRadio.checked) {
            // Check if default key usage is available
            const stats = this.visitorTracker.getVisitorStats();
            if (!stats.canUse) {
                planButton.disabled = true;
                planButton.innerHTML = '❌ Weekly Limit Reached';
                planButton.title = 'Default API key has reached weekly limit. Use your own key for unlimited access.';
            } else {
                planButton.disabled = false;
                planButton.innerHTML = '🚀 Plan My Trip';
                planButton.title = '';
            }
        } else if (customKeyRadio && customKeyRadio.checked) {
            const userKey = userApiKeyField.value.trim();
            if (userKey && userKey.startsWith('sk-')) {
                planButton.disabled = false;
                planButton.innerHTML = '🚀 Plan My Trip (Your Key)';
                planButton.title = '';
            } else {
                planButton.disabled = true;
                planButton.innerHTML = '❌ Enter Valid API Key';
                planButton.title = 'Please enter a valid OpenAI API key starting with "sk-"';
            }
        }
    }

    getSelectedApiKey() {
        const defaultKeyRadio = document.getElementById('defaultKey');
        const customKeyRadio = document.getElementById('customKey');
        const userApiKeyField = document.getElementById('userApiKey');

        if (customKeyRadio && customKeyRadio.checked) {
            const userKey = userApiKeyField.value.trim();
            if (userKey && userKey.startsWith('sk-')) {
                return { type: 'custom', key: userKey };
            }
        }
        
        if (defaultKeyRadio && defaultKeyRadio.checked) {
            const stats = this.visitorTracker.getVisitorStats();
            if (stats.canUse) {
                return { type: 'default', key: this.openaiApiKey };
            }
        }
        
        return null;
    }

    async incrementDefaultKeyUsage() {
        try {
            const result = await this.visitorTracker.recordUsage();
            this.updateDefaultKeyDisplay();
            this.updateApiKeySelection();
            return result;
        } catch (error) {
            console.error('Error incrementing default key usage:', error);
            throw error;
        }
    }

    addTerminalLine(text, className = 'text', prompt = true) {
        const line = document.createElement('div');
        line.className = 'terminal-line new';
        
        if (prompt) {
            line.innerHTML = `<span class="prompt">travel-planner@ai:~$</span> <span class="${className}">${text}</span>`;
        } else {
            line.innerHTML = `<span class="${className}">${text}</span>`;
        }
        
        this.terminal.appendChild(line);
        this.terminal.scrollTop = this.terminal.scrollHeight;
        
        return line;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async showTypingIndicator(duration = 2000) {
        const line = this.addTerminalLine('', 'typing-indicator', false);
        line.innerHTML = '<span class="typing-indicator">AI agents are thinking...</span>';
        await this.sleep(duration);
        line.remove();
    }

    getFormData() {
        return {
            currentLocation: document.getElementById('currentLocation').value,
            destination: document.getElementById('destination').value,
            adults: document.getElementById('adults').value,
            children: document.getElementById('children').value,
            hotelType: document.getElementById('hotelType').value,
            hotelBrand: document.getElementById('hotelBrand').value,
            dietType: document.getElementById('dietType').value,
            fuelEfficiency: document.getElementById('fuelEfficiency').value,
            gasPrice: document.getElementById('gasPrice').value,
            days: document.getElementById('days').value,
            startDate: document.getElementById('startDate').value,
            budget: document.getElementById('budget').value
        };
    }

    async callOpenAI(messages, maxTokens = 1000) {
        if (!this.openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }

        try {
            // If using default key, use server endpoint
            const selectedKey = this.getSelectedApiKey();
            if (selectedKey && selectedKey.type === 'default') {
                const visitorId = this.visitorTracker.getCookie('travel_planner_visitor_id');
                if (!visitorId) {
                    throw new Error('No visitor ID found');
                }

                const response = await fetch('/api/use-default-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        visitorId: visitorId,
                        tripSessionId: this.tripSessionId,
                        messages: messages,
                        maxTokens: maxTokens
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to use default key');
                }

                const data = await response.json();
                this.defaultKeyUsage = {
                    count: data.usage.count,
                    remaining: data.usage.remaining
                };
                this.updateDefaultKeyDisplay();
                this.updateApiKeySelection();
                return data.content;
            }

            // If using custom key, call OpenAI directly
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: this.openaiModel,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API call failed:', error);
            throw error;
        }
    }

    async planTrip() {
        if (this.isProcessing) return;
        
        // Get the selected API key
        const selectedKey = this.getSelectedApiKey();
        if (!selectedKey) {
            this.addTerminalLine('❌ No valid API key selected. Please choose an option and enter a valid key if using custom.', 'error');
            return;
        }
        
        // Set the API key for this session
        const originalKey = this.openaiApiKey;
        this.openaiApiKey = selectedKey.key;
        
        this.isProcessing = true;
        this.planButton.disabled = true;
        this.planButton.innerHTML = '🔄 Planning...';
        
        const formData = this.getFormData();
        
        // Clear terminal except welcome message
        this.terminal.innerHTML = `
            <div class="terminal-line">
                <span class="prompt">travel-planner@ai:~$</span>
                <span class="text">Starting AI Travel Planner with CrewAI Agents...</span>
            </div>
        `;

        try {
            // Add API key type indicator
            if (selectedKey.type === 'custom') {
                this.addTerminalLine('🔑 Using your personal API key for unlimited access', 'info', false);
            } else {
                const stats = this.visitorTracker.getVisitorStats();
                this.addTerminalLine(`🔑 Using default API key (${stats.remainingRuns} uses remaining this week)`, 'info', false);
            }
            
            await this.simulateCrewAI(formData, selectedKey.type);
        } catch (error) {
            this.addTerminalLine(`❌ Error: ${error.message}`, 'error');
        } finally {
            // Restore original key
            this.openaiApiKey = originalKey;
            this.isProcessing = false;
            this.updateApiKeySelection(); // Update button state
        }
    }

    async createTripSession(keyType) {
        const visitorId = this.visitorTracker.getCookie('travel_planner_visitor_id');
        if (!visitorId) {
            throw new Error('No visitor ID found');
        }
        
        try {
            const response = await fetch('/api/create-trip-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitorId: visitorId,
                    keyType: keyType
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create trip session');
            }
            
            const data = await response.json();
            this.tripSessionId = data.tripSessionId;
            console.log('Trip session created:', this.tripSessionId);
            return this.tripSessionId;
        } catch (error) {
            console.error('Failed to create trip session:', error);
            throw error;
        }
    }
    
    async completeTripSession() {
        if (!this.tripSessionId) {
            console.warn('No trip session to complete');
            return;
        }
        
        const visitorId = this.visitorTracker.getCookie('travel_planner_visitor_id');
        if (!visitorId) {
            console.warn('No visitor ID found');
            return;
        }
        
        try {
            const response = await fetch('/api/complete-trip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    visitorId: visitorId,
                    tripSessionId: this.tripSessionId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn('Failed to complete trip session:', errorData.error || 'Unknown error');
                return;
            }
            
            const data = await response.json();
            console.log('Trip session completed:', data);
            
            // Update UI with usage data if provided
            if (data.usage) {
                this.defaultKeyUsage = {
                    count: data.usage.count,
                    remaining: data.usage.remaining
                };
                this.updateDefaultKeyDisplay();
                this.updateApiKeySelection();
            }
        } catch (error) {
            console.warn('Error completing trip session:', error);
        }
    }
    
    async simulateCrewAI(data, keyType) {
        // Increment usage counter when travel planner is used
        await this.incrementUsageCount();
        
        // Create a trip session
        await this.createTripSession(keyType);
        
        // Initialize crew
        this.addTerminalLine('Initializing AI Travel Planning Crew...', 'info');
        await this.sleep(1000);
        
        this.addTerminalLine('✓ Route Planner Agent loaded', 'success', false);
        this.addTerminalLine('✓ Activity Suggester Agent loaded', 'success', false);
        this.addTerminalLine('✓ Restaurant Finder Agent loaded', 'success', false);
        this.addTerminalLine('✓ Attraction Finder Agent loaded', 'success', false);
        this.addTerminalLine('✓ Accommodation Finder Agent loaded', 'success', false);
        this.addTerminalLine('✓ Travel Writer Agent loaded', 'success', false);
        this.addTerminalLine('✓ Itinerary Editor Agent loaded', 'success', false);
        
        await this.sleep(1500);
        
        // Execute tasks with real AI agents
        const routeData = await this.executeRouteAgent(data);
        const activityData = await this.executeActivityAgent(data);
        const restaurantData = await this.executeRestaurantAgent(data);
        const attractionData = await this.executeAttractionAgent(data);
        const hotelData = await this.executeAccommodationAgent(data);
        const itineraryData = await this.executeTravelWriterAgent(data, {
            route: routeData,
            activities: activityData,
            restaurants: restaurantData,
            attractions: attractionData,
            hotels: hotelData
        });
        const finalItinerary = await this.executeItineraryEditorAgent(data, itineraryData);
        
        // Display final result
        await this.displayFinalItinerary(finalItinerary);
    }

    async executeRouteAgent(data) {
        this.addTerminalLine('🗺️ Route Planner Agent: Finding fastest route...', 'agent-output');
        await this.showTypingIndicator(1000);
        
        const messages = [
            {
                role: "system",
                content: `You're a navigation expert. Your job is to get travelers to their destination quickly using the fastest highways and avoiding unnecessary delays. Find the fastest route from ${data.currentLocation} to ${data.destination} using major highways. Include estimated time and distance.`
            },
            {
                role: "user",
                content: `Find the fastest route from ${data.currentLocation} to ${data.destination} using major highways. Include estimated time and distance. Provide a concise response with route details, total time, and distance.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 500);
            this.addTerminalLine(`Route found: ${data.currentLocation} → ${data.destination}`, 'task-output', false);
            this.addTerminalLine(response, 'task-output', false);
            await this.sleep(1000);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Route planning failed: ${error.message}`, 'error', false);
            return `Route from ${data.currentLocation} to ${data.destination} - Please check manually`;
        }
    }

    async executeActivityAgent(data) {
        this.addTerminalLine('🎯 Activity Suggester Agent: Finding activities...', 'agent-output');
        await this.showTypingIndicator(1500);
        
        const messages = [
            {
                role: "system",
                content: `You're a local guide expert helping travelers make the most of their time at their destination. Focus on unique, memorable experiences that are budget-aware and available on the travel dates.`
            },
            {
                role: "user",
                content: `List 5-7 fun and unique activities to do in ${data.destination} during a ${data.days}-day trip starting on ${data.startDate}. Consider a budget of $${data.budget} and flag those that are out of budget as optional extras. Confirm their availability on the given dates. Provide activity names with brief descriptions and pricing notes.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 800);
            this.addTerminalLine(`Found activities for ${data.days}-day trip:`, 'task-output', false);
            this.addTerminalLine(response, 'task-output', false);
            await this.sleep(1000);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Activity search failed: ${error.message}`, 'error', false);
            return `Activities in ${data.destination} - Please research manually`;
        }
    }

    async executeRestaurantAgent(data) {
        this.addTerminalLine('🍽️ Restaurant Finder Agent: Searching restaurants...', 'agent-output');
        await this.showTypingIndicator(1200);
        
        const messages = [
            {
                role: "system",
                content: `You're a food scout who can locate restaurants based on religious or dietary preferences and note their costs.`
            },
            {
                role: "user",
                content: `Find restaurants in ${data.destination} that fit the diet type ${data.dietType}. Include name, cuisine, rating, and a one-line review, and approximate pricing. Provide a list of 4-5 restaurants with dietary alignment, brief details, and estimated cost.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 600);
            this.addTerminalLine(`Found ${data.dietType !== 'none' ? data.dietType : 'general'} restaurants:`, 'task-output', false);
            this.addTerminalLine(response, 'task-output', false);
            await this.sleep(1000);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Restaurant search failed: ${error.message}`, 'error', false);
            return `Restaurants in ${data.destination} - Please research manually`;
        }
    }

    async executeAttractionAgent(data) {
        this.addTerminalLine('🏛️ Attraction Finder Agent: Locating attractions...', 'agent-output');
        await this.showTypingIndicator(1300);
        
        const messages = [
            {
                role: "system",
                content: `You're a travel researcher focused on helping tourists explore key attractions, parks, and landmarks while being mindful of budget and checking availability based on the trip dates.`
            },
            {
                role: "user",
                content: `Find top tourist attractions in ${data.destination} for a ${data.days}-day stay starting on ${data.startDate}. Stay within the user's budget of $${data.budget} and mention optional out-of-budget extras. Ensure attractions are open on the specific dates. Provide a list of attractions with descriptions, pricing, open dates, and budget suitability.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 700);
            this.addTerminalLine('Top attractions found:', 'task-output', false);
            this.addTerminalLine(response, 'task-output', false);
            await this.sleep(1000);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Attraction search failed: ${error.message}`, 'error', false);
            return `Attractions in ${data.destination} - Please research manually`;
        }
    }

    async executeAccommodationAgent(data) {
        this.addTerminalLine('🏨 Accommodation Finder Agent: Finding hotels...', 'agent-output');
        await this.showTypingIndicator(1400);
        
        const totalGuests = parseInt(data.adults) + parseInt(data.children);
        
        const messages = [
            {
                role: "system",
                content: `You're a hospitality expert who finds hotel accommodations suited for families and group sizes with pricing estimates, including preferred brands.`
            },
            {
                role: "user",
                content: `Find hotel options in ${data.destination} for ${data.adults} adults and ${data.children} children based on ${data.hotelType} budget, preferred hotel brand ${data.hotelBrand}, and number of days ${data.days}. Include price per night and total estimated cost. Provide a list of hotels with room types, price per night, total cost, and family suitability.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 600);
            this.addTerminalLine(`Hotels for ${totalGuests} guests (${data.hotelType} category):`, 'task-output', false);
            this.addTerminalLine(response, 'task-output', false);
            await this.sleep(1000);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Hotel search failed: ${error.message}`, 'error', false);
            return `Hotels in ${data.destination} - Please research manually`;
        }
    }

    async executeTravelWriterAgent(data, agentData) {
        this.addTerminalLine('✍️ Travel Writer Agent: Creating itinerary...', 'agent-output');
        await this.showTypingIndicator(2000);
        
        this.addTerminalLine('Crafting detailed itinerary with cost breakdown...', 'task-output', false);
        this.addTerminalLine('Calculating total expenses vs budget...', 'task-output', false);
        this.addTerminalLine('Adding day-by-day schedule...', 'task-output', false);
        
        const messages = [
            {
                role: "system",
                content: `You're a seasoned travel writer. Use the inputs from other agents to craft a compelling, engaging itinerary with total cost calculated and compared directly against the user's specified budget.`
            },
            {
                role: "user",
                content: `Create a detailed and engaging ${data.days}-day itinerary in markdown format starting on ${data.startDate} to ${data.destination} with a total budget of $${data.budget}. 

Use this information from other agents:
- Route: ${agentData.route}
- Activities: ${agentData.activities}
- Restaurants: ${agentData.restaurants}
- Attractions: ${agentData.attractions}
- Hotels: ${agentData.hotels}

Include full cost breakdown (hotel + fuel + food) and compare the total to the provided budget ($${data.budget}). Clearly state if the trip is within or exceeds the budget. Format as a detailed day-by-day itinerary with costs.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 1500);
            await this.sleep(1500);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Itinerary creation failed: ${error.message}`, 'error', false);
            return `Basic itinerary for ${data.destination} - Please create manually`;
        }
    }

    async executeItineraryEditorAgent(data, itineraryData) {
        this.addTerminalLine('📝 Itinerary Editor Agent: Polishing content...', 'agent-output');
        await this.showTypingIndicator(1500);
        
        this.addTerminalLine('Reviewing itinerary for clarity and flow...', 'task-output', false);
        this.addTerminalLine('Ensuring budget alignment...', 'task-output', false);
        this.addTerminalLine('Final formatting and optimization...', 'task-output', false);
        
        const messages = [
            {
                role: "system",
                content: `You're a professional editor. Your job is to ensure the trip itinerary is well-structured, readable, and budget-conscious.`
            },
            {
                role: "user",
                content: `Polish and finalize this markdown itinerary. Ensure clarity, flow, excitement, and budget accountability. Make it well-structured and engaging:

${itineraryData}

Return the final edited itinerary in markdown format.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages, 1500);
            await this.sleep(1500);
            return response;
        } catch (error) {
            this.addTerminalLine(`❌ Itinerary editing failed: ${error.message}`, 'error', false);
            return itineraryData; // Return original if editing fails
        }
    }

    async displayFinalItinerary(itinerary) {
        // Complete the trip session if using default key
        // This is where we officially mark the usage as complete
        const selectedKey = this.getSelectedApiKey();
        if (selectedKey && selectedKey.type === 'default') {
            await this.completeTripSession();
        }
        
        this.addTerminalLine('🎉 Trip planning completed successfully!', 'success');
        await this.sleep(1000);
        
        this.addTerminalLine('', 'text', false);
        this.addTerminalLine('='.repeat(60), 'info', false);
        this.addTerminalLine('🌍 YOUR PERSONALIZED TRAVEL ITINERARY', 'info', false);
        this.addTerminalLine('='.repeat(60), 'info', false);
        this.addTerminalLine('', 'text', false);
        
        // Split the itinerary into lines and display with proper formatting
        const lines = itinerary.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                let className = 'text';
                if (line.startsWith('#')) {
                    className = 'info';
                } else if (line.includes('$') || line.toLowerCase().includes('cost') || line.toLowerCase().includes('budget')) {
                    className = 'warning';
                } else if (line.includes('✓') || line.toLowerCase().includes('within budget')) {
                    className = 'success';
                }
                
                this.addTerminalLine(line, className, false);
            } else {
                this.addTerminalLine('', 'text', false);
            }
            await this.sleep(50); // Small delay for readability
        }
        
        this.addTerminalLine('', 'text', false);
        this.addTerminalLine('✅ Your AI-generated travel itinerary is ready!', 'success', false);
        this.addTerminalLine('📋 Click the button below to copy your itinerary', 'info', false);

        // Enable copy button and store itinerary
        const copyBtn = document.getElementById('copyItineraryBtn');
        copyBtn.disabled = false;
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(itinerary);
                this.addTerminalLine('✅ Itinerary copied to clipboard!', 'success', false);
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy Itinerary to Clipboard';
                }, 2000);
            } catch (error) {
                this.addTerminalLine('❌ Failed to copy itinerary: ' + error.message, 'error', false);
            }
        };
    }
}

// Initialize the travel planner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TravelPlanner();
});
