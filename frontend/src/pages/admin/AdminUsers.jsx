import React, { useState, useEffect } from "react";
import { 
  Users, Search, Shield, ShieldAlert, ShieldCheck, 
  UserX, UserCheck, ChevronLeft, ChevronRight, UserMinus 
} from "lucide-react";
import { useFilters } from "../../hooks/useFilters";
import { useDebounce } from "../../hooks/useDebounce";
import adminService from "../../services/admin.service";
import { toast } from "sonner";

const roleColors = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  OWNER: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  STAFF: "bg-amber-100 text-amber-700 border-amber-200",
  USER: "bg-gray-100 text-gray-700 border-gray-200",
};

const SYSTEM_ROLES = [
  'OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'USER', 'EDITOR',
  'VIEWER', 'ANALYST', 'STREAM_MANAGER', 'CONTENT_MANAGER',
  'CONTENT_CREATOR', 'STREAM_OPERATOR', 'CLIENT'
];

export function AdminUsers() {
  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    search: "",
    role: "",
    page: "1",
    limit: "10"
  });

  const [userData, setUserData] = useState({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Sync debounced search to URL params
  useEffect(() => {
    if (debouncedSearch !== (filters.search || "")) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Sync input value back if URL search parameter is cleared externally
  useEffect(() => {
    setSearchTerm(filters.search || "");
  }, [filters.search]);

  // Fetch dynamic users list from server
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers(searchParamsString);
      setUserData(response || { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } });
    } catch (error) {
      toast.error(error.message || "Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchParamsString]);

  // Handle Ban/Unban user status toggle
  const handleToggleStatus = async (userId, currentActive) => {
    const actionText = currentActive ? "vô hiệu hóa" : "kích hoạt";
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này không?`)) {
      return;
    }

    try {
      const response = await adminService.updateUserStatus(userId, !currentActive);
      toast.success(response?.message || `${currentActive ? 'Vô hiệu hóa' : 'Kích hoạt'} thành công!`);
      fetchUsers();
    } catch (error) {
      toast.error(error.message || `Lỗi khi ${actionText} tài khoản`);
    }
  };

  // Handle User Role change
  const handleChangeRole = async (userId, newRole) => {
    try {
      const response = await adminService.updateUserRole(userId, newRole);
      toast.success(response?.message || "Thay đổi vai trò thành công!");
      fetchUsers();
    } catch (error) {
      toast.error(error.message || "Lỗi khi thay đổi vai trò");
    }
  };

  const totalEntries = userData.meta?.total || 0;
  const totalPages = userData.meta?.totalPages || 1;
  const currentPage = userData.meta?.page || 1;
  const usersList = userData.data || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]" style={{ padding: "40px 60px", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 text-[#DC2626]">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A]">User Management</h1>
            <p className="text-gray-500 mt-1">Quản lý tài khoản người dùng hệ thống, phân quyền và kiểm soát quyền truy cập.</p>
          </div>
        </div>
      </div>

      {/* Users Table Container */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters</span>
            
            {/* Role select filter */}
            <select
              id="select-filter-role"
              value={filters.role || ""}
              onChange={(e) => updateFilters({ role: e.target.value })}
              className="text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-black cursor-pointer transition-all px-3 py-1.5"
            >
              <option value="">Tất cả vai trò (All Roles)</option>
              {SYSTEM_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Clear filters */}
            {(filters.search || filters.role) && (
              <button
                id="btn-clear-filters"
                onClick={() => {
                  clearFilters();
                  setSearchTerm("");
                }}
                className="text-[10px] font-bold text-gray-450 hover:text-black uppercase tracking-wider cursor-pointer bg-transparent border-none outline-none px-2.5 py-1.5"
              >
                Clear
              </button>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                id="input-search-users"
                placeholder="Tìm tên hoặc email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-black w-64 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
              <th className="px-8 py-4">Người dùng</th>
              <th className="px-8 py-4">Vai trò (Role)</th>
              <th className="px-8 py-4">Trạng thái (Status)</th>
              <th className="px-8 py-4">Đăng nhập cuối</th>
              <th className="px-8 py-4">Ngày tham gia</th>
              <th className="px-8 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0A0A0A] mb-3" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Đang tải người dùng...</span>
                  </div>
                </td>
              </tr>
            ) : usersList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-10 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Users size={28} className="text-gray-300 mb-2" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Không có người dùng nào khớp điều kiện</span>
                  </div>
                </td>
              </tr>
            ) : usersList.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                {/* User Info */}
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px] text-gray-500 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name[0]
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0A0A0A]">{user.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{user.email}</div>
                    </div>
                  </div>
                </td>

                {/* System Role Selection */}
                <td className="px-8 py-5">
                  <select
                    id={`select-role-${user.id}`}
                    value={user.role}
                    onChange={(e) => handleChangeRole(user.id, e.target.value)}
                    className="text-xs bg-transparent border border-gray-100 rounded-lg outline-none focus:border-black cursor-pointer font-bold px-2 py-1"
                  >
                    {SYSTEM_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>

                {/* Status Indicator */}
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-[10px] font-bold uppercase ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                      {user.isActive ? 'Active' : 'Banned'}
                    </span>
                  </div>
                </td>

                {/* Last Login */}
                <td className="px-8 py-5 text-xs text-gray-500">
                  {user.lastLoginAt ? (
                    new Date(user.lastLoginAt).toLocaleString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  ) : (
                    <span className="text-gray-300 italic">Chưa đăng nhập</span>
                  )}
                </td>

                {/* Created At */}
                <td className="px-8 py-5 text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>

                {/* Action Button: Ban/Unban */}
                <td className="px-8 py-5 text-right">
                  <button
                    id={`btn-status-${user.id}`}
                    onClick={() => handleToggleStatus(user.id, user.isActive)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                      user.isActive 
                        ? 'bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 hover:text-red-700' 
                        : 'bg-green-50 border border-green-100 text-green-600 hover:bg-green-100 hover:text-green-700'
                    }`}
                  >
                    {user.isActive ? (
                      <>
                        <UserX size={12} /> Ban
                      </>
                    ) : (
                      <>
                        <UserCheck size={12} /> Unban
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer / Pagination */}
        <div className="px-8 py-5 border-t border-gray-50 flex items-center justify-between bg-gray-50/20">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Hiển thị {usersList.length} trên tổng số {totalEntries} (Trang {currentPage} / {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button 
              id="btn-page-prev"
              disabled={currentPage <= 1 || loading}
              onClick={() => updateFilters({ page: currentPage - 1 })}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              id="btn-page-next"
              disabled={currentPage >= totalPages || loading}
              onClick={() => updateFilters({ page: currentPage + 1 })}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
