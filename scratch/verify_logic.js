import { hybridFusion } from '../src/utils/fusionLogic.js';

// Test case 1: SpO2 = 95 (should be HIGH)
const res1 = hybridFusion(0, 0, 95, 20, 10);
console.log('Test 1 (SpO2 95, Age 10):', res1.finalRisk, res1.reasoning);

// Test case 2: SpO2 = 96 (should be MEDIUM if Safe is 98)
const res2 = hybridFusion(0, 0, 96, 20, 10);
console.log('Test 2 (SpO2 96, Age 10):', res2.finalRisk, res2.reasoning);

// Test case 3: SpO2 = 98 (should be SAFE if BR is low)
const res3 = hybridFusion(0, 0, 98, 20, 10);
console.log('Test 3 (SpO2 98, Age 10):', res3.finalRisk, res3.reasoning);

// Test case 4: Age 10, BR = 28 (should be MEDIUM if Safe is 22)
const res4 = hybridFusion(0, 0, 99, 28, 10);
console.log('Test 4 (Age 10, BR 28):', res4.finalRisk, res4.reasoning);

// Test case 5: Age 5, BR = 28 (should be SAFE if Safe is 34)
const res5 = hybridFusion(0, 0, 99, 28, 5);
console.log('Test 5 (Age 5, BR 28):', res5.finalRisk, res5.reasoning);
