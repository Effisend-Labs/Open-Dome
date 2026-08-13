import { ethers } from 'ethers';

const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY;
const VALID_ADMIN_TOKEN =
  process.env.ADMIN_SCANNER_TOKEN || 'admin-session-token-123';
const DEFAULT_CONTRACT =
  process.env.CONTRACT_ADDRESS ||
  '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';

const RPC_URLS = {
  base: process.env.RPC_URL || 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
};

const MINT_ABI = [
  'function mint(address to, uint256 id, uint256 amount, bytes data) external',
  'function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data) external',
];

/**
 * Sandbox mint bridge for OpenDomeERC1155Pass.
 * POST { to, ids|tokenId, amounts|amount, network?, contractAddress? }
 * Authorization: Bearer ADMIN_SCANNER_TOKEN
 */
export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${VALID_ADMIN_TOKEN}`) {
      return Response.json({ message: 'Unauthorized mint access' }, { status: 401 });
    }

    if (!MERCHANT_PRIVATE_KEY) {
      return Response.json(
        { message: 'Merchant wallet not configured on sandbox' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      to,
      ids: rawIds,
      amounts: rawAmounts,
      tokenId,
      amount,
      network = 'base',
      contractAddress,
    } = body;

    if (!to) {
      return Response.json({ message: 'to (recipient address) is required' }, { status: 400 });
    }

    const ids =
      Array.isArray(rawIds) && rawIds.length
        ? rawIds
        : tokenId != null
          ? [tokenId]
          : null;
    const amounts =
      Array.isArray(rawAmounts) && rawAmounts.length
        ? rawAmounts
        : [amount != null ? amount : 1];

    if (!ids?.length) {
      return Response.json(
        { message: 'ids or tokenId is required' },
        { status: 400 }
      );
    }
    if (ids.length !== amounts.length) {
      return Response.json(
        { message: 'ids and amounts length mismatch' },
        { status: 400 }
      );
    }

    const chain = String(network).toLowerCase();
    const rpcUrl = RPC_URLS[chain];
    if (!rpcUrl) {
      return Response.json({ message: `Unsupported network: ${network}` }, { status: 400 });
    }

    const address = contractAddress || DEFAULT_CONTRACT;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(MERCHANT_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(address, MINT_ABI, wallet);

    let tx;
    if (ids.length === 1) {
      tx = await contract.mint(to, ids[0], amounts[0], '0x');
    } else {
      tx = await contract.mintBatch(to, ids, amounts, '0x');
    }
    const receipt = await tx.wait();

    try {
      const { assignTicketsAsPlatform } = await import('../../utilsAPI/ticketsDb.js');
      await assignTicketsAsPlatform(to, ids, amounts);
    } catch (indexErr) {
      console.warn('[Sandbox Mint API] Ticket assign failed:', indexErr.message);
    }

    return Response.json({
      success: true,
      txHash: receipt.hash,
      contractAddress: address,
      to,
      ids,
      amounts,
      signedBy: 'platform',
      message: 'Platform minted and assigned tickets',
    });
  } catch (error) {
    console.error('[Sandbox Mint API]', error);
    const errorMsg = error.reason || error.data?.message || error.message;
    return Response.json({ message: errorMsg }, { status: 500 });
  }
}
