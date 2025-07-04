// Cloudflare Worker for AI Travel Planner with Real OpenAI Integration
// This worker serves the HTML page and handles AI processing

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Travel Planner</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }

        header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        /* Input Section */
        .input-section {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .input-section h2 {
            color: #4a5568;
            margin-bottom: 25px;
            font-size: 1.8rem;
            text-align: center;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            font-weight: 600;
            margin-bottom: 8px;
            color: #4a5568;
        }

        .form-group input,
        .form-group select {
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        #planTripBtn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1.2rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        #planTripBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        #planTripBtn:active {
            transform: translateY(0);
        }

        #planTripBtn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* Terminal Section */
        .terminal-section {
            background: #1a1a1a;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            min-height: 400px;
        }

        .terminal-header {
            background: #2d2d2d;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid #404040;
        }

        .terminal-controls {
            display: flex;
            gap: 8px;
            margin-right: 15px;
        }

        .control {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            cursor: pointer;
        }

        .control.close {
            background: #ff5f57;
        }

        .control.minimize {
            background: #ffbd2e;
        }

        .control.maximize {
            background: #28ca42;
        }

        .terminal-title {
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
        }

        .terminal-body {
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: #00ff00;
            background: #000000;
            min-height: 350px;
            overflow-y: auto;
            max-height: 600px;
        }

        .terminal-line {
            margin-bottom: 8px;
            word-wrap: break-word;
        }

        .prompt {
            color: #00ff00;
            font-weight: bold;
        }

        .text {
            color: #ffffff;
            margin-left: 10px;
        }

        .agent-output {
            color: #00bfff;
            margin-left: 20px;
        }

        .task-output {
            color: #ffa500;
            margin-left: 20px;
        }

        .error {
            color: #ff4444;
        }

        .success {
            color: #00ff00;
        }

        .warning {
            color: #ffaa00;
        }

        .info {
            color: #00bfff;
        }

        .typing-indicator {
            color: #00ff00;
        }

        .typing-indicator::after {
            content: '|';
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            header h1 {
                font-size: 2rem;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .input-section {
                padding: 20px;
            }
            
            .terminal-body {
                font-size: 12px;
                padding: 15px;
            }
        }

        .terminal-line.new {
            animation: fadeInUp 0.3s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🌍 AI Travel Planner</h1>
            <p>Plan your perfect trip with AI-powered agents</p>
        </header>

        <div class="input-section">
            <h2>Trip Details</h2>
            <form id="travelForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="currentLocation">Starting Location:</label>
                        <input type="text" id="currentLocation" required placeholder="e.g., New York, NY">
                    </div>
                    
                    <div class="form-group">
                        <label for="destination">Destination:</label>
                        <input type="text" id="destination" required placeholder="e.g., Miami, FL">
                    </div>
                    
                    <div class="form-group">
                        <label for="adults">Adults:</label>
                        <input type="number" id="adults" min="1" value="2" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="children">Children:</label>
                        <input type="number" id="children" min="0" value="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="hotelType">Hotel Type:</label>
                        <select id="hotelType" required>
                            <option value="budget">Budget</option>
                            <option value="mid-range">Mid-range</option>
                            <option value="luxury">Luxury</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="hotelBrand">Preferred Hotel Brand:</label>
                        <input type="text" id="hotelBrand" placeholder="e.g., Holiday Inn Express, Marriott">
                    </div>
                    
                    <div class="form-group">
                        <label for="dietType">Dietary Preference:</label>
                        <select id="dietType">
                            <option value="none">No preference</option>
                            <option value="halal">Halal</option>
                            <option value="kosher">Kosher</option>
                            <option value="vegetarian">Vegetarian</option>
                            <option value="vegan">Vegan</option>
                            <option value="gluten-free">Gluten-free</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="fuelEfficiency">Fuel Efficiency (MPG):</label>
                        <input type="number" id="fuelEfficiency" step="0.1" value="25" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="gasPrice">Gas Price per Gallon ($):</label>
                        <input type="number" id="gasPrice" step="0.01" value="3.50" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="days">Trip Duration (days):</label>
                        <input type="number" id="days" min="1" value="3" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="startDate">Start Date:</label>
                        <input type="date" id="startDate" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="budget">Total Budget ($):</label>
                        <input type="number" id="budget" min="0" step="0.01" value="1000" required>
                    </div>
                </div>
                
                <button type="submit" id="planTripBtn">🚀 Plan My Trip</button>
            </form>
        </div>

        <div class="terminal-section">
            <div class="terminal-header">
                <div class="terminal-controls">
                    <span class="control close"></span>
                    <span class="control minimize"></span>
                    <span class="control maximize"></span>
                </div>
                <span class="terminal-title">AI Travel Planner Terminal</span>
            </div>
            <div class="terminal-body" id="terminal">
                <div class="terminal-line">
                    <span class="prompt">travel-planner@ai:~$</span>
                    <span class="text">Welcome to AI Travel Planner! Fill out the form above and click "Plan My Trip" to get started.</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // AI Travel Planner JavaScript with Real OpenAI Integration - Embedded for Cloudflare Workers
        class TravelPlanner {
            constructor() {
                this.terminal = document.getElementById('terminal');
                this.form = document.getElementById('travelForm');
                this.planButton = document.getElementById('planTripBtn');
                this.isProcessing = false;
                this.openaiApiKey = null;
                this.openaiModel = 'gpt-3.5-turbo';
                
                this.initializeEventListeners();
                this.setDefaultDate();
                this.loadEnvironmentVariables();
            }

            async loadEnvironmentVariables() {
                try {
                    this.openaiApiKey = localStorage.getItem('OPENAI_API_KEY') ||
                                       prompt('Please enter your OpenAI API key:');
                    
                    if (this.openaiApiKey) {
                        localStorage.setItem('OPENAI_API_KEY', this.openaiApiKey);
                    }
                } catch (error) {
                    console.warn('Environment variables not available in browser context');
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

            addTerminalLine(text, className = 'text', prompt = true) {
                const line = document.createElement('div');
                line.className = 'terminal-line new';
                
                if (prompt) {
                    line.innerHTML = '<span class="prompt">travel-planner@ai:~$</span> <span class="' + className + '">' + text + '</span>';
                } else {
                    line.innerHTML = '<span class="' + className + '">' + text + '</span>';
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
                    const response = await fetch('/api/openai', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messages: messages,
                            maxTokens: maxTokens,
                            apiKey: this.openaiApiKey
                        })
                    });

                    if (!response.ok) {
                        throw new Error('API error: ' + response.status + ' ' + response.statusText);
                    }

                    const data = await response.json();
                    return data.content;
                } catch (error) {
                    console.error('OpenAI API call failed:', error);
                    throw error;
                }
            }

            async planTrip() {
                if (this.isProcessing) return;
                
                if (!this.openaiApiKey) {
                    this.addTerminalLine('❌ OpenAI API key not configured. Please set your API key.', 'error');
                    return;
                }
                
                this.isProcessing = true;
                this.planButton.disabled = true;
                this.planButton.innerHTML = '🔄 Planning...';
                
                const formData = this.getFormData();
                
                this.terminal.innerHTML = '<div class="terminal-line"><span class="prompt">travel-planner@ai:~$</span><span class="text">Starting AI Travel Planner with CrewAI Agents...</span></div>';

                try {
                    await this.simulateCrewAI(formData);
                } catch (error) {
                    this.addTerminalLine('❌ Error: ' + error.message, 'error');
                } finally {
                    this.isProcessing = false;
                    this.planButton.disabled = false;
                    this.planButton.innerHTML = '🚀 Plan My Trip';
                }
            }

            async simulateCrewAI(data) {
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
                
                await this.displayFinalItinerary(finalItinerary);
            }

            async executeRouteAgent(data) {
                this.addTerminalLine('🗺️ Route Planner Agent: Finding fastest route...', 'agent-output');
                await this.showTypingIndicator(1000);
                
                const messages = [
                    {
                        role: "system",
                        content: "You're a navigation expert. Find the fastest route from " + data.currentLocation + " to " + data.destination + " using major highways. Include estimated time and distance."
                    },
                    {
                        role: "user",
                        content: "Find the fastest route from " + data.currentLocation + " to " + data.destination + " using major highways. Include estimated time and distance. Provide a concise response with route details, total time, and distance."
                    }
                ];

                try {
                    const response = await this.callOpenAI(messages, 500);
                    this.addTerminalLine('Route found: ' + data.currentLocation + ' → ' + data.destination, 'task-output', false);
                    this.addTerminalLine(response, 'task-output', false);
                    await this.sleep(1000);
                    return response;
                } catch (error) {
                    this.addTerminalLine('❌ Route planning failed: ' + error.message, 'error', false);
                    return 'Route from ' + data.currentLocation + ' to ' + data.destination + ' - Please check manually';
                }
            }

            async executeActivityAgent(data) {
                this.addTerminalLine('🎯 Activity Suggester Agent: Finding activities...', 'agent-output');
                await this.showTypingIndicator(1500);
                
                const messages = [
                    {
                        role: "system",
                        content: "You're a local guide expert helping travelers make the most of their time at their destination. Focus on unique, memorable experiences that are budget-aware and available on the travel dates."
                    },
                    {
                        role: "user",
                        content: "List 5-7 fun and unique activities to do in " + data.destination + " during a " + data.days + "-day trip starting on " + data.startDate + ". Consider a budget of $" + data.budget + " and flag those that are out of budget as optional extras. Confirm their availability on the given dates. Provide activity names with brief descriptions and pricing notes."
                    }
                ];

                try {
                    const response = await this.callOpenAI(messages, 800);
                    this.addTerminalLine('Found activities for ' + data.days + '-day trip:', 'task-output', false);
                    this.addTerminalLine(response, 'task-output', false);
                    await this.sleep(1000);
                    return response;
                } catch (error) {
                    this.addTerminalLine('❌ Activity search failed: ' + error.message, 'error', false);
                    return 'Activities in ' + data.destination + ' - Please research manually';
                }
            }

            async displayFinalItinerary(itinerary) {
                this.addTerminalLine('🎉 Trip planning completed successfully!', 'success');
                await this.sleep(1000);
                
                this.addTerminalLine('', 'text', false);
                this.addTerminalLine('='.repeat(60), 'info', false);
                this.addTerminalLine('🌍 YOUR PERSONALIZED TRAVEL ITINERARY', 'info', false);
                this.addTerminalLine('='.repeat(60), 'info', false);
                this.addTerminalLine('', 'text', false);
                
                const lines = itinerary.split('\\n');
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
                    await this.sleep(50);
                }
                
                this.addTerminalLine('', 'text', false);
                this.addTerminalLine('✅ Your AI-generated travel itinerary is ready!', 'success', false);
                this.addTerminalLine('📧 Save this itinerary for your trip planning.', 'info', false);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new TravelPlanner();
        });
    </script>
</body>
</html>`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Handle CORS for all requests
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Serve the main HTML page
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return new Response(HTML_CONTENT, {
                headers: {
                    'Content-Type': 'text/html',
                    ...corsHeaders
                }
            });
        }

        // API endpoint for OpenAI calls
        if (url.pathname === '/api/openai' && request.method === 'POST') {
            try {
                const { messages, maxTokens, apiKey } = await request.json();
                
                if (!apiKey) {
                    return new Response(JSON.stringify({
                        error: 'OpenAI API key not provided'
                    }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        }
                    });
                }

                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: messages,
                        max_tokens: maxTokens || 1000,
                        temperature: 0.7
                    })
                });

                if (!openaiResponse.ok) {
                    throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`);
                }

                const data = await openaiResponse.json();
                
                return new Response(JSON.stringify({
                    content: data.choices[0].message.content
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    error: error.message
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
        }

        // 404 for other routes
        return new Response('Not Found', { 
            status: 404,
            headers: corsHeaders
        });
    }
};
