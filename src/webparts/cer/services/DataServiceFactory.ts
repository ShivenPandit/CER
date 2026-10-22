import { ICERDataService } from "./ICERDataService";
import { SharePointCERDataService } from "./SharePointCERDataService";
import { LocalMockCERDataService } from "./LocalMockCERDataService";
import { ICERProps } from "../components/ICERProps";

let cachedService: ICERDataService | null = null;

export class DataServiceFactory {
  public static getService(props?: ICERProps): ICERDataService {
    // If live SharePoint context is active, always ensure live SharePointCERDataService is used
    if (
      props &&
      props.newspHttpClient &&
      props.newsiteUrl &&
      props.newsiteUrl.indexOf("http") === 0
    ) {
      if (!cachedService || !(cachedService instanceof SharePointCERDataService)) {
        cachedService = new SharePointCERDataService(
          props.newspHttpClient,
          props.newsiteUrl,
        );
      }
      return cachedService;
    }

    if (!cachedService) {
      cachedService = new LocalMockCERDataService();
    }

    return cachedService;
  }

  public static resetService(): void {
    cachedService = null;
  }
}
