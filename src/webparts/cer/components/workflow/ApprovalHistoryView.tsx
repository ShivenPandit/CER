import React, { useState, useEffect } from "react";
import { History, Search, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { IApprovalDecision } from "../../models/WorkflowModel";
import { ICERProposal } from "../../models/CERModel";
import { ICERDataService } from "../../services/ICERDataService";

interface IApprovalHistoryViewProps {
  dataService: ICERDataService;
  proposals: ICERProposal[];
  onNavigateToDisplay: (cerprno: string) => void;
}

export const ApprovalHistoryView: React.FC<IApprovalHistoryViewProps> = ({
  dataService,
  proposals,
  onNavigateToDisplay,
}) => {
  const [decisions, setDecisions] = useState<IApprovalDecision[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDecisions = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Gather decisions across proposals
      const results: IApprovalDecision[] = [];
      for (const p of proposals) {
        const decs = await dataService.getApprovalDecisions(p.cerprno);
        results.push(...decs);
      }
      // Sort newest first
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDecisions(results);
    } catch (e) {
      console.error("Error loading approval history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions().catch((e) => console.error(e));
  }, []);

  const filteredDecisions = decisions.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.cerprno.toLowerCase().includes(q) ||
      d.approver_name.toLowerCase().includes(q) ||
      d.level_name.toLowerCase().includes(q) ||
      d.comments.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Workflow Decision History & Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of all reviewer approvals, endorsements, and rejections
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by proposal or approver..."
            className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white w-64"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-4">Proposal No</th>
                <th className="py-3 px-4">Stage / Approval Level</th>
                <th className="py-3 px-3">Approver Name</th>
                <th className="py-3 px-3 text-center">Decision</th>
                <th className="py-3 px-4">Reviewer Comments</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDecisions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No approval decisions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredDecisions.map((dec) => {
                  const isApproved = dec.decision === "APPROVED";

                  return (
                    <tr
                      key={dec.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {dec.cerprno}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Level {dec.level_id}: {dec.level_name}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {dec.approver_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {dec.decision}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={dec.comments}>
                        "{dec.comments || "No comments"}"
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(dec.timestamp).toLocaleString("en-GB")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNavigateToDisplay(dec.cerprno)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Display Proposal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
