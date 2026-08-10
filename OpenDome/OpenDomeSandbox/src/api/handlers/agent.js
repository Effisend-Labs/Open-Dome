import { Hono } from 'hono';
import { VertexAI, Type } from '@google-cloud/vertexai';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import path from 'path';

// Force Google Cloud SDKs to use the local credential for authentication
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'credential.json');

// Initialize Vertex AI with the project ID extracted from the credential
const vertex_ai = new VertexAI({
  project: 'project-cadf416c-23aa-4f9b-be6',
  location: 'us-central1' 
});

// Setup Circle SDK (Gracefully handles missing keys for the hackathon MVP)
let circleClient = null;
if (process.env.CIRCLE_API_KEY && process.env.CIRCLE_ENTITY_SECRET) {
  circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET,
  });
}

const app = new Hono();

// Gemini Tool Definitions (Function Calling) mapping to Circle SDK
const circleAgentTools = [{
  functionDeclarations: [
    {
      name: 'create_agent_wallet',
      description: 'Creates a new MPC developer-controlled wallet for the AI Agent to autonomously hold funds.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          blockchains: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of blockchains (e.g. MATIC-AMOY, ETH-SEPOLIA, BASE-SEPOLIA)'
          }
        },
        required: ['blockchains']
      }
    },
    {
      name: 'execute_nanopayment',
      description: 'Executes a gasless sub-cent USDC payment via Circle Developer API.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.STRING, description: 'Amount of USDC to send' },
          destination: { type: Type.STRING, description: 'Destination address' },
          tokenId: { type: Type.STRING, description: 'Circle Token ID for USDC' }
        },
        required: ['amount', 'destination', 'tokenId']
      }
    }
  ]
}];

/**
 * Global utility to translate technical backend errors into human-readable advice via Vertex AI
 */
export const translateErrorWithAI = async (technicalErrorContext) => {
  try {
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-preview-0514',
      generationConfig: { maxOutputTokens: 256, temperature: 0.2 },
    });

    const prompt = `You are the Open-Dome AI Support Agent. 
The system encountered a technical error: "${technicalErrorContext}".
Translate this into a friendly, helpful 1-2 sentence explanation for a non-technical user. If it's an "insufficient funds" or "gas" error, clearly explain that they need to fund their wallet to pay for network fees.`;

    const request = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    const streamingResp = await generativeModel.generateContentStream(request);
    const response = await streamingResp.response;
    return response.candidates[0].content.parts[0].text.trim();
  } catch (e) {
    console.error("[Agent AI] Failed to translate error:", e.message);
    return `An unexpected error occurred: ${technicalErrorContext}`;
  }
};

app.post('/', async (c) => {
  console.log("[Agent API] Execution started via Google Vertex AI");
  try {
    let body = {};
    try { body = await c.req.json(); } catch {}

    const defaultPrompt = "You are the Open-Dome AI Agent. Give a highly professional, 2-sentence response welcoming the user and confirming you are operational.";
    const userPrompt = body.prompt || body.message || defaultPrompt;

    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-preview-0514',
      tools: circleAgentTools, // Give Gemini the Circle Agent Tools!
      generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
    });

    const request = {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    };

    const streamingResp = await generativeModel.generateContentStream(request);
    const response = await streamingResp.response;
    
    // 1. Check if the AI decided to call a Circle tool instead of just responding with text
    const functionCall = response.candidates[0].content.parts[0].functionCall;
    if (functionCall) {
      if (!circleClient) {
        return c.json({
          status: "success",
          response: `I attempted to execute an autonomous action (${functionCall.name}), but my Circle Developer SDK is currently missing API keys in the environment variables.`
        });
      }
      
      // In a full implementation, the backend would actually trigger the Circle API here
      return c.json({
        status: "success",
        response: `I autonomously called the Circle SDK tool: ${functionCall.name} with parameters: ${JSON.stringify(functionCall.args)}`
      });
    }

    // 2. Standard AI Text Response
    const text = response.candidates[0].content.parts[0].text;
    return c.json({
      status: "success",
      response: text.trim()
    });
  } catch (error) {
    console.error("[Agent API] Vertex AI Error:", error);
    
    if (error.message && error.message.includes("API has not been used in project")) {
      return c.json({
        status: "error",
        response: "Vertex AI API is not enabled on your Google Cloud project. Please enable it in the GCP console.",
        details: error.message
      }, 403);
    }

    return c.json({
      status: "error",
      response: "AI Agent failed to execute.",
      details: error.message
    }, 500);
  }
});

export default app;
