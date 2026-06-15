// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExitReportRegistry} from "../src/ExitReportRegistry.sol";

interface Vm {
    function envUint(string calldata name) external returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployExitReportRegistry {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (ExitReportRegistry registry) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        registry = new ExitReportRegistry();
        vm.stopBroadcast();
    }
}
