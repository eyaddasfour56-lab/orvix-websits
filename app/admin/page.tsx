"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  phone: string;
  governorate: string;
  address: string;
  colour: string;
  quantity: number;
  products_total: number;
  delivery_fee: number;
  total_price: number;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      if (response.status === 401) {
        setAuthenticated(false);
        setOrders([]);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load orders.");
      }

      setAuthenticated(true);
      setOrders(result.orders || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Incorrect password.");
      }

      setPassword("");