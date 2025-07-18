import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { wormhole, Wormhole } from '@wormhole-foundation/sdk';
import solana from '@wormhole-foundation/sdk/solana';
import evm from '@wormhole-foundation/sdk/evm';

export default function App() {
  // State for wallets and form
  const [evmAddress, setEvmAddress] = useState('');
  const [solAddress, setSolAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [evmProvider, setEvmProvider] = useState(null);
  const [solWallet, setSolWallet] = useState(null);

  // Connect MetaMask
  const connectEvm = async () => {
    if (!window.ethereum) return alert('MetaMask not found');
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    setEvmAddress(await signer.getAddress());
    setEvmProvider(provider);
  };

  // Connect Phantom
  const connectSol = async () => {
    if (!window.solana) return alert('Phantom not found');
    const resp = await window.solana.connect();
    setSolAddress(resp.publicKey.toString());
    setSolWallet(window.solana);
  };

  // Handle bridging from EVM to Solana
  const bridge = async () => {
    setStatus('Initializing Wormhole...');
    // 1. Setup Wormhole SDK
    const wh = await wormhole('Testnet', [solana, evm]);
    const sendChain = wh.getChain('Avalanche'); // Change to your EVM testnet
    const rcvChain = wh.getChain('Solana');

    // 2. Get EVM signer
    const signer = await evm().getSigner(await sendChain.getRpc(), evmProvider);

    // 3. Get Solana recipient
    const solRecipient = solAddress;

    // 4. Prepare token transfer
    const tokenId = Wormhole.tokenId('Avalanche', 'native');
    const decimals = 18; // AVAX decimals
    const transferAmount = ethers.parseUnits(amount, decimals).toString();

    // 5. Build transfer
    setStatus('Building transfer...');
    const xfer = await wh.tokenTransfer(
      tokenId,
      transferAmount,
      Wormhole.chainAddress('Avalanche', evmAddress),
      Wormhole.chainAddress('Solana', solRecipient),
      false
    );

    // 6. Initiate transfer (signs with MetaMask)
    setStatus('Signing and sending EVM transaction...');
    const srcTxids = await xfer.initiateTransfer(signer);
    setStatus(`EVM tx sent: ${srcTxids}`);

    // 7. Wait for attestation
    setStatus('Waiting for attestation...');
    await xfer.fetchAttestation(5 * 60 * 1000);

    // 8. Complete transfer (signs with Phantom)
    setStatus('Completing on Solana...');
    const solConnection = new Connection('https://api.devnet.solana.com');
    const solSigner = {
      address: () => solRecipient,
      signAndSend: async (txs) => {
        // Sign and send each transaction with Phantom
        const results = [];
        for (const tx of txs) {
          tx.feePayer = new PublicKey(solRecipient);
          tx.recentBlockhash = (await solConnection.getLatestBlockhash()).blockhash;
          const signed = await solWallet.signTransaction(tx);
          const txid = await solConnection.sendRawTransaction(signed.serialize());
          results.push(txid);
        }
        return results;
      },
      chain: () => 'Solana',
    };
    const destTxids = await xfer.completeTransfer(solSigner);
    setStatus(`Bridge complete! Solana tx: ${destTxids}`);
  };

  return (
    <div style={{ maxWidth: 500, margin: 'auto', padding: 32 }}>
      <h2>Wormhole EVM ↔ Solana Bridge (Testnet)</h2>
      <button onClick={connectEvm}>
        {evmAddress ? `EVM Connected: ${evmAddress}` : 'Connect MetaMask'}
      </button>
      <br /><br />
      <button onClick={connectSol}>
        {solAddress ? `Solana Connected: ${solAddress}` : 'Connect Phantom'}
      </button>
      <br /><br />
      <input
        placeholder="Amount (e.g. 0.1)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <br /><br />
      <button
        onClick={bridge}
        disabled={!evmAddress || !solAddress || !amount}
      >
        Bridge from EVM to Solana
      </button>
      <br /><br />
      <div>Status: {status}</div>
    </div>
  );
}
