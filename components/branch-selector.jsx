"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  GitCommit,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export function BranchSelector({ selectedBranch, onBranchSelect, onError }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    totalItems: 0,
  });
  const [searchInfo, setSearchInfo] = useState({
    hasSearch: false,
    totalMatches: 0,
    totalBranches: 0,
  });

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchBranches(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const fetchBranches = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/cxdeployer/api/branches?${params}`, {
        credentials: "include",
      });

      if (response.status === 401) {
        onError("Authentication required");
        return;
      }

      const data = await response.json();

      // Filter out origin branches
      const filteredBranches = data.branches.filter(
        (branch) => branch.name !== "origin"
      );
      setBranches(filteredBranches);
      setPagination(data.pagination);
      setSearchInfo(data.search);

      // Auto-select first branch if none selected and no search
      if (filteredBranches.length > 0 && !selectedBranch && !search.trim()) {
        onBranchSelect(filteredBranches[0].name);
      }
    } catch (error) {
      onError("Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchBranches(newPage, debouncedSearchTerm);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Branches
        </CardTitle>
        <CardDescription>
          {searchInfo.hasSearch
            ? `Showing branches matching "${searchInfo.term}"`
            : "Select a branch"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results Info */}
        {searchInfo.hasSearch && (
          <div className="text-sm text-muted-foreground">
            Found {searchInfo.totalMatches} branches matching "{searchInfo.term}
            "
          </div>
        )}

        {/* Branch List */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  Loading branches...
                </div>
              </div>
            ) : branches.length > 0 ? (
              branches.map((branch) => (
                <div
                  key={branch.name}
                  onClick={() => onBranchSelect(branch.name)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedBranch === branch.name
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <span className="font-medium">{branch.name}</span>
                      {selectedBranch === branch.name && (
                        <Badge variant="secondary">Selected</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <GitCommit className="h-3 w-3" />
                      <span>{branch.commitCount}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchInfo.hasSearch
                  ? `No branches match "${searchInfo.term}"`
                  : "No branches found"}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
