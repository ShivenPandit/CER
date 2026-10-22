import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface ICERProps {
  newcontext?: WebPartContext;
  newsiteUrl?: string;
  newlistName?: string;
  newspHttpClient?: any;
  newrelativeUrl?: string;
  newcurrentUserId?: number;
  newgroups?: any;
  newcurrentUserName?: string;
  newcurrentUserEmail?: string;
  newcurrentUserLoginName?: string;
  newisSiteAdmin?: boolean;
}
