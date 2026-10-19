// Lightweight stubs for SPFx runtime modules during local browser preview
export const SPHttpClient = {
  configurations: {
    v1: {},
  },
};

export class SPHttpClientResponse {
  public ok: boolean = false;
  public status: number = 200;
  public statusText: string = "OK";
  public async json(): Promise<any> {
    return {};
  }
}

export class BaseClientSideWebPart<T = any> {}

export const Version = {
  parse: (v: string) => ({ version: v }),
};

export type WebPartContext = any;
