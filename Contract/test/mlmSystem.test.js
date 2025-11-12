const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MLMSystem income flows", function () {
  const ENTRY_PRICE = ethers.parseUnits("20", 18);
  const RETOPUP_PRICE = ethers.parseUnits("40", 18);
  const DIRECT_INCOME = ethers.parseUnits("18", 18);
  const COMPANY_FEE = ethers.parseUnits("2", 18);
  const LEVEL_BPS = [3000n, 1500n, 1000n, 500n, 500n, 500n, 500n, 500n, 1000n, 1000n];

  let deployer;
  let company;
  let alice;
  let bob;
  let carol;
  let dave;
  let eve;
  let frank;
  let grace;
  let heidi;
  let ivan;
  let judy;
  let kim;
  let louis;
  let mallory;
  let nick;
  let olivia;
  let peggy;
  let quentin;
  let rita;

  let token;
  let mlm;
  let mlmAddress;
  let participants;

  beforeEach(async function () {
    [
      deployer,
      company,
      alice,
      bob,
      carol,
      dave,
      eve,
      frank,
      grace,
      heidi,
      ivan,
      judy,
      kim,
      louis,
      mallory,
      nick,
      olivia,
      peggy,
      quentin,
      rita,
    ] = await ethers.getSigners();

    participants = [
      alice,
      bob,
      carol,
      dave,
      eve,
      frank,
      grace,
      heidi,
      ivan,
      judy,
      kim,
      louis,
      mallory,
      nick,
      olivia,
      peggy,
      quentin,
      rita,
    ];

    const Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("Mock USDT", "mUSDT", deployer.address, 0n);
    await token.waitForDeployment();

    const MLM = await ethers.getContractFactory("MLMSystem");
    mlm = await MLM.deploy(await token.getAddress(), company.address);
    await mlm.waitForDeployment();
    mlmAddress = await mlm.getAddress();

    const fundAmount = ethers.parseUnits("100000", 18);
    for (const user of participants) {
      await token.mint(user.address, fundAmount);
      await token.connect(user).approve(mlmAddress, fundAmount);
    }
  });

  async function registerUser(user, referrer) {
    return mlm.connect(user).register(referrer.address);
  }

  async function registerChain(length, startIndex = 0) {
    const chain = [];
    let currentRef = company;
    for (let i = 0; i < length; i++) {
      const user = participants[startIndex + i];
      await registerUser(user, currentRef);
      chain.push(user);
      currentRef = user;
    }
    return chain;
  }

  async function triggerSecondReferral(referrer, first, second) {
    await registerUser(first, referrer);
    const tx = await registerUser(second, referrer);
    return { tx, autopoolUser: second };
  }

  describe("registration & direct income", function () {
    it("assigns sequential user IDs starting at 2", async function () {
      await registerUser(alice, company);
      await registerUser(bob, company);

      const aliceInfo = await mlm.getUserInfo(alice.address);
      const bobInfo = await mlm.getUserInfo(bob.address);

      expect(aliceInfo[0]).to.equal(2n);
      expect(bobInfo[0]).to.equal(3n);
    });

    it("reverts when referrer is inactive", async function () {
      await expect(registerUser(alice, bob)).to.be.revertedWith("Referrer not active");
    });

    it("prevents self referral", async function () {
      await expect(mlm.connect(alice).register(alice.address)).to.be.revertedWith(
        "Cannot refer yourself"
      );
    });

    it("rejects duplicate registrations", async function () {
      await registerUser(alice, company);
      await expect(registerUser(alice, company)).to.be.revertedWith("User already registered");
    });

    it("pays direct income and fee on first referral", async function () {
      const beforeBalance = await token.balanceOf(company.address);
      const tx = await registerUser(alice, company);

      await expect(tx)
        .to.emit(mlm, "DirectIncomeEarned")
        .withArgs(company.address, alice.address, DIRECT_INCOME);

      const afterBalance = await token.balanceOf(company.address);
      expect(afterBalance - beforeBalance).to.equal(DIRECT_INCOME + COMPANY_FEE);

      const companyInfo = await mlm.getUserInfo(company.address);
      expect(companyInfo[3]).to.equal(DIRECT_INCOME);
    });

    it("accumulates direct income across non-second referrals", async function () {
      await registerUser(alice, company);
      await registerUser(bob, company); // triggers auto pool, no direct income
      await registerUser(carol, company);

      const companyInfo = await mlm.getUserInfo(company.address);
      expect(companyInfo[3]).to.equal(DIRECT_INCOME * 2n);
    });

    it("does not transfer tokens to referrer on second referral", async function () {
      await registerUser(alice, company);
      const before = await token.balanceOf(company.address);
      await registerUser(bob, company);
      const after = await token.balanceOf(company.address);

      expect(after - before).to.equal(0n);
    });

    it("tracks referral counts correctly", async function () {
      await registerUser(alice, company);
      await registerUser(bob, company);
      await registerUser(carol, company);

      const companyInfo = await mlm.getUserInfo(company.address);
      expect(companyInfo[2]).to.equal(3n);
    });

    it("records referral ordering", async function () {
      await registerUser(alice, company);
      await registerUser(bob, company);
      await registerUser(carol, company);

      const referrals = await mlm.getUserReferrals(company.address, 3);
      expect(referrals).to.deep.equal([alice.address, bob.address, carol.address]);
    });

    it("exposes accurate user info snapshot", async function () {
      await registerUser(alice, company);
      const info = await mlm.getUserInfo(alice.address);

      expect(info[0]).to.equal(2n);
      expect(info[1]).to.equal(company.address);
      expect(info[2]).to.equal(0n);
      expect(info[6]).to.equal(true);
    });

    it("computes total earnings correctly", async function () {
      await registerUser(alice, company);
      await registerUser(bob, company);
      await registerUser(carol, company);

      await triggerSecondReferral(alice, dave, eve); // autopool child
      const { autopoolUser: frankUser } = await triggerSecondReferral(bob, frank, grace);
      await registerUser(heidi, frankUser); // first referral under autopool user
      await registerUser(ivan, frankUser); // second referral -> autopool payout to frankUser

      const chain = await registerChain(6, 9);
      const retopper = chain[5];
      await mlm.connect(retopper).retopup();

      const info = await mlm.getUserInfo(chain[2].address);
      const total = await mlm.getTotalEarnings(chain[2].address);

      expect(total).to.equal(info[3] + info[4] + info[5]);
    });

    it("emits UserRegistered with sequential IDs", async function () {
      await expect(registerUser(alice, company))
        .to.emit(mlm, "UserRegistered")
        .withArgs(alice.address, company.address, 2n);
      await expect(registerUser(bob, company))
        .to.emit(mlm, "UserRegistered")
        .withArgs(bob.address, company.address, 3n);
    });
  });

  describe("auto pool distribution", function () {
    beforeEach(async function () {
      await triggerSecondReferral(company, alice, bob); // bob becomes root level 1
    });

    it("places the second referral into pool level 1 as root", async function () {
      const node = await mlm.getPoolNode(bob.address, 1);
      expect(node.user).to.equal(bob.address);
      expect(node.poolLevel).to.equal(1n);
      expect(node.leftFilled).to.equal(false);
      expect(node.rightFilled).to.equal(false);
      expect(node.isComplete).to.equal(false);
    });

    it("keeps pool queue index at zero until first completion", async function () {
      const index = await mlm.poolQueueIndex(1);
      expect(index).to.equal(0n);
    });

    describe("with left child assigned", function () {
      beforeEach(async function () {
        await triggerSecondReferral(alice, carol, dave); // dave becomes left child of bob
      });

      it("fills left child before right", async function () {
        const parentNode = await mlm.getPoolNode(bob.address, 1);
        const childNode = await mlm.getPoolNode(dave.address, 1);

        expect(parentNode.left).to.equal(dave.address);
        expect(parentNode.leftFilled).to.equal(true);
        expect(parentNode.rightFilled).to.equal(false);
        expect(childNode.poolLevel).to.equal(1n);
      });

      it("does not complete parent until both children exist", async function () {
        const parentNode = await mlm.getPoolNode(bob.address, 1);
        expect(parentNode.isComplete).to.equal(false);
      });

      it("pays company fee and emits completion events when node closes", async function () {
        await registerUser(eve, bob);
        const before = await token.balanceOf(company.address);
        const tx = await registerUser(frank, bob);
        const after = await token.balanceOf(company.address);

        expect(after - before).to.equal(COMPANY_FEE);

        await expect(tx)
          .to.emit(mlm, "PoolCompleted")
          .withArgs(bob.address, 1n);
        await expect(tx)
          .to.emit(mlm, "PoolIncomeEarned")
          .withArgs(bob.address, 1n, DIRECT_INCOME);
      });

      describe("with right child assigned", function () {
        beforeEach(async function () {
          await registerUser(eve, bob);
          await registerUser(frank, bob);
        });

        it("marks parent node complete after both children fill", async function () {
          const node = await mlm.getPoolNode(bob.address, 1);
          expect(node.rightFilled).to.equal(true);
          expect(node.isComplete).to.equal(true);
        });

        it("credits pool income of 18 to the parent", async function () {
          const info = await mlm.getUserInfo(bob.address);
          expect(info[4]).to.equal(DIRECT_INCOME);
        });

        it("places the parent into pool level 2 as soon as level 1 completes", async function () {
          const node = await mlm.getPoolNode(bob.address, 2);
          expect(node.user).to.equal(bob.address);
          expect(node.poolLevel).to.equal(2n);
        });

        it("leaves the queue index pointing at the first parent (no advance until read)", async function () {
          await triggerSecondReferral(carol, grace, heidi);
          const index = await mlm.poolQueueIndex(1);
          expect(index).to.equal(0n);
        });

        describe("with subsequent completions", function () {
          beforeEach(async function () {
            await triggerSecondReferral(carol, grace, heidi); // fills left child of dave
            await triggerSecondReferral(dave, ivan, judy); // completes dave node
            await triggerSecondReferral(eve, kim, louis); // fills left child of frank
            await triggerSecondReferral(frank, mallory, nick); // completes frank node
          });

          it("assigns dave as left child of bob at level 2", async function () {
            const parentNode = await mlm.getPoolNode(bob.address, 2);
            expect(parentNode.left).to.equal(dave.address);
          });

          it("assigns frank as right child of bob at level 2", async function () {
            const parentNode = await mlm.getPoolNode(bob.address, 2);
            expect(parentNode.right).to.equal(frank.address);
          });

          it("credits pool income to each completed child once", async function () {
            const daveInfo = await mlm.getUserInfo(dave.address);
            const frankInfo = await mlm.getUserInfo(frank.address);

            expect(daveInfo[4]).to.equal(DIRECT_INCOME);
            expect(frankInfo[4]).to.equal(DIRECT_INCOME);
          });

          it("prevents double payout when node completes more than once", async function () {
            const before = await mlm.getUserInfo(dave.address);
            await triggerSecondReferral(heidi, olivia, peggy);
            const after = await mlm.getUserInfo(dave.address);

            expect(after[4]).to.equal(before[4]);
          });

          it("propagates company fee for each completion", async function () {
            const before = await token.balanceOf(company.address);
            await triggerSecondReferral(grace, olivia, peggy);
            const after = await token.balanceOf(company.address);

            expect(after - before).to.equal(COMPANY_FEE);
          });

          it("enqueues upgraded nodes for higher pool levels", async function () {
            const node = await mlm.getPoolNode(dave.address, 2);
            expect(node.user).to.equal(dave.address);
          });
        });
      });
    });
  });

  describe("retopup distribution", function () {
    LEVEL_BPS.forEach((bps, index) => {
      const level = index + 1;
      it(`allocates ${Number(bps) / 100}% to level ${level} upline when available`, async function () {
        const chain = await registerChain(level + 1);
        const retopper = chain[chain.length - 1];
        const recipientIndex = chain.length - 1 - level;
        const recipient = chain[recipientIndex];

        const before = await token.balanceOf(recipient.address);
        await mlm.connect(retopper).retopup();
        const after = await token.balanceOf(recipient.address);

        expect(after - before).to.equal((RETOPUP_PRICE * bps) / 10000n);
      });
    });

    it("stops distribution when company wallet encountered", async function () {
      await registerUser(alice, company);
      const before = await token.balanceOf(company.address);
      await mlm.connect(alice).retopup();
      const after = await token.balanceOf(company.address);

      expect(after - before).to.equal(RETOPUP_PRICE);
    });

    it("distributes to available uplines and sends remainder to company", async function () {
      const chain = await registerChain(4);
      const retopper = chain[chain.length - 1];
      const beforeBalances = await Promise.all(
        chain.map((user) => token.balanceOf(user.address))
      );
      const beforeCompany = await token.balanceOf(company.address);

      await mlm.connect(retopper).retopup();

      const afterBalances = await Promise.all(
        chain.map((user) => token.balanceOf(user.address))
      );
      const afterCompany = await token.balanceOf(company.address);

      let distributed = 0n;
      for (let level = 1; level < chain.length; level++) {
        const idx = chain.length - 1 - level;
        const expected = (RETOPUP_PRICE * LEVEL_BPS[level - 1]) / 10000n;
        expect(afterBalances[idx] - beforeBalances[idx]).to.equal(expected);
        distributed += expected;
      }

      expect(afterCompany - beforeCompany).to.equal(RETOPUP_PRICE - distributed);
    });

    it("increments retopup count for caller", async function () {
      await registerChain(3);
      const retopper = participants[2];
      await mlm.connect(retopper).retopup();
      const info = await mlm.getUserInfo(retopper.address);
      expect(info[7]).to.equal(1n);
    });

    it("emits LevelIncomeEarned events for each paid level", async function () {
      const chain = await registerChain(5);
      const retopper = chain[4];

      const tx = await mlm.connect(retopper).retopup();
      await expect(tx)
        .to.emit(mlm, "LevelIncomeEarned")
        .withArgs(chain[3].address, retopper.address, 1n, (RETOPUP_PRICE * LEVEL_BPS[0]) / 10000n);
    });

    it("updates level income aggregation", async function () {
      const chain = await registerChain(6);
      const retopper = chain[chain.length - 1];
      const targetLevel = 4;
      const recipientIndex = chain.length - 1 - targetLevel;
      const recipient = chain[recipientIndex];
      const expected = (RETOPUP_PRICE * LEVEL_BPS[targetLevel - 1]) / 10000n;

      await mlm.connect(retopper).retopup();
      const info = await mlm.getUserInfo(recipient.address);
      expect(info[5]).to.equal(expected);
    });

    it("allows repeated retopups and accumulates income", async function () {
      const chain = await registerChain(3);
      const retopper = chain[2];
      const recipient = chain[1];

      await mlm.connect(retopper).retopup();
      await mlm.connect(retopper).retopup();

      const info = await mlm.getUserInfo(recipient.address);
      expect(info[5]).to.equal(((RETOPUP_PRICE * LEVEL_BPS[0]) / 10000n) * 2n);
    });

    it("reverts retopup for inactive users", async function () {
      await expect(mlm.connect(alice).retopup()).to.be.revertedWith("User not registered");
    });
  });

  describe("view helpers", function () {
    it("returns empty referrals for users without downlines", async function () {
      await registerUser(alice, company);
      const referrals = await mlm.getUserReferrals(alice.address, 3);
      expect(referrals).to.deep.equal([ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress]);
    });

    it("returns default pool node for unplaced users", async function () {
      const node = await mlm.getPoolNode(alice.address, 1);
      expect(node.user).to.equal(ethers.ZeroAddress);
      expect(node.leftFilled).to.equal(false);
    });

    it("getTotalEarnings returns zero for inactive user", async function () {
      const total = await mlm.getTotalEarnings(alice.address);
      expect(total).to.equal(0n);
    });

    it("getUserInfo reflects company bootstrap state", async function () {
      const info = await mlm.getUserInfo(company.address);
      expect(info[0]).to.equal(1n);
      expect(info[6]).to.equal(true);
    });

    it("getUserReferrals obeys count parameter", async function () {
      await registerChain(5);
      const referrals = await mlm.getUserReferrals(participants[0].address, 2);
      expect(referrals.length).to.equal(2);
    });
  });

  describe("edge behaviours", function () {
    it("fails registration when allowance insufficient", async function () {
      await token.connect(alice).approve(mlmAddress, 0n);
      await expect(registerUser(alice, company)).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("propagates failure when retopup allowance missing", async function () {
      await registerUser(alice, company);
      await token.connect(alice).approve(mlmAddress, 0n);
      await expect(mlm.connect(alice).retopup()).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("does not allow users to re-enter auto pool without second referral", async function () {
      await registerUser(alice, company);
      await registerUser(bob, company);
      await registerUser(carol, company);

      const node = await mlm.getPoolNode(alice.address, 1);
      expect(node.user).to.equal(ethers.ZeroAddress);
    });

    it("leaves company earnings limited to fee when referral is not company", async function () {
      await registerUser(alice, company);
      const before = await token.balanceOf(company.address);
      await registerUser(bob, alice);
      const after = await token.balanceOf(company.address);
      expect(after - before).to.equal(COMPANY_FEE);
    });
  });
});

