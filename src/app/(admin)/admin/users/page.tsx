"use client";

import { useState } from "react";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreVertical, Shield, Ban, Edit, Trash2, Eye, UserCheck } from "lucide-react";
import { usePermissions } from "@/hooks";
import type { User, UserRole, UserAccountStatus } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UsersPage() {
  const firestore = useFirestore();
  const { can } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all users (only staff can access this)
  const usersRef = collection(firestore, "users");
  const { data: users, isLoading } = useCollection<User>(usersRef);

  // Filter users
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.accountStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        {can("users.edit") && (
          <Button>
            <UserCheck className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={users?.length.toString() || "0"}
          description="All registered users"
        />
        <StatsCard
          title="Active"
          value={users?.filter((u) => u.accountStatus === "active").length.toString() || "0"}
          description="Active accounts"
          variant="success"
        />
        <StatsCard
          title="Suspended"
          value={users?.filter((u) => u.accountStatus === "suspended").length.toString() || "0"}
          description="Temporarily suspended"
          variant="warning"
        />
        <StatsCard
          title="Staff"
          value={users?.filter((u) => u.role !== "user").length.toString() || "0"}
          description="Staff members"
          variant="info"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>A list of all users in your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Workflows</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.profile?.photoURL} />
                              <AvatarFallback>
                                {user.profile?.displayName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.profile?.displayName || "Unnamed User"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.profile?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.accountStatus} />
                        </TableCell>
                        <TableCell>
                          <SubscriptionBadge plan={user.subscription?.plan || "free"} />
                        </TableCell>
                        <TableCell>{user.stats?.totalWorkflows || 0}</TableCell>
                        <TableCell>
                          {user.createdAt
                            ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActions user={user} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  variant = "default",
}: {
  title: string;
  value: string;
  description: string;
  variant?: "default" | "success" | "warning" | "info";
}) {
  const colors = {
    default: "text-gray-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };

  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const variants: Record<UserRole, { variant: any; label: string }> = {
    user: { variant: "outline", label: "User" },
    support: { variant: "secondary", label: "Support" },
    moderator: { variant: "secondary", label: "Moderator" },
    developer: { variant: "default", label: "Developer" },
    admin: { variant: "default", label: "Admin" },
    super_admin: { variant: "destructive", label: "Super Admin" },
  };

  const config = variants[role];

  return (
    <Badge variant={config.variant}>
      {role === "super_admin" || role === "admin" ? (
        <Shield className="mr-1 h-3 w-3" />
      ) : null}
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: UserAccountStatus }) {
  const variants: Record<UserAccountStatus, { variant: any; label: string }> = {
    active: { variant: "success", label: "Active" },
    suspended: { variant: "warning", label: "Suspended" },
    banned: { variant: "destructive", label: "Banned" },
    pending_verification: { variant: "secondary", label: "Pending" },
    deleted: { variant: "outline", label: "Deleted" },
  };

  const config = variants[status] || { variant: "outline", label: status };

  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

function SubscriptionBadge({ plan }: { plan: string }) {
  const variants: Record<string, { variant: any; label: string }> = {
    free: { variant: "outline", label: "Free" },
    pro: { variant: "default", label: "Pro" },
    enterprise: { variant: "secondary", label: "Enterprise" },
  };

  const config = variants[plan] || { variant: "outline", label: plan };

  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

function UserActions({ user }: { user: User }) {
  const { can } = usePermissions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        {can("users.edit") && (
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
        )}
        {can("users.impersonate") && (
          <DropdownMenuItem>
            <UserCheck className="mr-2 h-4 w-4" />
            Impersonate
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {can("users.suspend") && user.accountStatus === "active" && (
          <DropdownMenuItem className="text-yellow-600">
            <Ban className="mr-2 h-4 w-4" />
            Suspend Account
          </DropdownMenuItem>
        )}
        {can("users.delete") && (
          <DropdownMenuItem className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
