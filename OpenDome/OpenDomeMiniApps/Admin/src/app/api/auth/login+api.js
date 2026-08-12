/** Password login disabled — Admin is an OpenDome mini-app for @altaga only. */
export async function POST() {
  return Response.json(
    {
      error:
        'Password login disabled. Open Admin from OpenDome while signed in as @altaga (god).',
    },
    { status: 410 }
  );
}
