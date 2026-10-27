// import * as $ from "jquery";
import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { useCallback } from "react";

// Custom hook for UI operations
export const useUIOperations = () => {
  const cancel = useCallback((siteUrl: string) => {
    window.location.href = siteUrl;
  }, []);

  const loadCss = useCallback((id: string, url: string) => {
    const head = document.getElementsByTagName("head")[0];
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = url;
    head.appendChild(link);
  }, []);

  return {
    cancel,
    loadCss,
  };
};

// Custom hook for user operations
export const useUserOperations = () => {
  const getCurrentUserGroups = useCallback(
    async (requester: SPHttpClient, siteUrl: string) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/currentuser/?$select=Title,Email,LoginName,Id&$expand=groups`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getCurrentUserGroups: ${error.message}`);
        throw error;
      }
    },
    []
  );

const getCurrentUser = useCallback(
  async (context: WebPartContext) => {
    try {
      const client = await context.msGraphClientFactory.getClient("3");
      
      const response = await client
        .api("/me")
        .select("id,displayName,mail,userPrincipalName,jobTitle,employeeId,mobilePhone,department")
        .get();
      
      return {
        d: {
          Id: response.id,
          Title: response.displayName || "",
          Email: response.mail || "",
          LoginName: response.userPrincipalName || "",
          Department: response.department || "",
          EmployeeId: response.employeeId || "",
          MobilePhone: response.mobilePhone || "",
          JobTitle: response.jobTitle || "",
        }
      };
    } catch (error: any) {
      console.log(`Error occurred in getCurrentUser: ${error.message}`);
      throw error;
    }
  },
  []
);

  const getUserId = useCallback(
    async (requester: SPHttpClient, siteUrl: string, email: string) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/siteusers?$select=Title,Email,Id&$filter=Email eq '${email}'`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getUserId: ${error.message}`);
        throw error;
      }
    },
    []
  );

  const getSPGroupUsers = useCallback(
    async (requester: SPHttpClient, siteUrl: string, groupName: string) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/Web/SiteGroups/GetByName('${groupName}')/users?$select=Email,Id`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getSPGroupUsers: ${error.message}`);
        throw error;
      }
    },
    []
  );

  // const getUserGroups = useCallback((siteUrl: string) => {
  //   return new Promise((resolve, reject) => {
  //     $.ajax({
  //       url: siteUrl + "/_api/web/currentuser?$select=Title&$expand=groups",
  //       method: "GET",
  //       headers: { Accept: "application/json; odata=verbose" },
  //       success: (data) => {
  //         resolve(data);
  //       },
  //       error: (error) => {
  //         reject(error);
  //       },
  //     });
  //   });
  // }, []);

  const checkUserRole = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select: string,
      filter: string
    ) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items${select}${filter}`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in checkUserRole: ${error.message}`);
        throw error;
      }
    },
    []
  );

  return {
    getCurrentUserGroups,
    getCurrentUser,
    getUserId,
    getSPGroupUsers,
    // getUserGroups,
    checkUserRole,
  };
};

