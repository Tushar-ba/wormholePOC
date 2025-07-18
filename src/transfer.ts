import { wormhole, amount, Wormhole } from '@wormhole-foundation/sdk';
import solana from '@wormhole-foundation/sdk/solana';
import evm from '@wormhole-foundation/sdk/evm';
import { getSigner, getTokenDecimals } from './helper';

// ======= USER CONFIGURATION =======
// Set your source and destination chains here
const sourceChainName = 'Avalanche'; // e.g., 'Avalanche', 'Polygon', 'Base', 'Solana'
const destChainName = 'Solana';      // e.g., 'Solana', 'Avalanche', 'Polygon', 'Base'
// ===================================

(async function () {
  // Initialize Wormhole SDK for EVM and Solana on Testnet
  const wh = await wormhole('Testnet', [solana, evm]);

  // Get chain contexts
  const sendChain = wh.getChain(sourceChainName);
  const rcvChain = wh.getChain(destChainName);

  // Load signers and addresses for both chains
  const source = await getSigner(sendChain);
  const destination = await getSigner(rcvChain);

  // Define the token and amount to transfer
  // 'native' means native asset (ETH, AVAX, etc. on EVM; SOL on Solana)
  const tokenId = Wormhole.tokenId(sourceChainName, 'native');
  const amt = '0.1'; // Amount as a string

  // Convert to raw units based on token decimals
  const decimals = await getTokenDecimals(wh, tokenId, sendChain);
  const transferAmount = amount.units(amount.parse(amt, decimals));

  // Set to false to require manual approval steps (recommended for testnet/devnet)
  const automatic = false;
  const nativeGas = automatic ? amount.units(amount.parse('0.0', 6)) : 0n;

  // Construct the transfer object
  const xfer = await wh.tokenTransfer(
    tokenId,
    transferAmount,
    source.address,
    destination.address,
    automatic,
    undefined,
    nativeGas
  );

  // Initiate the transfer from the source chain
  console.log('Starting Transfer');
  const srcTxids = await xfer.initiateTransfer(source.signer);
  console.log(`Started Transfer: `, srcTxids);

  // Wait for the signed attestation from the Guardian network
  console.log('Fetching Attestation');
  const timeout = 5 * 60 * 1000; // 5 minutes
  await xfer.fetchAttestation(timeout);

  // Redeem the tokens on the destination chain
  console.log('Completing Transfer');
  const destTxids = await xfer.completeTransfer(destination.signer);
  console.log(`Completed Transfer: `, destTxids);

  process.exit(0);
})();
