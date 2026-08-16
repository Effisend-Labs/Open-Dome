export const GET = async () => {
  return Response.json({
    origins: [
      "https://sandbox.opendome.xyz",
      "https://app.opendome.xyz"
    ]
  });
};
