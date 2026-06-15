# ExitIQ Contracts

Foundry workspace for the ExitIQ report registry.

## Mantle Mainnet

- RPC: `https://rpc.mantle.xyz`
- Chain ID: `5000`
- Deployed `ExitReportRegistry`: [`0x160493BC227713b256344E382f02d2adbFD0555e`](https://explorer.mantle.xyz/address/0x160493BC227713b256344E382f02d2adbFD0555e)

## Compile

```bash
forge build
```

## Deploy

Set the deployer key in your shell, then broadcast the script from this `contracts` folder:

```bash
export PRIVATE_KEY=0x...
forge script script/DeployExitReportRegistry.s.sol:DeployExitReportRegistry \
  --rpc-url mantle_mainnet \
  --chain-id 5000 \
  --broadcast
```

PowerShell:

```powershell
$env:PRIVATE_KEY="0x..."
forge script script/DeployExitReportRegistry.s.sol:DeployExitReportRegistry `
  --rpc-url mantle_mainnet `
  --chain-id 5000 `
  --broadcast
```
