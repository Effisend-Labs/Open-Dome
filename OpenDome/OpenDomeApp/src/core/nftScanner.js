export const getNFTsForNetwork = async (networkConfig, userAddress) => {
  // Deprecated, see scanAllNetworksForNFTs
  return [];
};

export const scanAllNetworksForNFTs = async (userAddress) => {
  if (!userAddress) return [];
  
  try {
    const response = await fetch(`http://localhost:3000/api/tickets?address=${userAddress}`);
    if (!response.ok) throw new Error('Failed to fetch from Server Bridge');
    
    const nfts = await response.json();
    return nfts || [];
  } catch (error) {
    console.error("[nftScanner] Error fetching tickets:", error);
    return [];
  }
};
