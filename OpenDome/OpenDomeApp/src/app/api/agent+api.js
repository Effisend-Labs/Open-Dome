
import { GoogleGenAI } from '@google/genai';
import { createCircleAgentWallet, executeCircleNanoPayment } from '../../utilsAPI/circleTools';

/**
 * OpenDome AI Agent API (Vertex AI Implementation)
 * Uses the official @google/genai SDK for Gemini models.
 */

// Initialize GenAI Client for Vertex AI
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'project-cadf416c-23aa-4f9b-be6',
  location: 'global'
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
    }
  ]
}];

export async function POST(req) {
  try {
    const body = await req.json();
    const defaultPrompt = 'You are the OpenDome AI Agent. You manage MPC wallets using Circle. If asked, you can create a wallet or send nanopayments.';
    const userPrompt = body.prompt || body.message || defaultPrompt;

    const config = {
      tools: circleAgentTools,
      maxOutputTokens: 512,
      temperature: 0.7,
      systemInstruction: defaultPrompt
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config
    });
    
    // Check if Gemini wants to call a Circle tool
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      console.log(`Agent invoked tool: ${call.name}`, call.args);
      
      let toolResult = {};
      if (call.name === 'create_agent_wallet') {
        toolResult = await createCircleAgentWallet(call.args.blockchains);
      } else if (call.name === 'execute_nanopayment') {
        toolResult = await executeCircleNanoPayment(call.args);
      } else {
        toolResult = { error: 'Unknown tool requested' };
      }

      // Automatically synthesize the final response based on the tool result
      const finalResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] },
          { role: 'model', parts: [{ functionCall: call }] },
          { role: 'function', parts: [{ functionResponse: { name: call.name, response: toolResult } }] }
        ],
        config
      });

      return Response.json({
        response: finalResponse.text,
        tool_executed: call.name,
        tool_result: toolResult
      });
    }

    // Standard text response
    return Response.json({
      response: response.text
    });

  } catch (error) {
    console.error("AI Agent error:", error);
    return Response.json({
      status: "error",
      response: "AI Agent failed to execute.",
      details: "An internal error occurred."
    }, { status: 500 });
  }
}
