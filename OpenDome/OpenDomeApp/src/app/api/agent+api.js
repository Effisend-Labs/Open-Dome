import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { emitAiEvent } from '../../utilsAPI/aiTelemetry.js';
import { emitPlatformEvent } from '../../utilsAPI/platformTelemetry.js';

/**
 * OpenDomeApp agent — x402 challenge must work even if Gemini fails to load.
 * GenAI is lazy-initialized only after payment settles.
 */

const rateLimitStore = new Map();

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
  const startedAt = Date.now();
  let telemetry = { intent: 'agent:error', user_input: '', network: null };

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
    const { nodeRequire } = await import('../../utilsAPI/nodeRequire.js');
    const skills = nodeRequire('opendome/dist/agentSkills.js');
    const { OPEN_AGENT_SYSTEM_PROMPT, buildOpenAgentContents } = nodeRequire(
      'opendome/dist/openAgentPrompt.js',
    );
    const mode = skills.resolveAgentMode(body);
    const isOpenAgent = mode === 'openagent';
    const defaultPrompt =
      mode === 'openagent'
        ? OPEN_AGENT_SYSTEM_PROMPT
        : mode === 'wallet'
          ? skills.WALLET_CIRCLE_PROMPT
          : skills.DOME_CONSULTANT_PROMPT;
    const userPrompt = body.prompt || body.message || defaultPrompt;
    telemetry = {
      intent: `${mode}:chat`,
      user_input: userPrompt,
      network: null,
    };

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

    const { quotePromptTariff } = nodeRequire('opendome/dist/agentTariff.js');
    const tariff = quotePromptTariff(userPrompt, body.modelId);
    const targetModel = tariff.apiModel;
    const modelLabel = tariff.modelLabel;
    const price = tariff.x402Amount;

    let paymentTxHash = null;
    let paymentChain = null;

    // Per-prompt x402 is OpenAgent only. Dome consultant and Wallet Circle chat are free.
    if (isOpenAgent) {
      const {
        OpenDomeSeller,
        resolveX402PaymentNetwork,
        explorerTxUrl,
        OpenDomeFacilitator,
        resolveUsdcRpcUrls,
      } = nodeRequire('opendome/dist/x402.js');

      let cfg;
      try {
        cfg = resolveX402PaymentNetwork(
          req.headers.get('x-payment-network') || 'base',
        );
      } catch (err) {
        return Response.json(
          { error: err.message },
          { status: err.status || 400 },
        );
      }
      paymentChain = cfg;

      const payTo =
        cfg.key === 'SOL'
          ? process.env.MERCHANT_SOLANA_ADDRESS
          : process.env.MERCHANT_ADDRESS;
      if (!payTo) {
        return Response.json(
          {
            error:
              cfg.key === 'SOL'
                ? 'MERCHANT_SOLANA_ADDRESS is not set'
                : 'MERCHANT_ADDRESS is not set',
          },
          { status: 500 },
        );
      }

      const seller = new OpenDomeSeller(payTo);
      const paymentSignatureBase64 = req.headers.get('payment-signature');

      if (!paymentSignatureBase64) {
        return new Response(null, {
          status: 402,
          headers: {
            'x402-challenge': seller.generateChallenge(price, {
              chain: cfg.key,
              payTo,
              asset: cfg.usdc,
            }),
          },
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

      if (parsedPayment.scheme === 'solana-circle') {
        paymentTxHash = parsedPayment.transactionId;
        console.log(`[Host Agent] x402 Solana settled. Id: ${paymentTxHash}`);
      } else {
        if (!process.env.MERCHANT_PRIVATE_KEY) {
          return Response.json(
            { error: 'MERCHANT_PRIVATE_KEY is not set' },
            { status: 500 },
          );
        }
        const facilitator = new OpenDomeFacilitator(
          process.env.MERCHANT_PRIVATE_KEY,
          {
            chain: cfg.key,
            rpcUrls: resolveUsdcRpcUrls(cfg),
            usdc: cfg.usdc,
          },
        );
        try {
          paymentTxHash = await facilitator.verifyAndRelay(
            parsedPayment.payload,
            parsedPayment.signature,
          );
          console.log(
            `[Host Agent] x402 settled on ${cfg.key}. Hash: ${paymentTxHash}`,
          );
        } catch (err) {
          console.error('[Host Agent] Facilitator relay failed:', err.message);
          return Response.json({ error: err.message }, { status: 500 });
        }
      }

      if (!decoded) decoded = { userId: 'x402-user', username: 'x402 Payer' };
      telemetry.network = cfg.key || null;
      emitPlatformEvent({
        event_type: 'x402_payment',
        status: 'ok',
        network: cfg.key,
        amount_usdc: Number(price) || 0,
        latency_ms: Date.now() - startedAt,
      });
    }

    const ai = await getAI();
    const tools =
      mode === 'openagent'
        ? skills.GOOGLE_SEARCH_TOOLS
        : mode === 'wallet'
          ? skills.WALLET_CIRCLE_TOOLS
          : skills.DOME_CONSULTANT_TOOLS;
    const config = {
      tools,
      temperature: 0.7,
      systemInstruction: defaultPrompt,
    };

    const geminiContents = buildOpenAgentContents(userPrompt, body.messages);
    const { geminiText, runGeminiWithTools } = await import(
      '../../utilsAPI/geminiToolLoop.js'
    );

    if (mode !== 'openagent') {
      let circleCtx = {};
      if (mode === 'wallet' && decoded?.userId) {
        const { Wallets } = await import('../../utilsAPI/passkeyDb.js');
        const snap = await Wallets.doc(decoded.userId).get();
        const walletData = snap.exists ? snap.data() || {} : {};
        const ids = walletData.walletIds || {};
        circleCtx = {
          walletId: ids.BASE || ids.ETH || walletData.evm?.id || null,
          solWalletId: ids.SOL || ids.SOLANA || null,
          walletIds: ids,
          solanaAddress:
            walletData.solanaAddress ||
            walletData.sol?.address ||
            null,
        };
      }

      const { runCircleAgentTool } = await import(
        '../../utilsAPI/circleAgentRuntime.js'
      );
      const ran = await runGeminiWithTools({
        ai,
        model: targetModel,
        config,
        contents: geminiContents,
        executeTool: async (name, args) => {
          console.log(`[Host Agent] tool: ${name}`, args);
          if (mode === 'dome') return skills.runDomeConsultantTool(name, args);
          return runCircleAgentTool(name, args, circleCtx);
        },
      });

      const solanaPay =
        ran.lastResult?.payment_url && ran.lastResult?.reference
          ? {
              payment_url: ran.lastResult.payment_url,
              reference: ran.lastResult.reference,
              amount: ran.lastResult.amount || null,
              recipient: ran.lastResult.recipient || null,
            }
          : null;

      const toolName = ran.tools?.[0] || null;
      emitAiEvent({
        intent: toolName ? `${mode}:${toolName}` : `${mode}:chat`,
        confidence: toolName ? 0.92 : 0.7,
        user_input: userPrompt,
        latency_ms: Date.now() - startedAt,
        network: paymentChain?.key || telemetry.network,
        model: targetModel,
        model_label: modelLabel,
      });

      return Response.json({
        response: ran.text || 'No response from the agent.',
        tool_executed: ran.tools?.[0] || null,
        tools: ran.tools,
        model: targetModel,
        modelLabel,
        tariff,
        paymentTxHash,
        paymentNetwork: paymentChain?.key || null,
        explorerUrl: paymentTxHash
          ? (paymentChain
              ? nodeRequire('opendome/dist/x402.js').explorerTxUrl(
                  paymentChain,
                  paymentTxHash,
                )
              : `https://basescan.org/tx/${paymentTxHash}`)
          : null,
        ...(solanaPay ? { extra: { solana_pay: solanaPay } } : {}),
      });
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: geminiContents,
      config,
    });

    const { explorerTxUrl } = nodeRequire('opendome/dist/x402.js');
    const grounded = Boolean(response.candidates?.[0]?.groundingMetadata);
    emitAiEvent({
      intent: grounded ? 'openagent:search' : 'openagent:chat',
      confidence: grounded ? 0.88 : 0.7,
      user_input: userPrompt,
      latency_ms: Date.now() - startedAt,
      network: paymentChain?.key || telemetry.network,
      model: targetModel,
      model_label: modelLabel,
    });
    return Response.json({
      response: geminiText(response) || response.text,
      model: targetModel,
      modelLabel,
      tariff,
      paymentTxHash,
      paymentNetwork: paymentChain?.key || null,
      explorerUrl: paymentTxHash
        ? explorerTxUrl(paymentChain || 'BASE', paymentTxHash)
        : null,
    });
  } catch (error) {
    console.error('[Host Agent]', error);
    emitAiEvent({
      intent: telemetry.intent || 'agent:error',
      confidence: 0,
      user_input: telemetry.user_input,
      latency_ms: Date.now() - startedAt,
      network: telemetry.network,
      model: 'unknown',
    });
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