// Custom hook for SharePoint list operations
export const useListOperations = () => {
  const createRequest = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      data: any,
      listName: string
    ) => {

      try {
        const response = await requester.post(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "Content-type": "application/json;odata=verbose",
              "odata-version": "",
            },
            body: data,
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in createRequest: ${error.message}`);
        throw error;
      }
    },
    []
  );

  const updateItems = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      oListItemID: string,
      body: string
    ) => {
      try {
        console.log(
          "UpdateItems:",
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${oListItemID})`
        );

        const response = await requester.post(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${oListItemID})`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "Content-type": "application/json;odata=verbose",
              "odata-version": "",
              "IF-MATCH": "*",
              "X-HTTP-Method": "MERGE",
            },
            body: body,
          }
        );
        return response.json;
      } catch (error: any) {
        console.log(`Error occurred in updateItems: ${error.message}`);
        throw error;
      }
    },
    []
  );
  const deleteItem = useCallback(
    async (
      spHttpClient: SPHttpClient,
      siteUrl: string,
      listName: string,
      itemId: string,
      context: WebPartContext
    ) => {
      const apiUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items(${itemId})`;

      try {
        const response = await spHttpClient.fetch(
          apiUrl,
          SPHttpClient.configurations.v1,
          {
            method: "POST",
            headers: {
              Accept: "*/*", // ✅ no JSON expectation
              "X-HTTP-Method": "DELETE",
              "IF-MATCH": "*",
              "X-RequestDigest":
                context.pageContext.legacyPageContext.formDigestValue,
            },
          }
        );

        console.log("Delete response:", response.status, response.statusText);

        if (response.status === 204 || response.status === 200) {
          console.log("✅ Item successfully deleted");
          return true;
        }

        // ✅ treat 404 as success
        if (response.status === 404) {
          console.warn("Item already deleted");
          return true;
        }

        throw new Error(`❌ Failed to delete item. Status: ${response.status}`);
      } catch (error) {
        console.error("Error deleting item:", error);
        throw error;
      }
    },
    []
  );

  const getLookUpItems = useCallback(
    async (requester: SPHttpClient, siteUrl: string, listName: string) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getLookUpItems: ${error.message}`);
        throw error;
      }
    },
    []
  );

  const getListItems = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select: string
    ) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items${select}`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getListItems: ${error.message}`);
        throw error;
      }
    },
    []
  );

 const getAllListItems = async (
    requester: SPHttpClient,
    siteUrl: string,
    listName: string,
    select: string
  ): Promise<any[]> => {
    let allItems: any[] = [];
    let nextUrl:
      | string
      | null = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items${select}&$top=5000`;

    try {
      while (nextUrl) {
        const response: SPHttpClientResponse = await requester.get(
          nextUrl,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );

        const data: any = await response.json();
        allItems = allItems.concat(data.d.results);
        nextUrl = data.d.__next ?? null;
      }
      return allItems;
    } catch (error: any) {
      console.error(`Error occurred in getAllListItems: ${error.message}`);
      throw error;
    }
  };

  const getAttachments = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      query: string,
      documentName: string
    ): Promise<any[]> => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${documentName}')/items${query}`,
          SPHttpClient.configurations.v1
        );

        if (response.ok) {
          const data = await response.json();
          console.log(data);
          const attachments = data.value.map((item: any) => ({
            name: item.FileLeafRef,
            url: `${item.FileRef}`,
            size: item.File.Length,
          }));

          return attachments;
        } else {
          console.error("Failed to fetch attachments", response.statusText);
          return [];
        }
      } catch (error) {
        console.error("Error fetching attachments:", error);
        return [];
      }
    },
    []
  );

  const getListItemsWithFilter = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select: string,
      filter: string
    ) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items${select}${filter}`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(
          `Error occurred in getListItemsWithFilter: ${error.message}`
        );
        throw error;
      }
    },
    []
  );

  const getListItemsFilter = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select: string,
      filter: string
    ) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items${select}${filter}`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getListItemsFilter: ${error.message}`);
        throw error;
      }
    },
    []
  );

  const getListTimeLineFilter = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select: string,
      filter: string
    ) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items${select}${filter}`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(
          `Error occurred in getListTimeLineFilter: ${error.message}`
        );
        throw error;
      }
    },
    []
  );

  const getApprovalListItems = useCallback(
    async (requester: SPHttpClient, siteUrl: string, listName: string) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$select=*`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getApprovalListItems: ${error.message}`);
        throw error;
      }
    },
    []
  );

  const getDropDownListItems = useCallback(
    async (requester: SPHttpClient, siteUrl: string, listName: string) => {
      try {
        const response = await requester.get(
          `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$select=*`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=verbose",
              "odata-version": "",
            },
          }
        );
        return await response.json();
      } catch (error: any) {
        console.log(`Error occurred in getDropDownListItems: ${error.message}`);
        throw error;
      }
    },
    []
  );

  // const deleteFileFromLibrary = useCallback(

  //   async (
  //     spHttpClient: SPHttpClient,
  //     siteUrl: string,
  //     serverRelativeUrl: string,
  //     formDigestValue: string
  //   ) => {
  //     if (!serverRelativeUrl) {
  //       console.error("❌ serverRelativeUrl is undefined.");
  //       alert("Invalid file path. Cannot delete.");
  //       return;
  //     }
  //     try {
  //       if (!serverRelativeUrl.startsWith("/")) {
  //         const parsedUrl = new URL(serverRelativeUrl);
  //         serverRelativeUrl = parsedUrl.pathname;
  //       }

  //       const apiUrl = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')`;
  //       const response = await spHttpClient.fetch(
  //         apiUrl,
  //         SPHttpClient.configurations.v1,
  //         {
  //           method: "POST",
  //           headers: {
  //             Accept: "application/json",
  //             "X-HTTP-Method": "DELETE",
  //             "IF-MATCH": "*",
  //             "X-RequestDigest": formDigestValue,
  //           },
  //         }
  //       );

  //       if (response.ok) {
  //         console.log("File successfully deleted");
  //         alert("File successfully deleted.");
  //       } else {
  //         const errorText = await response.text();
  //         throw new Error(
  //           `Failed to delete file. Status: ${response.status}\n${errorText}`
  //         );
  //       }
  //     } catch (error) {
  //       console.error("Error deleting file:", error);
  //       alert("Error deleting file: " + error.message);
  //     }
  //   },
  //   []
  // );

  const deleteFileFromLibrary = async (
    spHttpClient: SPHttpClient,
    siteUrl: string,
    serverRelativeUrl: string
  ): Promise<void> => {
    try {
      const endpoint = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/recycle`;

      await spHttpClient.post(endpoint, SPHttpClient.configurations.v1, {
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=nometadata",
        },
      });

      // if (!response.ok) {
      //   const text = await response.text();
      //   throw new Error(
      //     `Failed to delete file. Status: ${response.status} - ${text}`
      //   );
      // }

      console.log("✅ File moved to recycle bin:", serverRelativeUrl);
    } catch (error: any) {
      console.error("❌ Error deleting file:", error.message);
      throw error;
    }
  };

  const uploadFileToDocumentLibrary = useCallback(
    async (
      file: File,
      libraryName: string,
      spHttpClient: SPHttpClient,
      siteUrl: string,
      metadata: Record<string, any>
    ): Promise<number> => {
      // if (!file || !(file instanceof File)) {
      //   console.warn("Skipping invalid file", file);
      //   return;
      // }
      try {
        const encodedFileName = encodeURIComponent(file.name);
        const uploadUrl = `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')/rootfolder/files/add(url='${encodedFileName}',overwrite=true)`;

        // 1. Upload the file
        const uploadResponse = await spHttpClient.post(
          uploadUrl,
          SPHttpClient.configurations.v1,
          {
            headers: { "Content-Length": file.size.toString() },
            body: file,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(
            `File upload failed with status: ${uploadResponse.status}`
          );
        }

        const uploadResult = await uploadResponse.json();

        console.log(uploadResult);

        // --- START: The Fix ---

        // 2. Get the file's list item properties using its server-relative URL from the upload result
        const fileItemResponse = await spHttpClient.get(
          `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${uploadResult.ServerRelativeUrl}')/ListItemAllFields`,
          SPHttpClient.configurations.v1
        );

        if (!fileItemResponse.ok) {
          throw new Error(
            `Could not retrieve the file's list item properties.`
          );
        }

        const fileItemJson = await fileItemResponse.json();



        // Now, fileItemJson contains the Id and the @odata.etag we need.
        // 3. Prepare and send the metadata update
        const updatePayload = {
          ...metadata,
        };



        const updateUrl = `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')/items(${fileItemJson.Id})`;

        await spHttpClient.post(updateUrl, SPHttpClient.configurations.v1, {
          headers: {
            Accept: "application/json",
            "Content-type": "application/json",
            "X-HTTP-Method": "MERGE",
            "IF-MATCH": fileItemJson["@odata.etag"], // Use the correct ETag from the item itself
          },
          body: JSON.stringify(updatePayload),
        });

        return fileItemJson.Id;


      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        throw error;
      }
    },
    []
  );

  return {
    createRequest,
    updateItems,
    deleteItem,
    getLookUpItems,
    getListItems,
    getListItemsWithFilter,
    getListItemsFilter,
    getListTimeLineFilter,
    getApprovalListItems,
    getDropDownListItems,
    getAllListItems,
    uploadFileToDocumentLibrary,
    deleteFileFromLibrary,
    getAttachments,
  };
};
