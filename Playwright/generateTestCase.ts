import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const XRAY_CLIENT_ID = process.env.XRAY_CLIENT_ID;
const XRAY_CLIENT_SECRET = process.env.XRAY_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Ensure API keys are present
if (!XRAY_CLIENT_ID || !XRAY_CLIENT_SECRET || !GEMINI_API_KEY) {
    console.error("❌ Missing required API keys in environment variables.");
    process.exit(1);
}

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ==========================================
// API HELPERS
// ==========================================

async function getXrayToken(): Promise<string> {
    console.log("Authenticating with Xray Cloud...");
    const response = await fetch('https://eu.xray.cloud.getxray.app/api/v2/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: XRAY_CLIENT_ID, client_secret: XRAY_CLIENT_SECRET })
    });

    if (!response.ok) throw new Error("Failed to authenticate with Xray.");
    return await response.json() as string;
}

async function getTestSteps(token: string, issueKey: string): Promise<any> {
    console.log(`Fetching steps for Xray Test Case: ${issueKey}...`);
    const query = `{
      getTests(jql: "key = '${issueKey}'", limit: 1){
        results {
          jira(fields: ["summary"])
          steps { action, data, result }
        }
      }
    }`;

    const response = await fetch('https://eu.xray.cloud.getxray.app/api/v2/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    if (data.errors) throw new Error("GraphQL Query failed.");
    
    const results = data?.data?.getTests?.results;
    if (!results || results.length === 0) throw new Error(`Test case ${issueKey} not found.`);

    return results[0];
}

// ==========================================
// FILE SYSTEM & MEMORY HELPERS
// ==========================================

function getFilePathsList(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) return [];
    let fileList: string[] = [];
    const readDir = (currentPath: string) => {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                readDir(fullPath);
            } else if (entry.isFile() && fullPath.endsWith('.ts')) {
                fileList.push(path.relative(process.cwd(), fullPath));
            }
        }
    };
    readDir(dirPath);
    return fileList;
}

function readSpecificFiles(filePaths: string[]): string {
    let output = "";
    for (const relativePath of filePaths) {
        const absolutePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(absolutePath)) {
            const content = fs.readFileSync(absolutePath, 'utf-8');
            output += `\n### File: ${relativePath} ###\n${content}\n`;
        }
    }
    return output || "No relevant existing Page Objects or Components found. You must create new ones.";
}

const writeToFile = (filePath: string | undefined, content: string | undefined, label: string) => {
    if (filePath && content) {
        const absolutePath = path.join(process.cwd(), filePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, content);
        console.log(`${label}: ${filePath}`);
    }
};

// --- NEW: Structured Memory System ---
const MEMORY_PATH = path.join(process.cwd(), '../.github/agents/lessons_learned.json');

type AgentMemory = {
    locators: string[];
    waits: string[];
    api: string[];
    architecture: string[];
    general: string[];
};

function loadMemory(): AgentMemory {
    if (!fs.existsSync(MEMORY_PATH)) {
        return { locators: [], waits: [], api: [], architecture: [], general: [] };
    }
    return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8'));
}

