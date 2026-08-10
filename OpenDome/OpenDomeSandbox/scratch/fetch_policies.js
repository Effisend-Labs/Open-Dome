async function fetchPolicies() {
  const url = 'https://api.circle.com/v1/w3s/developer/transactions/policies'; // Wait, let me check the exact endpoint. 
  // Programmable Wallets Policies endpoint is: https://api.circle.com/v1/w3s/policies
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Bearer LIVE_API_KEY:53cce4ded3d2f66f68c47caae2061a2d:c888d50978d6b7bfe0eade6623d8d085'
    }
  };
  
  try {
    const res = await fetch('https://api.circle.com/v1/w3s/policies', options);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
fetchPolicies();
