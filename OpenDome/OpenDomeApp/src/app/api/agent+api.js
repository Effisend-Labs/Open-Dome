import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * OpenDomeApp agent — x402 challenge must work even if Gemini fails to load.
 * GenAI is lazy-initialized only after payment settles.
 */

/** Testing — skip USDC settlement without touching .env. Never for OpenAgent. */
const FORCE_SKIP_X402 = true;

const rateLimitStore = new Map();

const circleAgentTools = [
  {
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
              description: 'List of blockchains (e.g., ["ETH", "BASE", "MATIC"])',
            },
          },
          required: ['blockchains'],
        },
      },
      {
        name: 'execute_nanopayment',
        description: 'Executes a USDC payment via Circle.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'STRING' },
            destination: { type: 'STRING' },
            tokenId: { type: 'STRING' },
          },
          required: ['amount', 'destination', 'tokenId'],
        },
      },
    ],
  },
];

function ensureGcpCredentials() {
  const gcpCredsPath = path.join(os.tmpdir(), 'opendome-app-gcp-creds.json');
  if (!fs.existsSync(gcpCredsPath) && process.env.GCP_PRIVATE_KEY) {
    fs.writeFileSync(
      gcpCredsPath,
      JSON.stringify({
        type: 'service_account',
        project_id: process.env.GCP_PROJECT_ID,
        private_key_id: 'opendome-app-key',
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GCP_CLIENT_EMAIL,
        client_id: 'opendome-app-client',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_CLIENT_EMAIL || '')}`,
        universe_domain: 'googleapis.com',
      }),
    );
  }
  if (fs.existsSync(gcpCredsPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredsPath;
  }
}

let _ai = null;
async function getAI() {
  if (_ai) return _ai;
  ensureGcpCredentials();
  // Metro breaks google-auth-library when bundling @google/genai — load from Node.
  const { nodeRequire } = await import('../../utilsAPI/nodeRequire.js');
  const { GoogleGenAI } = nodeRequire('@google/genai');
  if (typeof GoogleGenAI !== 'function') {
    throw new Error('GoogleGenAI is not a constructor (Metro/nodeRequire mismatch)');
  }
  _ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID || 'project-cadf416c-23aa-4f9b-be6',
    location: 'global',
    httpOptions: { timeout: 60000 },
  });
  return _ai;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, payment-signature, x-payment-network',
    },
  });
}

export async function POST(req) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return Response.json({ error: 'JWT_SECRET is not set' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    let decoded = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      } catch (err) {
        console.error(`[Host Agent] JWT failed:`, err.message);
        return Response.json(
          { error: 'Unauthorized: Invalid or expired token' },
          { status: 401 },
        );
      }
    }

    const body = await req.json();
    const isOpenAgent = body.mode === 'openagent' || body.app === 'openagent';
    const defaultPrompt = isOpenAgent
      ? 'You are OpenAgent, a Gemini assistant inside OpenDome. Be helpful, concise, and accurate. Answer the user directly. Do not claim you charged a card or moved funds unless a tool actually ran.'
      : 'You are the OpenDome AI Agent. You manage MPC wallets using Circle. If asked, you can create a wallet or send nanopayments.';
    const userPrompt = body.prompt || body.message || defaultPrompt;

    if (userPrompt.length > 1000) {
      return Response.json(
        { error: 'Input too long: Maximum 1000 characters allowed.' },
        { status: 400 },
      );
    }

    if (decoded) {
      const now = Date.now();
      const recent = (rateLimitStore.get(decoded.userId) || []).filter(
        (ts) => now - ts < 60000,
      );
      if (recent.length >= 5) {
        return Response.json(
          { error: 'Rate limit exceeded: Maximum 5 requests per minute.' },
          { status: 429 },
        );
      }
      recent.push(now);
      rateLimitStore.set(decoded.userId, recent);
    }

    const { nodeRequire } = await import('../../utilsAPI/nodeRequire.js');
    const { quotePromptTariff } = nodeRequire('opendome/dist/agentTariff.js');
    const tariff = quotePromptTariff(userPrompt, body.modelId);
    const targetModel = tariff.apiModel;
    const modelLabel = tariff.modelLabel;
    const price = tariff.x402Amount;

    let paymentTxHash = null;

    // OpenAgent always settles x402. JWT must not skip the 402 challenge.
    const requireX402 = isOpenAgent || !decoded;
    if (requireX402) {
      const { OpenDomeSeller, OpenDomeFacilitator } = nodeRequire('opendome/dist/x402.js');
      const merchantAddress = process.env.MERCHANT_ADDRESS;
      if (!merchantAddress) {
        return Response.json({ error: 'MERCHANT_ADDRESS is not set' }, { status: 500 });
      }
      const seller = new OpenDomeSeller(merchantAddress);
      const paymentSignatureBase64 = req.headers.get('payment-signature');

      if (!paymentSignatureBase64) {
        return new Response(null, {
          status: 402,
          headers: { 'x402-challenge': seller.generateChallenge(price) },
        });
      }

      let parsedPayment;
      try {
        parsedPayment = seller.parseAndValidateSignature(
          paymentSignatureBase64,
          price,
        );
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }

      const skipRelay =
        !isOpenAgent && (FORCE_SKIP_X402 || process.env.OD_BYPASS_X402 === 'true');
      if (skipRelay) {
        console.warn('[Host Agent] SKIP_X402 — skip on-chain relay (code flag or env)');
      } else {
        const facilitator = new OpenDomeFacilitator(
          process.env.MERCHANT_PRIVATE_KEY,
        );
        try {
          paymentTxHash = await facilitator.verifyAndRelay(
            parsedPayment.payload,
            parsedPayment.signature,
          );
          console.log(`[Host Agent] x402 settled. Hash: ${paymentTxHash}`);
        } catch (err) {
          console.error('[Host Agent] Facilitator relay failed:', err.message);
          return Response.json({ error: err.message }, { status: 500 });
        }
      }

      if (!decoded) decoded = { userId: 'x402-user', username: 'x402 Payer' };
    }

    const ai = await getAI();
    const config = {
      tools: isOpenAgent ? undefined : circleAgentTools,
      temperature: 0.7,
      systemInstruction: defaultPrompt,
    };

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: userPrompt,
      config,
    });

    if (response.functionCalls?.length > 0) {
      const call = response.functionCalls[0];
      const modelPart = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.functionCall,
      );
      console.log(`[Host Agent] tool: ${call.name}`, call.args);

      const {
        createCircleAgentWallet,
        executeCircleNanoPayment,
      } = await import('../../utilsAPI/circleTools.js');

      let toolResult = {};
      if (call.name === 'create_agent_wallet') {
        toolResult = await createCircleAgentWallet(call.args.blockchains);
      } else if (call.name === 'execute_nanopayment') {
        toolResult = await executeCircleNanoPayment(call.args);
      } else {
        toolResult = { error: 'Unknown tool requested' };
      }

      const finalResponse = await ai.models.generateContent({
        model: targetModel,
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] },
          { role: 'model', parts: [modelPart || { functionCall: call }] },
          {
            role: 'user',
            parts: [
              {
                functionResponse: { name: call.name, response: toolResult },
              },
            ],
          },
        ],
        config,
      });

      return Response.json({
        response: `*(Tool executed: ${call.name})*\n\n${finalResponse.text}`,
        tool_executed: call.name,
        tool_result: toolResult,
        model: targetModel,
        modelLabel,
        tariff,
        paymentTxHash,
        explorerUrl: paymentTxHash
          ? `https://basescan.org/tx/${paymentTxHash}`
          : null,
      });
    }

    return Response.json({
      response: response.text,
      model: targetModel,
      modelLabel,
      tariff,
      paymentTxHash,
      explorerUrl: paymentTxHash
        ? `https://basescan.org/tx/${paymentTxHash}`
        : null,
    });
  } catch (error) {
    console.error('[Host Agent]', error);
    return Response.json(
      {
        status: 'error',
        response: 'AI Agent failed to execute.',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
