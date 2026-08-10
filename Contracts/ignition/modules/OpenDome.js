import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("OpenDomeModule", (m) => {
  // Parameters for the constructor
  // Assuming the deployer is the default admin and initial scanner
  const defaultAdmin = m.getAccount(0);
  const initialScanner = m.getAccount(0);
  const uri = "ipfs://YOUR_BASE_URI_HERE/{id}.json";

  const pass = m.contract("OpenDomeERC1155Pass", [uri, defaultAdmin, initialScanner]);

  return { pass };
});
