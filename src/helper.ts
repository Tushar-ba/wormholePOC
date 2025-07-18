import {
    ChainAddress,
    ChainContext,
    Network,
    Signer,
    Wormhole,
    Chain,
    isTokenId,
    TokenId,
  } from '@wormhole-foundation/sdk';
  import solana from '@wormhole-foundation/sdk/solana';
  import evm from '@wormhole-foundation/sdk/evm';
  
  /**
   * Returns a signer for the given chain using locally scoped credentials.
   * The required values (EVM_PRIVATE_KEY, SOL_PRIVATE_KEY) must
   * be loaded securely beforehand, for example via a keystore,
   * secrets manager, or environment variables (not recommended).
   */
  export async function getSigner<n c="" chain="" extends="" network,="">(
    chain: ChainContext<n, c="">
  ): Promise<{
    chain: ChainContext<n, c="">;
    signer: Signer<n, c="">;
    address: ChainAddress<c>;
  }> {
    let signer: Signer;
    const platform = chain.platform.utils()._platform;
  
    switch (platform) {
      case 'Evm':
        signer = await (
          await evm()
        ).getSigner(await chain.getRpc(), process.env.EVM_PRIVATE_KEY!);
        break;
      case 'Solana':
        signer = await (
          await solana()
        ).getSigner(await chain.getRpc(), process.env.SOL_PRIVATE_KEY!);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  
    return {
      chain,
      signer: signer as Signer<n, c="">,
      address: Wormhole.chainAddress(chain.chain, signer.address()),
    };
  }
  
  /**
   * Get the number of decimals for the token on the source chain.
   * This helps convert a user-friendly amount (e.g., '1') into raw units.
   */
  export async function getTokenDecimals<n extends="" network="">(
    wh: Wormhole<n>,
    token: TokenId,
    chain: ChainContext<n, any="">
  ): Promise<number> {
    return isTokenId(token)
      ? Number(await wh.getDecimals(token.chain, token.address))
      : chain.config.nativeTokenDecimals;
  }
  