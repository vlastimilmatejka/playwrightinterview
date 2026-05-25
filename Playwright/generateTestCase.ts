import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const XRAY_CLIENT_ID = process.env.XRAY_CLIENT_ID;
const XRAY_CLIENT_SECRET = process.env.XRAY_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Ensure API keys are present
if (!XRAY_CLIENT_ID || !XRAY_CLIENT_SECRET || !GEMINI_API_KEY) {
    console.error("❌ Missing required API keys in environment variables. Ensure GEMINI_API_KEY is set.");
    process.exit(1);
}

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
    const query = `
    {
      getTests(jql: "key = '${issueKey}'", limit: 1){
        results {
          jira(fields: ["summary"])
          steps {
            action
            data
            result
          }
        }
      }
    }`;

    const response = await fetch('https://eu.xray.cloud.getxray.app/api/v2/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });
    const data = await response.json();

    if (data.errors) {
        console.error("❌ Xray API rejected the request. Details:");
        console.error(JSON.stringify(data.errors, null, 2));
        throw new Error("GraphQL Query failed.");
    }

    const results = data?.data?.getTests?.results;

    if (!results || results.length === 0) {
        console.error(`❌ Zero results found for ${issueKey}.`);
        throw new Error(`Test case ${issueKey} not found in Xray.`);
    }

    return results[0];
}

// --- NEW HELPER: Recursively read existing TS files to provide context ---
function getExistingTypeScriptFiles(dirPath: string): string {
    if (!fs.existsSync(dirPath)) return "Directory does not exist.";
    
    let output = "";
    const readDir = (currentPath: string) => {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                readDir(fullPath);
            } else if (entry.isFile() && fullPath.endsWith('.ts')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const relPath = path.relative(process.cwd(), fullPath);
                output += `\n### File: ${relPath} ###\n${content}\n`;
            }
        }
    };
    
    readDir(dirPath);
    return output || "No existing files found in this directory.";
}

async function generatePlaywrightTest(issueKey: string): Promise<void> {
    try {
        const token: string = await getXrayToken();
        const testCase = await getTestSteps(token, issueKey);

        const title: string = testCase.jira.summary;
        const steps: any[] = testCase.steps || [];

        const formattedSteps: string = steps.map((step: any, index: number) => {
            return `Step ${index + 1}:
            Action: ${step.action}
            Data: ${step.data || 'None'}
            Expected Result: ${step.result || 'None'}`;
        }).join('\n\n');

        const agentFilePath: string = path.join(process.cwd(), '../.github/agents/copilot-instructions.agent.md');
        if (!fs.existsSync(agentFilePath)) {
            throw new Error("agents.md file not found in root directory.");
        }
        const systemPrompt: string = fs.readFileSync(agentFilePath, 'utf-8');

        // Fetch Selectors Context
        const selectorFilePath: string = path.join(process.cwd(), 'support/testSelectors.ts');
        let existingSelectors: string = "No existing selectors found.";
        if (fs.existsSync(selectorFilePath)) {
            existingSelectors = fs.readFileSync(selectorFilePath, 'utf-8');
        }

        // --- NEW: Fetch Page Objects and Components Context ---
        const pagesPath = path.join(process.cwd(), 'pages');
        const componentsPath = path.join(process.cwd(), 'components');
        const existingPages = getExistingTypeScriptFiles(pagesPath);
        const existingComponents = getExistingTypeScriptFiles(componentsPath);

        const userPrompt: string = `
        You are an expert QA Automation Engineer.
        Please write a Playwright E2E test for the following Jira Test Case: ${issueKey} - ${title}.
        
        Here are the manual steps from Xray:
        ${formattedSteps}

        Here is the CURRENT state of the selectors file (support/testSelectors.ts):
        ---
        ${existingSelectors}
        ---
        CRITICAL RULE FOR SELECTORS: If a new selector belongs to an existing category, you MUST merge the new key-value pair into the existing object. Output the ENTIRE updated content of the file.

        Here is the CURRENT state of existing Page Objects:
        ---
        ${existingPages}
        ---

        Here is the CURRENT state of existing Components:
        ---
        ${existingComponents}
        ---
        
        CRITICAL RULE FOR PAGE OBJECTS & COMPONENTS: 
        1. If you need to interact with the UI, check the existing Page Objects and Components first and USE existing methods.
        2. If you MUST add a new method to an existing Page Object or Component, you MUST output the ENTIRE file content in your JSON response, preserving ALL existing methods, properties, and imports exactly as they are. DO NOT delete existing methods.
        3. Only generate entirely new files if the domain/page does not conceptually fit into the existing files.

        You MUST output ONLY a valid JSON object matching this exact schema:
        {
          "testFile": {
            "path": "tests/e2e/${issueKey.toLowerCase()}.test.ts",
            "content": "// Playwright test code..."
          },
          "pageObjects": [
            { "path": "pages/example.page.ts", "content": "// The FULL content of the file, preserving old methods..." }
          ],
          "components": [
            { "path": "components/example.component.ts", "content": "// The FULL content of the file, preserving old methods..." }
          ],
          "selectors": {
            "path": "support/testSelectors.ts",
            "content": "// The FULL updated content..."
          }
        }
        
        Leave arrays empty if no new files or modifications are needed. Omit markdown formatting outside the JSON.
        `;

        console.log("Sending to Gemini for generation...");

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        });

        const responseText: string = result.response.text();
        
        let output: any;
        try {
            output = JSON.parse(responseText);
        } catch (e) {
            console.error("❌ Failed to parse AI response as JSON. Raw response:");
            console.log(responseText);
            process.exit(1);
        }

        // 1. Write the Test File
        if (output.testFile?.path && output.testFile?.content) {
            const fullTestPath: string = path.join(process.cwd(), output.testFile.path);
            fs.mkdirSync(path.dirname(fullTestPath), { recursive: true });
            fs.writeFileSync(fullTestPath, output.testFile.content);
            console.log(`✅ Generated Test: ${output.testFile.path}`);
        }

        // 2. Write/Update Page Objects
        if (output.pageObjects && Array.isArray(output.pageObjects)) {
            for (const po of output.pageObjects) {
                const poPath: string = path.join(process.cwd(), po.path);
                fs.mkdirSync(path.dirname(poPath), { recursive: true });
                fs.writeFileSync(poPath, po.content);
                console.log(`📄 Generated/Updated Page Object: ${po.path}`);
            }
        }

        // 3. Write/Update Components
        if (output.components && Array.isArray(output.components)) {
            for (const comp of output.components) {
                const compPath: string = path.join(process.cwd(), comp.path);
                fs.mkdirSync(path.dirname(compPath), { recursive: true });
                fs.writeFileSync(compPath, comp.content);
                console.log(`🧩 Generated/Updated Component: ${comp.path}`);
            }
        }

        // 4. Write/Update Selectors 
        if (output.selectors?.content) {
            const targetPath: string = path.join(process.cwd(), output.selectors.path || 'support/testSelectors.ts');
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, output.selectors.content);
            console.log(`📝 Updated and merged selectors in: ${targetPath}`);
        }

        console.log("🚀 Automation scaffolding complete.");

    } catch (error) {
        console.error("❌ Error generating test:", error);
        process.exit(1);
    }
}

const ticketId: string | undefined = process.argv[2] || process.env.JIRA_TICKET;
if (!ticketId) {
    console.error("❌ Please provide a Jira Ticket ID (e.g., QA-123).");
    process.exit(1);
}

generatePlaywrightTest(ticketId);