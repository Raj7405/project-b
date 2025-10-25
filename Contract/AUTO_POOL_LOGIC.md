# Auto Pool Logic - Clarification Document

## ✅ CORRECTED Logic (Current Implementation)

### The Rule:
**When a user gets their 2nd sponsor, THAT USER enters the Auto Pool (not the sponsor)**

---

## 📊 Example Scenario

### Setup:
- Company (ID: 1) is the root
- Alice (ID: 2) registers under Company

### Flow:

#### Step 1: Alice's First Sponsor (Bob)
```
Action: Bob registers under Alice
Payment: Bob pays $20
Distribution:
  - Alice receives: $18 (90%)
  - Company receives: $2 (10%)
Result: Alice's sponsor count = 1
Auto Pool: Nothing happens yet
```

#### Step 2: Alice's Second Sponsor (Carol)
```
Action: Carol registers under Alice  
Payment: Carol pays $20
Distribution:
  - Alice receives: $18 (90%)
  - Company receives: $2 (10%)
Result: Alice's sponsor count = 2
Auto Pool: ⭐ ALICE ENTERS THE AUTO POOL ⭐ (not Carol!)
```

#### Step 3: Alice's Third Sponsor (Dave)
```
Action: Dave registers under Alice
Payment: Dave pays $20
Distribution:
  - Alice receives: $18 (90%)
  - Company receives: $2 (10%)
Result: Alice's sponsor count = 3
Auto Pool: Nothing happens (Alice already in pool)
```

---

## 🎯 Key Points

### ✅ What Happens:
1. **Payment ALWAYS occurs**: Every registration pays $18 to parent and $2 to company
2. **Parent enters pool**: When reaching 2 sponsors, the PARENT (not the 2nd sponsor) enters Auto Pool
3. **Continues normally**: 3rd, 4th, 5th+ sponsors all pay normally

### ❌ What DOESN'T Happen:
1. ❌ The 2nd sponsor does NOT enter the pool
2. ❌ Payment is NOT withheld on 2nd sponsor
3. ❌ The $20 is NOT "reserved" for the pool

---

## 🔄 Visual Tree Example

```
Initial State:
    Company(1)
        |
      Alice(2)

After Bob joins (1st sponsor):
    Company(1)
        |
      Alice(2)
        |
      Bob(3)
    
    Alice's sponsors: 1
    Auto Pool: []

After Carol joins (2nd sponsor):
    Company(1)
        |
      Alice(2)
       / \
    Bob(3) Carol(4)
    
    Alice's sponsors: 2
    Auto Pool: [Alice(2)] ← Alice enters!

After Dave joins (3rd sponsor):
    Company(1)
        |
      Alice(2)
       /  |  \
    Bob Carol Dave
    
    Alice's sponsors: 3
    Auto Pool: [Alice(2)] ← unchanged
```

---

## 💰 Payment Flow Summary

| Event | Who Pays | Alice Gets | Company Gets | Who Enters Pool |
|-------|----------|------------|--------------|----------------|
| Bob joins Alice (1st) | Bob: $20 | $18 | $2 | Nobody |
| Carol joins Alice (2nd) | Carol: $20 | $18 | $2 | **Alice** |
| Dave joins Alice (3rd) | Dave: $20 | $18 | $2 | Nobody |
| Eve joins Alice (4th) | Eve: $20 | $18 | $2 | Nobody |

---

## 🧪 Test Verification

The following tests verify this logic:

1. **Test: "should send parent (Alice) to Auto Pool when they get second sponsor"**
   - Verifies Alice receives payment ($18)
   - Verifies company receives fee ($2)
   - Verifies pool queue increases
   - Verifies Alice's sponsor count = 2

2. **Test: "should correctly identify which user enters the pool"**
   - Verifies AutoPoolEnqueued event is emitted
   - Verifies the event contains Alice's ID (not Carol's)
   - Verifies the event contains Alice's wallet address

---

## 🔧 Technical Implementation

### In `register()` function:

```solidity
// 1. Payment ALWAYS happens first
uint256 companyFee = (packageAmount * 10) / 100; // $2
uint256 parentShare = packageAmount - companyFee; // $18
token.safeTransfer(parentWallet, parentShare);
token.safeTransfer(companyWallet, companyFee);

// 2. Check if parent reached 2 sponsors
if (users[referrerId].sponsorCount == 2) {
    // PARENT (referrerId) enters Auto Pool, not the new sponsor
    poolQueue.push(referrerId); // Push parent's ID
    emit AutoPoolEnqueued(referrerId, parentWallet);
}
```

---

## 📝 Event Logs

When Carol (2nd sponsor) registers under Alice:

```javascript
✅ Event: DirectIncomePaid(aliceId, aliceWallet, $18)
✅ Event: CompanyFeePaid(companyWallet, $2)
✅ Event: AutoPoolEnqueued(aliceId, aliceWallet) // ← Alice, not Carol!
✅ Event: UserRegistered(carolId, carolWallet, aliceId, true) // parentWentToPool=true
```

---

## 🎓 Why This Makes Sense

This structure incentivizes users to:
1. **Build a team**: You need 2 sponsors to qualify for Auto Pool
2. **Earn while qualifying**: You still earn $18 from each sponsor
3. **Get pool benefits**: Once in the pool, you can receive additional pool distributions
4. **Continue earning**: After entering pool, you continue earning from all future sponsors

---

## ✅ Verification Checklist

- [x] Payment happens on every registration ($18 + $2 split)
- [x] Parent enters pool when reaching 2 sponsors (not the 2nd sponsor)
- [x] AutoPoolEnqueued event logs the parent's ID
- [x] Pool queue contains parent's user ID
- [x] Tests verify the correct user enters the pool
- [x] Documentation updated to reflect corrected logic

---

**Date Updated:** October 20, 2025  
**Status:** ✅ Implemented and Tested

