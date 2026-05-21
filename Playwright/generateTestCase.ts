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

async function getTestSteps(token: string, issueKey: string) {
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

async function generatePlaywrightTest(issueKey: string) {
    try {
        const token = await getXrayToken();
        const testCase = await getTestSteps(token, issueKey);

        const title = testCase.jira.summary;
        const steps = testCase.steps || [];

        const formattedSteps = steps.map((step: any, index: number) => {
            return `Step ${index + 1}:
            Action: ${step.action}
            Data: ${step.data || 'None'}
            Expected Result: ${step.result || 'None'}`;
        }).join('\n\n');

        const agentFilePath = path.join(process.cwd(), '../.github/agents/copilot-instructions.agent.md');
        if (!fs.existsSync(agentFilePath)) {
            throw new Error("agents.md file not found in root directory.");
        }
        const systemPrompt = fs.readFileSync(agentFilePath, 'utf-8');

        // Instruct Gemini to return a multi-file JSON structure
        const userPrompt = `
        You are an expert QA Automation Engineer.
        Please write a Playwright E2E test for the following Jira Test Case: ${issueKey} - ${title}.
        
        Here are the manual steps from Xray:
        ${formattedSteps}

        Analyze the architecture rules. If the test requires new Page Objects or Components to remain compliant with the POM structure, generate them. If new selectors are needed, provide them.
        
        You MUST output ONLY a valid JSON object matching this exact schema:
        {
          "testFile": {
            "path": "tests/e2e/${issueKey.toLowerCase()}.test.ts",
            "content": "// Playwright test code..."
          },
          "pageObjects": [
            { "path": "pages/example.page.ts", "content": "// Page object code..." }
          ],
          "components": [
            { "path": "components/example.component.ts", "content": "// Component code..." }
          ],
          "selectors": {
            "appendContent": "export const exampleSelectors = { \\n  self: '.example' \\n};"
          }
        }
        
        Leave arrays empty if no new files of that type are needed. Omit markdown formatting outside the JSON.
        `;

        console.log("Sending to Gemini for generation...");

        // Using 2.5-flash for excellent speed and JSON structure adherence
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json" // Strict JSON enforcement
            }
        });

        const responseText = result.response.text();
        
        let output;
        try {
            output = JSON.parse(responseText);
        } catch (e) {
            console.error("❌ Failed to parse AI response as JSON. Raw response:");
            console.log(responseText);
            process.exit(1);
        }

        // 1. Write the Test File
        if (output.testFile?.path && output.testFile?.content) {
            const fullTestPath = path.join(process.cwd(), output.testFile.path);
            fs.mkdirSync(path.dirname(fullTestPath), { recursive: true });
            fs.writeFileSync(fullTestPath, output.testFile.content);
            console.log(`✅ Generated Test: ${output.testFile.path}`);
        }

        // 2. Write Page Objects
        if (output.pageObjects && Array.isArray(output.pageObjects)) {
            for (const po of output.pageObjects) {
                const poPath = path.join(process.cwd(), po.path);
                fs.mkdirSync(path.dirname(poPath), { recursive: true });
                fs.writeFileSync(poPath, po.content);
                console.log(`📄 Generated Page Object: ${po.path}`);
            }
        }

        // 3. Write Components
        if (output.components && Array.isArray(output.components)) {
            for (const comp of output.components) {
                const compPath = path.join(process.cwd(), comp.path);
                fs.mkdirSync(path.dirname(compPath), { recursive: true });
                fs.writeFileSync(compPath, comp.content);
                console.log(`🧩 Generated Component: ${comp.path}`);
            }
        }

        // 4. Append Selectors
        if (output.selectors?.appendContent) {
            const selectorFilePath = path.join(process.cwd(), 'support/testSelectors.ts');
            fs.mkdirSync(path.dirname(selectorFilePath), { recursive: true });
            // Add a newline before appending to ensure it doesn't break existing exports
            fs.appendFileSync(selectorFilePath, `\n${output.selectors.appendContent}\n`);
            console.log(`📝 Appended new selectors to: support/testSelectors.ts`);
        }

        console.log("🚀 Automation scaffolding complete.");

    } catch (error) {
        console.error("❌ Error generating test:", error);
        process.exit(1);
    }
}

const ticketId = process.argv[2] || process.env.JIRA_TICKET;
if (!ticketId) {
    console.error("❌ Please provide a Jira Ticket ID (e.g., QA-123).");
    process.exit(1);
}

generatePlaywrightTest(ticketId);