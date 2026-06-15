// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExitReportRegistry {
    struct ExitReport {
        address user;
        address asset;
        uint256 amountUsd;
        bytes32 reportHash;
        uint8 exitScore;
        uint256 timestamp;
    }

    uint256 public nextReportId;
    mapping(uint256 => ExitReport) public reports;

    event ExitReportSaved(
        uint256 indexed reportId,
        address indexed user,
        address indexed asset,
        uint256 amountUsd,
        bytes32 reportHash,
        uint8 exitScore,
        uint256 timestamp
    );

    function saveExitReport(
        address asset,
        uint256 amountUsd,
        bytes32 reportHash,
        uint8 exitScore
    ) external returns (uint256 reportId) {
        require(exitScore >= 1 && exitScore <= 5, "Invalid score");

        reportId = nextReportId++;

        reports[reportId] = ExitReport({
            user: msg.sender,
            asset: asset,
            amountUsd: amountUsd,
            reportHash: reportHash,
            exitScore: exitScore,
            timestamp: block.timestamp
        });

        emit ExitReportSaved(
            reportId,
            msg.sender,
            asset,
            amountUsd,
            reportHash,
            exitScore,
            block.timestamp
        );
    }
}
