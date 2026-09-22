"use client"

;

import { useState } from "react";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { SupportTicket, SupportTicketStatus, SupportTicketPriority } from "@/lib/types";
import Link from "next/link";

export default function SupportPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Fetch all support tickets
  const ticketsRef = collection(firestore, "support_tickets");
  const ticketsQuery = query(ticketsRef, orderBy("createdAt", "desc"));
  const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

  // Filter tickets
  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      searchQuery === "" ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group tickets by status
  const openTickets = tickets?.filter((t) => t.status === "open") || [];
  const inProgressTickets = tickets?.filter((t) => t.status === "in_progress") || [];
  const resolvedTickets = tickets?.filter((t) => t.status === "resolved" || t.status === "closed") || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            Manage and respond to user support requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Open Tickets"
          value={openTickets.length.toString()}
          description="Awaiting response"
          icon={AlertCircle}
          variant="warning"
        />
        <StatsCard
          title="In Progress"
          value={inProgressTickets.length.toString()}
          description="Being worked on"
          icon={Clock}
          variant="info"
        />
        <StatsCard
          title="Resolved"
          value={resolvedTickets.length.toString()}
          description="Completed today"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Avg Response Time"
          value="2.3h"
          description="Last 7 days"
          icon={MessageSquare}
          variant="default"
        />
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
          <CardDescription>View and manage support tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({tickets?.length || 0})</TabsTrigger>
              <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({inProgressTickets.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 my-6">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_user">Waiting User</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all">
              <TicketsTable tickets={filteredTickets} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="open">
              <TicketsTable
                tickets={filteredTickets?.filter((t) => t.status === "open")}
                isLoading={isLoading}
              />
            </TabsContent>
            <TabsContent value="in_progress">
              <TicketsTable
                tickets={filteredTickets?.filter((t) => t.status === "in_progress")}
                isLoading={isLoading}
              />
            </TabsContent>
            <TabsContent value="resolved">
              <TicketsTable
                tickets={filteredTickets?.filter((t) => t.status === "resolved" || t.status === "closed")}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: any;
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function TicketsTable({
  tickets,
  isLoading,
}: {
  tickets?: SupportTicket[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!tickets || tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No tickets found
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.subject}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {ticket.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.userName || "Unknown"}</div>
                    <div className="text-sm text-muted-foreground">{ticket.userEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <CategoryBadge category={ticket.category} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={ticket.status} />
                </TableCell>
                <TableCell>
                  {ticket.createdAt
                    ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {ticket.assignedTo ? (
                    <Badge variant="outline">Assigned</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/support/${ticket.id}`}>
                    <Button variant="ghost" size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const variants: Record<SupportTicketStatus, { variant: any; label: string }> = {
    open: { variant: "destructive", label: "Open" },
    in_progress: { variant: "default", label: "In Progress" },
    waiting_user: { variant: "secondary", label: "Waiting User" },
    resolved: { variant: "success", label: "Resolved" },
    closed: { variant: "outline", label: "Closed" },
  };

  const config = variants[status];

  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

function PriorityBadge({ priority }: { priority: SupportTicketPriority }) {
  const variants: Record<SupportTicketPriority, { variant: any; label: string }> = {
    low: { variant: "outline", label: "Low" },
    medium: { variant: "secondary", label: "Medium" },
    high: { variant: "default", label: "High" },
    urgent: { variant: "destructive", label: "Urgent" },
  };

  const config = variants[priority];

  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="outline" className="capitalize">
      {category.replace("_", " ")}
    </Badge>
  );
}
