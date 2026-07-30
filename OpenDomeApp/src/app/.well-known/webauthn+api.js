export const GET = async () => {
  return Response.json({
    origins: [
      "https://opendome.expo.app",
      "https://opendomeos.expo.app"
    ]
  });
};
