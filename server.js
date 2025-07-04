// Simple Node.js server to serve the AI Travel Planner with environment variables
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoint to check if default key is available (without exposing the key)
app.get('/api/config', (req, res) => {
    res.json({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    });
});

// Usage statistics endpoints
const USAGE_STATS_FILE = path.join(__dirname, 'usage-stats.json');

// Get usage statistics
app.get('/api/usage-stats', (req, res) => {
    try {
        if (fs.existsSync(USAGE_STATS_FILE)) {
            const data = fs.readFileSync(USAGE_STATS_FILE, 'utf8');
            const stats = JSON.parse(data);
            res.json(stats);
        } else {
            // Create file if it doesn't exist
            const initialStats = { usageCount: 0, lastUpdated: null };
            fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify(initialStats, null, 2));
            res.json(initialStats);
        }
    } catch (error) {
        console.error('Error reading usage stats:', error);
        res.status(500).json({ error: 'Failed to read usage statistics' });
    }
});

// Update usage statistics
app.post('/api/usage-stats', (req, res) => {
    try {
        const { usageCount, lastUpdated } = req.body;
        const stats = {
            usageCount: parseInt(usageCount) || 0,
            lastUpdated: lastUpdated || new Date().toISOString()
        };
        
        fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify(stats, null, 2));
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error saving usage stats:', error);
        res.status(500).json({ error: 'Failed to save usage statistics' });
    }
});

// Get default key usage status
app.get('/api/default-key-usage', (req, res) => {
    try {
        const visitorId = req.query.visitorId;
        if (!visitorId) {
            return res.status(400).json({ error: 'Visitor ID is required' });
        }

        const allData = loadVisitorData();
        const visitorData = allData.visitors[visitorId];

        if (!visitorData) {
            return res.json({
                count: 0,
                remaining: 2,
                maxWeeklyUses: 2,
                canUse: true
            });
        }

        // Get current week's usage
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday

        const weeklyUses = visitorData.weeklyUsage.filter(usage => {
            return new Date(usage.timestamp) >= weekStart;
        }).length;

        const remaining = Math.max(0, 2 - weeklyUses);
        
        res.json({
            count: weeklyUses,
            remaining: remaining,
            maxWeeklyUses: 2,
            canUse: remaining > 0
        });
    } catch (error) {
        console.error('Error reading default key usage:', error);
        res.status(500).json({ error: 'Failed to read default key usage' });
    }
});

// Validate and use default key (server-side validation)
app.post('/api/use-default-key', async (req, res) => {
    try {
        const { visitorId, messages, maxTokens = 1000 } = req.body;

        // Check if default key is available
        if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({ error: 'Default API key not configured' });
        }

        if (!visitorId) {
            return res.status(400).json({ error: 'Visitor ID is required' });
        }

        // Load visitor data
        const allData = loadVisitorData();
        let visitorData = allData.visitors[visitorId];

        if (!visitorData) {
            visitorData = {
                visitorId: visitorId,
                totalRuns: 0,
                weeklyUsage: [],
                firstVisit: new Date().toISOString(),
                lastVisit: new Date().toISOString()
            };
            allData.visitors[visitorId] = visitorData;
            allData.metadata.totalVisitors++;
        }

        // Check weekly usage
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday

        const weeklyUses = visitorData.weeklyUsage.filter(usage => {
            return new Date(usage.timestamp) >= weekStart;
        }).length;

        if (weeklyUses >= 2) {
            return res.status(429).json({
                error: 'Weekly usage limit reached',
                remaining: 0
            });
        }
        
        // Make OpenAI API call with server's key
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json().catch(() => ({}));
            return res.status(openaiResponse.status).json({
                error: `OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`,
                details: errorData.error?.message || 'Unknown error'
            });
        }

        const openaiData = await openaiResponse.json();

        // Record usage
        visitorData.weeklyUsage.push({
            timestamp: new Date().toISOString(),
            id: Date.now()
        });
        visitorData.totalRuns++;
        visitorData.lastVisit = new Date().toISOString();
        allData.metadata.totalRuns++;

        // Save updated visitor data
        saveVisitorData(allData);

        // Return the response with usage info
        res.json({
            content: openaiData.choices[0].message.content,
            usage: {
                count: weeklyUses + 1,
                remaining: Math.max(0, 1 - weeklyUses),
                maxWeeklyUses: 2
            }
        });
        
    } catch (error) {
        console.error('Error using default key:', error);
        res.status(500).json({ error: 'Failed to process request with default key' });
    }
});

