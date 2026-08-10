require('fs').readFileSync('C:\\Users\\VAI\\Github\\Open-Dome\\OpenDome\\OpenDomeSandbox\\.env', 'utf-8').split('\n').forEach(l => { 
  const match = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    process.env[match[1]] = val;
  }
});

const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const os = require('os');
const fs = require('fs');

// 1. Setup Auth
const projectId = process.env.GCP_PROJECT_ID;
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY
? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n')
: undefined;

const gcpCredsPath = path.join(os.tmpdir(), 'gcp-creds.json');
fs.writeFileSync(gcpCredsPath, JSON.stringify({
  type: 'service_account',
  project_id: projectId,
  private_key: privateKey,
  client_email: clientEmail,
}));
process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredsPath;

// 2. Initialize SDK
const ai = new GoogleGenAI({
  project: projectId,
  location: 'global',
  vertexai: true
});

// 3. Define Native Tool Schema
const circleAgentTools = [{
  functionDeclarations: [
    {
      name: 'create_agent_wallet',
      description: 'Creates a new MPC developer-controlled wallet.',
      parameters: {
        type: 'OBJECT',
        properties: {
          blockchains: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['blockchains']
      }
    }
  ]
}];

async function testNativeTool() {
  const model = 'gemini-3.6-flash';
  const userPrompt = '2 plus 2?';
  
  console.log(`💬 User: ${userPrompt}`);
  
  const config = {
    tools: circleAgentTools,
    temperature: 0.7,
    systemInstruction: 'You are the OpenDome AI Agent. You manage MPC wallets using Circle. If asked, you can create a wallet or send nanopayments. You must execute tools when asked to.'
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config
    });

    console.log(`\n🤖 Response: ${response.text}`);

  } catch (error) {
    console.error('Error invoking Model with tools:', error);
  }
}

testNativeTool();
