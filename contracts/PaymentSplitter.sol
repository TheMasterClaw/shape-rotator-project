// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AgentPaymentSplitter
 * @notice Handles automatic payment distribution to task participants
 */
contract AgentPaymentSplitter is Ownable(msg.sender) {
    
    struct Split {
        bytes32 taskId;
        address[] payees;
        uint256[] shares;
        uint256 totalShares;
        uint256 totalReleased;
        bool isERC20;
        address token;
    }
    
    mapping(bytes32 => Split) public splits;
    mapping(bytes32 => mapping(address => uint256)) public released;
    
    event SplitCreated(bytes32 indexed taskId, address[] payees, uint256[] shares);
    event PaymentReleased(bytes32 indexed taskId, address indexed payee, uint256 amount);
    event ERC20PaymentReleased(bytes32 indexed taskId, address indexed payee, address indexed token, uint256 amount);
    
    function createSplit(
        bytes32 taskId,
        address[] memory payees,
        uint256[] memory shares,
        bool isERC20,
        address token
    ) external payable onlyOwner {
        require(payees.length == shares.length, "Payees and shares length mismatch");
        require(payees.length > 0, "No payees");
        
        uint256 totalShares = 0;
        for (uint i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        
        if (!isERC20) {
            require(msg.value > 0, "No ETH sent");
        }
        
        splits[taskId] = Split({
            taskId: taskId,
            payees: payees,
            shares: shares,
            totalShares: totalShares,
            totalReleased: 0,
            isERC20: isERC20,
            token: token
        });
        
        emit SplitCreated(taskId, payees, shares);
    }
    
    function release(bytes32 taskId, address payable payee) external {
        Split storage split = splits[taskId];
        require(split.payees.length > 0, "Split does not exist");
        
        uint256 payeeIndex = findPayeeIndex(taskId, payee);
        require(payeeIndex < split.payees.length, "Not a payee");
        
        uint256 totalReceived = split.isERC20 ? 
            IERC20(split.token).balanceOf(address(this)) + split.totalReleased :
            address(this).balance + split.totalReleased;
        
        uint256 payment = (totalReceived * split.shares[payeeIndex]) / split.totalShares - released[taskId][payee];
        require(payment > 0, "No payment due");
        
        released[taskId][payee] += payment;
        split.totalReleased += payment;
        
        if (split.isERC20) {
            IERC20(split.token).transfer(payee, payment);
            emit ERC20PaymentReleased(taskId, payee, split.token, payment);
        } else {
            payee.transfer(payment);
            emit PaymentReleased(taskId, payee, payment);
        }
    }
    
    function findPayeeIndex(bytes32 taskId, address payee) internal view returns (uint256) {
        Split storage split = splits[taskId];
        for (uint i = 0; i < split.payees.length; i++) {
            if (split.payees[i] == payee) {
                return i;
            }
        }
        return split.payees.length; // Return out of bounds if not found
    }
    
    function pendingPayment(bytes32 taskId, address payee) external view returns (uint256) {
        Split storage split = splits[taskId];
        if (split.payees.length == 0) return 0;
        
        uint256 payeeIndex = findPayeeIndex(taskId, payee);
        if (payeeIndex >= split.payees.length) return 0;
        
        uint256 totalReceived = split.isERC20 ? 
            IERC20(split.token).balanceOf(address(this)) + split.totalReleased :
            address(this).balance + split.totalReleased;
        
        return (totalReceived * split.shares[payeeIndex]) / split.totalShares - released[taskId][payee];
    }
    
    function getSplit(bytes32 taskId) external view returns (Split memory) {
        return splits[taskId];
    }
}
