export const getNFTsForNetwork = async (networkConfig, userAddress) => {
  // Deprecated, see scanAllNetworksForNFTs
  return [];
};

export const scanAllNetworksForNFTs = async (userAddress) => {
  if (!userAddress) return [];

  try {
    const response = await fetch(
      `/api/tickets?address=${encodeURIComponent(userAddress)}`
    );
    if (!response.ok) return [];

    const nfts = await response.json();
    return Array.isArray(nfts) ? nfts : [];
  } catch {
    return [];
  }
};
