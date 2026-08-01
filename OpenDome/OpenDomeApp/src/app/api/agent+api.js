import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const bearerToken = process.env.BEDROCK_TOKEN;

    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'BEDROCK_TOKEN is missing in server environment.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize the official AWS Bedrock client with dummy credentials
    const config = {
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: "dummy",
        secretAccessKey: "dummy"
      }
    };

    // Intercept the HTTP request to forcefully inject the Bearer token
    const handler = new NodeHttpHandler();
    const originalHandle = handler.handle.bind(handler);
    handler.handle = async (request, options) => {
        request.headers["Authorization"] = `Bearer ${bearerToken}`;
        return originalHandle(request, options);
    };

    config.requestHandler = handler;
    const client = new BedrockRuntimeClient(config);

    // Use the uniform Converse API to avoid model-specific payload formats
    const command = new ConverseCommand({
      modelId: "us.meta.llama4-maverick-17b-instruct-v1:0",
      messages: [
        {
          role: "user",
          content: [{ text: prompt }]
        }
      ]
    });

    const response = await client.send(command);
    const textReply = response.output?.message?.content?.[0]?.text || "No response generated.";

    return new Response(JSON.stringify({ response: textReply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Open-Dome Agent API]', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