// Email sending endpoint
app.post('/api/send-itinerary', async (req, res) => {
    console.log('📧 Email endpoint called');
    
    try {
        const { email, itinerary } = req.body;
        console.log('📧 Request data:', { email: email ? 'provided' : 'missing', itinerary: itinerary ? 'provided' : 'missing' });
        
        if (!email || !itinerary) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'Email and itinerary are required' });
        }
        
        console.log('📧 Checking email credentials...');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'configured' : 'not configured');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'configured' : 'not configured');
        
        // If no email credentials, use a test account
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('📧 No email credentials found, using Ethereal test account...');
            
            try {
                // Create test account
                console.log('📧 Creating Ethereal test account...');
                const testAccount = await nodemailer.createTestAccount();
                console.log('📧 Test account created:', testAccount.user);
                
                const testTransporter = nodemailer.createTransporter({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                
                console.log('📧 Test transporter created, verifying connection...');
                await testTransporter.verify();
                console.log('📧 Test transporter verified successfully');
                
                const mailOptions = {
                    from: '"AI Travel Planner" <noreply@travelplanner.ai>',
                    to: email,
                    subject: '🌍 Your Personalized Travel Itinerary',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                                <h1>🌍 Your Travel Itinerary</h1>
                                <p>Generated by AI Travel Planner</p>
                            </div>
                            <div style="padding: 20px; background: #f9f9f9;">
                                <div style="background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.6;">
${itinerary}
                                </div>
                            </div>
                            <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                                <p>Generated by AI Travel Planner | Happy Travels! ✈️</p>
                            </div>
                        </div>
                    `
                };
                
                console.log('📧 Sending test email...');
                const info = await testTransporter.sendMail(mailOptions);
                console.log('✅ Test email sent successfully!');
                console.log('📧 Test email URL:', nodemailer.getTestMessageUrl(info));
                
                res.json({ 
                    success: true, 
                    message: 'Email sent successfully (test mode)',
                    testUrl: nodemailer.getTestMessageUrl(info)
                });
                return;
                
            } catch (testError) {
                console.error('❌ Test email failed:', testError);
                throw new Error(`Test email service failed: ${testError.message}`);
            }
        }
        
        // Production email sending
        console.log('📧 Using production email settings...');
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        console.log('📧 Verifying production transporter...');
        await transporter.verify();
        console.log('📧 Production transporter verified successfully');
        
        const mailOptions = {
            from: `"AI Travel Planner" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🌍 Your Personalized Travel Itinerary',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                        <h1>🌍 Your Travel Itinerary</h1>
                        <p>Generated by AI Travel Planner</p>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <div style="background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.6;">
${itinerary}
                        </div>
                    </div>
                    <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                        <p>Generated by AI Travel Planner | Happy Travels! ✈️</p>
                    </div>
                </div>
            `
        };
        
        console.log('📧 Sending production email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Production email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        
        res.json({ success: true, message: 'Email sent successfully' });
        
    } catch (error) {
        console.error('❌ Email sending error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to send email: ' + error.message,
            details: error.stack
        });
    }
});

// Visitor tracking endpoints
const VISITOR_DATA_FILE = path.join(__dirname, 'visitor.json');

// Load visitor data from file
function loadVisitorData() {
    try {
        if (fs.existsSync(VISITOR_DATA_FILE)) {
            const data = fs.readFileSync(VISITOR_DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading visitor data:', error);
    }
    
    // Return default structure
    return {
        visitors: {},
        metadata: {
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalVisitors: 0,
            totalRuns: 0
        }
    };
}

// Save visitor data to file
function saveVisitorData(data) {
    try {
        data.metadata.lastUpdated = new Date().toISOString();
        fs.writeFileSync(VISITOR_DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving visitor data:', error);
        return false;
    }
}

// Get visitor data by ID
app.post('/api/visitor-data', (req, res) => {
    try {
        const { visitorId } = req.body;
        
        if (!visitorId) {
            return res.status(400).json({ error: 'Visitor ID is required' });
        }
        
        const allData = loadVisitorData();
        const visitorData = allData.visitors[visitorId];
        
        if (visitorData) {
            console.log(`👋 Returning visitor: ${visitorId}`);
            res.json(visitorData);
        } else {
            console.log(`🆕 New visitor: ${visitorId}`);
            res.status(404).json({ error: 'Visitor not found' });
        }
    } catch (error) {
        console.error('Error getting visitor data:', error);
        res.status(500).json({ error: 'Failed to get visitor data' });
    }
});

// Save visitor data
app.post('/api/save-visitor-data', (req, res) => {
    try {
        const visitorData = req.body;
        
        if (!visitorData.visitorId) {
            return res.status(400).json({ error: 'Visitor ID is required' });
        }
        
        const allData = loadVisitorData();
        const isNewVisitor = !allData.visitors[visitorData.visitorId];
        
        // Update visitor data
        allData.visitors[visitorData.visitorId] = visitorData;
        
        // Update metadata
        if (isNewVisitor) {
            allData.metadata.totalVisitors++;
        }
        allData.metadata.totalRuns = Object.values(allData.visitors)
            .reduce((total, visitor) => total + visitor.totalRuns, 0);
        
        // Save to file
        if (saveVisitorData(allData)) {
            console.log(`💾 Visitor data saved: ${visitorData.visitorId} (${visitorData.totalRuns} total runs)`);
            res.json({ 
                success: true, 
                message: 'Visitor data saved successfully',
                isNewVisitor: isNewVisitor
            });
        } else {
            res.status(500).json({ error: 'Failed to save visitor data' });
        }
    } catch (error) {
        console.error('Error saving visitor data:', error);
        res.status(500).json({ error: 'Failed to save visitor data' });
    }
});

// Get visitor statistics (admin endpoint)
app.get('/api/visitor-stats', (req, res) => {
    try {
        const allData = loadVisitorData();
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
        
        const stats = {
            totalVisitors: allData.metadata.totalVisitors,
            totalRuns: allData.metadata.totalRuns,
            activeThisWeek: 0,
            runsThisWeek: 0,
            visitors: []
        };
        
        // Calculate weekly stats
        Object.values(allData.visitors).forEach(visitor => {
            const weeklyRuns = visitor.weeklyUsage.filter(usage => {
                return new Date(usage.timestamp) >= weekStart;
            }).length;
            
            if (weeklyRuns > 0) {
                stats.activeThisWeek++;
                stats.runsThisWeek += weeklyRuns;
            }
            
            stats.visitors.push({
                visitorId: visitor.visitorId,
                totalRuns: visitor.totalRuns,
                weeklyRuns: weeklyRuns,
                firstVisit: visitor.firstVisit,
                lastVisit: visitor.lastVisit
            });
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting visitor stats:', error);
        res.status(500).json({ error: 'Failed to get visitor statistics' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌍 AI Travel Planner server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔑 OpenAI API Key loaded: ${process.env.OPENAI_API_KEY ? '✓ Yes' : '❌ No'}`);
});
