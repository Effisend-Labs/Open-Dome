/** Host returns { response, modelLabel, ... } — never render that object in <Text>. */
export function agentReplyText(res) {
  if (typeof res === 'string') return res;
  if (res && typeof res.response === 'string') return res.response;
  if (res?.data && typeof res.data.response === 'string') return res.data.response;
  return '';
}
