import React, { useState, useEffect, useRef } from "react";
import { Search, User, Mail, Check, X, Loader2, AlertCircle, Building2, Briefcase } from "lucide-react";
import { IDirectoryUser, resolveDirectoryUserEmail } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { UserAvatar } from "../Common/UserAvatar";

export interface IDirectoryPeoplePickerProps {
  dataService: ICERDataService;
  selectedName: string;
  selectedEmail: string;
  onSelect: (user: IDirectoryUser, resolvedEmail: string) => void;
  onClear: () => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  id?: string;
  onBlur?: () => void;
}

export const DirectoryPeoplePicker: React.FC<IDirectoryPeoplePickerProps> = ({
  dataService,
  selectedName,
  selectedEmail,
  onSelect,
  onClear,
  disabled = false,
  required = false,
  hasError = false,
  errorMessage,
  id = "owname-people-picker",
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState(selectedName || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IDirectoryUser[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);
  const blurTimerRef = useRef<any>(null);

  // Synchronize internal input value when external selectedName prop changes
  useEffect(() => {
    setInputValue(selectedName || "");
  }, [selectedName]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        // If closed with arbitrary unselected text, revert back to selectedName
        if (inputValue !== selectedName) {
          setInputValue(selectedName || "");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [inputValue, selectedName]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const triggerSearch = async (query: string): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setHasSearched(true);
    setActiveIndex(-1);

    try {
      const users = await dataService.searchDirectoryUsers(trimmed);
      setResults(users || []);
      setIsOpen(true);
    } catch (err: any) {
      console.error("[DirectoryPeoplePicker] Directory search error:", err);
      setSearchError(err?.message || "Failed to query organization directory.");
      setResults([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void triggerSearch(val);
    }, 300);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    if (inputValue.trim().length >= 1) {
      void triggerSearch(inputValue);
    } else {
      // Trigger default search or open state
      void triggerSearch("");
    }
  };

  const handleInputBlur = () => {
    // Delay handling blur to allow dropdown click selection
    blurTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
      // Prevent arbitrary text: if input doesn't match selectedName, revert
      if (inputValue !== selectedName) {
        setInputValue(selectedName || "");
      }
      if (onBlur) {
        onBlur();
      }
    }, 250);
  };

  const handleSelectUser = (user: IDirectoryUser) => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    const resolvedEmail = resolveDirectoryUserEmail(user);
    setInputValue(user.displayName);
    setIsOpen(false);
    setActiveIndex(-1);
    setSearchError(null);
    onSelect(user, resolvedEmail);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setInputValue("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setSearchError(null);
    onClear();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        void triggerSearch(inputValue);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (results.length > 0) {
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (results.length > 0) {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        }
        break;

      case "Enter":
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
          handleSelectUser(results[activeIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        if (inputValue !== selectedName) {
          setInputValue(selectedName || "");
        }
        break;

      case "Tab":
        setIsOpen(false);
        setActiveIndex(-1);
        if (inputValue !== selectedName) {
          setInputValue(selectedName || "");
        }
        break;

      default:
        break;
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isSelected = !!selectedName;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#012964]" />
          ) : isSelected ? (
            <UserAvatar name={selectedName} email={selectedEmail} size="xs" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={`${id}-dropdown`}
          aria-invalid={hasError}
          aria-describedby={hasError && errorMessage ? `${id}-error` : undefined}
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search authorized portal users by name or email..."
          className={`w-full pl-9 pr-9 py-2 rounded-lg font-medium text-xs transition-colors text-slate-900 placeholder:text-slate-400 focus:outline-none ${
            hasError
              ? "bg-rose-50/20 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              : isSelected
              ? "bg-[#012964]/5 border-[#012964]/30 hover:border-[#012964]/50 focus:border-[#012964] focus:ring-2 focus:ring-[#012964]/15"
              : "bg-white border border-slate-300 hover:border-slate-400 focus:border-[#012964] focus:ring-2 focus:ring-[#012964]/15"
          } ${disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
        />

        {/* Clear Button */}
        {isSelected && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Clear selected owner"
            aria-label="Clear owner selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>



      {/* Error Message */}
      {hasError && errorMessage && (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          id={`${id}-dropdown`}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="px-4 py-3 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#012964]" />
              <span className="font-medium text-xs">Searching authorized portal users...</span>
            </div>
          )}

          {/* Directory Search Error State */}
          {!isLoading && searchError && (
            <div className="px-4 py-2.5 bg-rose-50/60 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Directory Search Notice</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{searchError}</p>
              </div>
            </div>
          )}

          {/* No Results State */}
          {!isLoading && !searchError && hasSearched && results.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-500">
              <User className="w-6 h-6 mx-auto mb-1.5 text-slate-400 opacity-60" />
              <p className="font-semibold text-xs text-slate-700">No portal users found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No users with permission to this portal matched &ldquo;{inputValue}&rdquo;. Only users granted access to this portal are eligible.
              </p>
            </div>
          )}

          {/* Search Results List */}
          {!isLoading && results.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 bg-slate-50/80">
                Authorized Portal Users ({results.length})
              </div>
              {results.map((user, idx) => {
                const isActive = idx === activeIndex;
                const email = resolveDirectoryUserEmail(user);
                const isItemChosen = selectedName === user.displayName && selectedEmail === email;

                return (
                  <div
                    key={user.id || user.userPrincipalName || idx}
                    role="option"
                    aria-selected={isActive || isItemChosen}
                    onMouseDown={(e) => {
                      // Prevent input blur before click finishes
                      e.preventDefault();
                      handleSelectUser(user);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#012964]/10 text-slate-900"
                        : isItemChosen
                        ? "bg-slate-50"
                        : "hover:bg-slate-50/80 text-slate-800"
                    }`}
                  >
                    {/* User Profile Avatar */}
                    <UserAvatar
                      name={user.displayName}
                      email={email}
                      size="sm"
                    />

                    {/* User Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {user.displayName}
                        </span>
                        {isItemChosen && (
                          <span className="text-[10px] font-bold text-[#012964] bg-[#012964]/10 px-1.5 py-0.2 rounded border border-[#012964]/20">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-0.5">
                        <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {email || <span className="text-amber-600 italic">No email address on record</span>}
                        </span>
                      </div>

                      {(user.jobTitle || user.department) && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate mt-0.5">
                          {user.jobTitle && (
                            <span className="flex items-center gap-0.5 truncate">
                              <Briefcase className="w-2.5 h-2.5 shrink-0" />
                              {user.jobTitle}
                            </span>
                          )}
                          {user.jobTitle && user.department && <span>•</span>}
                          {user.department && (
                            <span className="flex items-center gap-0.5 truncate">
                              <Building2 className="w-2.5 h-2.5 shrink-0" />
                              {user.department}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Active / Check Icon */}
                    {isItemChosen ? (
                      <Check className="w-4 h-4 text-[#012964] shrink-0" />
                    ) : isActive ? (
                      <span className="text-[11px] text-[#012964] font-semibold shrink-0">Enter ↵</span>
                    ) : null}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
