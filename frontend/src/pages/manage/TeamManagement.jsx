import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus, MoreHorizontal, Check, X, Mail, Shield, User, Loader2, Plus, Edit2, Trash2, Settings, Lock, Calendar, FileText, SendHorizonal, RefreshCw } from "lucide-react";
import { useFilters } from "../../hooks/useFilters";
import { useDebounce } from "../../hooks/useDebounce";
import { useLatestRequestId } from "../../hooks/useLatestRequestId";
import { useBrand } from "../../context/BrandContext";
import teamService from "../../services/team.service";
import apiService from "../../services/api";
import { toast } from "sonner";
import { SYSTEM_ROLES, ASSIGNABLE_ROLES, TEAM_FILTER_ROLES, MEMBER_STATUS } from "../../constants/roles";
import { useConfirm } from "@/hooks/useConfirm";
import { useTranslation } from "react-i18next";

const PRESET_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0A0A0A", "#6B7280"];

export function TeamManagementPage() {
  const { t } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();
  const confirm = useConfirm();
  const teamRequest = useLatestRequestId();

  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    search: "",
    role: "All",
    status: "All"
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "members";
  const setActiveTab = (tabName) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabName);
      return next;
    });
  };
  const [teamData, setTeamData] = useState({ data: [], meta: {} });
  const [roles, setRoles] = useState([]);
  const [systemPermissions, setSystemPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isRoleCreateEditOpen, setIsRoleCreateEditOpen] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  const handleResendInvite = async (member) => {
    setResendingId(member.id);
    try {
      const res = await teamService.resendInvite(member.id);
      toast.success(res?.message || t("team.inviteResent", { email: member.email }));
    } catch (error) {
      toast.error(error.message || t("team.resendFailed"));
    } finally {
      setResendingId(null);
    }
  };

  // Sync debounced search to URL params
  useEffect(() => {
    if (debouncedSearch !== (filters.search || "")) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Sync input value back
  useEffect(() => {
    setSearchTerm(filters.search || "");
  }, [filters.search]);

  // Fetch Team Members
  const fetchTeam = async () => {
    if (!activeBrand?.id) return;
    const requestId = teamRequest.start();
    setLoading(true);
    try {
      const response = await teamService.getMembers(activeBrand.id);
      if (!teamRequest.isLatest(requestId)) return;
      setTeamData(response.data || response);
    } catch (error) {
      if (!teamRequest.isLatest(requestId)) return;
      toast.error(error.message || t("team.loadMembersFailed"));
    } finally {
      if (teamRequest.isLatest(requestId)) setLoading(false);
    }
  };

  // Fetch Custom Roles
  const fetchRoles = async () => {
    if (!activeBrand?.id) return;
    setRolesLoading(true);
    try {
      const response = await teamService.getBrandRoles(activeBrand.id);
      setRoles(response || []);
    } catch (error) {
      toast.error(error.message || t("team.loadRolesFailed"));
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchSystemPermissions = async () => {
    try {
      const response = await teamService.getPermissions();
      if (response) {
        setSystemPermissions(response);
      }
    } catch (error) {
      console.error("Failed to fetch system permissions", error);
    }
  };

  useEffect(() => {
    fetchSystemPermissions();
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [searchParamsString, activeBrand?.id]);

  useEffect(() => {
    fetchRoles();
  }, [activeBrand?.id]);

  const members = teamData.data || [];

  const handleDeleteRole = async (roleId) => {
    const isConfirmed = await confirm({
      title: t("team.deleteRoleConfirmTitle"),
      description: t("team.deleteRoleConfirmDesc"),
      confirmText: t("common:delete"),
      cancelText: t("common:cancel"),
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await teamService.deleteRole(activeBrand.id, roleId);
      toast.success(t("team.deleteRoleSuccess"));
      fetchRoles();
      fetchTeam();
    } catch (error) {
      toast.error(error.message || t("team.deleteRoleFailed"));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-8 py-6 bg-card border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">{t("team.title")}</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t("team.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "roles" ? (
            <button 
              onClick={() => { setSelectedRole(null); setIsRoleCreateEditOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={14} /> {t("team.addCustomRole")}
            </button>
          ) : (
            <button 
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UserPlus size={14} /> {t("team.inviteMember")}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-8 bg-card border-b border-border">
        <button 
          onClick={() => setActiveTab("members")}
          className={`py-4 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "members" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("team.tabMembers", { count: members.length })}
        </button>
        <button 
          onClick={() => setActiveTab("roles")}
          className={`py-4 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "roles" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("team.tabRoles", { count: roles.length })}
        </button>
      </div>

      {activeTab === "members" && (
        <>
          {/* Filter Bar */}
          <div className="flex items-center gap-3 px-8 py-4 bg-card/50 backdrop-blur-sm border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("team.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-foreground text-foreground transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {TEAM_FILTER_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => updateFilters({ role: r })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    (filters.role || "All") === r ? "bg-foreground text-background shadow-md" : "bg-card text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {(filters.search || filters.role !== "All") && (
              <button 
                onClick={clearFilters}
                className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
              >
                {t("team.clearFilters")}
              </button>
            )}
          </div>

          {/* Members Table */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-24 bg-card border border-border rounded-3xl shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-3xl shadow-sm gap-4">
                <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground">
                  <User size={24} />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-foreground">{t("team.noMembers")}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">{t("team.noMembersSubtitle")}</p>
                </div>
                <button 
                  onClick={clearFilters}
                  className="mt-2 px-4 py-2 border border-border rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted transition-all uppercase tracking-widest cursor-pointer"
                >
                  {t("team.resetFilters")}
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      {[t("team.colMember"), t("team.colRole"), t("team.colStatus"), t("team.colJoined"), t("team.colInvitedBy"), ""].map((h, idx) => (
                        <th key={idx} className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-border hover:bg-muted/30 transition-all group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground font-bold text-xs shadow-sm overflow-hidden">
                              {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[12px] font-bold text-foreground">{member.name}</div>
                              <div className="text-[10px] text-muted-foreground font-medium">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {member.customRole ? (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: member.customRole.colorHex }} />
                                <span className="text-[11px] font-bold text-foreground">{member.customRole.name}</span>
                              </>
                            ) : (
                              <>
                                <div className={`p-1.5 rounded-lg ${member.role === SYSTEM_ROLES.OWNER ? 'bg-purple-500/10 text-purple-500' : 'bg-muted text-muted-foreground'}`}>
                                  {member.role === SYSTEM_ROLES.OWNER || member.role === SYSTEM_ROLES.ADMIN ? <Shield size={12} /> : <User size={12} />}
                                </div>
                                <span className="text-[11px] font-bold text-foreground">{t("team." + member.role.toLowerCase())}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            member.status === MEMBER_STATUS.ACTIVE ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {t("team." + member.status.toLowerCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[11px] text-muted-foreground font-medium">{member.joinedDate}</td>
                        <td className="px-6 py-4 text-[11px] text-muted-foreground font-medium">{member.invitedBy}</td>
                        <td className="px-6 py-4 text-right">
                          {member.role !== SYSTEM_ROLES.OWNER && (
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {member.status === MEMBER_STATUS.PENDING && (
                                <button
                                  onClick={() => handleResendInvite(member)}
                                  disabled={resendingId === member.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                                  title={t("team.resendInviteTitle")}
                                >
                                  {resendingId === member.id
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <RefreshCw size={11} />}
                                  {t("team.resend")}
                                </button>
                              )}
                              <button 
                                onClick={() => { setSelectedMember(member); setIsRoleOpen(true); }}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
                                title={t("team.manageMember")}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "roles" && (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {rolesLoading ? (
            <div className="flex items-center justify-center py-24 bg-card border border-border rounded-3xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-3xl shadow-sm gap-4">
              <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground">
                <Settings size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-foreground">{t("team.noCustomRoles")}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">{t("team.noCustomRolesSubtitle")}</p>
              </div>
              <button 
                onClick={() => { setSelectedRole(null); setIsRoleCreateEditOpen(true); }}
                className="mt-2 px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest hover:bg-foreground/90 cursor-pointer"
              >
                {t("team.createCustomRole")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group">
                  <div>
                    {/* Role Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-card shadow-sm" style={{ backgroundColor: role.colorHex }} />
                        <h3 className="text-sm font-bold text-foreground">{role.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedRole(role); setIsRoleCreateEditOpen(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title={t("team.editRole")}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                          title={t("team.deleteRole")}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-medium mt-2 line-clamp-2">{role.description || t("team.noDescription")}</p>
                    
                    {/* Role Counts */}
                    <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <User size={10} /> {t("team.roleAssignedMembers", { count: role._count?.teamMembers || 0 })}
                    </div>

                    {/* Permissions Preview */}
                    <div className="mt-5 border-t border-border pt-4 space-y-2">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t("team.activePermissions")}</div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {role.permissions?.filter(p => p.isAllowed).map(p => {
                          const sys = systemPermissions.find(s => s.key === p.permissionKey);
                          return (
                            <span key={p.id} className="px-2 py-1 bg-muted text-foreground rounded-lg text-[9px] font-semibold border border-border">
                              {sys ? sys.label.split(" (")[0] : p.permissionKey}
                            </span>
                          );
                        })}
                        {role.permissions?.filter(p => p.isAllowed).length === 0 && (
                          <span className="text-[10px] text-muted-foreground italic">{t("team.noActivePermissions")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      {/* Modals */}
      <InviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        activeBrandId={activeBrand?.id}
        customRoles={roles}
        onInviteSuccess={fetchTeam}
      />
      {selectedMember && (
        <RoleModal 
          isOpen={isRoleOpen} 
          onClose={() => { setIsRoleOpen(false); setSelectedMember(null); }} 
          member={selectedMember} 
          customRoles={roles}
          onSuccess={fetchTeam}
        />
      )}
      {isRoleCreateEditOpen && (
        <RoleCreateEditModal 
          isOpen={isRoleCreateEditOpen} 
          onClose={() => { setIsRoleCreateEditOpen(false); setSelectedRole(null); }} 
          activeBrandId={activeBrand?.id}
          role={selectedRole}
          onSuccess={fetchRoles}
          systemPermissions={systemPermissions}
        />
      )}
    </div>
  );
}

function InviteModal({ isOpen, onClose, activeBrandId, customRoles = [], onInviteSuccess }) {
  const { t } = useTranslation(["manage", "common"]);
  const [emails, setEmails] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [role, setRole] = useState(SYSTEM_ROLES.MEMBER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const addEmailTag = (val) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    const parsed = trimmed.split(/[\s,;]+/).filter(Boolean);
    const validEmails = [];
    const invalidEmails = [];
    parsed.forEach(email => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        invalidEmails.push(email);
      } else if (emails.includes(email)) {
        // duplicate
      } else {
        validEmails.push(email);
      }
    });

    if (invalidEmails.length > 0) {
      toast.error(t("team.emailInvalid", { emails: invalidEmails.join(', ') }));
    }

    if (validEmails.length > 0) {
      setEmails(prev => [...prev, ...validEmails]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addEmailTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue) {
      setEmails(prev => prev.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    addEmailTag(pastedText);
  };

  const removeEmailTag = (index) => {
    setEmails(prev => prev.filter((_, i) => i !== index));
  };

  const handleInvite = async () => {
    let finalEmails = [...emails];
    if (inputValue.trim()) {
      const trimmed = inputValue.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        if (!finalEmails.includes(trimmed)) {
          finalEmails.push(trimmed);
        }
      } else {
        toast.error(t("team.emailInvalid", { emails: trimmed }));
        return;
      }
    }

    if (finalEmails.length === 0) {
      toast.error(t("team.emailRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await teamService.inviteMember({
        emails: finalEmails,
        role,
        brandId: activeBrandId
      });

      const { message, successes = [], failures = [] } = response || {};
      
      if (failures.length > 0) {
        if (successes.length > 0) {
          toast.warning(t("team.inviteWarning", { success: successes.length, failed: failures.length }));
        } else {
          toast.error(t("team.inviteFailed", { error: failures[0].message }));
        }
      } else {
        toast.success(t("team.inviteSuccess", { count: successes.length }));
      }

      onInviteSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || t("team.inviteFailed", { error: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("team.inviteModalTitle")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={20} /></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("team.emailList")}</label>
              <span className="text-[9px] text-muted-foreground">{t("team.emailHint")}</span>
            </div>
            <div 
              onClick={() => inputRef.current?.focus()}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl flex flex-wrap gap-2 cursor-text focus-within:border-foreground transition-all min-h-[96px] overflow-y-auto max-h-40"
            >
              {emails.map((email, idx) => (
                <div 
                  key={idx} 
                  className="bg-card text-foreground text-[11px] font-bold py-1 px-2.5 rounded-xl flex items-center gap-1 border border-border"
                >
                  <span>{email}</span>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEmailTag(idx);
                    }}
                    className="text-muted-foreground hover:text-red-500 hover:bg-muted rounded-full p-0.5 transition-colors cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => addEmailTag(inputValue)}
                placeholder={emails.length === 0 ? "colleague1@company.com" : ""}
                className="flex-1 min-w-[120px] text-xs outline-none bg-transparent py-1 font-medium text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("team.inviteRole")}</label>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {/* Static default options */}
              {ASSIGNABLE_ROLES.map((r) => (
                <button 
                  key={r} 
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    role === r ? 'border-foreground bg-muted/50' : 'border-border hover:border-foreground/40'
                  }`}
                >
                  <div className="text-[11px] font-bold text-foreground">{t("team." + r.toLowerCase())}</div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    {r === 'Admin' ? t("team.adminDesc") : r === 'Analyst' ? t("team.analystDesc") : t("team.memberDesc")}
                  </div>
                </button>
              ))}
              {/* Custom Roles options */}
              {customRoles.map((cr) => (
                <button 
                  key={cr.id} 
                  type="button"
                  onClick={() => setRole(cr.id)}
                  className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    role === cr.id ? 'border-foreground bg-muted/50' : 'border-border hover:border-foreground/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-card shadow-sm" style={{ backgroundColor: cr.colorHex }} />
                    <div className="text-[11px] font-bold text-foreground">{cr.name}</div>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{cr.description || t("team.customRoleDesc")}</div>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleInvite}
            disabled={isSubmitting}
            className="w-full py-4 bg-foreground text-background rounded-2xl text-xs font-bold hover:bg-foreground/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={14} /> {t("team.sending")}
              </>
            ) : (
              t("team.sendInvite")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleModal({ isOpen, onClose, member, customRoles = [], onSuccess }) {
  const { t } = useTranslation(["manage", "common"]);
  const confirm = useConfirm();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  if (!isOpen) return null;

  const handleUpdateRole = async (newRole) => {
    setIsUpdating(true);
    try {
      await teamService.updateRole(member.id, newRole);
      toast.success(t("team.roleUpdateSuccess"));
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || t("team.roleUpdateFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async () => {
    const isConfirmed = await confirm({
      title: t("team.removeMemberConfirmTitle"),
      description: t("team.removeMemberConfirmDesc", { name: member.name }),
      confirmText: t("common:delete"),
      cancelText: t("common:cancel"),
      variant: "destructive"
    });
    if (!isConfirmed) return;
    setIsRemoving(true);
    try {
      await teamService.removeMember(member.id);
      toast.success(t("team.removeSuccess"));
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || t("team.removeFailed"));
    } finally {
      setIsRemoving(false);
    }
  };

  const currentRoleValue = member.customRole ? member.customRole.id : member.role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("team.manageRoleModalTitle")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={20} /></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground font-bold">{member.name?.charAt(0)}</div>
             <div>
                <div className="text-sm font-bold text-foreground">{member.name}</div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{t("team." + member.role.toLowerCase())}</div>
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">{t("team.selectRole")}</label>
             <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {/* Default roles */}
                {ASSIGNABLE_ROLES.map((r) => (
                   <button 
                     key={r} 
                     disabled={isUpdating}
                     onClick={() => handleUpdateRole(r)}
                     className={`w-full p-4 border rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                       currentRoleValue === r ? 'border-foreground bg-muted' : 'border-border hover:border-foreground/40'
                     }`}
                   >
                      <span className="text-[11px] font-bold text-foreground">{t("team." + r.toLowerCase())}</span>
                      {currentRoleValue === r && <Check size={14} className="text-foreground" />}
                   </button>
                ))}
                {/* Custom roles */}
                {customRoles.map((cr) => (
                   <button 
                     key={cr.id} 
                     disabled={isUpdating}
                     onClick={() => handleUpdateRole(cr.id)}
                     className={`w-full p-4 border rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                       currentRoleValue === cr.id ? 'border-foreground bg-muted' : 'border-border hover:border-foreground/40'
                     }`}
                   >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full border border-card shadow-sm" style={{ backgroundColor: cr.colorHex }} />
                        <span className="text-[11px] font-bold text-foreground">{cr.name}</span>
                      </div>
                      {currentRoleValue === cr.id && <Check size={14} className="text-foreground" />}
                   </button>
                ))}
             </div>
          </div>
          <div className="pt-2">
            <button 
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="w-full py-4 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRemoving ? <Loader2 className="animate-spin" size={14} /> : t("team.removeMember")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleCreateEditModal({ isOpen, onClose, activeBrandId, role, onSuccess, systemPermissions = [] }) {
  const { t } = useTranslation(["manage", "common"]);
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [colorHex, setColorHex] = useState(role?.colorHex || PRESET_COLORS[0]);
  const [permissions, setPermissions] = useState(() => {
    // Build initial permissions mapped to current role permissions
    const map = {};
    systemPermissions.forEach(sp => {
      const found = role?.permissions?.find(p => p.permissionKey === sp.key);
      map[sp.key] = found ? found.isAllowed : false;
    });
    return map;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isEdit = !!role;

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("team.roleNameRequired"));
      return;
    }
    setIsSubmitting(true);
    
    // Format permissions list
    const permissionsPayload = Object.keys(permissions).map(key => ({
      permissionKey: key,
      isAllowed: permissions[key]
    }));

    try {
      if (isEdit) {
        await teamService.updateBrandRole(activeBrandId, role.id, {
          name,
          description,
          colorHex,
          permissions: permissionsPayload
        });
        toast.success(t("team.roleSaveSuccess"));
      } else {
        await teamService.createRole(activeBrandId, {
          name,
          description,
          colorHex,
          permissions: permissionsPayload
        });
        toast.success(t("team.roleSaveSuccess"));
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || t("team.roleSaveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? t("team.editRoleModalTitle") : t("team.createRoleModalTitle")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={20} /></button>
        </div>
        
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Form details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("team.roleName")}</label>
              <input 
                type="text" 
                placeholder={t("team.roleNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-3 bg-muted border border-border text-foreground rounded-2xl text-xs outline-none focus:border-foreground transition-all font-medium placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("team.roleColor")}</label>
              <div className="flex items-center gap-2 py-1.5">
                {PRESET_COLORS.map(c => (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => setColorHex(c)}
                    className="w-7 h-7 rounded-full border-2 transition-transform duration-150 active:scale-90 relative flex items-center justify-center shadow-sm cursor-pointer"
                    style={{ backgroundColor: c, borderColor: colorHex === c ? "var(--foreground)" : "transparent" }}
                  >
                    {colorHex === c && <Check size={12} className={c === "#0A0A0A" ? "text-white" : "text-slate-900"} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("team.roleDescription")}</label>
            <input 
              type="text" 
              placeholder={t("team.roleDescriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border text-foreground rounded-2xl text-xs outline-none focus:border-foreground transition-all font-medium placeholder:text-muted-foreground"
            />
          </div>

          {/* Permissions checkbox grid */}
          <div className="space-y-6 pt-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block border-b border-border pb-2">{t("team.rolePermissionsTitle")}</label>
            
            {/* Nhóm Content & Media */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("team.groupContent")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemPermissions.filter(p => p.category === "content" || p.category === "posts").map(p => {
                  const isActive = permissions[p.key];
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePermission(p.key)}
                      className={`p-4 border rounded-2xl text-left transition-all duration-200 flex items-start justify-between gap-4 cursor-pointer ${
                        isActive ? "border-foreground bg-muted shadow-sm" : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-foreground">{p.label}</div>
                        <div className="text-[9px] text-muted-foreground leading-normal">{p.desc}</div>
                      </div>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                        isActive ? "bg-foreground" : "bg-muted"
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-card shadow-sm transform transition-all duration-300 ${
                          isActive ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nhóm Management & Settings */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("team.groupManagement")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemPermissions.filter(p => p.category === "management").map(p => {
                  const isActive = permissions[p.key];
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePermission(p.key)}
                      className={`p-4 border rounded-2xl text-left transition-all duration-200 flex items-start justify-between gap-4 cursor-pointer ${
                        isActive ? "border-foreground bg-muted shadow-sm" : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-foreground">{p.label}</div>
                        <div className="text-[9px] text-muted-foreground leading-normal">{p.desc}</div>
                      </div>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                        isActive ? "bg-foreground" : "bg-muted"
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-card shadow-sm transform transition-all duration-300 ${
                          isActive ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 bg-foreground text-background rounded-2xl text-xs font-bold hover:bg-foreground/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={14} /> {t("team.saving")}
              </>
            ) : (
              t("team.saveRole")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

