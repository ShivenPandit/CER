export interface ICERAttachment {
  id: string;
  cerprno: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type or extension
  data_url?: string; // Base64 or SharePoint server relative URL
  uploaded_by: string;
  uploaded_date: string;
}
