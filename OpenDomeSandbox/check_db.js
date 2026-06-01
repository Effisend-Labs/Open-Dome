const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

async function check() {
  const res = await dynamo.send(new ScanCommand({
    TableName: 'Open-Dome-Users'
  }));
  
  const altagaRecords = res.Items.filter(i => 
    i.username === 'altaga' || 
    (typeof i.user === 'string' && i.user.includes('altaga')) ||
    (typeof i.passkey === 'string' && i.passkey.includes('altaga'))
  );
  
  console.log("Altaga Records:", JSON.stringify(altagaRecords, null, 2));
}

check().catch(console.error);
