import * as React from "react";
import {
  TagPicker,
  Persona,
  PersonaSize,
  IPickerItemProps,
  ITag as IFluentTag,
} from "@fluentui/react";
import { SPHttpClient } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IUser {
  Id: string;
  title: string;
  email: string;
  jobTitle?: string;
  employeeId?: string;
  mobilePhone?: string;
}

export interface IPeopleTag extends IFluentTag {
  key: string;
  name: string;
  email: string;
  jobTitle?: string;
  employeeId: string;
  mobilePhone: string;
  photoUrl?: string;
}

export interface ITagPickerProps {
  context: WebPartContext;
  spHttpClient?: SPHttpClient;
  siteUrl?: string;
  selectedUsers: IUser[];
  onUsersSelected: (users: IUser[]) => void;
  disable?: boolean;
  itemLimit?: number;
}

export const TagPeoplePicker: React.FC<ITagPickerProps> = ({
  context,
  selectedUsers,
  onUsersSelected,
  disable = false,
  itemLimit,
}) => {
  const [peoplePickerUsers, setPeoplePickerUsers] = React.useState<IPeopleTag[]>([]);

  // Get user photo URL exactly like SharePoint PeoplePicker does
  const getUserPhotoUrl = (userId: string, email: string): string => {
    const baseUrl = context.pageContext.web.absoluteUrl;
    return `${baseUrl}/_layouts/15/userphoto.aspx?size=S&accountname=${encodeURIComponent(email)}`;
  };

  // Enrich or map selected users
  React.useEffect(() => {
    const enrichUsers = async () => {
      if (!selectedUsers || selectedUsers.length === 0) {
        setPeoplePickerUsers([]);
        return;
      }

      const enrichedTags: IPeopleTag[] = [];

      for (let i = 0; i < selectedUsers.length; i++) {
        const user = selectedUsers[i];
        if (user.Id && user.email) {
          enrichedTags.push({
            key: user.Id,
            name: user.title,
            email: user.email,
            jobTitle: user.jobTitle,
            employeeId: user.employeeId || "",
            mobilePhone: user.mobilePhone || "",
            photoUrl: getUserPhotoUrl(user.Id, user.email),
          });
        } else if (user.email) {
          try {
            const client = await context.msGraphClientFactory.getClient("3");
            const res = await client
              .api(`/users/${encodeURIComponent(user.email)}`)
              .select("id,displayName,mail,userPrincipalName,jobTitle,employeeId,mobilePhone")
              .get();

            const resolvedEmail = res.mail || res.userPrincipalName || user.email;
            enrichedTags.push({
              key: res.id || resolvedEmail,
              name: res.displayName || user.title,
              email: resolvedEmail,
              jobTitle: res.jobTitle || user.jobTitle,
              employeeId: res.employeeId || user.employeeId || "",
              mobilePhone: res.mobilePhone || user.mobilePhone || "",
              photoUrl: getUserPhotoUrl(res.id || resolvedEmail, resolvedEmail),
            });
          } catch {
            enrichedTags.push({
              key: user.email,
              name: user.title || user.email,
              email: user.email,
              jobTitle: user.jobTitle,
              employeeId: user.employeeId || "",
              mobilePhone: user.mobilePhone || "",
              photoUrl: getUserPhotoUrl(user.email, user.email),
            });
          }
        }
      }

      setPeoplePickerUsers(enrichedTags);
    };

    void enrichUsers();
  }, [selectedUsers, context]);

  // Fetch user suggestions with photos - searches ALL AD/Entra ID users
  const fetchEmails = async (filterText: string): Promise<IPeopleTag[]> => {
    const trimmed = (filterText || "").trim();
    if (!trimmed || trimmed.length < 1) return [];

    try {
      const client = await context.msGraphClientFactory.getClient("3");

      // Escape single quotes for OData
      const safeQuery = trimmed.replace(/'/g, "''");

      // Comprehensive search across displayName, givenName, surname, mail, UPN, and employeeId
      const filterQuery = [
        `startswith(displayName,'${safeQuery}')`,
        `startswith(givenName,'${safeQuery}')`,
        `startswith(surname,'${safeQuery}')`,
        `startswith(mail,'${safeQuery}')`,
        `startswith(userPrincipalName,'${safeQuery}')`,
        `startswith(employeeId,'${safeQuery}')`,
      ].join(" or ");

      const response = await client
        .api("/users")
        .filter(filterQuery)
        .select("id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,employeeId,mobilePhone")
        .top(50)
        .get();

      if (response && Array.isArray(response.value) && response.value.length > 0) {
        const usersWithPhotos: IPeopleTag[] = response.value
          .filter((user: any) => Boolean(user.displayName && (user.mail || user.userPrincipalName)))
          .map((user: any) => {
            const resolvedEmail = (user.mail || user.userPrincipalName || "").trim();
            return {
              key: user.id || resolvedEmail,
              name: user.displayName,
              email: resolvedEmail,
              jobTitle: user.jobTitle || "",
              employeeId: user.employeeId || "",
              mobilePhone: user.mobilePhone || "",
              photoUrl: getUserPhotoUrl(user.id, resolvedEmail),
            };
          });

        // Relevance sorting
        const lower = trimmed.toLowerCase();
        usersWithPhotos.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aStarts = aName.indexOf(lower) === 0 ? 2 : a.email.toLowerCase().indexOf(lower) === 0 ? 1 : 0;
          const bStarts = bName.indexOf(lower) === 0 ? 2 : b.email.toLowerCase().indexOf(lower) === 0 ? 1 : 0;
          if (bStarts !== aStarts) return bStarts - aStarts;
          return a.name.localeCompare(b.name);
        });

        return usersWithPhotos;
      }
    } catch (err) {
      console.warn("[TagPeoplePicker] MS Graph search failed, attempting SharePoint fallback:", err);
    }

    // Secondary fallback: SharePoint ClientPeoplePicker endpoint
    try {
      const endpoint = `${context.pageContext.web.absoluteUrl}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser`;
      const payload = {
        queryParams: {
          __metadata: { type: "SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters" },
          AllowEmailAddresses: true,
          AllowMultipleEntities: false,
          AllUrlZones: false,
          MaximumEntitySuggestions: 30,
          PrincipalSource: 15,
          PrincipalType: 1,
          QueryString: trimmed,
        },
      };

      const res = await context.spHttpClient.post(endpoint, SPHttpClient.configurations.v1, {
        headers: {
          Accept: "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json?.d?.ClientPeoplePickerSearchUser || json?.ClientPeoplePickerSearchUser;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            const email = (item.EntityData?.Email || (item.Description && item.Description.indexOf("@") !== -1 ? item.Description : "") || "").trim();
            return {
              key: item.Key || email,
              name: item.DisplayText,
              email: email,
              jobTitle: item.EntityData?.Title || "",
              employeeId: item.EntityData?.EmployeeId || "",
              mobilePhone: item.EntityData?.MobilePhone || "",
              photoUrl: getUserPhotoUrl(item.Key, email),
            };
          });
        }
      }
    } catch (spFallbackErr) {
      console.error("[TagPeoplePicker] Both Graph and SharePoint fallback failed:", spFallbackErr);
    }

    return [];
  };

  // Render each suggestion
  const onRenderSuggestion = (item: any): React.ReactElement => {
    const peopleTag = item as IPeopleTag;
    return (
      <div className="flex items-center p-1 rounded-lg hover:bg-gray-100 transition">
        <Persona
          text={peopleTag.name}
          secondaryText={peopleTag.email}
          tertiaryText={
            peopleTag.employeeId ? `ID: ${peopleTag.employeeId}` : peopleTag.jobTitle
          }
          size={PersonaSize.size32}
          imageUrl={peopleTag.photoUrl}
          hidePersonaDetails={false}
          showInitialsUntilImageLoads={true}
        />
      </div>
    );
  };

  // Compact selected item renderer
  const onRenderSelectedItem = (props: IPickerItemProps<any>): React.ReactElement => {
    const item = props.item as IPeopleTag;
    return (
      <div
        className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-md px-2 py-1 mr-1 mb-1 text-lg"
        style={{
          fontSize: "13px",
          height: "28px",
          width: "260px",
          lineHeight: "22px",
        }}
      >
        <Persona
          text={item.name}
          imageUrl={item.photoUrl}
          size={PersonaSize.size16}
          hidePersonaDetails
          showInitialsUntilImageLoads={true}
          styles={{
            root: { minWidth: "18px" },
          }}
        />
        <span
          className="ml-1 text-gray-800 font-medium max-w-40 truncate"
          title={`${item.name} ${item.employeeId ? `(${item.employeeId})` : ""}`}
        >
          {item.name}
        </span>
        {item.employeeId && (
          <span className="ml-1 text-gray-500 text-xs">
            ({item.employeeId})
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (props.onRemoveItem) {
              props.onRemoveItem();
            }
          }}
          title="Remove"
          className="ml-2 text-red-500 hover:text-red-600 transition text-sm hover:scale-105 font-bold leading-none cursor-pointer"
          style={{
            fontSize: "13px",
            width: "13px",
            height: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      " ",
    ];
    const isLetter = /^[a-zA-Z0-9]$/.test(e.key);
    if (!isLetter && allowedKeys.indexOf(e.key) === -1) {
      e.preventDefault();
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <TagPicker
        styles={{
          root: {
            color: "black",
            minHeight: "32px",
          },
          input: {
            color: "black",
            fontSize: "13px",
          },
          text: {
            color: "black",
            fontSize: "13px",
          },
          itemsWrapper: {
            color: "black",
          },
        }}
        className="text-black dark:text-white"
        onResolveSuggestions={fetchEmails as any}
        selectedItems={peoplePickerUsers as any}
        onChange={(items?: IFluentTag[]) => {
          const updatedTags = (items || []) as IPeopleTag[];
          setPeoplePickerUsers(updatedTags);

          const userMap: { [key: string]: IUser } = {};
          for (let i = 0; i < updatedTags.length; i++) {
            const item = updatedTags[i];
            userMap[item.key] = {
              Id: String(item.key),
              title: item.name,
              email: item.email,
              jobTitle: item.jobTitle,
              employeeId: item.employeeId,
              mobilePhone: item.mobilePhone,
            };
          }

          const userList: IUser[] = Object.keys(userMap).map((k) => userMap[k]);
          onUsersSelected(userList);
        }}
        onRenderSuggestionsItem={onRenderSuggestion as any}
        onRenderItem={onRenderSelectedItem as any}
        pickerSuggestionsProps={{
          suggestionsHeaderText: "Suggested Users",
          noResultsFoundText: "No matching users found",
          searchingText: "Searching users...",
        }}
        itemLimit={itemLimit === 1 ? 1 : undefined}
        disabled={disable}
        inputProps={{
          placeholder: "Search by name, email, or employee ID...",
        }}
      />
    </div>
  );
};

export default TagPeoplePicker;
