import { ICERDataService } from "./ICERDataService";
import { SharePointCERDataService } from "./SharePointCERDataService";
import { LocalMockCERDataService } from "./LocalMockCERDataService";
import { ICERProps } from "../components/ICERProps";

let cachedService: ICERDataService | null = null;

export class DataServiceFactory {
  public static getService(props?: ICERProps): ICERDataService {
    if (cachedService) {
      return cachedService;
    }

    // Check if live SharePoint context is active
    if (props && props.newspHttpClient && props.newsiteUrl && props.newsiteUrl.indexOf("http") === 0) {
      cachedService = new SharePointCERDataService(props.newspHttpClient, props.newsiteUrl);
    } else {
      cachedService = new LocalMockCERDataService();
    }

    return cachedService;
  }

  public static resetService(): void {
    cachedService = null;
  }
}
