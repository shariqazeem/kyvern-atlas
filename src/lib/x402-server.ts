import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

import type { Network } from "@x402/core/types";

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
const NETWORK: Network = (process.env.X402_NETWORK || "eip155:8453") as Network;

let _facilitator: HTTPFacilitatorClient | null = null;
let _server: x402ResourceServer | null = null;

export function getFacilitator(): HTTPFacilitatorClient {
  if (!_facilitator) {
    _facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
  }
  return _facilitator;
}

export function getResourceServer(): x402ResourceServer {
  if (!_server) {
    _server = new x402ResourceServer(getFacilitator());
    _server.register(NETWORK, new ExactEvmScheme());
  }
  return _server;
}

export function getPayToAddress(): string {
  return process.env.X402_PAYTO_ADDRESS || "0x0000000000000000000000000000000000000000";
}

export function getNetwork(): Network {
  return NETWORK;
}
