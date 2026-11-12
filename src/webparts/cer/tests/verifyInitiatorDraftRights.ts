import assert from "assert";
import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";
import { PermissionService } from "../services/PermissionService";
import { IAppUser } from "../models/UserModel";

async function runInitiatorRightsTests(): Promise<void> {
  console.log("================================================================================");
  console.log(" VERIFY INITIATOR DRAFT EDITING & RESUBMISSION RIGHTS");
  console.log("================================================================================");

  const service = new LocalMockCERDataService();

  const priyaUser: IAppUser = {
    id: 101,
    name: "Priya Kalekar (STL Digital)",
    email: "priya.kalekar@cairnindia.com",
    loginName: "70004733@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };

  const shivenOwner = {
    name: "Shiven Pandit (Microlink)",
    email: "shiven.pandit@microlink.com",
  };

  const strangerUser = {
    name: "Unknown Stranger",
    email: "stranger@external.com",
  };

  // 1. Create a draft proposal initiated by Priya with Shiven as CER Owner
  const draftPayload: Partial<ICERProposal> = {
    pr_name: "testing new build",
    proposal_no: "PR-2026/00099",
    sbu: "RJ North",
    cat: "Vital",
    owname: shivenOwner.name,
    owner_email: shivenOwner.email,
    created_by: priyaUser.name,
    created_by_email: priyaUser.email,
    amount: 10,
    currency: "USD",
    status: "Draft",
    current_level: 0,
    object: "testing draft rights",
    payable: "Payback",
    st_date: "2026-11-03",
    com_date: "2026-11-27",
    cbudget: "Yes",
    jv: "No",
  };

  const createdDraft = await service.createProposal(draftPayload as ICERProposal);
  assert(createdDraft.success, "Draft proposal created successfully");
  const draft = createdDraft.proposal;
  console.log(`✔ [PASS] Draft created: ${draft.cerprno} (Initiator: ${draft.created_by}, Owner: ${draft.owname})`);

  // 2. Client-side PermissionService.canEditCER check for Priya
  const canEditResult = PermissionService.canEditCER(draft, priyaUser);
  assert(canEditResult.allowed === true, `PermissionService permits Priya to edit her draft: ${canEditResult.reason || ""}`);
  console.log("✔ [PASS] Client PermissionService.canEditCER allows Initiator to edit draft");

  // 3. Service-side updateProposal by Priya (Initiator != Owner)
  const updatedDraftPayload: ICERProposal = {
    ...draft,
    amount: 25,
    object: "Updated by Priya (Initiator)",
  };

  let updateSuccess = false;
  try {
    const updateRes = await service.updateProposal(
      updatedDraftPayload,
      { name: priyaUser.name, email: priyaUser.email },
      draft
    );
    updateSuccess = updateRes.success;
  } catch (err: any) {
    console.error("Failed to update draft:", err.message);
  }
  assert(updateSuccess === true, "Initiator Priya Kalekar successfully saved draft without CER Owner mismatch error");
  console.log("✔ [PASS] Service updateProposal succeeds when Initiator edits draft with different CER Owner");

  // 4. Stranger attempting to modify the proposal is blocked
  let strangerBlocked = false;
  try {
    await service.updateProposal(
      { ...updatedDraftPayload, amount: 999 },
      strangerUser,
      draft
    );
  } catch (err: any) {
    strangerBlocked = true;
    assert(err.message.includes("Only the proposal Initiator"), `Appropriate error message thrown: ${err.message}`);
  }
  assert(strangerBlocked === true, "Unrelated user is strictly blocked from modifying proposal");
  console.log("✔ [PASS] Unrelated 3rd party is strictly blocked from updating draft");

  // 5. Submit the draft into "In Approval" workflow
  const submitRes = await service.updateProposal(
    { ...updatedDraftPayload, status: "In Approval", current_level: 1 },
    { name: priyaUser.name, email: priyaUser.email },
    draft
  );
  assert(submitRes.success, "Draft submitted successfully into approval workflow");
  console.log("✔ [PASS] Initiator successfully submits draft into approval workflow");

  console.log("\n================================================================================");
  console.log(" ALL INITIATOR RIGHTS VERIFICATION TESTS PASSED (5/5)!");
  console.log("================================================================================");
}

runInitiatorRightsTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

