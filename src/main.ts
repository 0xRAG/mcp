import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getMcpTools } from "@coinbase/agentkit-model-context-protocol";
import {
  AgentKit,
  ViemWalletProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import dotenv from "dotenv";
import { createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

dotenv.config();

async function main() {
  const walletClient = createWalletClient({
    account: privateKeyToAccount(generatePrivateKey()),
    transport: http(),
    chain: baseSepolia,
  });

  const walletProvider = new ViemWalletProvider(walletClient);

  const agentKit = await AgentKit.from({
    walletProvider,
    actionProviders: [walletActionProvider()],
  });

  const { tools, toolHandler } = await getMcpTools(agentKit);

  const server = new Server(
    {
      name: "agentkit",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return toolHandler(request.params.name, request.params.arguments);
    } catch (error) {
      throw new Error(`Tool ${name} failed: ${error}`);
    }
  });

  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch(console.error);
