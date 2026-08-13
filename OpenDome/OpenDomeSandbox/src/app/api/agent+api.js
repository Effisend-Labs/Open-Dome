import { GoogleGenAI } from '@google/genai';
import { createCircleAgentWallet, executeCircleNanoPayment } from '../../api-utils/circle-tools.js';
import jwt from 'jsonwebtoken';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configurar credenciales GCP para Vertex AI dinamicamente
const gcpCredsPath = path.join(os.tmpdir(), 'gcp-creds.json');
if (!fs.existsSync(gcpCredsPath) && process.env.GCP_PRIVATE_KEY) {
  fs.writeFileSync(gcpCredsPath, JSON.stringify({
    type: "service_account",
    project_id: process.env.GCP_PROJECT_ID,
    private_key_id: "sandbox-key",
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GCP_CLIENT_EMAIL,
    client_id: "sandbox-client",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_CLIENT_EMAIL)}`,
    universe_domain: "googleapis.com"
  }));
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredsPath;

// In-memory store for rate limiting (max 5 requests per minute per user)
const rateLimitStore = new Map();

// Initialize GenAI Client for Vertex AI
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID || 'project-cadf416c-23aa-4f9b-be6',
  location: 'global',
  httpOptions: {
    timeout: 60000
  }
});

// Define the exact Circle tool schema expected by the Gemini API
const circleAgentTools = [{
  functionDeclarations: [
    {
      name: 'create_agent_wallet',
      description: 'Creates a new MPC developer-controlled wallet.',
      parameters: {
        type: 'OBJECT',
        properties: {
          blockchains: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of blockchains to provision (e.g., ["ETH", "BASE", "MATIC"])'
          }
        },
        required: ['blockchains']
      }
    },
    {
      name: 'execute_nanopayment',
      description: 'Executes a USDC payment via Circle.',
      parameters: {
        type: 'OBJECT',
        properties: {
          amount: { type: 'STRING' },
          destination: { type: 'STRING' },
          tokenId: { type: 'STRING' }
        },
        required: ['amount', 'destination', 'tokenId']
      }
    },
    {
      name: 'calculate_sum',
      description: 'Calculates the sum of two numbers. Use this whenever the user asks to add or sum numbers.',
      parameters: {
        type: 'OBJECT',
        properties: {
          a: { type: 'NUMBER', description: 'The first number to add' },
          b: { type: 'NUMBER', description: 'The second number to add' }
        },
        required: ['a', 'b']
      }
    }
  ]
}];

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, payment-signature, x-payment-network',
    }
  });
}

export async function POST(req) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';
    console.log(`[Agent API] Incoming Headers:`, Object.fromEntries(req.headers.entries()));

    const authHeader = req.headers.get('authorization');
    
    // Check for free Bearer token
    let decoded = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error(`[Agent API] JWT Verification failed:`, err.message);
        return Response.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
      }
    }

    const body = await req.json();
    const isOpenAgent = body.mode === 'openagent' || body.app === 'openagent';
    const defaultPrompt = isOpenAgent
      ? 'You are OpenAgent, a Gemini assistant inside OpenDome. Be helpful, concise, and accurate. Answer the user directly. Do not claim you charged a card or moved funds unless a tool actually ran.'
      : 'You are the OpenDome AI Agent. You manage MPC wallets using Circle. If asked, you can create a wallet or send nanopayments. You must execute tools when asked to.';
    const userPrompt = body.prompt || body.message || defaultPrompt;

    // --- GUARDRAIL 1: Input Overload Protection ---
    if (userPrompt.length > 1000) {
      console.warn(`[Agent API] Blocked prompt exceeding length limit`);
      return Response.json({ error: 'Input too long: Maximum 1000 characters allowed to prevent context overload.' }, { status: 400 });
    }

    // --- GUARDRAIL 2: Rate Limiting (5 requests / min) ---
    // If authenticated via Bearer token, apply rate limiting per user.
    // If not authenticated (will use x402), use a generic identifier or skip rate limit since they are paying.
    if (decoded) {
      const now = Date.now();
      const userLimits = rateLimitStore.get(decoded.userId) || [];
      const recentRequests = userLimits.filter(ts => now - ts < 60000); // within last 60s
      
      if (recentRequests.length >= 5) {
        console.warn(`[Agent API] Rate limit exceeded for user ${decoded.userId}`);
        return Response.json({ error: 'Rate limit exceeded: Maximum 5 requests per minute. Please slow down.' }, { status: 429 });
      }
      recentRequests.push(now);
      rateLimitStore.set(decoded.userId, recentRequests);
    }

    const { quotePromptTariff } = await import('opendome/dist/agentTariff.js');
    const tariff = quotePromptTariff(userPrompt, body.modelId);
    const targetModel = tariff.apiModel;
    const price = tariff.x402Amount;

    // --- x402 CLASSIC FACILITATOR MIDDLEWARE ---
    if (!decoded) {
      const { OpenDomeSeller, OpenDomeFacilitator } = await import('opendome/dist/x402.js');
      const merchantAddress = process.env.MERCHANT_ADDRESS || "0x69F6B4d206E19D2ef5838ed3E7150F2D22A9Fc7f";
      const seller = new OpenDomeSeller(merchantAddress);
      
      const paymentSignatureBase64 = req.headers.get('payment-signature');
      
      if (!paymentSignatureBase64) {
        // Return standard 402 Challenge
        return new Response(null, {
          status: 402,
          headers: {
            'x402-challenge': seller.generateChallenge(price)
          }
        });
      }

      // 1. Decode and validate payment signature using OpenDomeSeller
      let parsedPayment;
      try {
        parsedPayment = seller.parseAndValidateSignature(paymentSignatureBase64, price);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }

      console.log(`[x402 Facilitator] Signature format valid. Handing over to OpenDomeFacilitator to verify and sponsor transaction for ${parsedPayment.from}...`);

      if (process.env.OD_BYPASS_X402 === 'true') {
        console.warn('[x402 Facilitator] OD_BYPASS_X402 — skipping on-chain relay');
      } else {
        // 2. Verify mathematically and relay transaction to Base Mainnet
        const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY);
        
        try {
          const txHash = await facilitator.verifyAndRelay(parsedPayment.payload, parsedPayment.signature);
          console.log(`[x402 Facilitator] Transaction confirmed! Payment settled. Hash: ${txHash}`);
        } catch (err) {
          console.error('[x402 Facilitator] Error relaying transaction:', err.message);
          return Response.json({ error: err.message }, { status: 500 });
        }
      }

      decoded = { userId: 'x402-user', username: 'x402 Payer' };
    }

    const config = {
      tools: isOpenAgent ? undefined : circleAgentTools,
      temperature: 0.7,
      systemInstruction: defaultPrompt
    };

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: userPrompt,
      config
    });
    
    // Check if Gemini wants to call a Circle tool
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const modelPart = response.candidates[0].content.parts.find(p => p.functionCall);
      console.log(`Agent invoked tool: ${call.name}`, call.args);
      
      let toolResult = {};
      if (call.name === 'create_agent_wallet') {
        toolResult = await createCircleAgentWallet(call.args.blockchains);
      } else if (call.name === 'execute_nanopayment') {
        toolResult = await executeCircleNanoPayment(call.args);
      } else if (call.name === 'calculate_sum') {
        const sum = call.args.a + call.args.b;
        toolResult = { result: sum };
      } else {
        toolResult = { error: 'Unknown tool requested' };
      }

      // Automatically synthesize the final response based on the tool result
      const finalResponse = await ai.models.generateContent({
        model: targetModel,
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] },
          { role: 'model', parts: [modelPart] },
          { role: 'user', parts: [{ functionResponse: { name: call.name, response: toolResult } }] }
        ],
        config
      });

      return Response.json({
        response: `*(Tool executed: ${call.name})*\n\n${finalResponse.text}`,
        tool_executed: call.name,
        tool_result: toolResult,
        model: targetModel,
        modelLabel: tariff.modelLabel,
        tariff,
      });
    }

    // Standard text response
    return Response.json({
      response: response.text,
      model: targetModel,
      modelLabel: tariff.modelLabel,
      tariff,
    });

  } catch (error) {
    console.error('[Open-Dome Agent API]', error);
    return Response.json({
      status: "error",
      response: "AI Agent failed to execute.",
      details: error.message
    }, { status: 500 });
  }
}
