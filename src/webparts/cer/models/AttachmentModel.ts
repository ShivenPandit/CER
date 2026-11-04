export interface ICERAttachment {
  id: string;
  cerprno: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type or extension
  data_url?: string; // Base64 or SharePoint server relative URL
  uploaded_by: string;
  uploaded_date: string;
  server_relative_url?: string; // Verified server-relative URL in SharePoint
  sp_file_id?: string; // Stable SharePoint identifier
  version_tag?: string; // e.g. "V1", "V2"
  proposal_no?: string; // e.g. "PR-2026/08"
  is_staged_for_delete?: boolean;
}

export interface ICERAttachmentManifestEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  server_relative_url?: string;
  data_url?: string;
  uploaded_by: string;
  uploaded_date: string;
  version_tag?: string;
  proposal_no?: string;
}
