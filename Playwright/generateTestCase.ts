import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { spawn } from 'child_process';

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

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), '../.github/agents/e2e.agent.md');

// ==========================================
// RESILIENCE HELPER: API Retry Logic (Handles 429s)
// ==========================================
async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await operation();
        } catch (error: any) {
            attempt++;
            const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded');
            
            if (isRateLimit && attempt < maxRetries) {
                // Wait 20s on first fail, 40s on second fail
                const waitTime = 20000 * attempt; 
                console.warn(`\n⏳ Gemini API Rate Limit (429) hit. Pausing for ${waitTime / 1000} seconds before retry ${attempt}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw error; // Re-throw if it's not a rate limit, or if we are out of retries
            }
        }
    }
    throw new Error("Max API retries exceeded.");
}

// ==========================================
// CUSTOM EXECUTION HELPER (Replaces exec)
// ==========================================
function runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log('\n--- Playwright Execution Logs ---');
        const child = spawn(command, { shell: true });
        let output = "";
        
        child.stdout.on('data', (data) => {
            process.stdout.write(data);
            output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            process.stderr.write(data);
            output += data.toString();
        });
        
        child.on('close', (code) => {
            console.log('---------------------------------\n');
            if (code === 0) {
                resolve(output);
            } else {
                const error = new Error(`Command failed with code ${code}`);
                (error as any).output = output; 
                reject(error);
            }
        });
    });
}

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
// FILE SYSTEM HELPERS
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

        // ====================================================================
        // PASS 1: THE ARCHITECT (Determine Context)
        // ====================================================================
        console.log("Pass 1: AI is analyzing required files...");
        const allPages = getFilePathsList(path.join(process.cwd(), 'pages'));
        const allComponents = getFilePathsList(path.join(process.cwd(), 'components'));
        const availableFiles = [...allPages, ...allComponents];

        const architectPrompt = `
        You are an Automation Architect. Automate Jira Test: ${issueKey} - ${title}.
        
        Test Steps:
        ${formattedSteps}

        Available Files:
        ${JSON.stringify(availableFiles, null, 2)}

        Select the file paths you need to interact with to automate this test.
        `;

        const architectSchema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                neededFiles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["neededFiles"]
        };

        const architectResult = await executeWithRetry(() => 
            model.generateContent({
                contents: [{ role: 'user', parts: [{ text: architectPrompt }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: architectSchema }
            })
        );

        const parsedArchitect = JSON.parse(architectResult.response.text());
        const neededFiles: string[] = parsedArchitect.neededFiles || [];
        
        console.log(`🧠 AI Context Files: ${neededFiles.join(', ') || 'None'}`);

        // ====================================================================
        // PASS 2: THE CODER (Generate the actual test)
        // ====================================================================
        console.log("Pass 2: AI is writing the code...");
        
        const systemPrompt = fs.existsSync(SYSTEM_PROMPT_PATH) 
            ? fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8') 
            : "You are an expert QA Automation Engineer. Write robust, maintainable Playwright code.";

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
        Write a Playwright E2E test for: ${issueKey} - ${title}.
        
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

        let chatResult = await executeWithRetry(() => chatSession.sendMessage(initialPrompt));
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
        let attempt = 1;
        let hasFailedAtLeastOnce = false;
        let combinedErrorLogs = "";

        for (; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`\n▶️ Running Playwright Test (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
            
            try {
                // Using runCommand with list reporter to prevent HTML server hanging
                const stdout = await runCommand(`npx playwright test ${testFilePath} --workers=1 --reporter=list`);
                console.log(`\n✅ TEST PASSED ON ATTEMPT ${attempt}!`);
                break; // Exit loop on success

            } catch (testError: any) {
                hasFailedAtLeastOnce = true;
                console.log(`\n❌ TEST FAILED (Attempt ${attempt}). Gathering logs for AI analysis...`);
                
                const rawLogs = testError.output || testError.message || "Unknown error";
                const errorLog = rawLogs.substring(0, 5000); 
                combinedErrorLogs += `\n--- Attempt ${attempt} Error ---\n${errorLog}\n`;

                if (attempt === MAX_ATTEMPTS) {
                    console.error("🚨 Max attempts reached. Manual review required.");
                } else {
                    console.log("Sending error logs to Gemini for self-correction...");
                    const correctionPrompt = `
                    The test failed. Error output:
                    ---
                    ${errorLog}
                    ---
                    Analyze the error and fix the code. Return the ENTIRE updated JSON payload matching the exact same schema.
                    `;

                    try {
                        chatResult = await executeWithRetry(() => chatSession.sendMessage(correctionPrompt));
                        let responseText = chatResult.response.text().trim();
                        
                        if (responseText.startsWith('```')) {
                            responseText = responseText.replace(/^```(json)?\n?/, '').replace(/```$/, '').trim();
                        }

                        output = JSON.parse(responseText);

                        console.log("Overwriting files with AI corrections...");
                        writeToFile(testFilePath, output.testFile?.content, "✅ Fixed Test");
                        if (output.selectors?.content) writeToFile(output.selectors.path, output.selectors.content, "📝 Fixed Selectors");
                        if (output.fixtures?.content) writeToFile(output.fixtures.path, output.fixtures.content, "🔧 Fixed Fixtures");
                        (output.pageObjects || []).forEach((po: any) => writeToFile(po.path, po.content, "📄 Fixed Page Object"));
                        (output.components || []).forEach((co: any) => writeToFile(co.path, co.content, "🧩 Fixed Component"));
                    } catch (aiError) {
                        console.error("⚠️ AI Correction failed on this attempt (likely a JSON formatting issue). Advancing to next attempt...", aiError);
                    }
                }
            }
        }

        // ====================================================================
        // PASS 4: INTELLIGENT MEMORY REFINEMENT (Inline Markdown Update)
        // ====================================================================
        if (hasFailedAtLeastOnce) {
            console.log("\n🧠 Analyzing accumulated failures to upgrade copilot-instructions.agent.md...");
            
            let existingInstructions = "";
            if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
                existingInstructions = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
            } else {
                existingInstructions = "# Playwright End-to-End Testing Automation Guide\n\nYou are an expert QA Automation Engineer.";
            }

            const memoryPrompt = `
            You are maintaining your own system instructions. You just executed a test script that failed during execution. 
            
            Here are the accumulated error logs from the failed attempt(s):
            ---
            ${combinedErrorLogs}
            ---

            Current System Instructions:
            ---
            ${existingInstructions}
            ---

            Task: Update the "Current System Instructions" to prevent these exact mistakes in future generated tests.
            1. Analyze the errors holistically to find the root cause.
            2. Integrate your technical corrections DIRECTLY into the relevant existing sections of the markdown document (e.g., "Locator Strategy", "Best Practices Summary", "Test Design and Structure").
            3. DO NOT create a "Lessons Learned" section. DO NOT append a list of errors at the bottom. Weave the insights naturally into the existing guide as new bullet points or refined rules.
            4. CRITICAL: Preserve all other foundational instructions, the YAML frontmatter at the top, code blocks, and overall document structure. Do not delete context that is unrelated to the error.
            
            Return ONLY the complete, updated Markdown text. Do not wrap your response in markdown code blocks (\`\`\`) and do not add conversational text.
            `;

            try {
                const memoryResult = await executeWithRetry(() => 
                    model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: memoryPrompt }] }],
                        generationConfig: { temperature: 0.1 } 
                    })
                );

                let updatedInstructions = memoryResult.response.text().trim();
                
                if (updatedInstructions.startsWith('```')) {
                    const lines = updatedInstructions.split('\n');
                    lines.shift(); 
                    if (lines[lines.length - 1].trim().startsWith('```')) {
                        lines.pop(); 
                    }
                    updatedInstructions = lines.join('\n').trim();
                }
                
                if (updatedInstructions) {
                    fs.mkdirSync(path.dirname(SYSTEM_PROMPT_PATH), { recursive: true });
                    fs.writeFileSync(SYSTEM_PROMPT_PATH, updatedInstructions);
                    console.log(`📝 Successfully wove failure analysis directly into the SOP guide.`);
                }
            } catch (e) {
                console.warn("⚠️ Failed to synthesize and update the markdown instructions.", e);
            }
        } else {
            console.log("\n🎉 Test passed on the first attempt! No memory updates needed.");
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