function saveMemory(memory: AgentMemory) {
    fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

// ==========================================
// MAIN GENERATION LOGIC
// ==========================================

async function generatePlaywrightTest(issueKey: string): Promise<void> {
    try {
        const token = await getXrayToken();
        const testCase = await getTestSteps(token, issueKey);

        const title: string = testCase.jira.summary;
        const formattedSteps: string = (testCase.steps || []).map((step: any, index: number) => {
            return `Step ${index + 1}:\nAction: ${step.action}\nData: ${step.data || 'None'}\nResult: ${step.result || 'None'}`;
        }).join('\n\n');

        const agentMemory = loadMemory();

        // ====================================================================
        // PASS 1: THE ARCHITECT (Determine Context & Memory Requirements)
        // ====================================================================
        console.log("Pass 1: AI is analyzing files and memory requirements...");
        const allPages = getFilePathsList(path.join(process.cwd(), 'pages'));
        const allComponents = getFilePathsList(path.join(process.cwd(), 'components'));
        const availableFiles = [...allPages, ...allComponents];

        const architectPrompt = `
        You are an Automation Architect. Automate Jira Test: ${issueKey} - ${title}.
        
        Test Steps:
        ${formattedSteps}

        Available Files:
        ${JSON.stringify(availableFiles, null, 2)}

        Select the files you need to interact with. Also, select the categories of past memory lessons that are relevant to this test.
        `;

        // Strict Schema Definition
        const architectSchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                neededFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                relevantMemoryCategories: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "Choose from: 'locators', 'waits', 'api', 'architecture', 'general'"
                }
            },
            required: ["neededFiles", "relevantMemoryCategories"]
        };

        const architectResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: architectPrompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: architectSchema }
        });

        const parsedArchitect = JSON.parse(architectResult.response.text());
        const neededFiles: string[] = parsedArchitect.neededFiles || [];
        const requestedCategories: string[] = parsedArchitect.relevantMemoryCategories || ['general'];
        
        console.log(`🧠 AI Context: ${neededFiles.join(', ') || 'None'}`);
        console.log(`🧠 AI Memory: ${requestedCategories.join(', ')}`);

        // ====================================================================
        // PASS 2: THE CODER (Generate the actual test)
        // ====================================================================
        console.log("Pass 2: AI is writing the code...");
        
        const systemPromptPath = path.join(process.cwd(), '../.github/agents/copilot-instructions.agent.md');
        const baseSystemPrompt = fs.existsSync(systemPromptPath) ? fs.readFileSync(systemPromptPath, 'utf-8') : "";

        // --- INJECT TARGETED MEMORY ---
        let targetedLessons = "";
        requestedCategories.forEach(category => {
            const catKey = category as keyof AgentMemory;
            if (agentMemory[catKey] && agentMemory[catKey].length > 0) {
                // Only take the 5 most recent lessons per category to save tokens
                targetedLessons += `\n### ${category.toUpperCase()} LESSONS ###\n`;
                targetedLessons += agentMemory[catKey].slice(-5).map(l => `- ${l}`).join('\n');
            }
        });

        const systemPrompt = `${baseSystemPrompt}\n\n### CRITICAL LESSONS FROM PAST FAILURES ###\n${targetedLessons || "No specific lessons for these categories yet."}`;

        const targetedContext = readSpecificFiles(neededFiles);
        const selectorPath = path.join(process.cwd(), 'support/testSelectors.ts');
        const existingSelectors = fs.existsSync(selectorPath) ? fs.readFileSync(selectorPath, 'utf-8') : "No existing selectors.";
        const fixturesPath = path.join(process.cwd(), 'support/fixtures.ts');
        const existingFixtures = fs.existsSync(fixturesPath) ? fs.readFileSync(fixturesPath, 'utf-8') : "No existing fixtures.";

        const coderModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
        const chatSession = coderModel.startChat({
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        });

        const initialPrompt = `
        You are an expert QA Automation Engineer. Write a Playwright E2E test for: ${issueKey} - ${title}.
        
        Manual steps:
        ${formattedSteps}

        Requested Files Code:
        ---
        ${targetedContext}
        ---

        Existing testSelectors.ts:
        ---
        ${existingSelectors}
        ---

        Existing fixtures.ts:
        ---
        ${existingFixtures}
        ---
        
        CRITICAL RULES:
        1. Use existing methods if they exist.
        2. Merge new selectors into existing objects in testSelectors.ts. Do NOT duplicate constants.
        3. If you modify an existing Page Object or Component, output the ENTIRE updated file content.

        Return JSON matching this exact schema:
        {
          "testFile": { "path": "tests/e2e/qa-123.test.ts", "content": "code" },
          "pageObjects": [ { "path": "pages/...", "content": "code" } ],
          "components": [ { "path": "components/...", "content": "code" } ],
          "selectors": { "path": "support/...", "content": "code" },
          "fixtures": { "path": "support/...", "content": "code" }
        }
        `;

        let chatResult = await chatSession.sendMessage(initialPrompt);
        let output = JSON.parse(chatResult.response.text());

        let testFilePath = output.testFile?.path;

        writeToFile(testFilePath, output.testFile?.content, "✅ Generated Test");
        if (output.selectors?.content) writeToFile(output.selectors.path || 'support/testSelectors.ts', output.selectors.content, "📝 Updated Selectors");
        if (output.fixtures?.content) writeToFile(output.fixtures.path || 'support/fixtures.ts', output.fixtures.content, "🔧 Updated Fixtures");
        (output.pageObjects || []).forEach((po: any) => writeToFile(po.path, po.content, "📄 Updated Page Object"));
        (output.components || []).forEach((co: any) => writeToFile(co.path, co.content, "🧩 Updated Component"));

        // ====================================================================
        // PASS 3: THE EXECUTION & FEEDBACK LOOP
        // ====================================================================
        const MAX_ATTEMPTS = 3;
        let testPassed = false;
        let attempt = 1;

        for (; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`\n▶️ Running Playwright Test (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
            
            try {
                const { stdout } = await execPromise(`npx playwright test ${testFilePath}`);
                console.log(`\n✅ TEST PASSED ON ATTEMPT ${attempt}!`);
                console.log(stdout);
                testPassed = true;
                break; 

            } catch (error: any) {
                console.log(`\n❌ TEST FAILED. Gathering logs for AI analysis...`);
                const errorLog = (error.stdout + "\n" + error.stderr).substring(0, 5000); 

                if (attempt === MAX_ATTEMPTS) {
                    console.error("🚨 Max attempts reached. Manual review required.");
                    console.log(errorLog);
                    break;
                }

                console.log("Sending error logs to Gemini for self-correction...");
                const correctionPrompt = `
                The test failed. Error output:
                ---
                ${errorLog}
                ---
                Analyze the error and fix the code. Return the ENTIRE updated JSON payload matching the exact same schema.
                `;

                chatResult = await chatSession.sendMessage(correctionPrompt);
                output = JSON.parse(chatResult.response.text());

                console.log("Overwriting files with AI corrections...");
                writeToFile(testFilePath, output.testFile?.content, "✅ Fixed Test");
                if (output.selectors?.content) writeToFile(output.selectors.path, output.selectors.content, "📝 Fixed Selectors");
                if (output.fixtures?.content) writeToFile(output.fixtures.path, output.fixtures.content, "🔧 Fixed Fixtures");
                (output.pageObjects || []).forEach((po: any) => writeToFile(po.path, po.content, "📄 Fixed Page Object"));
                (output.components || []).forEach((co: any) => writeToFile(co.path, co.content, "🧩 Fixed Component"));
            }
        }

        // ====================================================================
        // PASS 4: EXTRACT & SAVE NEW MEMORY (If corrected)
        // ====================================================================
        if (testPassed && attempt > 1) {
            console.log("\n🧠 Extracting structured lesson for persistent memory...");
            
            const memorySchema: Schema = {
                type: SchemaType.OBJECT,
                properties: {
                    category: { type: SchemaType.STRING, description: "Must be: 'locators', 'waits', 'api', 'architecture', or 'general'" },
                    lesson: { type: SchemaType.STRING, description: "A concise 1-sentence rule to prevent this mistake." }
                },
                required: ["category", "lesson"]
            };

            const lessonPrompt = `
            You successfully fixed a failing test. 
            Write a SINGLE concise rule to prevent this specific mistake in the future.
            Categorize it accurately.
            `;

            try {
                const lessonResult = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: lessonPrompt }] }],
                    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: memorySchema }
                });

                const newMemory = JSON.parse(lessonResult.response.text());
                const category = newMemory.category as keyof AgentMemory;
                
                // Ensure valid category fallback
                const safeCategory = agentMemory[category] ? category : 'general';
                
                // Add lesson and save
                agentMemory[safeCategory].push(newMemory.lesson);
                saveMemory(agentMemory);
                
                console.log(`📝 Added to [${safeCategory}] memory: ${newMemory.lesson}`);
            } catch (e) {
                console.warn("⚠️ Failed to save structured memory lesson.");
            }
        }

    } catch (error) {
        console.error("❌ Error in generation loop:", error);
        process.exit(1);
    }
}

// ==========================================
// EXECUTION TRIGGER
// ==========================================

const ticketId = process.argv[2] || process.env.JIRA_TICKET;
if (!ticketId) {
    console.error("❌ Please provide a Jira Ticket ID (e.g., QA-123).");
    process.exit(1);
}

generatePlaywrightTest(ticketId);