import React, { useState } from "react";
import {
  Search,
  Eye,
  Edit,
  FileDown,
  FileSpreadsheet,
  PlusCircle,
  FileText,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { PDFExportService } from "../../services/PDFExportService";
import { ExcelExportService } from "../../services/ExcelExportService";

interface IProposalListViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  mode: "my" | "all";
  onNavigateToCreate: () => void;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange: (cerprno: string) => void;
}

export const ProposalListView: React.FC<IProposalListViewProps> = ({
  proposals,
  currentUser,
  mode,
  onNavigateToCreate,
  onNavigateToDisplay,
  onNavigateToChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProposals = proposals.filter((p) => {
    // Mode filter
    if (mode === "my") {
      const isOwner =
        p.owname.toLowerCase() === currentUser.name.toLowerCase() ||
        p.owner_email.toLowerCase() === currentUser.email.toLowerCase();
      if (!isOwner) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return p.cerprno.toLowerCase().includes(q) || p.pr_name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDownloadPDF = async (prop: ICERProposal) => {
    try {
      await PDFExportService.generateCERPdf(prop, []);
    } catch (e: any) {
      alert("Error generating PDF: " + e.message);
    }
  };

  const handleDownloadExcel = (prop: ICERProposal) => {
    try {
      ExcelExportService.exportSingleProposal(prop);
    } catch (e: any) {
      alert("Error generating Excel: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {mode === "my" ? "My CER Proposals" : "All Capital Expenditure Requests"}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === "my"
              ? "Proposals initiated by you, current approval statuses, and revisions"
              : "Enterprise-wide capital expenditure proposals across all Strategic Business Units"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter proposals..."
              className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white"
            />
          </div>

          {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
            <button
              onClick={onNavigateToCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create CER</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-4">Proposal No</th>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">SBU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Pending Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No proposals found.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {prop.cerprno}
                    </td>
                    <td
                      className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate"
                      title={prop.pr_name}
                    >
                      {prop.pr_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{prop.owname}</td>
                    <td className="py-3 px-3 text-slate-600">{prop.sbu}</td>
                    <td className="py-3 px-3">
                      <CategoryBadge category={prop.cat} />
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {prop.status === "Approved" ? (
                        <span className="text-emerald-700 font-semibold">Approved</span>
                      ) : (
                        `L${prop.current_level} - ${prop.pending_with_role}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNavigateToDisplay(prop.cerprno)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Display CER"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                          <button
                            onClick={() => onNavigateToChange(prop.cerprno)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Change CER"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPDF(prop)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadExcel(prop)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Download Excel"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
