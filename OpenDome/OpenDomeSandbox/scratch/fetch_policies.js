async function fetchPolicies() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error('Set CIRCLE_API_KEY in the environment');
  }

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
  };

  const res = await fetch('https://api.circle.com/v1/w3s/policies', options);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

fetchPolicies().catch((err) => {
  console.error(err);
  process.exit(1);
});
