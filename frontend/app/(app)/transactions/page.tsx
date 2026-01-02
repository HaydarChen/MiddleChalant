"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transactionsApi, chainsApi } from "@/lib/api";
import type { Transaction, TransactionStats, ChainConfig } from "@/lib/types";

function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(amount: string): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [chainsData, statsData] = await Promise.all([
          chainsApi.getChains(),
          transactionsApi.getStats(),
        ]);
        setChains(chainsData);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const params: {
          chainId?: number;
          status?: string;
          limit: number;
          offset: number;
        } = {
          limit,
          offset: page * limit,
        };

        if (selectedChain) params.chainId = selectedChain;
        if (selectedStatus) params.status = selectedStatus;

        const response = await transactionsApi.getTransactions(params);
        setTransactions(response.data);
        setHasMore(response.hasMore);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [page, selectedChain, selectedStatus]);

  const getChainName = (chainId: number) => {
    const chain = chains.find((c) => c.chainId === chainId);
    return chain?.shortName || `Chain ${chainId}`;
  };

  const getExplorerUrl = (chainId: number) => {
    const chain = chains.find((c) => c.chainId === chainId);
    return chain?.explorerUrl || "";
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.depositTxHash?.toLowerCase().includes(query) ||
      tx.releaseTxHash?.toLowerCase().includes(query) ||
      tx.sender?.name?.toLowerCase().includes(query) ||
      tx.receiver?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">Transactions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Public ledger of all completed escrow transactions
        </p>
      </header>

      {/* Stats */}
      {stats && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard className="border border-slate-800/80 p-4">
            <p className="text-xs text-slate-400">Total Transactions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">
              {stats.totalTransactions.toLocaleString()}
            </p>
          </GlassCard>

          <GlassCard className="border border-slate-800/80 p-4">
            <p className="text-xs text-slate-400">Total Volume</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">
              {formatAmount(stats.totalVolume)} USDT
            </p>
          </GlassCard>

          <GlassCard className="border border-slate-800/80 p-4">
            <p className="text-xs text-slate-400">Completed</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">
              {stats.completedCount.toLocaleString()}
            </p>
          </GlassCard>

          <GlassCard className="border border-slate-800/80 p-4">
            <p className="text-xs text-slate-400">Refunded</p>
            <p className="mt-1 text-2xl font-semibold text-amber-400">
              {stats.refundedCount.toLocaleString()}
            </p>
          </GlassCard>
        </section>
      )}

      {/* Filters */}
      <GlassCard className="border border-slate-800/80 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search by tx hash or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />

            <select
              value={selectedChain || ""}
              onChange={(e) =>
                setSelectedChain(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-accent-blue focus:outline-none"
            >
              <option value="">All Chains</option>
              {chains.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus || ""}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-accent-blue focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Transactions Table */}
      <GlassCard className="border border-slate-800/80 overflow-hidden">
        {isLoading && transactions.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-slate-400">No transactions found</p>
            <p className="mt-1 text-sm text-slate-500">
              Completed escrow transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60 text-left text-xs text-slate-400">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Chain</th>
                  <th className="px-4 py-3 font-medium">Sender</th>
                  <th className="px-4 py-3 font-medium">Receiver</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Fee</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Tx</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-800/40 transition hover:bg-slate-900/30"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300">
                        {formatDate(tx.completedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                        {getChainName(tx.chainId)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-3 w-3 text-amber-400" />
                        <span className="text-sm text-slate-300">
                          {tx.sender?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                        <span className="text-sm text-slate-300">
                          {tx.receiver?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-slate-100">
                        {formatAmount(tx.amount)} USDT
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-400">
                        {formatAmount(tx.fee)} USDT
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                          <Check className="h-3 w-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                          <X className="h-3 w-3" />
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.releaseTxHash && (
                        <a
                          href={`${getExplorerUrl(tx.chainId)}/tx/${tx.releaseTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                        >
                          {shortenAddress(tx.releaseTxHash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-800/60 px-4 py-3">
            <p className="text-xs text-slate-400">
              Showing {page * limit + 1}-
              {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-400">
                Page {page + 1} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
